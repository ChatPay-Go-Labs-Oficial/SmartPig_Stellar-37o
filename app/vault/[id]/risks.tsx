import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Application from 'expo-application';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { V2Colors, V2Font, V2Layout, V2PiggyTint, V2Radius, withAlpha } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { useAuthStore } from '@/lib/stores/auth.store';
import { riskAckKey, useRiskAcksStore } from '@/lib/stores/risk-acks.store';
import {
  markDisclosureAcknowledged,
  useAcknowledgeDisclosure,
  useVault,
  useVaultDisclosure,
  useVaults,
  vaultKeys,
} from '@/lib/queries/vaults.queries';
import type { PortfolioSummary } from '@/lib/api/portfolio';
import type { TermKey } from '@/lib/copy/terms';
import {
  DISCLOSURE_ACCEPT,
  DISCLOSURE_READ_TO_END,
  DISCLOSURE_STALE,
  DISCLOSURE_UNREADABLE,
  buildRiskCards,
  changedLine,
  disclosureCaption,
  disclosureScreenCopy,
  updatedCardKeys,
} from '@/lib/copy/disclosures';
import { classifyOperationError } from '@/lib/guardar/operation-errors';
import { formatPositiveApy, formatVaultNameForMode } from '@/lib/utils/format';
import { buildPiggies } from '@/lib/utils/piggy';
import { Button3D, ScreenGlow, V2Checkbox, V2Icon, V2Spinner } from '@/components/v2';
import { RiskCardView, RisksBanner, RisksIdentity } from '@/components/guardar/RiskParts';
import { SheetError } from '@/components/guardar/sheet/SheetParts';

// Sem portfólio a tela não precisa de saldo: só nome, moeda e taxa.
const NO_SUMMARY: PortfolioSummary = {
  totalUsd: null,
  asOf: '',
  priceSource: null,
  stale: true,
  positions: [],
};

/** Folga para considerar a lista lida até o fim. */
const END_SLACK = 24;

/** Rodapé do Figma: 34 embaixo, ou a área segura quando ela é maior. */
const FOOTER_BOTTOM = 34;

/**
 * Aceite de riscos do porquinho (Figma "Guardar · Aceite de riscos", 13a–13h).
 *
 * O texto vem do backend em códigos (versão publicada do vault); os cartões
 * são escritos aqui, no modo da pessoa. O aceite exige a caixa marcada e a
 * lista lida até o fim (anotação do 13a), vale só para guardar e é registrado
 * com a versão lida: se outra sair no meio da leitura, o backend recusa e a
 * tela mostra o texto novo.
 */
export default function PiggyRisksScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vaultId = id ?? '';
  const screenInsets = useScreenInsets();
  const insets = useSafeAreaInsets();
  const accent = useAccent();
  const { t, mode, isPro } = useTerms();
  const queryClient = useQueryClient();
  const contractId = useAuthStore((s) => s.contractId);

  const vaultsQuery = useVaults();
  const listed = vaultsQuery.data?.find((v) => v.id === vaultId);
  // O detalhe só quando a lista não tem o vault (ele faz uma leitura ao vivo).
  const detailQuery = useVault(listed ? '' : vaultId);
  const vault = listed ?? detailQuery.data;
  const piggy = vault ? buildPiggies([vault], NO_SUMMARY, () => true)[0] : null;

  const disclosureQuery = useVaultDisclosure(vaultId);
  // Só a leitura feita nesta abertura vale: um texto em cache pode ser de
  // uma versão anterior, e aceitar texto velho é o que o aceite evita.
  const fresh = disclosureQuery.isFetchedAfterMount;
  const response = fresh ? disclosureQuery.data : undefined;
  const disclosure = response?.disclosure ?? null;
  const required = response?.acknowledgmentRequired ?? true;
  const acknowledge = useAcknowledgeDisclosure();

  const lastAck = useRiskAcksStore((s) => (contractId ? s.acks[riskAckKey(contractId, vaultId)] : undefined));
  const remember = useRiskAcksStore((s) => s.remember);

  const asset = piggy?.asset ?? null;
  const symbol = vault?.assetSymbol ?? '';
  const apyNumber = vault?.apy != null ? parseFloat(vault.apy) : null;
  const built = useMemo(() => {
    if (!disclosure) return null;
    return buildRiskCards(disclosure, {
      asset,
      symbol,
      isPro,
      // Taxa negativa não aparece como número: cai no texto geral do APY.
      apy: formatPositiveApy(vault?.apy),
      lowRate: asset === 'XLM' && (apyNumber == null || Number.isNaN(apyNumber) || apyNumber < 1),
    });
  }, [disclosure, asset, symbol, isPro, vault?.apy, apyNumber]);

  // Texto novo depois de um aceite anterior neste aparelho (Figma 13e): os
  // cartões novos ou alterados desde aquele aceite ganham o selo "Atualizado".
  const previous = required && lastAck && disclosure && lastAck.version < disclosure.version ? lastAck : null;
  const updatedKeys = useMemo(
    () => (previous && built ? updatedCardKeys(built.cards, previous) : new Set<string>()),
    [previous, built],
  );

  // A tela (corpo e rodapé) só fica pronta com o texto desta abertura e o
  // vault carregados: sem o vault, os cartões sairiam sem a moeda certa.
  const ready = !!built && !!disclosure && !!vault;

  const name = asset ? t(`guardar.piggy.${asset}.name` as TermKey) : vault ? formatVaultNameForMode(vault.name, mode) : '';
  const coin = asset ? t(`carteira.asset.${asset}.name` as TermKey) : symbol;
  const tint = asset === 'EURC' || asset === 'XLM' ? V2PiggyTint[asset] : accent.base;
  const copy = disclosureScreenCopy(isPro, name, symbol);

  const [checked, setChecked] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [footerHeight, setFooterHeight] = useState(0);
  const running = useRef(false);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );
  const scrollRef = useRef<ScrollView>(null);
  // endY: onde termina o último cartão (marcador depois da lista), na mesma
  // coordenada da rolagem. Não depende do espaço reservado ao rodapé.
  const metrics = useRef<{ layout: number; offset: number; endY: number | null }>({
    layout: 0,
    offset: 0,
    endY: null,
  });

  // Com leitor de tela, a leitura é item a item e não rola como o dedo: a
  // exigência de rolar até o fim não vale (a caixa continua obrigatória).
  const [screenReader, setScreenReader] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => sub.remove();
  }, []);

  // Uma versão nova (texto trocado no meio da leitura) começa a leitura de
  // novo; o marcador do fim é remontado com ela e mede de novo.
  const version = disclosure?.version;
  useEffect(() => {
    setChecked(false);
    setReachedEnd(false);
    metrics.current.endY = null;
  }, [version]);

  // Lista desatualizada: o backend diz que o aceite desta mesma versão já
  // existe. O selo e o aviso somem na Guardar, sem nova leitura (se a lista e
  // o texto discordarem, uma não desfaz a outra em ciclo).
  const listPending = vault?.disclosure?.acknowledgmentRequired === true;
  const sameVersion = !!disclosure && disclosure.version === vault?.disclosure?.version;
  useEffect(() => {
    if (response && !response.acknowledgmentRequired && listPending && sameVersion) {
      markDisclosureAcknowledged(queryClient, vaultId, { refetch: false });
    }
  }, [response, listPending, sameVersion, queryClient, vaultId]);

  function checkEnd() {
    const { layout, offset, endY } = metrics.current;
    // Só com a lista e o rodapé medidos: antes disso tudo "cabe" na tela.
    if (!ready || footerHeight === 0 || layout === 0 || endY == null) return;
    // O que se vê acima do rodapé chega ao fim do último cartão.
    if (offset + layout - footerHeight >= endY - END_SLACK) setReachedEnd(true);
  }

  // Além do onScroll (limitado a um evento a cada 16 ms), o fim do arrasto e
  // o fim da inércia: num arremesso que bate no fim da lista, a última posição
  // pode não chegar pelo onScroll, e a lista lida pareceria incompleta.
  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    metrics.current.offset = event.nativeEvent.contentOffset.y;
    if (!reachedEnd) checkEnd();
  }

  function onLayout(event: LayoutChangeEvent) {
    metrics.current.layout = event.nativeEvent.layout.height;
    if (!reachedEnd) checkEnd();
  }

  function onEndLayout(event: LayoutChangeEvent) {
    metrics.current.endY = event.nativeEvent.layout.y;
    if (!reachedEnd) checkEnd();
  }

  useEffect(() => {
    if (!reachedEnd) checkEnd();
    // checkEnd lê refs; roda quando a tela ou o rodapé ficam prontos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, footerHeight]);

  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/(tabs)/vaults', params: { vault: vaultId } });
  }

  const unreadable = (built?.unreadable.length ?? 0) > 0;
  const read = reachedEnd || screenReader;
  const canAccept = ready && required && checked && read && !unreadable && !acknowledge.isPending;

  async function accept() {
    if (!disclosure || !built || !canAccept || running.current) return;
    running.current = true;
    setError(null);
    try {
      await acknowledge.mutateAsync({
        vaultId,
        body: {
          version: disclosure.version,
          appVersion: Application.nativeApplicationVersion ?? undefined,
          mode,
          shownCodes: built.shownCodes,
        },
      });
      if (contractId) {
        remember(contractId, vaultId, {
          version: disclosure.version,
          codes: built.shownCodes,
          fingerprints: Object.fromEntries(built.cards.map((card) => [card.key, card.fingerprint])),
        });
      }
      // Aceito, a trava fica: o botão não dispara de novo enquanto a tela sai.
      // Se a pessoa já voltou durante o envio, a navegação é dela.
      if (!mounted.current) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      leave();
    } catch (e) {
      running.current = false;
      if (!mounted.current) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      const code = (e as { response?: { data?: { code?: string } } })?.response?.data?.code;
      if (code === 'DISCLOSURE_VERSION_STALE') {
        // Outra versão saiu durante a leitura: ela entra e a leitura recomeça.
        setStale(true);
        setChecked(false);
        setReachedEnd(false);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        AccessibilityInfo.announceForAccessibility(DISCLOSURE_STALE);
        queryClient.invalidateQueries({ queryKey: vaultKeys.disclosure(vaultId), exact: true });
      } else {
        setError(acknowledgeErrorMessage(e, code, isPro));
      }
    }
  }

  const changed = previous
    ? changedLine(built?.cards.filter((card) => updatedKeys.has(card.key)).map((card) => card.title) ?? [])
    : null;
  const vaultLoading = !vault && (vaultsQuery.isPending || detailQuery.isPending);

  let body: React.ReactNode;
  if ((!fresh && !disclosureQuery.isError) || vaultLoading) {
    body = (
      <View style={styles.state}>
        <V2Spinner size={32} />
      </View>
    );
  } else if ((disclosureQuery.isError && !response) || !vault) {
    body = (
      <View style={styles.state}>
        <Text style={styles.stateText}>Não foi possível carregar os riscos agora.</Text>
        <Button3D
          label="Tentar de novo"
          variant="glass"
          onPress={() => {
            if (disclosureQuery.isError) disclosureQuery.refetch();
            if (!vault) {
              vaultsQuery.refetch();
              if (!listed) detailQuery.refetch();
            }
          }}
        />
      </View>
    );
  } else if (!disclosure || !built) {
    body = (
      <View style={styles.state}>
        <Text style={styles.stateText}>
          {isPro
            ? 'Este vault ainda não tem divulgação de riscos publicada. Depósitos ficam indisponíveis até lá.'
            : 'Os riscos deste porquinho ainda não foram publicados. Guardar fica indisponível até lá.'}
        </Text>
      </View>
    );
  } else {
    body = (
      <>
        {stale ? (
          <RisksBanner message={DISCLOSURE_STALE} />
        ) : previous ? (
          <RisksBanner message={copy.updated} changed={changed} />
        ) : null}
        <RisksIdentity
          name={name}
          asset={asset}
          coin={coin}
          caption={disclosureCaption(isPro, disclosure.version, disclosure.publishedAt)}
          tint={tint}
        />
        <Text style={styles.intro}>{copy.intro}</Text>
        {built.cards.map((card) => (
          <RiskCardView key={card.key} card={card} updated={updatedKeys.has(card.key)} />
        ))}
        <View key={'end-' + disclosure.version} onLayout={onEndLayout} />
      </>
    );
  }

  const showFooter = ready;

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <ScrollView
        ref={scrollRef}
        style={{ marginTop: screenInsets.top }}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: screenInsets.topGap,
            paddingBottom: showFooter ? footerHeight + 20 : insets.bottom + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        onScrollEndDrag={onScroll}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
        onLayout={onLayout}
      >
        <View style={styles.header}>
          <Pressable
            onPress={leave}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={8}
          >
            <V2Icon name="chevron-left" size={22} color={V2Colors.text} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {copy.title}
          </Text>
        </View>
        {body}
      </ScrollView>

      {showFooter && (
        <View
          style={styles.footer}
          onLayout={(event) => setFooterHeight(Math.round(event.nativeEvent.layout.height))}
        >
          <LinearGradient
            colors={[withAlpha(V2Colors.background, 0), V2Colors.background, V2Colors.background]}
            locations={[0, 0.14, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={[styles.footerContent, { paddingBottom: Math.max(insets.bottom, FOOTER_BOTTOM) }]}>
            {!required ? (
              <>
                <View style={styles.doneRow} accessibilityRole="text">
                  <V2Icon name="check" size={18} color={V2Colors.success} />
                  <Text style={styles.doneText}>
                    {isPro ? 'Você já aceitou estes riscos.' : 'Você já aceitou os riscos deste porquinho.'}
                  </Text>
                </View>
                <Button3D label="Continuar" onPress={leave} />
              </>
            ) : unreadable ? (
              <>
                <SheetError message={DISCLOSURE_UNREADABLE} />
                <Button3D label={DISCLOSURE_ACCEPT} onPress={accept} disabled />
              </>
            ) : (
              <>
                <V2Checkbox
                  checked={checked}
                  onChange={(next) => {
                    setChecked(next);
                    setError(null);
                  }}
                  label={copy.checkbox}
                />
                {error && <SheetError message={error} />}
                <Button3D
                  label={DISCLOSURE_ACCEPT}
                  onPress={accept}
                  disabled={!canAccept}
                  loading={acknowledge.isPending}
                  accessibilityHint={
                    !checked ? 'Marque a caixa para aceitar.' : !read ? DISCLOSURE_READ_TO_END : undefined
                  }
                />
                <Text style={styles.footnote}>{checked && !read ? DISCLOSURE_READ_TO_END : copy.footnote}</Text>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function acknowledgeErrorMessage(error: unknown, code: string | undefined, isPro: boolean): string {
  if (code === 'VAULT_DISCLOSURE_MISSING') {
    return isPro
      ? 'A divulgação de riscos deste vault não está disponível agora. Tente mais tarde.'
      : 'Os riscos deste porquinho não estão disponíveis agora. Tente mais tarde.';
  }
  switch (classifyOperationError(error)) {
    case 'network':
      return 'Erro de conexão. Verifique sua internet e tente novamente.';
    case 'session':
      return 'Sessão expirada. Saia e entre novamente no app.';
    default:
      return 'Não foi possível registrar o aceite. Tente novamente.';
  }
}

const GUTTER = 18;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: V2Colors.background,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: V2Layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: GUTTER,
    gap: 14,
  },
  header: {
    minHeight: V2Layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: V2Radius.full,
    backgroundColor: V2Colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: V2Font.black,
    fontSize: 22,
    letterSpacing: -0.44,
    color: V2Colors.onPrimary,
  },
  intro: {
    fontFamily: V2Font.medium,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.45,
    color: V2Colors.textSecondary,
  },
  state: {
    paddingTop: 48,
    alignItems: 'center',
    gap: 18,
  },
  stateText: {
    textAlign: 'center',
    fontFamily: V2Font.medium,
    fontSize: 14,
    lineHeight: 21,
    color: V2Colors.textSecondary,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  footerContent: {
    width: '100%',
    maxWidth: V2Layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: GUTTER,
    paddingTop: 34,
    gap: 12,
  },
  footnote: {
    textAlign: 'center',
    fontFamily: V2Font.medium,
    fontSize: 12,
    color: V2Colors.textTertiary,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  doneText: {
    flex: 1,
    fontFamily: V2Font.semiBold,
    fontSize: 14,
    color: V2Colors.onPrimary,
  },
});
