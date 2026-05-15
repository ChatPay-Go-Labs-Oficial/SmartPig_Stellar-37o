import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUIStore } from '@/lib/stores/ui.store';
import { Accent, Colors, Font, FontSize, Radius, Spacing } from '@/constants/theme';

const AUTO_DISMISS_MS = 3500;

const typeStyles: Record<string, { bg: string; border: string; text: string }> = {
  success: { bg: 'rgba(25, 213, 96, 0.12)', border: 'rgba(25, 213, 96, 0.4)', text: Accent.success },
  error:   { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.4)', text: Accent.destructive },
  info:    { bg: 'rgba(244, 52, 180, 0.12)', border: 'rgba(244, 52, 180, 0.3)', text: Accent.primary },
};

function ToastItem({ id, message, type }: { id: string; message: string; type: string }) {
  const removeToast = useUIStore((s) => s.removeToast);
  const opacity = useRef(new Animated.Value(0)).current;
  const colors = typeStyles[type] ?? typeStyles.info;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    const timer = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() =>
      removeToast(id),
    );
  }

  return (
    <Animated.View style={[styles.toast, { backgroundColor: colors.bg, borderColor: colors.border, opacity }]}>
      <Pressable onPress={dismiss} style={styles.toastInner}>
        <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.container, { top: insets.top + Spacing[3] }]} pointerEvents="box-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing[6],
    right: Spacing[6],
    zIndex: 9999,
    gap: Spacing[2],
  },
  toast: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  toastInner: {
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
  },
  message: {
    fontFamily: Font.semiBold,
    fontSize: FontSize.bodySmall,
    lineHeight: 20,
  },
});
