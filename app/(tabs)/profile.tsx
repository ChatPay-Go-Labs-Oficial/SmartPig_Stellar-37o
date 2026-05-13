import { Button } from '@/components/ui/Button';
import { Colors, Font, FontSize, Radius, Spacing } from '@/constants/theme';
import { useWalletConnect } from '@/lib/hooks/use-wallet-connect';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useWalletStore } from '@/lib/stores/wallet.store';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  const contractId = useAuthStore((s) => s.contractId);
  const walletAddress = useWalletStore((s) => s.walletAddress);
  const { disconnect } = useWalletConnect();

  function handleLogout() {
    Alert.alert(
      'Desconectar carteira',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await disconnect();
            router.replace('/(auth)');
          },
        },
      ],
    );
  }

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-6)}`
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Perfil</Text>
      <Text style={styles.sub}>Configurações e carteira</Text>

      {(walletAddress || contractId) && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Carteira conectada</Text>
          {shortAddress && (
            <Text style={styles.cardValue} numberOfLines={1}>
              {shortAddress}
            </Text>
          )}
          {contractId && (
            <>
              <Text style={[styles.cardLabel, { marginTop: Spacing[3] }]}>Contrato</Text>
              <Text style={styles.cardValue} numberOfLines={1}>
                {contractId.slice(0, 8)}…{contractId.slice(-8)}
              </Text>
            </>
          )}
        </View>
      )}

      <Button
        label="Desconectar carteira"
        variant="destructive"
        fullWidth
        style={{ marginTop: Spacing[6] }}
        onPress={handleLogout}
      />
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
    marginTop: Spacing[6],
  },
  sub: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    marginTop: Spacing[1],
    marginBottom: Spacing[6],
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    marginBottom: Spacing[1],
  },
  cardValue: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
});
