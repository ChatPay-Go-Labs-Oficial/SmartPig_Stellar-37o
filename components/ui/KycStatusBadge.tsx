import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Accent, Colors, Font, FontSize, Radius } from '@/constants/theme';
import type { KycStatus } from '@/lib/api/blindpay';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface BadgeAppearance {
  label: string;
  color: string;
  icon: IconName;
}

/**
 * `APPROVED_RFI` aparece como aprovado de propósito: nesse estado a BlindPay
 * mantém o cliente operacional, e mostrar "pendente" faria o usuário achar que
 * não pode transacionar quando pode.
 */
const APPEARANCE: Record<KycStatus, BadgeAppearance> = {
  APPROVED: { label: 'Aprovado', color: Accent.success, icon: 'verified' },
  APPROVED_RFI: { label: 'Aprovado', color: Accent.success, icon: 'verified' },
  VERIFYING: { label: 'Em análise', color: Accent.accent, icon: 'schedule' },
  COMPLIANCE_REQUEST: {
    label: 'Ação necessária',
    color: Accent.accent,
    icon: 'assignment-late',
  },
  REJECTED: {
    label: 'Recusado',
    color: Accent.destructive,
    icon: 'error-outline',
  },
};

interface KycStatusBadgeProps {
  /** `null` enquanto carrega, ou quando o usuário ainda não fez o cadastro. */
  status: KycStatus | null | undefined;
  isLoading?: boolean;
}

/** Selo compacto de status do KYC. Renderiza nada quando não há o que informar. */
export function KycStatusBadge({ status, isLoading }: KycStatusBadgeProps) {
  if (isLoading && !status) {
    return <ActivityIndicator size="small" color={Colors.mutedForeground} />;
  }
  if (!status) return null;

  const { label, color, icon } = APPEARANCE[status];

  return (
    // O fundo é o surface neutro, não uma versão translúcida de `color`: os
    // tokens do tema são `hsl(...)`, que não aceita sufixo de alpha como hex.
    <View
      style={[styles.badge, { borderColor: color }]}
      accessibilityRole="text"
      accessibilityLabel={`Verificação de identidade: ${label}`}
    >
      <MaterialIcons name={icon} size={12} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: Colors.surface,
  },
  label: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
  },
});
