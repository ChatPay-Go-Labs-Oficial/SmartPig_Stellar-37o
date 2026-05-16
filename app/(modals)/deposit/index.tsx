import { ScreenContainer } from '@/components/layout';
import { Button, Card } from '@/components/ui';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Accent, Colors, Font, FontSize, Radius, Spacing } from '@/constants/theme';
import { EtherfuseApi } from '@/lib/api/etherfuse.api';
import { TrustlineService } from '@/lib/services/trustline.service';
import { signTransaction, hasActiveSession } from '@/lib/wallet-kit';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useWalletStore } from '@/lib/stores/wallet.store';
import { useUIStore } from '@/lib/stores/ui.store';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const DEPOSIT_SOURCE_ASSET = 'BRL';

// Etherfuse requires the full Stellar asset identifier (code:issuer).
const _isTestnet = (process.env.EXPO_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? '').includes('Test');
const _isMock = process.env.EXPO_PUBLIC_MOCK_ETHERFUSE === 'true';
const DEPOSIT_TARGET_ASSET = _isTestnet
  ? 'USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
  : 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

export default function DepositAmountScreen() {
  const addToast = useUIStore((s) => s.addToast);
  const userId = useAuthStore((s) => s.userId);
  const walletAddress = useWalletStore((s) => s.walletAddress);

  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('');

  const { data: bankAccounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['etherfuse-bank-accounts'],
    queryFn: () => EtherfuseApi.listBankAccounts(),
    enabled: !!userId,
  });

  const compliantAccount = bankAccounts?.find((a) => a.isCompliant) ?? null;
  const parsedAmount = parseFloat(amount.replace(',', '.'));
  const canQuote = !isNaN(parsedAmount) && parsedAmount >= 1 && !!compliantAccount && !!walletAddress;

  async function ensureTrustline(): Promise<boolean> {
    if (_isMock) return true;
    if (!walletAddress) return true;
    try {
      const has = await TrustlineService.hasTrustline(walletAddress);
      if (has) return true;

      // On testnet, if the account doesn't exist yet, activate it via Friendbot automatically.
      // On mainnet the user must fund the account themselves.
      const exists = await TrustlineService.accountExists(walletAddress);
      if (!exists) {
        if (!_isTestnet) {
          addToast(
            'Sua conta Stellar não está ativada. Envie XLM para o endereço da sua carteira para ativá-la.',
            'error',
          );
          return false;
        }
        setLoadingLabel('Ativando conta no testnet…');
        await TrustlineService.fundWithFriendbot(walletAddress);
        setLoadingLabel('Conta ativada! Configurando trustline…');
      }

      if (!hasActiveSession()) {
        addToast('Conecte sua carteira para continuar', 'error');
        return false;
      }
      setLoadingLabel('Aprovando trustline USDC na carteira…');
      const xdr = await TrustlineService.buildTrustlineXdr(walletAddress);
      const signedXdr = await signTransaction(xdr);
      setLoadingLabel('Enviando trustline para a rede…');
      await TrustlineService.submitTrustline(signedXdr);
      return true;
    } catch (e: any) {
      // Horizon op_already_exists means trustline is already set up — proceed normally.
      const rc = e?.horizonResultCodes ?? e?.response?.data?.extras?.result_codes;
      const opCode = rc?.operations?.[0] ?? '';
      if (opCode === 'op_already_exists') return true;

      const errMsg: string = (e?.message ?? '').toLowerCase();
      if (errMsg.includes('cancel') || errMsg.includes('reject') || errMsg.includes('declined')) {
        addToast('Aprovação cancelada. Abra o Lobstr e aprove a trustline para continuar.', 'info');
      } else if (errMsg.includes('horizon rejeitou')) {
        addToast(e.message, 'error');
      } else {
        const detail =
          e?.response?.data?.message ??
          e?.response?.data?.detail ??
          e?.response?.status ??
          e?.message ??
          'erro desconhecido';
        console.error('[Trustline] Unexpected error:', e);
        addToast(`Trustline falhou: ${detail}`, 'error');
      }
      return false;
    }
  }

  async function handleGetQuote() {
    if (!canQuote || !userId || !walletAddress) return;
    setLoading(true);
    setLoadingLabel('Verificando trustline USDC…');
    try {
      const trustlineOk = await ensureTrustline();
      if (!trustlineOk) return;
      setLoadingLabel('Obtendo cotação…');
      const quote = await EtherfuseApi.getQuote({
        userId,
        direction: 'onramp',
        sourceAsset: DEPOSIT_SOURCE_ASSET,
        targetAsset: DEPOSIT_TARGET_ASSET,
        sourceAmount: parsedAmount.toFixed(2),
        walletAddress,
      });
      router.push({
        pathname: '/(modals)/deposit/quote',
        params: {
          quoteId: quote.quoteId,
          sourceAmount: quote.sourceAmount,
          destinationAmount: quote.destinationAmountAfterFee ?? quote.destinationAmount,
          exchangeRate: quote.exchangeRate,
          expiresAt: quote.expiresAt,
          bankAccountId: compliantAccount!.id,
          walletAddress,
          sourceAsset: DEPOSIT_SOURCE_ASSET,
          targetAsset: DEPOSIT_TARGET_ASSET,
        },
      } as any);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Erro ao obter cotação';
      addToast(typeof msg === 'string' ? msg : 'Erro ao obter cotação', 'error');
    } finally {
      setLoading(false);
      setLoadingLabel('');
    }
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <IconSymbol name="xmark" size={20} color={Colors.mutedForeground} />
        </Pressable>
        <Text style={styles.title}>Depositar</Text>
        <View style={{ width: 20 }} />
      </View>

      {/* Amount card */}
      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>VALOR EM BRL</Text>
        <View style={styles.inputRow}>
          <Text style={styles.currencySymbol}>R$</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0,00"
            placeholderTextColor={Colors.mutedForeground}
            returnKeyType="done"
          />
        </View>
        <Text style={styles.minHint}>Mínimo: R$ 1,00</Text>
      </View>

      {/* Info card */}
      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <IconSymbol name="arrow.right" size={14} color={Accent.primary} />
          <Text style={styles.infoText}>
            Você receberá{' '}
            <Text style={styles.infoHighlight}>USDC</Text>
            {' '}diretamente na sua carteira Stellar
          </Text>
        </View>
        <View style={styles.infoRow}>
          <IconSymbol name="arrow.right" size={14} color={Accent.primary} />
          <Text style={styles.infoText}>
            A cotação é válida por{' '}
            <Text style={styles.infoHighlight}>2 minutos</Text>
          </Text>
        </View>
        {accountsLoading && (
          <View style={styles.infoRow}>
            <ActivityIndicator size="small" color={Accent.primary} />
            <Text style={styles.infoText}>Verificando conta bancária…</Text>
          </View>
        )}
        {!accountsLoading && !compliantAccount && (
          <View style={styles.infoRow}>
            <IconSymbol name="exclamationmark" size={14} color={Accent.destructive} />
            <Text style={[styles.infoText, { color: Accent.destructive }]}>
              Nenhuma conta bancária aprovada. Conclua o onboarding primeiro.
            </Text>
          </View>
        )}
      </Card>

      {/* Loading status */}
      {loading && loadingLabel ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={Accent.primary} />
          <Text style={styles.loadingText}>{loadingLabel}</Text>
        </View>
      ) : null}

      <Button
        label="Cotar agora"
        rightIcon={
          loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <IconSymbol name="arrow.right" size={16} color="#fff" />
        }
        variant="primary"
        size="lg"
        fullWidth
        onPress={handleGetQuote}
        disabled={!canQuote || loading}
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
  amountCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing[6],
    marginBottom: Spacing[4],
    gap: Spacing[2],
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    letterSpacing: 1,
    alignSelf: 'flex-start',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[3],
  },
  currencySymbol: {
    fontSize: FontSize.heading,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
  },
  amountInput: {
    fontSize: FontSize.displaySm,
    fontFamily: Font.black,
    color: Colors.foreground,
    minWidth: 100,
    textAlign: 'left',
  },
  minHint: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    alignSelf: 'flex-start',
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

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  loadingText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
});
