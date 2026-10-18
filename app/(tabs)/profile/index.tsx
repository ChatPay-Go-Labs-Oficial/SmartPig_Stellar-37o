import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Button3D, ListCard, SheetLink, V2Icon, V2Sheet } from "@/components/v2";
import { ProfileHeader, type ProfileStat } from "@/components/profile/ProfileHeader";
import { ProfileGroupTitle, ProfileRow } from "@/components/profile/ProfileRows";
import { kycStatusInfo } from "@/components/profile/kyc-status";
import { V2Colors, V2Font } from "@/constants/theme-v2";
import { levelProgress } from "@/constants/pig-levels";
import { useScreenInsets } from "@/hooks/use-screen-insets";
import { useTerms } from "@/hooks/use-terms";
import { useSignOut } from "@/hooks/use-sign-out";
import { useSound } from "@/hooks/use-sound";
import { useInvestedTotal } from "@/hooks/use-invested-total";
import { useWalletTotal } from "@/hooks/use-wallet-total";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useKycStatus } from "@/lib/queries/blindpay.queries";
import { formatMonthYear, formatUsdV2 } from "@/lib/utils/format";

/** Valor em dólar da faixa de números; "≈" quando há moeda cotada. */
function statValue(value: number | null, estimated: boolean): string | null {
  if (value == null) return null;
  return `${estimated ? "≈ " : ""}${formatUsdV2(value)}`;
}

/**
 * Perfil V2 (Figma "Perfil · Tela e modo Lite/Pro", 26a/26b/26d): cabeçalho
 * com o porquinho e os números, a verificação de identidade, as preferências,
 * gerenciar conta e sair.
 *
 * XP, Chama e o calendário de Atividade do Figma são funcionalidades futuras
 * e ficam de fora até existirem (decisão do Matheus, 18/10/2026).
 */
export default function ProfileScreen() {
  const screenInsets = useScreenInsets();
  const { isPro } = useTerms();
  const { playClick } = useSound();
  const signOut = useSignOut();

  const walletAddress = useAuthStore((s) => s.walletAddress);
  const contractId = useAuthStore((s) => s.contractId);
  const accountCreatedAt = useAuthStore((s) => s.accountCreatedAt);

  const { data: kyc } = useKycStatus(contractId);
  const invested = useInvestedTotal();
  const wallet = useWalletTotal(walletAddress);
  // Mesmo total e mesmo nível da Home e da Evolução do porquinho.
  const level = levelProgress(invested.totalUsd);

  const verified = kyc?.kycStatus === "APPROVED" || kyc?.kycStatus === "APPROVED_RFI";
  const stats: ProfileStat[] = [
    {
      value: invested.valuationUnavailable
        ? null
        : statValue(invested.totalUsd, invested.usesMarketPricing),
      label: "Guardado",
      icon: "piggy",
    },
    { value: statValue(wallet.totalUsd, wallet.estimated), label: "Na carteira", icon: "wallet" },
  ];

  const [showLogoutSheet, setShowLogoutSheet] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // O sheet fica aberto, carregando, até a saída terminar; o AppGate leva ao
  // login quando a sessão acaba (ver useSignOut). Fechado antes, o Perfil
  // ficava à mostra enquanto o Privy saía.
  async function handleConfirmLogout() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
      setShowLogoutSheet(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: screenInsets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          paddingTop={screenInsets.top + screenInsets.topGap}
          name="Investidor"
          verified={verified}
          level={level}
          since={formatMonthYear(accountCreatedAt)}
          stats={stats}
        />

        <View style={styles.content}>
          {/* Sem cadastro no Pix (sem verificação), o grupo não aparece. */}
          {kyc ? (
            <>
              <ProfileGroupTitle title="Conta" />
              <ListCard style={styles.group}>
                <ProfileRow
                  icon="shield"
                  title="Verificação de identidade"
                  status={kycStatusInfo(kyc)}
                  onPress={() => router.push("/profile/verification")}
                />
              </ListCard>
            </>
          ) : null}

          <ProfileGroupTitle title="App" />
          <ListCard style={styles.group}>
            <ProfileRow
              icon="settings"
              title="Preferências"
              value={isPro ? "Pro" : "Lite"}
              onPress={() => router.push("/profile/preferences")}
            />
          </ListCard>
          <ListCard style={styles.group}>
            <ProfileRow icon="user" title="Gerenciar conta" onPress={() => router.push("/profile/account")} />
          </ListCard>

          <Pressable
            onPress={() => {
              playClick();
              setShowLogoutSheet(true);
            }}
            style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]}
            accessibilityRole="button"
          >
            <V2Icon name="logout" size={18} color={V2Colors.textSecondary} />
            <Text style={styles.logoutText}>Sair</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Figma 28a. Durante a saída nada fecha o sheet (closable). */}
      <V2Sheet
        visible={showLogoutSheet}
        onClose={() => setShowLogoutSheet(false)}
        title="Sair da conta"
        icon="logout"
        closable={!signingOut}
      >
        <View style={styles.logoutBody}>
          <Text style={styles.logoutDescription}>
            Tem certeza que deseja sair? Você precisará reconectar sua carteira.
          </Text>
          <Button3D
            label="Sair"
            onPress={handleConfirmLogout}
            loading={signingOut}
            loadingLabel="Saindo..."
          />
          <SheetLink
            label="Cancelar"
            onPress={() => setShowLogoutSheet(false)}
            disabled={signingOut}
          />
        </View>
      </V2Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: V2Colors.background,
  },
  // Figma "conteúdo": 18 de margem e 18 entre os blocos (o título do grupo
  // traz mais 8 embaixo).
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    gap: 18,
  },
  group: {
    borderColor: V2Colors.surfaceBorderStrong,
  },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  logoutPressed: {
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  logoutText: {
    fontFamily: V2Font.bold,
    fontSize: 14.5,
    color: V2Colors.textSecondary,
  },
  logoutBody: {
    gap: 14,
  },
  logoutDescription: {
    fontFamily: V2Font.medium,
    fontSize: 14,
    lineHeight: 21,
    color: V2Colors.textSecondary,
  },
});
