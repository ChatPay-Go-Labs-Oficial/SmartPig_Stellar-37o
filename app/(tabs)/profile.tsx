import { useCallback, useState } from "react";
import { Pressable, View, Text, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  Colors,
  Accent,
  Font,
  FontSize,
  Radius,
  Spacing,
} from "@/constants/theme";
import { Button, Card, Input } from "@/components/ui";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useSmartAccount } from "@/hooks/use-smart-account";
import { usePixStore } from "@/lib/stores/pix.store";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useEtherfuseStore } from "@/lib/stores/etherfuse.store";
import {
  useEtherfuseCustomer,
  useListBankAccounts,
} from "@/lib/queries/etherfuse.queries";
import {
  useBuildTrustlineXdr,
  useSubmitTrustlineXdr,
} from "@/lib/queries/etherfuse-ramp.queries";
import { signXdr } from "@/lib/stellar/kit";
import * as Clipboard from "expo-clipboard";

export default function ProfileScreen() {
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const contractId = useAuthStore((s) => s.contractId);
  const { pixKey, setPixKey } = usePixStore();
  const { disconnect } = useSmartAccount();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [pixInput, setPixInput] = useState(pixKey);
  const [saved, setSaved] = useState(false);

  const { data: etherfuseCustomer, isLoading: efLoading } =
    useEtherfuseCustomer(contractId);
  const { data: bankAccounts } = useListBankAccounts(
    etherfuseCustomer ? contractId : null,
  );

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-6)}`
    : null;

  const initials = shortAddress ? shortAddress.slice(0, 2).toUpperCase() : "??";

  const [copied, setCopied] = useState(false);
  const [trustlineLoading, setTrustlineLoading] = useState(false);
  const [trustlineMsg, setTrustlineMsg] = useState("");

  const buildTrustline = useBuildTrustlineXdr();
  const submitTrustline = useSubmitTrustlineXdr();

  const handleCopy = useCallback(async () => {
    if (!walletAddress) return;
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [walletAddress]);

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
    setTrustlineMsg("");
    try {
      setTrustlineMsg("Passo 1: gerando XDR...");
      const { unsignedXdr } = await buildTrustline.mutateAsync(walletAddress);
      setTrustlineMsg("Passo 2: assinando XDR...");
      const signedXdr = await signXdr(unsignedXdr);
      setTrustlineMsg("Passo 3: enviando trustline...");
      const { hash } = await submitTrustline.mutateAsync({
        signedXdr,
        stellarAddress: walletAddress,
      });
      setTrustlineMsg(`Trustline ativada! Tx: ${hash.slice(0, 12)}…`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "";
      if (msg.includes("already exists") || msg.includes("op_already_exists")) {
        setTrustlineMsg("Trustline já está ativa ✅");
      } else {
        setTrustlineMsg("Erro: " + msg);
      }
    } finally {
      setTrustlineLoading(false);
    }
  }

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
        <LinearGradient
          colors={["hsla(320, 90%, 58%, 0.2)", "hsla(270, 80%, 60%, 0.2)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>Investidor</Text>
          <Text style={styles.userEmail}>
            {walletAddress ? `${shortAddress}` : "Carteira não conectada"}
          </Text>
        </LinearGradient>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>💳</Text>
            <Text style={styles.cardLabel}>Carteira Digital</Text>
          </View>
          <Pressable onPress={handleCopy} style={styles.walletBox}>
            <Text style={styles.walletText} selectable>
              {walletAddress ?? "Nenhuma carteira"}
            </Text>
            {copied && <Text style={styles.copiedBadge}>Copiado!</Text>}
          </Pressable>
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🔑</Text>
            <Text style={styles.cardLabel}>Chave PIX para Saques</Text>
          </View>
          <Text style={styles.pixHint}>
            Cadastre sua chave PIX aqui. Saques serão enviados exclusivamente
            para esta chave.
          </Text>
          <Input
            placeholder="CPF, e-mail, telefone ou chave aleatória"
            value={pixInput}
            onChangeText={setPixInput}
            style={styles.pixInput}
          />
          <Button
            label={saved ? "✓ Salvo!" : "Salvar Chave PIX"}
            variant="primary"
            fullWidth
            disabled={!pixInput.trim() || saved}
            onPress={handleSavePix}
          />
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🏦</Text>
            <Text style={styles.cardLabel}>Etherfuse</Text>
          </View>
          {efLoading ? (
            <Text style={styles.efHint}>Carregando...</Text>
          ) : etherfuseCustomer ? (
            <View style={styles.efStatus}>
              <View style={styles.efRow}>
                <Text style={styles.efLabel}>KYC</Text>
                <Text
                  style={[
                    styles.efValue,
                    {
                      color:
                        etherfuseCustomer.kycStatus === "APPROVED" ||
                        etherfuseCustomer.kycStatus ===
                          "APPROVED_CHAIN_DEPLOYING"
                          ? Accent.success
                          : etherfuseCustomer.kycStatus === "REJECTED"
                            ? Accent.destructive
                            : Colors.mutedForeground,
                    },
                  ]}
                >
                  {etherfuseCustomer.kycStatus === "NOT_STARTED" &&
                    "Não iniciado"}
                  {etherfuseCustomer.kycStatus === "PROPOSED" && "Em análise"}
                  {etherfuseCustomer.kycStatus === "APPROVED" && "Aprovado"}
                  {etherfuseCustomer.kycStatus === "APPROVED_CHAIN_DEPLOYING" &&
                    "Aprovado"}
                  {etherfuseCustomer.kycStatus === "REJECTED" && "Rejeitado"}
                </Text>
              </View>
              {bankAccounts && bankAccounts.length > 0 ? (
                <View style={styles.efRow}>
                  <Text style={styles.efLabel}>Conta Bancária</Text>
                  <Text style={[styles.efValue, { color: Accent.success }]}>
                    {bankAccounts.some((a) => a.isCompliant)
                      ? "Ativa"
                      : "Pendente"}
                  </Text>
                </View>
              ) : null}
              {etherfuseCustomer.kycStatus !== "APPROVED" &&
                etherfuseCustomer.kycStatus !== "APPROVED_CHAIN_DEPLOYING" && (
                  <Text
                    style={styles.efAction}
                    onPress={() => {
                      useEtherfuseStore
                        .getState()
                        .setCurrentStep("check-status");
                      router.replace("/(etherfuse-onboarding)" as any);
                    }}
                  >
                    Completar verificação →
                  </Text>
                )}
            </View>
          ) : (
            <View>
              <Text style={styles.efHint}>
                Configure sua conta para operações com PIX
              </Text>
              <Text
                style={styles.efAction}
                onPress={() => {
                  useEtherfuseStore.getState().setCurrentStep("check-status");
                  router.replace("/(etherfuse-onboarding)" as any);
                }}
              >
                Iniciar verificação →
              </Text>
            </View>
          )}

          {etherfuseCustomer && walletAddress && (
            <View style={styles.trustlineSection}>
              <View style={styles.trustlineRow}>
                <Text style={styles.trustlineLabel}>Receber USDC</Text>
                <Text
                  style={styles.trustlineAction}
                  onPress={handleSetupTrustline}
                >
                  {trustlineLoading ? "Ativando..." : "Configurar Trustline →"}
                </Text>
              </View>
              {trustlineMsg ? (
                <Text style={styles.trustlineMsg}>{trustlineMsg}</Text>
              ) : null}
            </View>
          )}
        </Card>

        <Button
          label="Sair da Conta"
          variant="destructive"
          fullWidth
          style={styles.logoutBtn}
          onPress={() => setShowLogoutModal(true)}
        />
      </ScrollView>

      <ConfirmModal
        visible={showLogoutModal}
        title="Sair da Conta"
        description="Tem certeza que deseja sair? Você precisará reconectar sua carteira."
        confirmLabel="Sair"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
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
    paddingBottom: Spacing[12],
  },
  header: {
    alignItems: "center",
    paddingHorizontal: Spacing[6],
    paddingTop: 56,
    paddingBottom: Spacing[8],
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: 10,
    marginBottom: Spacing[4],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "hsla(320, 90%, 58%, 0.2)",
    borderWidth: 2,
    borderColor: Accent.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 28,
    fontFamily: Font.black,
    color: Accent.primary,
  },
  userName: {
    fontSize: FontSize.subheading,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  userEmail: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
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
  cardIcon: {
    fontSize: 18,
  },
  cardLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
  },
  walletBox: {
    backgroundColor: Colors.muted,
    borderRadius: Radius.md,
    padding: 12,
  },
  walletText: {
    fontSize: FontSize.bodySmall,
    fontFamily: "monospace",
    color: Colors.foreground,
  },
  copiedBadge: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Accent.success,
    marginTop: 4,
  },
  pixHint: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  pixInput: {
    height: 48,
  },
  efHint: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  efStatus: {
    gap: 8,
  },
  efRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  efLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  efValue: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
  },
  efAction: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Accent.primary,
    marginTop: 8,
  },
  trustlineSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing[3],
    marginTop: Spacing[1],
    gap: 4,
  },
  trustlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trustlineLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  trustlineAction: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Accent.success,
  },
  trustlineMsg: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  logoutBtn: {
    marginHorizontal: Spacing[4],
    marginTop: Spacing[2],
  },
});
