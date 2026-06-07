import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Accent, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useSound } from '@/hooks/use-sound';

interface EtherfuseOnrampModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EtherfuseOnrampModal({ visible, onClose }: EtherfuseOnrampModalProps) {
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const { playClick } = useSound();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!walletAddress) return;
    playClick();
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const displayAddress = walletAddress
    ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`
    : '—';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          {/* ── Header ── */}
          <View style={styles.headerRow}>
            <LinearGradient
              colors={Gradients.primary as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerIcon}
            >
              <MaterialIcons name="arrow-downward" size={18} color="#fff" />
            </LinearGradient>
            <View style={styles.headerTextBlock}>
              <Text style={styles.headerTitle}>Depositar fundos</Text>
              <View style={styles.networkBadge}>
                <View style={styles.networkDot} />
                <Text style={styles.networkText}>Stellar · USDC</Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <MaterialIcons name="close" size={16} color={Colors.mutedForeground} />
            </Pressable>
          </View>

          {/* ── Body ── */}
          <View style={styles.body}>

            {/* Method selector */}
            <View style={styles.methodRow}>
              {/* USDC — active */}
              <View style={[styles.methodCard, styles.methodCardActive]}>
                <MaterialIcons name="account-balance-wallet" size={20} color={Accent.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodLabel}>USDC via Stellar</Text>
                  <Text style={styles.methodSub}>Carteira crypto</Text>
                </View>
                <MaterialIcons name="check-circle" size={16} color={Accent.primary} />
              </View>

              {/* PIX — disabled */}
              <View style={[styles.methodCard, styles.methodCardDisabled]}>
                <MaterialIcons name="pix" size={20} color={Colors.mutedForeground} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodLabelDisabled}>PIX</Text>
                  <Text style={styles.methodSub}>Transferência bancária</Text>
                </View>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Em breve</Text>
                </View>
              </View>
            </View>

            {/* Steps */}
            <View style={styles.stepsList}>
              <Step num={1} text="Abra sua carteira Stellar (Lobstr, Freighter, etc.)" />
              <Step num={2} text="Copie o endereco da sua carteira PigFi abaixo" />
              <Step num={3} text="Envie USDC na rede Stellar — aparece em instantes" />
            </View>

            {/* Address card */}
            <View style={styles.addressCard}>
              <View style={styles.addressLabelRow}>
                <MaterialIcons name="account-balance-wallet" size={14} color={Colors.mutedForeground} />
                <Text style={styles.addressLabel}>Sua carteira PigFi</Text>
              </View>
              <View style={styles.addressRow}>
                <Text style={styles.addressText} numberOfLines={1}>
                  {displayAddress}
                </Text>
                <Pressable
                  onPress={handleCopy}
                  style={[styles.copyBtn, copied && styles.copyBtnDone]}
                  hitSlop={8}
                >
                  <MaterialIcons
                    name={copied ? 'check' : 'content-copy'}
                    size={16}
                    color={copied ? Accent.success : Accent.primary}
                  />
                  <Text style={[styles.copyText, copied && styles.copyTextDone]}>
                    {copied ? 'Copiado!' : 'Copiar'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Warning */}
            <View style={styles.warningRow}>
              <MaterialIcons name="info-outline" size={14} color={Colors.mutedForeground} />
              <Text style={styles.warningText}>
                Envie somente{' '}
                <Text style={styles.warningBold}>USDC na rede Stellar</Text>.
                {' '}Outras redes ou tokens não são suportados.
              </Text>
            </View>

            {/* CTA */}
            <Pressable onPress={onClose} style={{ alignSelf: 'stretch' }}>
              <LinearGradient
                colors={Gradients.primary as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.confirmBtn}
              >
                <MaterialIcons name="check" size={18} color="#fff" />
                <Text style={styles.confirmBtnText}>Entendi</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Step({ num, text }: { num: number; text: string }) {
  return (
    <View style={stepStyles.row}>
      <LinearGradient
        colors={Gradients.primary as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={stepStyles.numBadge}
      >
        <Text style={stepStyles.numText}>{num}</Text>
      </LinearGradient>
      <Text style={stepStyles.text}>{text}</Text>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  numText: {
    fontSize: FontSize.label,
    fontFamily: Font.black,
    color: '#fff',
  },
  text: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    flex: 1,
    lineHeight: 20,
  },
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[8],
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.muted,
    alignSelf: 'center',
    marginBottom: Spacing[4],
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing[6],
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerTextBlock: {
    flex: 1,
    gap: 5,
  },
  headerTitle: {
    fontSize: FontSize.body,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: Colors.muted,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  networkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Accent.success,
  },
  networkText: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  // Body
  body: {
    gap: Spacing[4],
  },

  // Method selector
  methodRow: {
    gap: 8,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.md,
    padding: Spacing[3],
    borderWidth: 1,
  },
  methodCardActive: {
    backgroundColor: 'rgba(244,52,180,0.08)',
    borderColor: 'rgba(244,52,180,0.3)',
  },
  methodCardDisabled: {
    backgroundColor: Colors.muted,
    borderColor: Colors.border,
    opacity: 0.6,
  },
  methodLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  methodLabelDisabled: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Colors.mutedForeground,
  },
  methodSub: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    marginTop: 1,
  },
  comingSoonBadge: {
    backgroundColor: Colors.muted,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  comingSoonText: {
    fontSize: 10,
    fontFamily: Font.black,
    color: Colors.mutedForeground,
    letterSpacing: 0.3,
  },

  stepsList: {
    gap: 12,
    paddingVertical: Spacing[2],
  },

  // Address card
  addressCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    gap: 10,
  },
  addressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  addressLabel: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addressText: {
    flex: 1,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.foreground,
    letterSpacing: 0.5,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(244,52,180,0.12)',
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(244,52,180,0.25)',
    flexShrink: 0,
  },
  copyBtnDone: {
    backgroundColor: 'rgba(72,207,120,0.12)',
    borderColor: 'rgba(72,207,120,0.25)',
  },
  copyText: {
    fontSize: FontSize.label,
    fontFamily: Font.black,
    color: Accent.primary,
  },
  copyTextDone: {
    color: Accent.success,
  },

  // Warning
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: Colors.muted,
    borderRadius: Radius.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  warningText: {
    flex: 1,
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  warningBold: {
    fontFamily: Font.black,
    color: Colors.foreground,
  },

  // CTA
  confirmBtn: {
    height: 54,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontFamily: Font.black,
  },
});
