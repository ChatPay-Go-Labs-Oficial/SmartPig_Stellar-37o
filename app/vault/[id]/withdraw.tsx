import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Font, FontSize } from '@/constants/theme';

export default function WithdrawScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // TODO: useVaultBalance(id, walletAddress), multi-step withdraw flow
  // Step 1: enter shares → Step 2: confirm → Step 3: sign XDR via kit.signAndSubmit() → Step 4: status

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Sacar</Text>
      <Text style={styles.sub}>Vault {id}</Text>
      {/* TODO: SharesInput, ConfirmStep, StatusStep */}
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
