import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Spacing, Font, FontSize } from '@/constants/theme';

export default function HistoryScreen() {
  // TODO: merge useDeposits() + useWithdrawals() sorted by date

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Histórico</Text>
      <Text style={styles.sub}>Seus depósitos e saques</Text>
      {/* TODO: TransactionItem list */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing[6] },
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
});
