import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useAccent } from '@/hooks/use-accent';
import type { Piggy } from '@/lib/utils/piggy';
import { PiggyCard } from './PiggyCard';

// Figma 10a: cartão de 290 numa tela de 393, 14 entre cartões e 37,5 do
// vizinho aparecendo de cada lado. A soma espaço + vizinho (51,5) fica fixa e
// o cartão acompanha a largura, até um teto para tablets e dobráveis.
const GAP = 14;
const SIDE = 51.5;
const MAX_CARD = 320;

interface PiggyCarouselProps {
  piggies: readonly Piggy[];
  index: number;
  onIndexChange: (index: number) => void;
  /** Largura da coluna da tela. */
  width: number;
  onSave: (piggy: Piggy) => void;
  onWithdraw: (piggy: Piggy) => void;
}

/**
 * Carrossel dos porquinhos (Figma 10a–10d): um cartão por vault, com o
 * vizinho espiando dos lados. Arrastar muda de página; tocar no vizinho ou
 * num ponto do indicador também.
 *
 * A rolagem é a fonte da verdade enquanto o dedo manda: ela avisa a página
 * nova e a tela só acompanha. Rolagem por código acontece só quando a página
 * muda por outro caminho (ponto, vizinho, deep link, recarga dos dados).
 */
export function PiggyCarousel({
  piggies,
  index,
  onIndexChange,
  width,
  onSave,
  onWithdraw,
}: PiggyCarouselProps) {
  const cardWidth = Math.min(MAX_CARD, width - SIDE * 2);
  const step = cardWidth + GAP;
  const sidePadding = (width - cardWidth) / 2;
  const last = piggies.length - 1;

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(index * step);
  // Página que o JS já conhece: a rolagem só avisa quando ela muda.
  const reported = useSharedValue(index);
  // Destino de uma rolagem feita por código. Até chegar lá, as páginas do
  // caminho não são avisadas: a seção de baixo não pisca pelo porquinho do
  // meio. -1 = nenhuma.
  const target = useSharedValue(-1);

  // Página onde a rolagem está (ou para onde vai) e quantos avisos ela já
  // deu. Um efeito de um render anterior a um aviso mais novo não rola: o
  // render desse aviso já vem a caminho (avisos de runOnJS chegam fora de
  // ordem com os efeitos quando o dedo vai e volta perto do meio do passo).
  const lastPage = useRef(index);
  const lastStep = useRef(step);
  const scrollSeq = useRef(0);
  const seqAtRender = scrollSeq.current;

  const report = useCallback(
    (next: number) => {
      scrollSeq.current += 1;
      lastPage.current = next;
      onIndexChange(next);
    },
    [onIndexChange],
  );

  const onScroll = useAnimatedScrollHandler({
    onBeginDrag: () => {
      target.value = -1;
    },
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
      const page = Math.min(last, Math.max(0, Math.round(event.contentOffset.x / step)));
      if (target.value !== -1) {
        if (page !== target.value) return;
        target.value = -1;
      }
      if (page !== reported.value) {
        reported.value = page;
        runOnJS(report)(page);
      }
    },
  });

  // Posição inicial, só na montagem. No Android toda atualização da prop
  // contentOffset vira um scrollTo nativo (ReactHorizontalScrollViewManager):
  // recalculada a cada render, ela puxava a rolagem para baixo do dedo quando
  // a página mudava no meio do arraste.
  const initialOffset = useRef({ x: index * step, y: 0 }).current;

  useEffect(() => {
    if (seqAtRender !== scrollSeq.current) return;
    if (index === lastPage.current && step === lastStep.current) return;

    const x = index * step;
    lastPage.current = index;
    lastStep.current = step;
    reported.value = index;
    // Já parado lá, a rolagem não emite eventos: nada a esperar.
    if (Math.abs(scrollX.value - x) > 1) target.value = index;
    scrollRef.current?.scrollTo({ x, animated: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, step]);

  const goTo = useCallback(
    (next: number) => {
      if (next !== index) onIndexChange(next);
    },
    [index, onIndexChange],
  );

  return (
    <View>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        disableIntervalMomentum
        contentOffset={initialOffset}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.row, { paddingHorizontal: sidePadding }]}
      >
        {piggies.map((piggy, i) => (
          <PiggyCard
            key={piggy.vault.id}
            piggy={piggy}
            index={i}
            width={cardWidth}
            step={step}
            scrollX={scrollX}
            active={i === index}
            onFocus={goTo}
            onSave={onSave}
            onWithdraw={onWithdraw}
          />
        ))}
      </Animated.ScrollView>

      {piggies.length > 1 && (
        // O papel "ajustável" fica no indicador: no ScrollView horizontal ele
        // é ignorado (o Android já instala um delegate de acessibilidade).
        <View
          style={styles.dots}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Porquinhos"
          accessibilityValue={{ text: `${index + 1} de ${piggies.length}` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'increment') goTo(Math.min(last, index + 1));
            if (event.nativeEvent.actionName === 'decrement') goTo(Math.max(0, index - 1));
          }}
        >
          {piggies.map((piggy, i) => (
            <PageDot key={piggy.vault.id} index={i} step={step} scrollX={scrollX} onPress={goTo} />
          ))}
        </View>
      )}
    </View>
  );
}

interface PageDotProps {
  index: number;
  step: number;
  scrollX: SharedValue<number>;
  onPress: (index: number) => void;
}

/** Ponto do indicador: vira a pílula de 22 quando a página está no centro. */
function PageDot({ index, step, scrollX, onPress }: PageDotProps) {
  const accent = useAccent();
  const style = useAnimatedStyle(() => {
    const focus = interpolate(Math.abs(scrollX.value - index * step), [0, step], [1, 0], 'clamp');
    return {
      width: 8 + 14 * focus,
      backgroundColor: interpolateColor(focus, [0, 1], ['rgba(255,255,255,0.2)', accent.base]),
    };
  });

  return (
    <Pressable onPress={() => onPress(index)} hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }}>
      <Animated.View style={[styles.dot, style]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Figma "carrossel (recorte)": linha a 20 do topo; 2 de folga embaixo.
  row: {
    gap: GAP,
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 2,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
    paddingTop: 12,
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
});
