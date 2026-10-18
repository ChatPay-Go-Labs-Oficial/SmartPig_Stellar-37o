import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { V2Colors, V2Font } from '@/constants/theme-v2';
// Direto dos arquivos, não do índice: a abertura é o primeiro quadro do app e
// não deve carregar todos os componentes V2 antes dele.
import { V2Spinner } from '@/components/v2/V2Spinner';
import { Wordmark } from '@/components/v2/Wordmark';
import { EntryBackdrop } from './EntryBackdrop';
import { waitForCalm } from '@/lib/utils/wait-for-calm';

const SYMBOL = require('@/assets/images/v2/mascote-simbolo.png');

/** Figma 01/03: símbolo de 188, logo 22 abaixo dele e o status 36 abaixo do logo. */
const SYMBOL_SIZE = 188;
const LOGO_GAP = 22;
const STATUS_GAP = 36;
/** Altura do logo de 38 antes da primeira medida. */
const WORDMARK_HEIGHT = 46;

/** Figma 00 → 01: entrada em 0,8 s com "ease out back". */
const INTRO_MS = 800;
/** Figma 01 → 02: a abertura se dissolve no login em 0,45 s. */
export const SPLASH_EXIT_MS = 450;
const STATUS_IN_MS = 250;

/** Sem o evento de carga do símbolo, segue sem ele depois disso. */
const SYMBOL_TIMEOUT_MS = 1_200;
/**
 * Opacidade mínima do que acende na entrada (fundo, logo). O Android não
 * desenha uma view com opacidade 0, e as imagens dela só subiam para a GPU no
 * primeiro quadro da animação — que travava ali. Com 1%, invisível sobre o
 * fundo escuro, esse custo fica no porquinho parado, antes da entrada.
 */
const WARM_OPACITY = 0.01;

interface OpeningSplashProps {
  /** Status abaixo do logo (Figma 03 "Entrando..."); aparece sem mover o logo. */
  status?: string;
  /** Anima a entrada (abertura do app). Sem ela, já começa montada. */
  animateIn?: boolean;
  /**
   * As fontes do app carregaram. A abertura monta antes delas (o porquinho
   * não usa fonte) e só desenha o logo e anima a entrada depois.
   */
  fontsReady?: boolean;
  /** Saindo: dissolve e avisa ao terminar. */
  exiting?: boolean;
  onExited?: () => void;
  /** A entrada começou (ou não havia entrada). */
  onIntroStart?: () => void;
  /** A entrada terminou (ou não havia entrada). */
  onIntroEnd?: () => void;
}

/**
 * Abertura do app (Figma 01) e "Entrando..." (Figma 03): o porquinho, o logo
 * e, quando há, o status de entrada.
 *
 * Começa idêntica ao splash nativo — o mesmo símbolo, do mesmo tamanho, no
 * centro, sobre o fundo liso — e só então o nativo sai: a troca não aparece.
 * A entrada espera o aparelho ficar livre (a WebView do Privy e as telas de
 * baixo montam neste mesmo momento) e então o logo cresce por baixo do
 * símbolo, o conjunto sobe para o centro e o brilho e as estrelas acendem.
 */
export function OpeningSplash({
  status,
  animateIn = true,
  fontsReady = true,
  exiting = false,
  onExited,
  onIntroStart,
  onIntroEnd,
}: OpeningSplashProps) {
  const intro = useSharedValue(animateIn ? 0 : 1);
  const exit = useSharedValue(1);
  const statusIn = useSharedValue(status ? 1 : 0);
  // Alturas medidas do logo e do status: o conjunto se centraliza com elas.
  const wordmarkHeight = useSharedValue(WORDMARK_HEIGHT);
  const statusHeight = useSharedValue(0);
  const [symbolReady, setSymbolReady] = useState(false);
  // O status só entra: quando some, é porque a abertura está saindo, e o
  // conjunto não deve se mexer nessa hora. O último texto fica.
  const [shownStatus, setShownStatus] = useState(status);
  if (status && status !== shownStatus) setShownStatus(status);
  const onIntroStartRef = useRef(onIntroStart);
  onIntroStartRef.current = onIntroStart;
  const onIntroEndRef = useRef(onIntroEnd);
  onIntroEndRef.current = onIntroEnd;

  useEffect(() => {
    const timer = setTimeout(() => setSymbolReady(true), SYMBOL_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  // O nativo sai assim que o símbolo está na tela (um quadro depois da carga).
  const [nativeHidden, setNativeHidden] = useState(false);
  useEffect(() => {
    if (!symbolReady) return;
    let active = true;
    const frame = requestAnimationFrame(() => {
      SplashScreen.hideAsync()
        .catch(() => {})
        .finally(() => {
          if (active) setNativeHidden(true);
        });
    });
    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [symbolReady]);

  // A entrada espera o nativo sair, as fontes e o aparelho livre. Só depois
  // do nativo: enquanto ele está na frente, o app nem desenha, e os quadros
  // pareciam livres justo antes do primeiro desenho de verdade, o mais caro.
  useEffect(() => {
    if (!nativeHidden || !fontsReady) return;
    if (!animateIn) {
      onIntroStartRef.current?.();
      onIntroEndRef.current?.();
      return;
    }
    return waitForCalm(() => {
      onIntroStartRef.current?.();
      const end = () => onIntroEndRef.current?.();
      intro.value = withTiming(1, { duration: INTRO_MS, easing: Easing.out(Easing.back(1.6)) }, (done) => {
        if (done) runOnJS(end)();
      });
    });
  }, [animateIn, fontsReady, intro, nativeHidden]);

  useEffect(() => {
    if (status) statusIn.value = withTiming(1, { duration: STATUS_IN_MS });
  }, [status, statusIn]);

  useEffect(() => {
    if (!exiting) return;
    exit.value = withTiming(0, { duration: SPLASH_EXIT_MS, easing: Easing.out(Easing.quad) }, (done) => {
      if (done && onExited) runOnJS(onExited)();
    });
  }, [exiting, exit, onExited]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: exit.value }));
  // O splash nativo é só o fundo liso: brilho e estrelas acendem na entrada.
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: Math.max(WARM_OPACITY, Math.min(1, intro.value)),
  }));
  // O símbolo começa no centro exato (como no nativo). Logo e status ficam
  // fora do fluxo, embaixo dele, e o conjunto sobe metade do que cada um
  // ocupa conforme aparece: o que está na tela fica sempre centralizado.
  const stackStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          -(
            Math.min(intro.value, 1) * (LOGO_GAP + wordmarkHeight.value) +
            statusIn.value * (STATUS_GAP + statusHeight.value)
          ) / 2,
      },
    ],
  }));
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: Math.max(WARM_OPACITY, Math.min(1, intro.value * 1.4)),
    transform: [{ scale: 0.6 + 0.4 * intro.value }],
  }));
  const statusStyle = useAnimatedStyle(() => ({
    opacity: statusIn.value,
    transform: [{ translateY: wordmarkHeight.value + STATUS_GAP }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <EntryBackdrop />
      </Animated.View>
      <View style={styles.center}>
        <Animated.View style={[styles.stack, stackStyle]}>
          <Image
            source={SYMBOL}
            contentFit="contain"
            style={styles.symbol}
            onLoadEnd={() => setSymbolReady(true)}
          />
          {/* Logo e status fora do fluxo, na altura natural (uma altura fixa
              cortava a perna do "g"): aparecem sem empurrar o símbolo. */}
          <Animated.View
            style={[styles.below, wordmarkStyle]}
            onLayout={(e) => {
              if (fontsReady) wordmarkHeight.value = e.nativeEvent.layout.height;
            }}
          >
            {fontsReady ? <Wordmark size={38} /> : null}
          </Animated.View>
          <Animated.View
            style={[styles.below, statusStyle]}
            pointerEvents="none"
            onLayout={(e) => {
              statusHeight.value = e.nativeEvent.layout.height;
            }}
          >
            {shownStatus ? (
              <View style={styles.status} accessibilityLiveRegion="polite">
                <V2Spinner size={18} color={V2Colors.textSecondary} />
                <Text style={styles.statusText}>{shownStatus}</Text>
              </View>
            ) : null}
          </Animated.View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // O mesmo fundo do splash nativo (app.json), para a troca não aparecer.
  root: {
    backgroundColor: V2Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: {
    width: SYMBOL_SIZE,
    height: SYMBOL_SIZE,
  },
  // Figma: sombra 0 14 13 preta 50% embaixo do símbolo.
  symbol: {
    width: SYMBOL_SIZE,
    height: SYMBOL_SIZE,
    filter: [{ dropShadow: { offsetX: 0, offsetY: 14, standardDeviation: 6.5, color: 'rgba(0,0,0,0.5)' } }],
  },
  // Embaixo do símbolo, centralizado nele e mais largo que ele (o status
  // pode passar dos 188).
  below: {
    position: 'absolute',
    top: SYMBOL_SIZE + LOGO_GAP,
    left: -SYMBOL_SIZE,
    right: -SYMBOL_SIZE,
    alignItems: 'center',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: V2Colors.chip,
  },
  statusText: {
    fontFamily: V2Font.semiBold,
    fontSize: 13,
    lineHeight: 19,
    color: V2Colors.textSecondary,
  },
});
