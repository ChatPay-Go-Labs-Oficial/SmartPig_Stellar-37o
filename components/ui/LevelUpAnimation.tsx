import { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Accent, Colors, Font, FontSize, Glow, Gradients, Radius, Spacing } from "@/constants/theme";
import { useSound } from "@/hooks/use-sound";

interface LevelUpAnimationProps {
  visible: boolean;
  oldLevel: { label: string; image: any } | null;
  newLevel: { label: string; image: any } | null;
  direction?: "up" | "down";
  onClose: () => void;
  onDeposit?: () => void;
}

export function LevelUpAnimation({
  visible,
  oldLevel,
  newLevel,
  direction = "up",
  onClose,
  onDeposit,
}: LevelUpAnimationProps) {
  // Sounds: level_up.wav for evolution, quedaPersonagem for fall
  const { playLevelUp, playQuedaPersonagem } = useSound();
  const isDown   = direction === "down";
  const didClose = useRef(false);

  const oldPigAnim  = useRef(new Animated.Value(0)).current;
  const arrowAnim   = useRef(new Animated.Value(0)).current;
  const newPigScale = useRef(new Animated.Value(0)).current;
  const floatAnim   = useRef(new Animated.Value(0)).current;
  const floatLoop   = useRef<Animated.CompositeAnimation | null>(null);
  const [showCard, setShowCard] = useState(false);
  const timerRefs   = useRef<ReturnType<typeof setTimeout>[]>([]);

  const cancelAll = () => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
    floatLoop.current?.stop();
  };

  useEffect(() => {
    if (visible && oldLevel && newLevel) {
      didClose.current = false;
      oldPigAnim.setValue(0);
      arrowAnim.setValue(0);
      newPigScale.setValue(0);
      floatAnim.setValue(0);
      setShowCard(false);
      cancelAll();

      const after = (ms: number, fn: () => void) => {
        const t = setTimeout(fn, ms);
        timerRefs.current.push(t);
      };

      after(150, () =>
        Animated.spring(oldPigAnim, {
          toValue: 1, damping: 14, stiffness: 120, useNativeDriver: true,
        }).start()
      );
      after(550, () =>
        Animated.spring(arrowAnim, {
          toValue: 1, damping: 12, stiffness: 160, useNativeDriver: true,
        }).start()
      );
      after(950, () => {
        Animated.spring(newPigScale, {
          toValue: 1, damping: 7, mass: 0.7, stiffness: 130, useNativeDriver: true,
        }).start();
        isDown ? playQuedaPersonagem() : playLevelUp();
        floatLoop.current = Animated.loop(
          Animated.sequence([
            Animated.timing(floatAnim, { toValue: -10, duration: 1400, useNativeDriver: true }),
            Animated.timing(floatAnim, { toValue: 0,   duration: 1400, useNativeDriver: true }),
          ])
        );
        floatLoop.current.start();
      });
      after(1750, () => setShowCard(true));
    } else {
      cancelAll();
    }
    return cancelAll;
  }, [visible, direction]);

  const handleClose = () => {
    cancelAll();
    onClose();
  };

  if (!oldLevel || !newLevel) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.inner} onPress={() => {}}>

          {/* ── Título ── */}
          <View style={styles.titleRow}>
            <MaterialIcons
              name={isDown ? "trending-down" : "trending-up"}
              size={26}
              color={Accent.primary}
            />
            <Text style={styles.titleText}>
              {isDown ? "Ops..." : "Evolução!"}
            </Text>
          </View>

          {/* ── Porquinhos ── */}
          <View style={styles.pigRow}>

            {/* Antigo — opaco e pequeno */}
            <Animated.View style={[
              styles.oldWrap,
              { opacity: oldPigAnim, transform: [{ scale: oldPigAnim }] },
            ]}>
              <View style={styles.oldRing}>
                <Image source={oldLevel.image} style={styles.oldImg} resizeMode="contain" />
              </View>
              <Text style={styles.oldLabel} numberOfLines={2}>{oldLevel.label}</Text>
            </Animated.View>

            {/* Seta */}
            <Animated.View style={{ opacity: arrowAnim, transform: [{ scale: arrowAnim }] }}>
              <MaterialIcons
                name={isDown ? "expand-more" : "chevron-right"}
                size={30}
                color={Accent.primary}
              />
            </Animated.View>

            {/* Novo — anel rosa + glow + float */}
            <Animated.View style={{
              alignItems: "center",
              opacity: newPigScale,
              transform: [{ scale: newPigScale }],
            }}>
              <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
                <View style={[styles.newRing, Glow.pink]}>
                  <Image source={newLevel.image} style={styles.newImg} resizeMode="contain" />
                </View>
              </Animated.View>
              <Text style={styles.newLabel} numberOfLines={2}>{newLevel.label}</Text>
            </Animated.View>

          </View>

          {/* ── Card ── */}
          {showCard && (
            <View style={styles.card}>
              <Text style={styles.cardText}>
                {isDown ? (
                  <>
                    Seu porquinho voltou de nível.{"\n"}
                    Não desanime e continue poupando!
                  </>
                ) : (
                  <>
                    Seu porquinho evoluiu para{"\n"}
                    <Text style={styles.cardBold}>{newLevel.label}</Text>! Continue poupando.
                  </>
                )}
              </Text>

              <Pressable
                onPress={handleClose}
                style={styles.btnWrap}
              >
                <LinearGradient
                  colors={Gradients.primary as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.btn}
                >
                  <Text style={styles.btnText}>
                    {isDown ? "Vou me esforçar" : "Que legal!"}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}

        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing[6],
  },
  inner: {
    width: "100%",
    alignItems: "center",
    gap: Spacing[8],
  },

  // Título
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  titleText: {
    fontSize: 36,
    fontFamily: Font.black,
    color: Colors.foreground,
    letterSpacing: -0.5,
  },

  // Linha dos porquinhos
  pigRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },

  // Porquinho antigo
  oldWrap: {
    alignItems: "center",
    gap: 8,
  },
  oldRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  oldImg: {
    width: 68,
    height: 68,
    opacity: 0.4,
  },
  oldLabel: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    textAlign: "center",
    maxWidth: 84,
  },

  // Porquinho novo — anel único rosa com Glow.pink do design system
  newRing: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: Colors.card,
    borderWidth: 2.5,
    borderColor: Accent.primary,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  newImg: {
    width: 120,
    height: 120,
  },
  newLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Colors.foreground,
    textAlign: "center",
    maxWidth: 140,
    marginTop: 10,
  },

  // Card de mensagem
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    paddingVertical: Spacing[6],
    paddingHorizontal: Spacing[6],
    alignItems: "center",
    gap: Spacing[4],
    width: "100%",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardText: {
    fontSize: FontSize.body,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    textAlign: "center",
    lineHeight: 24,
  },
  cardBold: {
    fontFamily: Font.black,
    color: Colors.foreground,
  },

  // Botões
  btnWrap: { alignSelf: "stretch" },
  btn: {
    height: 52,
    borderRadius: Radius.lg,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },
  btnText: {
    fontSize: FontSize.body,
    fontFamily: Font.black,
    color: "#fff",
  },
  skipText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
});
