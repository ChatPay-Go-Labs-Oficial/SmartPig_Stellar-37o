import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Font, FontSize, Accent, Radius } from '@/constants/theme';
import { useSmartAccount } from '@/hooks/use-smart-account';
import { useAuthStore } from '@/lib/stores/auth.store';

export default function ProfileScreen() {
  const { disconnect } = useSmartAccount();
  const contractId = useAuthStore((s) => s.contractId);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Perfil</Text>
      <Text style={styles.sub}>Configurações e carteira</Text>

      {contractId ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Contrato</Text>
          <Text style={styles.cardValue} numberOfLines={1} ellipsizeMode="middle">
            {contractId}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.logoutBtn} onPress={disconnect}>
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing[6], gap: Spacing[4] },
  heading: {
    fontSize: FontSize.displaySm,
    fontFamily: Font.extraBold,
    color: Colors.foreground,
  },
  sub: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    marginTop: Spacing[1],
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing[4],
    gap: Spacing[1],
  },
  cardLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardValue: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.foreground,
  },
  logoutBtn: {
    marginTop: Spacing[4],
    backgroundColor: Accent.destructive,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontFamily: Font.bold,
  },
});
