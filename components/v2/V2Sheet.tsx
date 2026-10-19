import { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { V2Colors, V2Font, V2Layout, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { V2Icon, type V2IconName } from './V2Icon';

interface V2SheetProps {
  visible: boolean;
  onClose: () => void;
  /**
   * Sem título não há cabeçalho: o conteúdo começa logo abaixo da alça (Figma
   * 14, Resgate de presente, que centraliza selo e título no corpo).
   */
  title?: string;
  /** Linha de apoio abaixo do título (Figma 10e). */
  subtitle?: string;
  /**
   * Pílula abaixo do título, com ponto colorido (Figma "selo de rede" dos
   * sheets de Guardar e Tirar: "Porquinho Poupador · 7,1% ao ano").
   */
  pill?: { label: string; dotColor: string };
  /**
   * Selo do cabeçalho. Sem ele o sheet é uma pergunta (Figma 26k, "Ativar o
   * modo Pro?"): só o título, sem selo nem X; fecha pela ação secundária, pelo
   * toque fora ou pelo voltar.
   */
  icon?: V2IconName;
  /**
   * false durante uma operação em andamento: some o X, e nem o toque fora
   * nem o voltar do Android fecham o sheet.
   */
  closable?: boolean;
  children: React.ReactNode;
}

/** Bottom sheet V2: alça, selo com ícone, título e botão de fechar. */
export function V2Sheet({
  visible,
  onClose,
  title,
  subtitle,
  pill,
  icon,
  closable = true,
  children,
}: V2SheetProps) {
  const accent = useAccent();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const close = closable ? onClose : () => {};

  // Com o teclado aberto o sheet encosta nele (Figma: 22 de folga); sem
  // teclado, a folga respeita a área segura de baixo.
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const subs = [
      Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true)),
      Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false)),
    ];
    return () => subs.forEach((sub) => sub.remove());
  }, []);
  const bottomPadding = keyboardOpen ? 22 : Math.max(insets.bottom, 12) + 16;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={close}
    >
      {/* Desvia do teclado; o sheet nunca passa da altura da tela (alça e
          botão de fechar ficam sempre abaixo da barra de status). Só com o
          teclado aberto: no Android o "teclado fechou" vem com a borda de
          baixo sem a barra de navegação, e o modal (navigationBarTranslucent)
          desenha por baixo dela; ligado, sobrava essa altura sob o sheet. */}
      <KeyboardAvoidingView behavior="padding" enabled={keyboardOpen} style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityLabel="Fechar"
          accessible={closable}
        />
        <View style={[styles.sheetShadow, { maxHeight: height - insets.top - 12 }]}>
          <LinearGradient
            colors={[V2Colors.sheetTop, V2Colors.sheetBase]}
            style={[styles.sheet, { paddingBottom: bottomPadding }]}
          >
            <View style={styles.handleRow}>
              <View style={styles.handle} />
            </View>

            {title ? (
              <View style={[styles.header, !icon && styles.headerPlain]}>
                {icon ? (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: accent.alpha(0.14),
                        borderColor: accent.alpha(0.32),
                      },
                    ]}
                  >
                    <V2Icon name={icon} size={20} color={accent.light} />
                  </View>
                ) : null}
                <View style={[styles.titles, pill && styles.titlesWithPill]}>
                  <Text style={styles.title}>{title}</Text>
                  {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                  {pill ? (
                    <View style={styles.pill}>
                      <View style={[styles.pillDot, { backgroundColor: pill.dotColor }]} />
                      <Text style={styles.pillText} numberOfLines={1}>
                        {pill.label}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {closable && icon && (
                  <Pressable
                    onPress={onClose}
                    style={styles.close}
                    accessibilityRole="button"
                    accessibilityLabel="Fechar"
                    hitSlop={8}
                  >
                    <V2Icon name="x" size={18} color={V2Colors.text} />
                  </Pressable>
                )}
              </View>
            ) : null}

            {children}
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: V2Colors.overlay,
  },
  sheetShadow: {
    width: '100%',
    maxWidth: V2Layout.maxWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -20 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 24,
  },
  sheet: {
    flexShrink: 1,
    borderTopLeftRadius: V2Radius.sheet,
    borderTopRightRadius: V2Radius.sheet,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingTop: 15,
    paddingHorizontal: 23,
  },
  handleRow: {
    alignItems: 'center',
    paddingBottom: 14,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: V2Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
  },
  // Figma 26k: 12 entre o título e o texto.
  headerPlain: {
    paddingBottom: 12,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: V2Font.black,
    fontSize: 20,
    letterSpacing: -0.4,
    color: V2Colors.onPrimary,
  },
  subtitle: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    color: V2Colors.textTertiary,
  },
  titlesWithPill: {
    gap: 5,
    alignItems: 'flex-start',
  },
  pill: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: V2Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: V2Colors.chip,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    flexShrink: 1,
    fontFamily: V2Font.bold,
    fontSize: 11,
    color: V2Colors.textSecondary,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: V2Colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
