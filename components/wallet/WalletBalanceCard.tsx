import { memo, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { V2Colors, V2Font, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { V2Icon, V2Spinner } from '@/components/v2';
import { formatWalletUsd, shortAddress } from '@/lib/utils/format';

interface WalletBalanceCardProps {
  /** Total em USD; null quando alguma moeda com saldo não pôde ser cotada. */
  amountUsd: number | null;
  /** O total inclui pelo menos uma moeda convertida por cotação. */
  estimated: boolean;
  address: string | null;
  /** Meus presentes (Figma 17a, botão no canto). */
  onGifts: () => void;
  /**
   * Estado da conta na rede. Sem ativação, a linha do código vira o aviso com
   * "Ativar" (Figma 17i); ativando, mostra o progresso (17j).
   */
  activation: 'active' | 'inactive' | 'activating';
  onActivate: () => void;
  /** Falha da última tentativa de ativar, abaixo da linha. */
  activationError?: string | null;
}

/** Card de saldo da Carteira (Figma 17a / 17b / 17g / 17i / 17j). */
function WalletBalanceCardView({
  amountUsd,
  estimated,
  address,
  onGifts,
  activation,
  onActivate,
  activationError,
}: WalletBalanceCardProps) {
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

  const addressLabel = isPro ? 'Endereço' : 'Código';
  const showEstimate = estimated && amountUsd !== null;
  const formatted = amountUsd === null
    ? 'Saldo indisponível'
    : `${showEstimate ? '≈ ' : ''}${formatWalletUsd(amountUsd)}`;

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
        <Text style={styles.label} numberOfLines={1}>{t('carteira.balance.label')}</Text>
        {showEstimate && (
          <View style={styles.estimateChip}>
            <V2Icon name="info" size={11} color={V2Colors.textSecondary} />
            <Text style={styles.estimateText}>estimativa</Text>
          </View>
        )}
        <Pressable
          onPress={onGifts}
          hitSlop={8}
          style={[styles.gift, { backgroundColor: accent.alpha(0.12), borderColor: accent.alpha(0.24) }]}
          accessibilityRole="button"
          accessibilityLabel="Meus presentes"
        >
          <V2Icon name="gift" size={16} color={accent.base} />
        </Pressable>
      </View>

      <Text
        style={[styles.amount, isPro ? styles.amountPro : styles.amountLite]}
        numberOfLines={1}
        adjustsFontSizeToFit
        accessibilityLabel={`${t('carteira.balance.label')}: ${formatted}`}
      >
        {formatted}
      </Text>

      {amountUsd === null && (
        <Text style={styles.hint}>Não foi possível cotar todas as suas moedas agora.</Text>
      )}

      {!isPro && amountUsd === 0 && (
        <Text style={styles.hint}>Deposite para começar a guardar.</Text>
      )}

      {/* Figma "código": o Lite chama de código o que o Pro chama de endereço. */}
      {address && activation === 'active' && (
        <Pressable
          onPress={copyAddress}
          style={styles.addressRow}
          accessibilityRole="button"
          accessibilityLabel={isPro ? 'Copiar endereço' : 'Copiar código'}
          hitSlop={8}
        >
          <Text style={styles.addressLabel} numberOfLines={1}>{addressLabel}</Text>
          {/* "Copiado" ocupa o lugar do endereço: a linha não cresce e nada é
              cortado em telas estreitas. */}
          <Text style={[styles.address, copied && { color: accent.base }]} numberOfLines={1}>
            {copied ? 'Copiado' : shortAddress(address)}
          </Text>
          <V2Icon name={copied ? 'check' : 'copy'} size={14} color={accent.base} />
        </Pressable>
      )}
      {address && activation === 'inactive' && (
        <View style={styles.addressRow}>
          <Text style={styles.addressLabel} numberOfLines={1}>{addressLabel}</Text>
          <Text style={[styles.address, { color: V2Colors.warning }]} numberOfLines={1}>
            Conta não ativada
          </Text>
          <Pressable onPress={onActivate} hitSlop={10} accessibilityRole="button">
            <Text style={[styles.activate, { color: accent.light }]}>Ativar</Text>
          </Pressable>
        </View>
      )}
      {address && activation === 'activating' && (
        <View style={styles.addressRow}>
          <Text style={styles.addressLabel} numberOfLines={1}>{addressLabel}</Text>
          <Text style={styles.address} numberOfLines={1}>Ativando sua conta...</Text>
          <V2Spinner size={14} />
        </View>
      )}
      {activationError && activation === 'inactive' ? (
        <Text style={styles.activationError}>{activationError}</Text>
      ) : null}

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
    flexShrink: 1,
    fontFamily: V2Font.semiBold,
    fontSize: 13.5,
    color: V2Colors.textSecondary,
  },
  gift: {
    width: 32,
    height: 32,
    marginLeft: 'auto',
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  estimateChip: {
    flexShrink: 0,
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
    flexShrink: 1,
    fontFamily: V2Font.extraBold,
    fontSize: 12.5,
    color: V2Colors.text,
  },
  activate: {
    fontFamily: V2Font.bold,
    fontSize: 12.5,
  },
  activationError: {
    fontFamily: V2Font.medium,
    fontSize: 12,
    lineHeight: 17,
    color: V2Colors.error,
  },
});

/** Memoizado: a tela re-renderiza ao abrir modais; a linha só muda com os dados. */
export const WalletBalanceCard = memo(WalletBalanceCardView);
