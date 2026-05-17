import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Colors, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { useWalletConnect } from '@/lib/hooks/use-wallet-connect';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useWalletStore } from '@/lib/stores/wallet.store';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  const contractId = useAuthStore((s) => s.contractId);
  const walletAddress = useWalletStore((s) => s.walletAddress);
  const { disconnect } = useWalletConnect();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  async function handleConfirmLogout() {
    setShowLogoutModal(false);
    await disconnect();
    router.replace('/(auth)');
  }

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-6)}`
    : null;

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <LinearGradient
          colors={Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerBanner}
        >
          <Text style={styles.heading}>Perfil</Text>
          <Text style={styles.sub}>Configurações e carteira</Text>
        </LinearGradient>

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
          onPress={() => setShowLogoutModal(true)}
        />
      </ScrollView>

      <ConfirmModal
        visible={showLogoutModal}
        title="Desconectar carteira"
        description="Tem certeza que deseja sair? Você precisará reconectar sua carteira para acessar o app."
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
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing[8] },
  headerBanner: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: Spacing[6],
  },
  heading: {
    fontSize: FontSize.displaySm,
    fontFamily: Font.black,
    color: '#fff',
  },
  sub: {
    fontSize: FontSize.body,
    fontFamily: Font.semiBold,
    color: 'rgba(255,255,255,0.7)',
    marginTop: Spacing[1],
  },
  card: {
    marginHorizontal: Spacing[6],
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing[1],
  },
  cardValue: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
});
