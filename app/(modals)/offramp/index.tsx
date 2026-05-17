import { ScreenContainer } from '@/components/layout';
import { Button, Card } from '@/components/ui';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Accent, Colors, Font, FontSize, Spacing } from '@/constants/theme';
import { EtherfuseApi, type OfframpOrder, type QuoteResponse } from '@/lib/api/etherfuse.api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useWalletStore } from '@/lib/stores/wallet.store';
import { useUIStore } from '@/lib/stores/ui.store';
import { signTransaction, hasActiveSession } from '@/lib/wallet-kit';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const IS_MOCK = process.env.EXPO_PUBLIC_MOCK_ETHERFUSE === 'true';

const OFFRAMP_SOURCE_ASSET = 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const OFFRAMP_TARGET_ASSET = 'BRL';

type Step = 'amount' | 'confirm' | 'signing' | 'success';

function formatBRL(val: string | number): string {
  return parseFloat(String(val)).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatUSDC(val: string | number): string {
  return parseFloat(String(val)).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export default function OfframpScreen() {
  const addToast = useUIStore((s) => s.addToast);
  const userId = useAuthStore((s) => s.userId);
  const walletAccountId = useWalletStore((s) => s.walletAccountId);
  const walletAddress = useWalletStore((s) => s.walletAddress);

  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [order, setOrder] = useState<OfframpOrder | null>(null);
  const [signingLabel, setSigningLabel] = useState('');
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = parseFloat(amount.replace(',', '.'));
  const canGetQuote = !isNaN(parsedAmount) && parsedAmount > 0 && !!userId && !!walletAddress;

  const destAmount = quote?.destinationAmountAfterFee ?? quote?.destinationAmount ?? '0';

  async function handleGetQuote() {
    if (!canGetQuote || !userId || !walletAddress) return;
    setLoadingQuote(true);
    setError(null);
    try {
      const q = await EtherfuseApi.getQuote({
        userId,
        direction: 'offramp',
        sourceAsset: OFFRAMP_SOURCE_ASSET,
        targetAsset: OFFRAMP_TARGET_ASSET,
        sourceAmount: parsedAmount.toFixed(6),
        walletAddress,
      });
      setQuote(q);
      setStep('confirm');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Erro ao obter cotação';
      addToast(typeof msg === 'string' ? msg : 'Erro ao obter cotação', 'error');
    } finally {
      setLoadingQuote(false);
    }
  }

  async function handleWithdraw() {
    if (!userId || !walletAccountId || !walletAddress || !quote) return;
    setStep('signing');
    setError(null);

    try {
      // Step 1: Create offramp order (get unsigned burn XDR)
      setSigningLabel('Criando ordem de saque…');
      const offrampOrder = await EtherfuseApi.createOfframp({
        userId,
        bankAccountId: walletAccountId,
        quoteId: quote.quoteId,
        walletAddress,
        sourceAmount: parsedAmount.toFixed(6),
        destinationAmount: destAmount,
      });
      setOrder(offrampOrder);

      // Step 2: Sign the burn XDR (Lobstr in real mode, mock in demo)
      let signedXdr: string;
      if (IS_MOCK) {
        setSigningLabel('Assinando queima de USDC… (mock)');
        await new Promise((res) => setTimeout(res, 800));
        signedXdr = `MOCK_SIGNED_BURN_XDR_${Date.now()}`;
      } else {
        if (!hasActiveSession()) {
          throw new Error('Conecte sua carteira para assinar a transação.');
        }
        if (!offrampOrder.unsignedBurnXdr) {
          throw new Error('Nenhum XDR de queima retornado pelo backend.');
        }
        setSigningLabel('Aguardando aprovação no Lobstr…');
        signedXdr = await signTransaction(offrampOrder.unsignedBurnXdr);
      }

      // Step 3: Submit signed XDR
      setSigningLabel('Enviando para a rede Stellar…');
      await EtherfuseApi.submitOfframpSignedXdr(offrampOrder.id, signedXdr, userId);

      setStep('success');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Erro ao processar saque';
      setError(typeof msg === 'string' ? msg : 'Erro ao processar saque');
      addToast(typeof msg === 'string' ? msg : 'Erro ao processar saque', 'error');
      setStep('confirm');
    }
  }

  function handleCopyPix() {
    const key = order?.pixPayoutKey;
    if (!key) return;
    Clipboard.setString(key);
    setCopied(true);
    addToast('Chave PIX copiada!', 'success');
    setTimeout(() => setCopied(false), 3000);
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (step === 'success') {
    const pixKey = order?.pixPayoutKey;
    const pixKeyType = order?.pixPayoutKeyType;
    const pixAmount = order?.pixPayoutAmount ?? destAmount;

    return (
      <ScreenContainer scrollable>
        <View style={styles.header}>
          <View style={{ width: 20 }} />
          <Text style={styles.title}>Saque</Text>
          <View style={{ width: 20 }} />
        </View>

        <View style={styles.heroBlock}>
          <View style={styles.successIcon}>
            <IconSymbol name="checkmark.circle.fill" size={64} color={Accent.success} />
          </View>
          <Text style={styles.heroTitle}>Saque confirmado!</Text>
          <Text style={styles.heroSub}>
            Você receberá{' '}
            <Text style={styles.heroHighlight}>R$ {formatBRL(pixAmount)}</Text>
            {' '}via PIX em breve.
          </Text>
        </View>

        {pixKey ? (
          <Card style={styles.pixCard}>
            <View style={styles.pixHeader}>
              <IconSymbol name="qrcode" size={18} color={Accent.success} />
              <Text style={styles.pixTitle}>PIX de destino</Text>
            </View>

            <View style={styles.pixAmountRow}>
              <Text style={styles.pixAmountLabel}>Valor a receber</Text>
              <Text style={styles.pixAmount}>R$ {formatBRL(pixAmount)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.pixKeyBlock}>
              <Text style={styles.pixKeyLabel}>
                Chave PIX ({pixKeyType?.toUpperCase() ?? 'EVP'})
              </Text>
              <View style={styles.pixKeyRow}>
                <Text style={styles.pixKey} numberOfLines={1} ellipsizeMode="middle">
                  {pixKey}
                </Text>
                <Pressable
                  onPress={handleCopyPix}
                  style={[styles.copyBtn, copied && styles.copyBtnDone]}
                  hitSlop={8}
                >
                  <IconSymbol
                    name={copied ? 'checkmark' : 'doc.on.doc'}
                    size={14}
                    color={copied ? Accent.success : Accent.success}
                  />
                  <Text style={[styles.copyLabel, copied && styles.copyLabelDone]}>
                    {copied ? 'Copiado' : 'Copiar'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {IS_MOCK && (
              <Text style={styles.mockBadge}>MODO MOCK — PIX simulado</Text>
            )}
          </Card>
        ) : null}

        <View style={styles.successActions}>
          <Button
            label="Ir para o Dashboard"
            variant="primary"
            size="lg"
            fullWidth
            rightIcon={<IconSymbol name="house.fill" size={16} color="#fff" />}
            onPress={() => {
              router.dismiss();
              router.replace('/(tabs)');
            }}
          />
        </View>
      </ScreenContainer>
    );
  }

  // ── Signing (loading) ─────────────────────────────────────────────────────
  if (step === 'signing') {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <View style={{ width: 20 }} />
          <Text style={styles.title}>Saque</Text>
          <View style={{ width: 20 }} />
        </View>

        <View style={styles.signingBlock}>
          <ActivityIndicator size="large" color={Accent.primary} />
          <Text style={styles.signingLabel}>{signingLabel}</Text>
          {!IS_MOCK && (
            <Text style={styles.signingHint}>
              Aprove a queima de USDC no Lobstr e retorne a este app.
            </Text>
          )}
        </View>
      </ScreenContainer>
    );
  }

  // ── Confirm ───────────────────────────────────────────────────────────────
  if (step === 'confirm' && quote) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <Pressable onPress={() => setStep('amount')} hitSlop={8}>
            <IconSymbol name="arrow.left" size={20} color={Colors.mutedForeground} />
          </Pressable>
          <Text style={styles.title}>Confirmar Saque</Text>
          <View style={{ width: 20 }} />
        </View>

        <Card style={styles.confirmCard}>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>Você envia</Text>
            <Text style={[styles.confirmValue, { color: Accent.destructive }]}>
              {formatUSDC(parsedAmount)} USDC
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>Taxa</Text>
            <Text style={styles.confirmValue}>
              {parseFloat(quote.feeAmount ?? '0').toFixed(2)} BRL
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>Você recebe (BRL)</Text>
            <Text style={[styles.confirmValue, { color: Accent.success }]}>
              R$ {formatBRL(destAmount)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>Taxa de câmbio</Text>
            <Text style={styles.confirmValue}>
              1 USDC = R$ {parseFloat(quote.exchangeRate).toFixed(4)}
            </Text>
          </View>
        </Card>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <IconSymbol name="arrow.right" size={14} color={Accent.primary} />
            <Text style={styles.infoText}>
              O USDC será queimado na rede Stellar e o BRL enviado para sua{' '}
              <Text style={styles.infoHighlight}>chave PIX cadastrada</Text>
            </Text>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol name="arrow.right" size={14} color={Accent.primary} />
            <Text style={styles.infoText}>
              A cotação expira em{' '}
              <Text style={styles.infoHighlight}>2 minutos</Text>
            </Text>
          </View>
          {IS_MOCK && (
            <View style={styles.infoRow}>
              <IconSymbol name="exclamationmark" size={14} color={Accent.accent} />
              <Text style={[styles.infoText, { color: Accent.accent }]}>
                Modo mock — nenhuma transação real será executada
              </Text>
            </View>
          )}
        </Card>

        {error ? <Text style={styles.errorInline}>{error}</Text> : null}

        <View style={styles.confirmActions}>
          <Button
            label="Sacar agora"
            rightIcon={<IconSymbol name="arrow.up" size={16} color="#fff" />}
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleWithdraw}
          />
          <Button
            label="Voltar"
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => setStep('amount')}
          />
        </View>
      </ScreenContainer>
    );
  }

  // ── Amount input ──────────────────────────────────────────────────────────
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <IconSymbol name="xmark" size={20} color={Colors.mutedForeground} />
        </Pressable>
        <Text style={styles.title}>Sacar</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>VALOR EM USDC</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={Colors.mutedForeground}
            returnKeyType="done"
          />
          <Text style={styles.assetTag}>USDC</Text>
        </View>
        <Text style={styles.minHint}>Mínimo: 1 USDC</Text>
      </View>

      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <IconSymbol name="arrow.right" size={14} color={Accent.primary} />
          <Text style={styles.infoText}>
            Você converte USDC em{' '}
            <Text style={styles.infoHighlight}>BRL via PIX</Text>
          </Text>
        </View>
        <View style={styles.infoRow}>
          <IconSymbol name="arrow.right" size={14} color={Accent.primary} />
          <Text style={styles.infoText}>
            Taxa de câmbio obtida em tempo real,{' '}
            <Text style={styles.infoHighlight}>cotação de 2 minutos</Text>
          </Text>
        </View>
        {IS_MOCK && (
          <View style={styles.infoRow}>
            <IconSymbol name="exclamationmark" size={14} color={Accent.accent} />
            <Text style={[styles.infoText, { color: Accent.accent }]}>
              Modo mock ativo — nenhuma transação real será enviada
            </Text>
          </View>
        )}
      </Card>

      <Button
        label={loadingQuote ? 'Obtendo cotação…' : 'Cotar agora'}
        rightIcon={
          loadingQuote
            ? <ActivityIndicator size="small" color="#fff" />
            : <IconSymbol name="arrow.right" size={16} color="#fff" />
        }
        variant="primary"
        size="lg"
        fullWidth
        onPress={handleGetQuote}
        disabled={!canGetQuote || loadingQuote}
        style={{ marginTop: Spacing[6] }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing[6],
    marginBottom: Spacing[6],
  },
  title: {
    fontSize: FontSize.subheading,
    fontFamily: Font.extraBold,
    color: Colors.foreground,
  },

  // Amount step
  amountCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: Spacing[6],
    marginBottom: Spacing[4],
    gap: Spacing[2],
  },
  amountLabel: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    letterSpacing: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[3],
  },
  amountInput: {
    flex: 1,
    fontSize: FontSize.displaySm,
    fontFamily: Font.black,
    color: Colors.foreground,
    minWidth: 60,
  },
  assetTag: {
    fontSize: FontSize.subheading,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
  },
  minHint: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  infoCard: {
    gap: Spacing[3],
    marginBottom: Spacing[4],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[2],
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
  infoHighlight: {
    fontFamily: Font.bold,
    color: Colors.foreground,
  },

  // Confirm step
  confirmCard: {
    gap: Spacing[3],
    marginBottom: Spacing[4],
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing[3],
  },
  confirmLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  confirmValue: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Colors.foreground,
    flexShrink: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  errorInline: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Accent.destructive,
    textAlign: 'center',
    marginBottom: Spacing[3],
  },
  confirmActions: {
    gap: Spacing[3],
    marginTop: Spacing[2],
  },

  // Signing step
  signingBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing[4],
    paddingHorizontal: Spacing[6],
  },
  signingLabel: {
    fontSize: FontSize.body,
    fontFamily: Font.semiBold,
    color: Colors.foreground,
    textAlign: 'center',
  },
  signingHint: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },

  // Success step
  heroBlock: {
    alignItems: 'center',
    gap: Spacing[3],
    paddingVertical: Spacing[6],
  },
  successIcon: { marginBottom: Spacing[2] },
  heroTitle: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
    color: Colors.foreground,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing[2],
  },
  heroHighlight: {
    fontFamily: Font.bold,
    color: Accent.success,
  },
  pixCard: {
    gap: Spacing[3],
    marginBottom: Spacing[4],
    borderColor: Accent.success,
    borderWidth: 1,
  },
  pixHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  pixTitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Accent.success,
    letterSpacing: 0.5,
  },
  pixAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pixAmountLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  pixAmount: {
    fontSize: FontSize.subheading,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  pixKeyBlock: { gap: Spacing[2] },
  pixKeyLabel: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  pixKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  pixKey: {
    flex: 1,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: 8,
  },
  copyBtnDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.20)',
  },
  copyLabel: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Accent.success,
  },
  copyLabelDone: {
    color: Accent.success,
  },
  mockBadge: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Accent.accent,
    letterSpacing: 1,
  },
  successActions: {
    gap: Spacing[3],
    marginTop: Spacing[2],
  },
});
