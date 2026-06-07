import { useCallback, useMemo, useState } from "react";
import { Image, Pressable, View, Text, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  Colors,
  Accent,
  Font,
  FontSize,
  Gradients,
  Radius,
  Spacing,
} from "@/constants/theme";
import { Button, Card, Input, ConfirmModal, TransferModal, getPigLevel } from "@/components/ui";
import { useSmartAccount } from "@/hooks/use-smart-account";
import { useSound } from "@/hooks/use-sound";
import { usePixStore } from "@/lib/stores/pix.store";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useWalletBalance } from "@/lib/queries/wallets.queries";
import { useAllVaultBalances } from "@/lib/queries/vaults.queries";

const PIG_IMAGES: Record<string, any> = {
  'Porquinho Bebê':    require('@/assets/images/pig_babe.png'),
  'Porquinho Esperto': require('@/assets/images/pig1.png'),
  'Porquinho Forte':   require('@/assets/images/pig-muscle.png'),
  'Porquinho Dourado': require('@/assets/images/pig-gold.png'),
  'Porquinho Rei':     require('@/assets/images/pig-king.png'),
};
import { findUsdcBalance, getActivationXdr, submitActivation } from "@/lib/api/wallets";
import { useSubmitTrustlineXdr } from "@/lib/queries/etherfuse-ramp.queries";
import { signTrustlineXdr, signXdr } from "@/lib/stellar/kit";
import * as Clipboard from "expo-clipboard";

export default function ProfileScreen() {
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const walletAccountId = useAuthStore((s) => s.walletAccountId);
  const contractId = useAuthStore((s) => s.contractId);
  const isActivated = useAuthStore((s) => s.isActivated);
  const setIsActivated = useAuthStore((s) => s.setIsActivated);
  const { pixKey, setPixKey } = usePixStore();
  const { disconnect } = useSmartAccount();
  const { playClick } = useSound();

  const { data: balances } = useWalletBalance(walletAddress);
  const usdcBalance = balances ? findUsdcBalance(balances) : null;

  const vaultBalances = useAllVaultBalances(walletAddress);
  const totalInvested = useMemo(() => {
    let total = 0;
    for (const b of vaultBalances) {
      total += parseFloat(b.data?.underlyingBalance?.[0] ?? '0');
    }
    return total;
  }, [vaultBalances]);
  const pigLevel = getPigLevel(totalInvested);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [pixInput, setPixInput] = useState(pixKey);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [trustlineLoading, setTrustlineLoading] = useState(false);
  const [trustlineMsg, setTrustlineMsg] = useState("");
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationMsg, setActivationMsg] = useState("");

  const submitTrustline = useSubmitTrustlineXdr();

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`
    : null;
  const initials = walletAddress ? walletAddress.slice(0, 2).toUpperCase() : "??";

  const handleCopy = useCallback(async () => {
    if (!walletAddress) return;
    playClick();
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [walletAddress, playClick]);

  function handleSavePix() {
    if (!pixInput.trim()) return;
    setPixKey(pixInput.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleConfirmLogout() {
    setShowLogoutModal(false);
    await disconnect();
    router.replace("/(auth)");
  }

  async function handleSetupTrustline() {
    if (!walletAddress) return;
    setTrustlineLoading(true);
    setTrustlineMsg("Configurando trustline...");
    try {
      const signedXdr = await signTrustlineXdr(walletAddress);
      const { hash } = await submitTrustline.mutateAsync({
        signedXdr,
        stellarAddress: walletAddress,
      });
      setTrustlineMsg(`Trustline ativada! Tx: ${hash.slice(0, 12)}...`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "";
      if (msg.includes("already exists") || msg.includes("op_already_exists")) {
        setTrustlineMsg("Trustline ja esta ativa");
      } else {
        setTrustlineMsg("Erro ao configurar trustline");
      }
    } finally {
      setTrustlineLoading(false);
    }
  }

  async function handleRetryActivation() {
    if (!walletAddress || !walletAccountId || !contractId) return;
    setActivationLoading(true);
    setActivationMsg("Ativando conta Stellar...");
    try {
      const { unsignedXdr } = await getActivationXdr({
        userId: contractId,
        walletAccountId,
        stellarAddress: walletAddress,
      });
      const signed = await signXdr(unsignedXdr);
      await submitActivation({ walletAccountId, signedXdr: signed });
      setIsActivated(true);
      setActivationMsg("Conta ativada com sucesso!");
    } catch (err: any) {
      const detail = err?.response?.data?.message ?? err?.message ?? "Erro desconhecido";
      setActivationMsg("Nao foi possivel ativar: " + detail);
    } finally {
      setActivationLoading(false);
    }
  }

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={["hsla(320, 90%, 58%, 0.18)", "hsla(270, 80%, 60%, 0.18)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.avatarContainer}>
            <Image
              source={PIG_IMAGES[pigLevel.label] ?? PIG_IMAGES['Porquinho Bebê']}
              style={styles.avatarImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.userName}>Investidor</Text>
          {usdcBalance !== null && (
            <View style={styles.balancePill}>
              <MaterialIcons name="account-balance-wallet" size={12} color={Accent.primary} />
              <Text style={styles.balancePillText}>${usdcBalance} USDC</Text>
            </View>
          )}
        </LinearGradient>

        {/* ── Carteira ── */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <MaterialIcons name="credit-card" size={16} color={Accent.primary} />
            </View>
            <Text style={styles.cardLabel}>Carteira Digital</Text>
          </View>

          {/* Address block */}
          <Pressable onPress={handleCopy} style={styles.addressBlock}>
            <View style={styles.addressContent}>
              <Text style={styles.addressLabel}>Endereço Stellar</Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {shortAddress ?? "Nenhuma carteira"}
              </Text>
              {walletAddress && (
                <Text style={styles.addressFull} numberOfLines={2} selectable>
                  {walletAddress}
                </Text>
              )}
            </View>
            <View style={[styles.copyBtn, copied && styles.copyBtnDone]}>
              <MaterialIcons
                name={copied ? "check" : "content-copy"}
                size={16}
                color={copied ? Accent.success : Accent.primary}
              />
            </View>
          </Pressable>

          {/* Activation status */}
          <View style={styles.statusRow}>
            <View style={[styles.statusChip, isActivated ? styles.statusChipOk : styles.statusChipPending]}>
              <MaterialIcons
                name={isActivated ? "check-circle" : "schedule"}
                size={13}
                color={isActivated ? Accent.success : Accent.accent}
              />
              <Text style={[styles.statusChipText, isActivated ? styles.statusChipTextOk : styles.statusChipTextPending]}>
                {isActivated ? "Conta ativada" : "Conta nao ativada"}
              </Text>
            </View>
            {!isActivated && (
              <Pressable
                onPress={activationLoading ? undefined : handleRetryActivation}
                hitSlop={8}
              >
                <Text style={styles.activateLink}>
                  {activationLoading ? "Ativando..." : "Ativar agora"}
                </Text>
              </Pressable>
            )}
          </View>
          {activationMsg ? (
            <Text style={styles.statusMsg}>{activationMsg}</Text>
          ) : null}

          {/* Divider + Transfer button */}
          <View style={styles.divider} />
          <Pressable onPress={() => { playClick(); setShowTransferModal(true); }}>
            <LinearGradient
              colors={['hsl(220, 90%, 58%)', 'hsl(270, 80%, 60%)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.transferBtn}
            >
              <MaterialIcons name="send" size={16} color="#fff" />
              <Text style={styles.transferBtnText}>Transferir USDC</Text>
            </LinearGradient>
          </Pressable>
        </Card>

        {/* ── Chave PIX ── */}
        {false && <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <MaterialIcons name="key" size={16} color={Accent.primary} />
            </View>
            <Text style={styles.cardLabel}>Chave PIX para Saques</Text>
          </View>
          <Text style={styles.hint}>
            Cadastre sua chave PIX aqui. Saques serao enviados exclusivamente para esta chave.
          </Text>
          <Input
            placeholder="CPF, e-mail, telefone ou chave aleatoria"
            value={pixInput}
            onChangeText={setPixInput}
            style={styles.pixInput}
          />
          <Pressable onPress={handleSavePix} disabled={!pixInput.trim() || saved}>
            <LinearGradient
              colors={saved
                ? [Accent.success, 'hsl(145, 70%, 38%)']
                : (Gradients.primary as [string, string])}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.saveBtn, (!pixInput.trim() || saved) && styles.saveBtnDisabled]}
            >
              <MaterialIcons
                name={saved ? "check" : "save"}
                size={16}
                color="#fff"
              />
              <Text style={styles.saveBtnText}>{saved ? "Salvo!" : "Salvar Chave PIX"}</Text>
            </LinearGradient>
          </Pressable>
        </Card>}

        {/* ── Trustline ── */}
        {false && isActivated && walletAddress && (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}>
                <MaterialIcons name="link" size={16} color={Accent.primary} />
              </View>
              <Text style={styles.cardLabel}>Trustline USDC</Text>
            </View>
            <Text style={styles.hint}>
              Necessaria para receber USDC na rede Stellar.
            </Text>
            <Pressable
              onPress={trustlineLoading ? undefined : handleSetupTrustline}
              style={styles.trustlineActionRow}
            >
              <MaterialIcons name="settings" size={14} color={Accent.secondary} />
              <Text style={styles.trustlineAction}>
                {trustlineLoading ? "Configurando..." : "Configurar Trustline"}
              </Text>
            </Pressable>
            {trustlineMsg ? (
              <Text style={styles.statusMsg}>{trustlineMsg}</Text>
            ) : null}
          </Card>
        )}

        {/* ── Logout ── */}
        <Pressable
          onPress={() => { playClick(); setShowLogoutModal(true); }}
          style={styles.logoutBtn}
        >
          <View style={styles.logoutInner}>
            <MaterialIcons name="logout" size={18} color={Accent.destructive} />
            <Text style={styles.logoutText}>Sair da Conta</Text>
          </View>
        </Pressable>
      </ScrollView>

      <ConfirmModal
        visible={showLogoutModal}
        title="Sair da Conta"
        description="Tem certeza que deseja sair? Voce precisara reconectar sua carteira."
        confirmLabel="Sair"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      <TransferModal
        visible={showTransferModal}
        onClose={() => setShowTransferModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingBottom: 100,
  },

  // Header
  header: {
    alignItems: "center",
    paddingHorizontal: Spacing[6],
    paddingTop: 56,
    paddingBottom: Spacing[8],
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: 10,
    marginBottom: Spacing[4],
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(244,52,180,0.12)",
    borderWidth: 2,
    borderColor: "rgba(244,52,180,0.3)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 80,
    height: 80,
  },
  userName: {
    fontSize: FontSize.subheading,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(244,52,180,0.12)",
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(244,52,180,0.2)",
  },
  balancePillText: {
    fontSize: FontSize.label,
    fontFamily: Font.black,
    color: Accent.primary,
  },

  // Cards
  card: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[3],
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "rgba(244,52,180,0.12)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  cardLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    flex: 1,
  },

  // Address block
  addressBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.muted,
    borderRadius: Radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addressContent: {
    flex: 1,
    gap: 3,
  },
  addressLabel: {
    fontSize: 10,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  addressText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  addressFull: {
    fontSize: FontSize.label,
    fontFamily: "monospace",
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  copyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(244,52,180,0.1)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    borderWidth: 1,
    borderColor: "rgba(244,52,180,0.2)",
  },
  copyBtnDone: {
    backgroundColor: "rgba(34,197,94,0.1)",
    borderColor: "rgba(34,197,94,0.2)",
  },

  // Status
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  statusChipOk: {
    backgroundColor: "rgba(34,197,94,0.1)",
    borderColor: "rgba(34,197,94,0.25)",
  },
  statusChipPending: {
    backgroundColor: "rgba(245,158,11,0.1)",
    borderColor: "rgba(245,158,11,0.25)",
  },
  statusChipText: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
  },
  statusChipTextOk: { color: Accent.success },
  statusChipTextPending: { color: Accent.accent },
  activateLink: {
    fontSize: FontSize.label,
    fontFamily: Font.black,
    color: Accent.primary,
  },
  statusMsg: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: -4,
  },

  // Transfer
  transferBtn: {
    height: 46,
    borderRadius: Radius.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  transferBtnText: {
    color: "#fff",
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
  },

  // PIX
  hint: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  pixInput: {
    height: 48,
  },
  saveBtn: {
    height: 50,
    borderRadius: Radius.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: {
    color: "#fff",
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
  },

  // Trustline
  trustlineActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trustlineAction: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Accent.secondary,
  },

  // Logout
  logoutBtn: {
    marginHorizontal: Spacing[4],
    marginTop: Spacing[2],
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.25)",
    backgroundColor: "rgba(220,38,38,0.06)",
  },
  logoutInner: {
    height: 50,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  logoutText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Accent.destructive,
  },
});
