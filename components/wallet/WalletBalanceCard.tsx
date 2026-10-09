import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { V2Colors, V2Font, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { V2Icon } from '@/components/v2';
import { formatUsdV2, shortAddress } from '@/lib/utils/format';

interface WalletBalanceCardProps {
  /** Lite: saldo em dólar. Pro: total estimado de todos os ativos. */
  amountUsd: number;
  /** Pro: o total depende de cotação (vale o "≈" e o selo de estimativa). */
  estimated: boolean;
  address: string | null;
}

/** Card de saldo da Carteira (Figma 17a / 17b / 17g). */
export function WalletBalanceCard({ amountUsd, estimated, address }: WalletBalanceCardProps) {
  const accent = useAccent();
  const { t, isPro } = useTerms();
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
  }, []);

  async function copyAddress() {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 1500);
  }

  const showEstimate = isPro && estimated;
  const formatted = `${showEstimate ? '≈ ' : ''}${formatUsdV2(amountUsd)}`;

  return (
    <View style={styles.card}>
      <LinearGradient
        pointerEvents="none"
        colors={[accent.alpha(0.24), accent.alpha(0)]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.75 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.labelRow}>
        <Text style={styles.label}>{t('carteira.balance.label')}</Text>
        {showEstimate && (
          <View style={styles.estimateChip}>
            <V2Icon name="info" size={11} color={V2Colors.textSecondary} />
            <Text style={styles.estimateText}>estimativa</Text>
          </View>
        )}
      </View>

      <Text
        style={[styles.amount, isPro ? styles.amountPro : styles.amountLite]}
        numberOfLines={1}
        adjustsFontSizeToFit
        accessibilityLabel={`${t('carteira.balance.label')}: ${formatted}`}
      >
        {formatted}
      </Text>

      {!isPro && amountUsd === 0 && (
        <Text style={styles.hint}>Deposite para começar a guardar.</Text>
      )}

      {isPro && address && (
        <Pressable
          onPress={copyAddress}
          style={styles.addressRow}
          accessibilityRole="button"
          accessibilityLabel="Copiar endereço"
          hitSlop={8}
        >
          <Text style={styles.addressLabel}>Endereço</Text>
          <Text style={styles.address}>{shortAddress(address)}</Text>
          <V2Icon name={copied ? 'check' : 'copy'} size={14} color={accent.base} />
          {copied && <Text style={[styles.copied, { color: accent.base }]}>Copiado</Text>}
        </Pressable>
      )}

      {/* Borda numa camada própria, por cima do brilho */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.border, { borderColor: accent.alpha(0.32) }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: V2Radius.card,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 6,
    backgroundColor: V2Colors.surface,
    overflow: 'hidden',
  },
  border: {
    borderRadius: V2Radius.card,
    borderWidth: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontFamily: V2Font.semiBold,
    fontSize: 13.5,
    color: V2Colors.textSecondary,
  },
  estimateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: V2Radius.full,
    borderWidth: 1,
    borderColor: V2Colors.chipBorder,
    backgroundColor: V2Colors.chip,
  },
  estimateText: {
    fontFamily: V2Font.bold,
    fontSize: 10.5,
    color: V2Colors.textSecondary,
  },
  amount: {
    fontFamily: V2Font.black,
    color: V2Colors.text,
  },
  amountLite: {
    fontSize: 42,
    letterSpacing: -1.26,
  },
  amountPro: {
    fontSize: 38,
    letterSpacing: -1.14,
  },
  hint: {
    fontFamily: V2Font.medium,
    fontSize: 13,
    color: V2Colors.textSecondary,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
    alignSelf: 'flex-start',
  },
  addressLabel: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    color: V2Colors.textTertiary,
  },
  address: {
    fontFamily: V2Font.extraBold,
    fontSize: 12.5,
    color: V2Colors.text,
  },
  copied: {
    fontFamily: V2Font.bold,
    fontSize: 11.5,
  },
});
