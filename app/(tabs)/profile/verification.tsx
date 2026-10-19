import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Button3D, V2Icon } from "@/components/v2";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { ProfileSubScreen } from "@/components/profile/ProfileSubScreen";
import { kycStatusInfo } from "@/components/profile/kyc-status";
import { V2Font, withAlpha } from "@/constants/theme-v2";
import { useAccent } from "@/hooks/use-accent";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useKycStatus } from "@/lib/queries/blindpay.queries";

/** Verificação de identidade (Figma 26l–26p): estado e, se der, o reenvio. */
export default function VerificationScreen() {
  const accent = useAccent();
  const contractId = useAuthStore((s) => s.contractId);
  const { data: kyc } = useKycStatus(contractId);
  const status = kyc ? kycStatusInfo(kyc) : null;

  return (
    <ProfileSubScreen title="Verificação de identidade">
      {kyc && status ? (
        <ProfileCard
          icon="shield"
          title="Verificação de identidade"
          description={status.description}
          trailing={
            <View style={[styles.status, { borderColor: withAlpha(status.color, 0.9) }]}>
              <V2Icon name={status.icon} size={13} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          }
        >
          {/* O reenvio só aparece quando a BlindPay aceita nova tentativa.
              Motivos como fraude ou sanção não se corrigem pelo usuário: o
              botão ali só levaria a uma segunda recusa. */}
          {kyc.canResubmit ? (
            <View style={styles.action}>
              <Button3D
                label="Refazer verificação"
                variant="glass"
                onPress={() => router.push("/(blindpay-onboarding)")}
              />
            </View>
          ) : null}
        </ProfileCard>
      ) : (
        <ActivityIndicator color={accent.base} style={styles.loading} />
      )}
    </ProfileSubScreen>
  );
}

const styles = StyleSheet.create({
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  statusText: {
    fontFamily: V2Font.extraBold,
    fontSize: 12,
  },
  action: {
    paddingTop: 14,
  },
  loading: {
    paddingTop: 48,
  },
});
