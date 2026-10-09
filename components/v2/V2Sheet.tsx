import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { V2Colors, V2Font, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { V2Icon, type V2IconName } from './V2Icon';

interface V2SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  icon: V2IconName;
  children: React.ReactNode;
}

/** Bottom sheet V2: alça, selo com ícone, título e botão de fechar. */
export function V2Sheet({ visible, onClose, title, icon, children }: V2SheetProps) {
  const accent = useAccent();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Fechar">
        <Pressable onPress={() => {}} style={styles.sheetShadow}>
          <LinearGradient
            colors={[V2Colors.sheetTop, V2Colors.sheetBase]}
            style={[styles.sheet, { paddingBottom: 32 + insets.bottom }]}
          >
            <View style={styles.handleRow}>
              <View style={styles.handle} />
            </View>

            <View style={styles.header}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: accent.alpha(0.14), borderColor: accent.alpha(0.32) },
                ]}
              >
                <V2Icon name={icon} size={20} color={accent.base} />
              </View>
              <Text style={styles.title}>{title}</Text>
              <Pressable
                onPress={onClose}
                style={styles.close}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                hitSlop={8}
              >
                <V2Icon name="x" size={18} color={V2Colors.text} />
              </Pressable>
            </View>

            {children}
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: V2Colors.overlay,
  },
  sheetShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -20 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 24,
  },
  sheet: {
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
  badge: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: V2Font.black,
    fontSize: 20,
    letterSpacing: -0.4,
    color: V2Colors.text,
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
