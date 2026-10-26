import { memo, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { AssetIcon, Button3D, ScreenGlow, V2Icon } from '@/components/v2';
import { Confetti } from '@/components/home/Confetti';
import { V2Colors, V2Font, V2Layout, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useSound } from '@/hooks/use-sound';
import { useTerms } from '@/hooks/use-terms';
import type { TermKey } from '@/lib/copy/terms';
import { useVaults } from '@/lib/queries/vaults.queries';
import { useAuthStore } from '@/lib/stores/auth.store';
import { usePiggyUnlockStore } from '@/lib/stores/piggy-unlock.store';
import { piggyAsset, type PiggyAsset } from '@/lib/utils/piggy';

const MASCOT = require('@/assets/images/v2/mascote-baby-pig.png');

/** O porquinho entra depois da cena, com o confete e o som (como no 37a). */
const STAGE_DELAY = 450;
/** O cartão da mensagem vem por último. */
const CARD_DELAY = 850;

interface PiggyUnlockSceneProps {
  asset: PiggyAsset | null;
  /** "Porquinho Viajante". */
  name: string;
  /** "Euro". */
  coin: string;
  /** Aceite de riscos ainda pela frente: a cena leva a ele (13a). */
  risksPending: boolean;
  onReadRisks: () => void;
  onLater: () => void;
}

/**
 * Porquinho liberado (Figma 11b), no padrão da Evolução!: "Novo porquinho",
 * "Liberado!", o porquinho com a moeda, o confete e o som de subida (no
 * silencioso do app, nem som nem vibração). Com o aceite de riscos pendente,
 * "Ler os riscos" leva a ele e "Agora não" volta à Guardar, já no porquinho
 * (10g). Sem aceite pendente, "Continuar".
 */
function PiggyUnlockSceneView({ asset, name, coin, risksPending, onReadRisks, onLater }: PiggyUnlockSceneProps) {
  const accent = useAccent();
  const { t, p } = useTerms();
  const { playLevelUp, muted } = useSound();
  const stageIn = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const cardIn = useRef(new Animated.Value(0)).current;
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    let floatLoop: Animated.CompositeAnimation | null = null;
    const stage = setTimeout(() => {
      Animated.spring(stageIn, { toValue: 1, damping: 7, mass: 0.7, stiffness: 130, useNativeDriver: true }).start();
      // O playLevelUp vibra mesmo no silencioso; aqui a vibração também cala.
      if (!muted) playLevelUp();
      setCelebrate(true);
      floatLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(float, { toValue: -8, duration: 1400, useNativeDriver: true }),
          Animated.timing(float, { toValue: 0, duration: 1400, useNativeDriver: true }),
        ]),
      );
      floatLoop.start();
    }, STAGE_DELAY);
    const card = setTimeout(
      () => Animated.timing(cardIn, { toValue: 1, duration: 260, useNativeDriver: true }).start(),
      CARD_DELAY,
    );
    return () => {
      clearTimeout(stage);
      clearTimeout(card);
      floatLoop?.stop();
    };
    // A sequência roda uma vez por cena, com o silencioso de quando ela abriu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal visible animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onLater}>
      {/* Altura da tela desde o primeiro quadro: no Android o Modal abre com
          uma altura provisória e a cena, centralizada, descia (ver o 37a). */}
      <View style={[styles.screen, { minHeight: Dimensions.get('screen').height }]} accessibilityViewIsModal>
        <ScreenGlow peak={0.4} height={596} />
        <Confetti play={celebrate} />

        <View style={styles.scene}>
          <View style={[styles.seal, { backgroundColor: accent.alpha(0.14), borderColor: accent.alpha(0.32) }]}>
            <V2Icon name="sparkles" size={12} color={accent.base} />
            <Text style={[styles.sealText, { color: accent.base }]}>{t('guardar.unlocked.seal')}</Text>
          </View>
          <Text style={styles.title} accessibilityRole="header">
            {t('guardar.unlocked.title')}
          </Text>

          <View style={styles.stages}>
            <Animated.View style={[styles.stage, { opacity: stageIn, transform: [{ scale: stageIn }] }]}>
              <Animated.View
                style={[
                  styles.frame,
                  {
                    backgroundColor: accent.alpha(0.14),
                    borderColor: accent.alpha(0.48),
                    transform: [{ translateY: float }],
                  },
                ]}
              >
                <Image source={MASCOT} style={styles.mascot} contentFit="contain" />
              </Animated.View>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              <View style={styles.coin}>
                {asset && <AssetIcon asset={asset} size={16} round />}
                <Text style={styles.coinText}>{coin}</Text>
              </View>
            </Animated.View>
          </View>

          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardIn,
                transform: [{ translateY: cardIn.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
              },
            ]}
          >
            <Text style={styles.message}>
              {risksPending
                ? p('guardar.unlocked.message', { name })
                : p('guardar.unlocked.messageNoRisks', { name })}
            </Text>
            {risksPending ? (
              <>
                <Button3D label={t('guardar.notice.risks.cta')} size="card" icon="shield" onPress={onReadRisks} />
                <Pressable onPress={onLater} hitSlop={8} style={styles.later} accessibilityRole="button">
                  <Text style={styles.laterText}>{t('guardar.unlocked.later')}</Text>
                </Pressable>
              </>
            ) : (
              <Button3D label={t('guardar.unlocked.continue')} size="card" icon="sparkles" onPress={onLater} />
            )}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

export const PiggyUnlockScene = memo(PiggyUnlockSceneView);

/**
 * Mostra o 11b quando alguém pede (lib/stores/piggy-unlock.store.ts). Fica no
 * layout das abas, por cima da Guardar já no porquinho. Sem sessão, nada.
 */
export function PiggyUnlockGate() {
  const pending = usePiggyUnlockStore((s) => s.pending);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!pending || !isAuthenticated) return null;
  return <ConnectedUnlock vaultId={pending} />;
}

function ConnectedUnlock({ vaultId }: { vaultId: string }) {
  const { t } = useTerms();
  const dismiss = usePiggyUnlockStore((s) => s.dismiss);
  const vault = useVaults().data?.find((item) => item.id === vaultId);
  // A lista vem da Guardar, que acabou de abrir; sem ela ainda, espera.
  if (!vault) return null;

  const asset = piggyAsset(vault.assetSymbol);
  const name = asset ? t(`guardar.piggy.${asset}.name` as TermKey) : vault.name;
  const coin = asset ? t(`carteira.asset.${asset}.name` as TermKey) : vault.assetSymbol;
  return (
    <PiggyUnlockScene
      asset={asset}
      name={name}
      coin={coin}
      risksPending={asset !== 'USDC' && vault.disclosure?.acknowledgmentRequired === true}
      onLater={dismiss}
      onReadRisks={() => {
        dismiss();
        router.push({ pathname: '/vault/[id]/risks', params: { id: vault.id } });
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: V2Colors.background,
    justifyContent: 'center',
  },
  // Figma "cena": 24 de margem; o cartão tem a largura da coluna.
  scene: {
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: V2Layout.maxWidth,
    alignSelf: 'center',
  },
  seal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: V2Radius.full,
    borderWidth: 1,
  },
  sealText: {
    fontFamily: V2Font.extraBold,
    fontSize: 11.5,
  },
  title: {
    paddingTop: 12,
    fontFamily: V2Font.black,
    fontSize: 36,
    letterSpacing: -1.08,
    color: V2Colors.onPrimary,
  },
  // Figma "estágios": 26 em cima e 28 embaixo, como na Evolução!.
  stages: {
    paddingTop: 26,
    paddingBottom: 28,
  },
  stage: {
    alignItems: 'center',
    gap: 10,
  },
  frame: {
    width: 150,
    height: 150,
    borderRadius: 40,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascot: {
    width: 110,
    height: 110,
  },
  name: {
    fontFamily: V2Font.extraBold,
    fontSize: 15,
    color: V2Colors.onPrimary,
  },
  coin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coinText: {
    fontFamily: V2Font.semiBold,
    fontSize: 12.5,
    color: V2Colors.textSecondary,
  },
  card: {
    alignSelf: 'stretch',
    gap: 16,
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  message: {
    textAlign: 'center',
    fontFamily: V2Font.medium,
    fontSize: 15.5,
    lineHeight: 15.5 * 1.45,
    color: V2Colors.textSecondary,
  },
  later: {
    alignSelf: 'center',
  },
  laterText: {
    fontFamily: V2Font.bold,
    fontSize: 14,
    color: V2Colors.textSecondary,
  },
});
