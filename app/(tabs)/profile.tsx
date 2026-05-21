import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Accent, Font, FontSize, Radius, Spacing } from '@/constants/theme';
import { Button, Card, Input } from '@/components/ui';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useSmartAccount } from '@/hooks/use-smart-account';
import { useWalletStore } from '@/lib/stores/wallet.store';
import { usePixStore } from '@/lib/stores/pix.store';

export default function ProfileScreen() {
  const walletAddress = useWalletStore((s) => s.walletAddress);
  const { pixKey, setPixKey } = usePixStore();
  const { disconnect } = useSmartAccount();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [pixInput, setPixInput] = useState(pixKey);
  const [saved, setSaved] = useState(false);

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-6)}`
    : null;

  const initials = shortAddress ? shortAddress.slice(0, 2).toUpperCase() : '??';

  function handleSavePix() {
    if (!pixInput.trim()) return;
    setPixKey(pixInput.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleConfirmLogout() {
    setShowLogoutModal(false);
    await disconnect();
    router.replace('/(auth)');
  }

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
        <LinearGradient
          colors={['hsla(320, 90%, 58%, 0.2)', 'hsla(270, 80%, 60%, 0.2)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>Investidor</Text>
          <Text style={styles.userEmail}>
            {walletAddress ? `${shortAddress}` : 'Carteira não conectada'}
          </Text>
        </LinearGradient>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>💳</Text>
            <Text style={styles.cardLabel}>Carteira Digital</Text>
          </View>
          <View style={styles.walletBox}>
            <Text style={styles.walletText} selectable>
                {walletAddress ?? 'Nenhuma carteira'}
            </Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🔑</Text>
            <Text style={styles.cardLabel}>Chave PIX para Saques</Text>
          </View>
          <Text style={styles.pixHint}>
            Cadastre sua chave PIX aqui. Saques serão enviados exclusivamente para esta chave.
          </Text>
          <Input
            placeholder="CPF, e-mail, telefone ou chave aleatória"
            value={pixInput}
            onChangeText={setPixInput}
            style={styles.pixInput}
          />
          <Button
            label={saved ? '✓ Salvo!' : 'Salvar Chave PIX'}
            variant="primary"
            fullWidth
            disabled={!pixInput.trim() || saved}
            onPress={handleSavePix}
          />
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
    alignItems: 'center',
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
    backgroundColor: 'hsla(320, 90%, 58%, 0.2)',
    borderWidth: 2,
    borderColor: Accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    fontFamily: 'monospace',
    color: Colors.foreground,
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
  logoutBtn: {
    marginHorizontal: Spacing[4],
    marginTop: Spacing[2],
  },
});
