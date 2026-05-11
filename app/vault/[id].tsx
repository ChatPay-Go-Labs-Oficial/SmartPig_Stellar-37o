import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Font, FontSize } from '@/constants/theme';

export default function VaultDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // TODO: useVault(id), useVaultApy(id), useVaultBalance(id, walletAddress)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.placeholder}>Vault Detail — {id}</Text>
      <Text style={styles.sub}>Em construção</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing[8] },
  placeholder: {
    fontSize: FontSize.heading,
    fontWeight: '800',
    color: Colors.foreground,
    fontFamily: Font.extraBold,
  },
  sub: {
    fontSize: FontSize.body,
    color: Colors.mutedForeground,
    fontFamily: Font.regular,
    marginTop: Spacing[2],
  },
});
