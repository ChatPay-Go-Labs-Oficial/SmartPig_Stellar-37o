import { ScreenContainer } from '@/components/layout';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Accent, Colors, Font, FontSize, Radius, Spacing } from '@/constants/theme';
import { EtherfuseApi } from '@/lib/api/etherfuse.api';
import { TrustlineService } from '@/lib/services/trustline.service';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useWalletStore } from '@/lib/stores/wallet.store';
import { getActiveSessions, hasActiveSession } from '@/lib/wallet-kit';
import axios from 'axios';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const isTestnet = (process.env.EXPO_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? '').includes('Test');
const HORIZON_URL = isTestnet
  ? 'https://horizon-testnet.stellar.org'
  : 'https://horizon.stellar.org';
const DEPOSIT_TARGET_ASSET = isTestnet
  ? 'USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
  : 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

type Status = 'pending' | 'running' | 'ok' | 'warn' | 'error' | 'skip';

interface Check {
  id: string;
  label: string;
  status: Status;
  detail?: string;
}

const STATUS_ICON: Record<Status, string> = {
  pending: '○',
  running: '…',
  ok: '✓',
  warn: '⚠',
  error: '✗',
  skip: '—',
};

const STATUS_COLOR: Record<Status, string> = {
  pending: Colors.mutedForeground,
  running: Accent.primary,
  ok: Accent.success,
  warn: '#f59e0b',
  error: Accent.destructive,
  skip: Colors.mutedForeground,
};

function CheckRow({ check }: { check: Check }) {
  const color = STATUS_COLOR[check.status];
  return (
    <View style={styles.checkRow}>
      <View style={styles.checkLeft}>
        {check.status === 'running' ? (
          <ActivityIndicator size="small" color={Accent.primary} style={styles.spinner} />
        ) : (
          <Text style={[styles.checkIcon, { color }]}>{STATUS_ICON[check.status]}</Text>
        )}
        <View style={styles.checkText}>
          <Text style={styles.checkLabel}>{check.label}</Text>
          {check.detail ? (
            <Text style={[styles.checkDetail, check.status === 'error' && { color: Accent.destructive }]}>
              {check.detail}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function Section({ title, checks }: { title: string; checks: Check[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>
        {checks.map((c, i) => (
          <View key={c.id}>
            <CheckRow check={c} />
            {i < checks.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function DepositDebugScreen() {
  const userId = useAuthStore((s) => s.userId);
  const contractId = useAuthStore((s) => s.contractId);
  const walletAddress = useWalletStore((s) => s.walletAddress);

  const addr = walletAddress ?? contractId ?? null;
  const shortAddr = addr
    ? `${addr.slice(0, 6)}…${addr.slice(-6)}`
    : '(nenhum)';

  const [envChecks, setEnvChecks] = useState<Check[]>([
    { id: 'network', label: 'Rede', status: 'pending' },
    { id: 'horizon', label: 'Horizon URL', status: 'pending' },
    { id: 'api', label: 'API Backend', status: 'pending' },
  ]);

  const [authChecks, setAuthChecks] = useState<Check[]>([
    { id: 'userId', label: 'User ID', status: 'pending' },
    { id: 'wallet', label: 'Endereço da carteira', status: 'pending' },
    { id: 'wc', label: 'Sessão WalletConnect', status: 'pending' },
  ]);

  const [stellarChecks, setStellarChecks] = useState<Check[]>([
    { id: 'account', label: 'Conta Stellar existe', status: 'pending' },
    { id: 'xlm', label: 'Saldo XLM', status: 'pending' },
    { id: 'trustline', label: 'Trustline USDC', status: 'pending' },
  ]);

  const [etherfuseChecks, setEtherfuseChecks] = useState<Check[]>([
    { id: 'bankAccounts', label: 'Contas bancárias Etherfuse', status: 'pending' },
    { id: 'quote', label: 'Cotação R$ 10 → USDC', status: 'pending' },
  ]);

  function updateCheck<T extends Check>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    id: string,
    patch: Partial<T>,
  ) {
    setter((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)) as T[]);
  }

  useEffect(() => {
    run();
  }, []);

  async function run() {
    console.log('\n════════════════════════════════════════');
    console.log('🔍 [DEBUG] DIAGNÓSTICO DO ON-RAMP');
    console.log('════════════════════════════════════════');

    // ── Ambiente ─────────────────────────────────────────────────────────
    const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '(não definido)';
    console.log('[DEBUG] AMBIENTE:');
    console.log('  • Rede:', isTestnet ? 'TESTNET' : 'MAINNET');
    console.log('  • Horizon URL:', HORIZON_URL);
    console.log('  • API Backend:', apiUrl);
    console.log('  • STELLAR_NETWORK_PASSPHRASE:', process.env.EXPO_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? '(não definido)');
    console.log('  • Target asset:', DEPOSIT_TARGET_ASSET);

    updateCheck(setEnvChecks, 'network', {
      status: 'ok',
      detail: isTestnet ? 'Testnet ✓' : 'Mainnet ✓',
    });
    updateCheck(setEnvChecks, 'horizon', { status: 'ok', detail: HORIZON_URL });
    updateCheck(setEnvChecks, 'api', { status: 'ok', detail: apiUrl });

    // ── Auth ──────────────────────────────────────────────────────────────
    console.log('\n[DEBUG] AUTENTICAÇÃO:');
    console.log('  • userId:', userId ?? 'NULL');
    console.log('  • walletAddress (walletStore):', walletAddress ?? 'NULL');
    console.log('  • contractId (authStore):', contractId ?? 'NULL');
    console.log('  • addr resolvido:', addr ?? 'NULL');

    if (userId) {
      updateCheck(setAuthChecks, 'userId', { status: 'ok', detail: userId });
    } else {
      updateCheck(setAuthChecks, 'userId', { status: 'error', detail: 'Não autenticado — faça login' });
    }

    if (addr) {
      updateCheck(setAuthChecks, 'wallet', { status: 'ok', detail: shortAddr });
    } else {
      updateCheck(setAuthChecks, 'wallet', {
        status: 'error',
        detail: 'Nenhuma carteira conectada. walletStore e contractId são null.',
      });
    }

    const sessions = getActiveSessions();
    console.log('  • WC sessions count:', sessions.length);
    sessions.forEach((s, i) =>
      console.log(`    - session[${i}] topic: ${s.topic} | expiry: ${new Date(s.expiry * 1000).toISOString()}`),
    );

    if (sessions.length > 0) {
      updateCheck(setAuthChecks, 'wc', {
        status: 'ok',
        detail: `${sessions.length} sessão(ões) ativa(s). Topic: ${sessions[0].topic.slice(0, 12)}…`,
      });
    } else {
      updateCheck(setAuthChecks, 'wc', {
        status: 'warn',
        detail: 'Sem sessão WalletConnect ativa. Assinar transações vai falhar.',
      });
    }

    // ── Stellar ───────────────────────────────────────────────────────────
    console.log('\n[DEBUG] STELLAR:');
    if (!addr) {
      console.log('  ✗ Endereço de carteira ausente — pulando verificações Stellar');
      setStellarChecks((prev) =>
        prev.map((c) => ({ ...c, status: 'skip', detail: 'Endereço de carteira ausente' })),
      );
    } else {
      console.log('  • Consultando Horizon:', `${HORIZON_URL}/accounts/${addr}`);
      updateCheck(setStellarChecks, 'account', { status: 'running' });
      try {
        const { data } = await axios.get<{ balances: any[]; sequence: string }>(
          `${HORIZON_URL}/accounts/${addr}`,
        );
        console.log('  ✓ Conta encontrada. Sequence:', data.sequence);
        console.log('  • Balances:', JSON.stringify(data.balances, null, 2));

        const xlmBal = data.balances.find((b: any) => b.asset_type === 'native');
        const xlm = xlmBal ? parseFloat(xlmBal.balance).toFixed(2) : '0';
        console.log('  • XLM balance:', xlm);

        updateCheck(setStellarChecks, 'account', {
          status: 'ok',
          detail: `Conta existe. Seq: ${data.sequence}`,
        });
        updateCheck(setStellarChecks, 'xlm', {
          status: parseFloat(xlm) < 1 ? 'warn' : 'ok',
          detail:
            parseFloat(xlm) < 1
              ? `${xlm} XLM — saldo baixo! Pode não cobrir taxa + reserva`
              : `${xlm} XLM`,
        });

        const usdcIssuer = DEPOSIT_TARGET_ASSET.split(':')[1];
        const hasTrustline = data.balances.some(
          (b: any) => b.asset_code === 'USDC' && b.asset_issuer === usdcIssuer,
        );
        console.log('  • USDC issuer esperado:', usdcIssuer);
        console.log('  • Trustline USDC existe:', hasTrustline);

        updateCheck(setStellarChecks, 'trustline', {
          status: hasTrustline ? 'ok' : 'warn',
          detail: hasTrustline
            ? `Trustline USDC existe (issuer: ${usdcIssuer.slice(0, 8)}…)`
            : `Trustline USDC NÃO configurada. O app tentará criar via Lobstr.`,
        });
      } catch (e: any) {
        const status = e?.response?.status;
        const responseBody = e?.response?.data;
        console.log('  ✗ Erro ao consultar conta Stellar');
        console.log('    HTTP status:', status ?? 'sem resposta');
        console.log('    Mensagem:', e?.message);
        console.log('    Response body:', JSON.stringify(responseBody, null, 2));

        if (status === 404) {
          updateCheck(setStellarChecks, 'account', {
            status: 'error',
            detail: `Conta NÃO encontrada no ${isTestnet ? 'testnet' : 'mainnet'}. ${
              isTestnet ? 'Use Friendbot para ativar: https://friendbot.stellar.org/?addr=' + addr : 'A conta precisa ter XLM.'
            }`,
          });
        } else {
          updateCheck(setStellarChecks, 'account', {
            status: 'error',
            detail: `Horizon erro ${status ?? 'sem resposta'}: ${e?.message}`,
          });
        }
        setStellarChecks((prev) =>
          prev.map((c) =>
            c.id !== 'account' ? { ...c, status: 'skip', detail: 'Conta não encontrada' } : c,
          ),
        );
      }
    }

    // ── Etherfuse ─────────────────────────────────────────────────────────
    console.log('\n[DEBUG] ETHERFUSE API:');
    if (!userId) {
      console.log('  ✗ userId ausente — pulando verificações Etherfuse');
      setEtherfuseChecks((prev) =>
        prev.map((c) => ({ ...c, status: 'skip', detail: 'Usuário não autenticado' })),
      );
      return;
    }

    updateCheck(setEtherfuseChecks, 'bankAccounts', { status: 'running' });
    let compliantAccount: any = null;
    try {
      console.log('  • Buscando contas bancárias Etherfuse...');
      const accounts = await EtherfuseApi.listBankAccounts();
      console.log('  • Total de contas:', accounts.length);
      console.log('  • Contas:', JSON.stringify(accounts, null, 2));

      const compliant = accounts.filter((a) => a.isCompliant);
      compliantAccount = compliant[0] ?? null;
      console.log('  • Contas aprovadas (isCompliant):', compliant.length);

      if (compliant.length > 0) {
        updateCheck(setEtherfuseChecks, 'bankAccounts', {
          status: 'ok',
          detail: `${compliant.length} conta(s) aprovada(s) de ${accounts.length} total. ID: ${compliant[0].id.slice(0, 8)}…`,
        });
      } else {
        updateCheck(setEtherfuseChecks, 'bankAccounts', {
          status: 'error',
          detail:
            accounts.length > 0
              ? `${accounts.length} conta(s) encontrada(s) mas nenhuma aprovada (isCompliant=false). Conclua o onboarding.`
              : 'Nenhuma conta bancária cadastrada. Conclua o onboarding.',
        });
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ?? e?.response?.data?.error ?? e?.message ?? 'Erro desconhecido';
      console.log('  ✗ Erro ao listar contas bancárias');
      console.log('    HTTP status:', e?.response?.status ?? 'sem resposta');
      console.log('    Response body:', JSON.stringify(e?.response?.data, null, 2));
      console.log('    Mensagem:', e?.message);
      updateCheck(setEtherfuseChecks, 'bankAccounts', {
        status: 'error',
        detail: `Erro ${e?.response?.status ?? ''}: ${msg}`,
      });
    }

    updateCheck(setEtherfuseChecks, 'quote', { status: 'running' });
    if (!addr || !compliantAccount) {
      console.log('  ✗ Pulando cotação:', !addr ? 'sem carteira' : 'sem conta bancária aprovada');
      updateCheck(setEtherfuseChecks, 'quote', {
        status: 'skip',
        detail: !addr
          ? 'Carteira ausente'
          : 'Sem conta bancária aprovada — impossível cotar',
      });
      console.log('\n════════════════════════════════════════\n');
      return;
    }

    try {
      console.log('  • Solicitando cotação R$ 10...');
      console.log('    userId:', userId);
      console.log('    walletAddress:', addr);
      console.log('    targetAsset:', DEPOSIT_TARGET_ASSET);
      const quote = await EtherfuseApi.getQuote({
        userId,
        direction: 'onramp',
        sourceAsset: 'BRL',
        targetAsset: DEPOSIT_TARGET_ASSET,
        sourceAmount: '10.00',
        walletAddress: addr,
      });
      console.log('  ✓ Cotação obtida:', JSON.stringify(quote, null, 2));
      updateCheck(setEtherfuseChecks, 'quote', {
        status: 'ok',
        detail: `R$ 10 → ${parseFloat(quote.destinationAmount).toFixed(4)} USDC | rate: ${quote.exchangeRate} | expira: ${new Date(quote.expiresAt).toLocaleTimeString()}`,
      });
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ?? e?.response?.data?.error ?? e?.message ?? 'Erro desconhecido';
      console.log('  ✗ Erro na cotação');
      console.log('    HTTP status:', e?.response?.status ?? 'sem resposta');
      console.log('    Response body:', JSON.stringify(e?.response?.data, null, 2));
      console.log('    Mensagem:', e?.message);
      updateCheck(setEtherfuseChecks, 'quote', {
        status: 'error',
        detail: `Erro ${e?.response?.status ?? ''}: ${msg}`,
      });
    }

    console.log('\n════════════════════════════════════════\n');
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <IconSymbol name="chevron.left" size={20} color={Colors.mutedForeground} />
        </Pressable>
        <Text style={styles.title}>Diagnóstico On-Ramp</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Section title="AMBIENTE" checks={envChecks} />
        <Section title="AUTENTICAÇÃO" checks={authChecks} />
        <Section title="STELLAR" checks={stellarChecks} />
        <Section title="ETHERFUSE API" checks={etherfuseChecks} />

        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Os itens em vermelho indicam o que precisa ser corrigido.
            Itens em amarelo são avisos que podem causar falhas.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing[6],
    marginBottom: Spacing[4],
  },
  title: {
    fontSize: FontSize.subheading,
    fontFamily: Font.extraBold,
    color: Colors.foreground,
  },
  scroll: {
    paddingBottom: Spacing[10],
    gap: Spacing[4],
  },
  section: {
    gap: Spacing[2],
  },
  sectionTitle: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    letterSpacing: 1,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[4],
  },
  checkRow: {
    paddingVertical: Spacing[3],
  },
  checkLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  checkIcon: {
    fontSize: 16,
    fontFamily: Font.bold,
    width: 18,
    textAlign: 'center',
    marginTop: 1,
  },
  spinner: {
    width: 18,
  },
  checkText: {
    flex: 1,
    gap: 2,
  },
  checkLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  checkDetail: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  notice: {
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noticeText: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
});
