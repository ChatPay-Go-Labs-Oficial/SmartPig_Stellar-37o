import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '@/lib/stores/settings.store';
import { useCallback } from 'react';

const SOUND_FILES = {
  coin: require('@/assets/sounds/som_moeda.mp3'),
  levelUp: require('@/assets/sounds/level_up.wav'),
  levelDown: require('@/assets/sounds/porquinho_voltou_de_nivel.mp3'),
  deposit: require('@/assets/sounds/pix_in_completo.mp3'),
  withdraw: require('@/assets/sounds/pix_out_complete.wav'),
  celebration: require('@/assets/sounds/card_entry.wav'),
  appOpen: require('@/assets/sounds/abriu_o_app.wav'),
  click: require('@/assets/sounds/swipe.wav'),
  swipe: require('@/assets/sounds/swipe.wav'),
  success: require('@/assets/sounds/success.wav'),
  error: require('@/assets/sounds/error.wav'),
  nav: require('@/assets/sounds/nav.wav'),
  investirConfirmacao: require('@/assets/sounds/investir-porquinho-confirmacao.mp3'),
  investirCoin: require('@/assets/sounds/investir-porquinho-coin-sound.mp3'),
  retirarConfirmacao: require('@/assets/sounds/retirar_do_porquinho_sound.mp3'),
  evolucaoPersonagem: require('@/assets/sounds/evolucao-personagem-pigfi.mp3'),
  quedaPersonagem: require('@/assets/sounds/queda-personagem-pigfi.mp3'),
  questaoErrada: require('@/assets/sounds/quetao_errada.mp3'),
};

type SoundName = keyof typeof SOUND_FILES;

type AudioPlayer = ReturnType<typeof createAudioPlayer>;

// Preloaded pool — one instance per sound, seeked back to 0 on reuse
const soundPool: Partial<Record<SoundName, AudioPlayer>> = {};
const lastPlayed: Partial<Record<SoundName, number>> = {};

function getSound(name: SoundName): AudioPlayer {
  if (soundPool[name]) {
    const player = soundPool[name]!;
    try {
      player.seekTo(0);
      return player;
    } catch {
      try { soundPool[name]?.remove(); } catch {}
      delete soundPool[name];
    }
  }
  const player = createAudioPlayer(SOUND_FILES[name]);
  soundPool[name] = player;
  return player;
}

// Eagerly preload the most-used UI sounds so first tap is instant
try {
  (['click', 'nav', 'swipe'] as SoundName[]).forEach(getSound);
} catch {}

export function useSound() {
  const muted = useSettingsStore((s) => s.muted);
  const toggleMute = useSettingsStore((s) => s.toggleMute);

  const playSound = useCallback(
    (
      soundName: SoundName,
      hapticType?: Haptics.ImpactFeedbackStyle | Haptics.NotificationFeedbackType
    ) => {
      const now = Date.now();
      if (lastPlayed[soundName] && now - lastPlayed[soundName]! < 500) return;
      lastPlayed[soundName] = now;

      if (hapticType) {
        try {
          if (
            hapticType === Haptics.NotificationFeedbackType.Success ||
            hapticType === Haptics.NotificationFeedbackType.Warning ||
            hapticType === Haptics.NotificationFeedbackType.Error
          ) {
            Haptics.notificationAsync(hapticType);
          } else {
            Haptics.impactAsync(hapticType as Haptics.ImpactFeedbackStyle);
          }
        } catch {}
      }

      if (muted) return;

      try {
        getSound(soundName).play();
      } catch {
        // Fallback: fresh one-shot player that cleans itself up
        try {
          const player = createAudioPlayer(SOUND_FILES[soundName]);
          player.play();
          const sub = player.addListener('playbackStatusUpdate', (status) => {
            if (status.didJustFinish) {
              sub.remove();
              player.remove();
            }
          });
        } catch {}
      }
    },
    [muted]
  );

  const playCoin = useCallback(() => playSound('coin', Haptics.ImpactFeedbackStyle.Light), [playSound]);
  const playLevelUp = useCallback(() => playSound('levelUp', Haptics.NotificationFeedbackType.Success), [playSound]);
  const playLevelDown = useCallback(() => playSound('levelDown', Haptics.NotificationFeedbackType.Warning), [playSound]);
  const playDeposit = useCallback(() => playSound('deposit', Haptics.NotificationFeedbackType.Success), [playSound]);
  const playWithdraw = useCallback(() => playSound('withdraw', Haptics.NotificationFeedbackType.Success), [playSound]);
  const playCelebration = useCallback(() => playSound('celebration', Haptics.ImpactFeedbackStyle.Medium), [playSound]);
  const playAppOpen = useCallback(() => playSound('appOpen', Haptics.ImpactFeedbackStyle.Medium), [playSound]);
  const playClick = useCallback(() => playSound('click', Haptics.ImpactFeedbackStyle.Light), [playSound]);
  const playSwipe = useCallback(() => playSound('swipe', Haptics.ImpactFeedbackStyle.Light), [playSound]);
  const playSuccess = useCallback(() => playSound('success', Haptics.NotificationFeedbackType.Success), [playSound]);
  const playError = useCallback(() => playSound('error', Haptics.NotificationFeedbackType.Error), [playSound]);
  const playNav = useCallback(() => playSound('nav', Haptics.ImpactFeedbackStyle.Light), [playSound]);
  const playInvestirConfirmacao = useCallback(() => playSound('investirConfirmacao', Haptics.NotificationFeedbackType.Success), [playSound]);
  const playRetirarConfirmacao = useCallback(() => playSound('retirarConfirmacao', Haptics.NotificationFeedbackType.Success), [playSound]);
  const playEvolucaoPersonagem = useCallback(() => playSound('evolucaoPersonagem', Haptics.NotificationFeedbackType.Success), [playSound]);
  const playQuedaPersonagem = useCallback(() => playSound('quedaPersonagem', Haptics.NotificationFeedbackType.Warning), [playSound]);
  const playQuestaoErrada = useCallback(() => playSound('questaoErrada', Haptics.NotificationFeedbackType.Error), [playSound]);

  // Fresh instance per call so concurrent coin sounds don't interrupt each other
  const playInvestirCoin = useCallback(() => {
    if (muted) return;
    try {
      const player = createAudioPlayer(SOUND_FILES.investirCoin);
      player.play();
      const sub = player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          sub.remove();
          player.remove();
        }
      });
    } catch {}
  }, [muted]);

  return {
    playCoin,
    playLevelUp,
    playLevelDown,
    playDeposit,
    playWithdraw,
    playCelebration,
    playAppOpen,
    playClick,
    playSwipe,
    playSuccess,
    playError,
    playNav,
    playInvestirConfirmacao,
    playInvestirCoin,
    playRetirarConfirmacao,
    playEvolucaoPersonagem,
    playQuedaPersonagem,
    playQuestaoErrada,
    muted,
    toggleMute,
  };
}
