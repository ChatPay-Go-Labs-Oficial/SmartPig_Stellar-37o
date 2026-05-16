import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TextInput } from '@/components/ui/TextInput';
import { Accent, Colors, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { useWalletConnect } from '@/lib/hooks/use-wallet-connect';
import { useUser, useUpdateUser } from '@/lib/queries/users.queries';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useUIStore } from '@/lib/stores/ui.store';
import { useWalletStore } from '@/lib/stores/wallet.store';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

const MENU_ITEMS = [
  { icon: 'person.fill' as const, label: 'Dados Pessoais' },
  { icon: 'shield.fill' as const, label: 'Segurança e PIN' },
  { icon: 'bell.fill' as const, label: 'Notificações' },
  { icon: 'headphones' as const, label: 'Ajuda e Suporte' },
];

export default function ProfileScreen() {
  const userName = useAuthStore((s) => s.userName);
  const contractId = useAuthStore((s) => s.contractId);
  const walletAddress = useWalletStore((s) => s.walletAddress);
  const addToast = useUIStore((s) => s.addToast);
  const { disconnect } = useWalletConnect();

  const { data: user, isLoading: userLoading } = useUser();
  const updateUser = useUpdateUser();
  const insets = useSafeAreaInsets();

  const [addressVisible, setAddressVisible] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const address = walletAddress ?? contractId ?? '';
  const displayName = user?.name ?? userName ?? '';
  const displayEmail = user?.email ?? '';

  function openEditModal() {
    setEditName(displayName);
    setEditEmail(displayEmail);
    setShowEditModal(true);
  }

  async function handleSave() {
    if (!editName.trim()) return;
    try {
      await updateUser.mutateAsync({ name: editName.trim(), email: editEmail.trim() });
      addToast('Perfil atualizado!', 'success');
      setShowEditModal(false);
    } catch {
      addToast('Erro ao atualizar perfil. Tente novamente.', 'error');
    }
  }

  async function handleCopy() {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    addToast('Endereço copiado!', 'success');
  }

  async function handleConfirmLogout() {
    setShowLogoutModal(false);
    await disconnect();
    router.replace('/(auth)');
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Meu Perfil</Text>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <LinearGradient
              colors={Gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              {userLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.avatarInitials}>{getInitials(displayName)}</Text>
              )}
            </LinearGradient>
            <View style={styles.avatarEditBadge}>
              <IconSymbol name="pencil" size={12} color="#fff" />
            </View>
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{displayName || '—'}</Text>
            <Pressable onPress={openEditModal} hitSlop={8} style={styles.editBtn}>
              <IconSymbol name="pencil" size={16} color={Accent.primary} />
            </Pressable>
          </View>

          {!!displayEmail && (
            <Text style={styles.displayEmail}>{displayEmail}</Text>
          )}
        </View>

        {/* Wallet card */}
        <View style={styles.walletCard}>
          <View style={styles.walletTop}>
            <Text style={styles.walletLabel}>CARTEIRA PIGFI</Text>
            <View style={styles.walletActions}>
              <Pressable onPress={() => setAddressVisible((v) => !v)} hitSlop={8} style={styles.iconBtn}>
                <IconSymbol
                  name={addressVisible ? 'eye.slash' : 'eye'}
                  size={18}
                  color={Colors.mutedForeground}
                />
              </Pressable>
              <Pressable onPress={handleCopy} hitSlop={8} style={styles.iconBtn}>
                <IconSymbol name="doc.on.doc" size={18} color={Colors.mutedForeground} />
              </Pressable>
            </View>
          </View>
          <Text style={styles.walletAddress} numberOfLines={addressVisible ? undefined : 1}>
            {address ? (addressVisible ? address : truncateAddress(address)) : '—'}
          </Text>
        </View>

        {/* Menu */}
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <View key={item.label}>
              <View style={styles.menuRow}>
                <View style={styles.menuIconWrapper}>
                  <IconSymbol name={item.icon} size={18} color={Accent.primary} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <IconSymbol name="chevron.right" size={18} color={Colors.mutedForeground} />
              </View>
              {i < MENU_ITEMS.length - 1 && <View style={styles.menuDivider} />}
            </View>
          ))}
        </View>

        <Button
          label="Sair da Conta"
          variant="destructive"
          fullWidth
          style={{ marginTop: Spacing[4] }}
          onPress={() => setShowLogoutModal(true)}
        />
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowEditModal(false)} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + Spacing[4] }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Editar Perfil</Text>

          <View style={styles.modalFields}>
            <TextInput
              label="Nome completo"
              placeholder="Seu nome"
              value={editName}
              onChangeText={setEditName}
              autoCapitalize="words"
            />
            <TextInput
              label="E-mail"
              placeholder="seu@email.com"
              value={editEmail}
              onChangeText={setEditEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <Button
            label="Salvar"
            variant="primary"
            size="lg"
            fullWidth
            loading={updateUser.isPending}
            onPress={handleSave}
          />
        </View>
      </Modal>

      <ConfirmModal
        visible={showLogoutModal}
        title="Sair da Conta"
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
  content: {
    padding: Spacing[6],
    paddingBottom: Spacing[12],
  },
  heading: {
    fontSize: FontSize.displaySm,
    fontFamily: Font.extraBold,
    color: Colors.foreground,
    marginTop: Spacing[6],
    marginBottom: Spacing[6],
    textAlign: 'center',
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing[6],
    gap: Spacing[2],
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: Spacing[2],
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
    color: '#fff',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  displayName: {
    fontSize: FontSize.subheading,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  editBtn: {
    padding: Spacing[1],
  },
  displayEmail: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },

  // Wallet card
  walletCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    gap: Spacing[2],
    marginBottom: Spacing[4],
  },
  walletTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletLabel: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    letterSpacing: 1,
  },
  walletActions: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  iconBtn: {
    padding: Spacing[1],
  },
  walletAddress: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.foreground,
  },

  // Menu
  menuCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[4],
    gap: Spacing[3],
    opacity: 0.5,
  },
  menuIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(244, 52, 180, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: FontSize.body,
    fontFamily: Font.semiBold,
    color: Colors.foreground,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing[4],
  },

  // Edit modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing[6],
    gap: Spacing[4],
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing[2],
  },
  modalTitle: {
    fontSize: FontSize.subheading,
    fontFamily: Font.extraBold,
    color: Colors.foreground,
    textAlign: 'center',
  },
  modalFields: {
    gap: Spacing[4],
  },
});
