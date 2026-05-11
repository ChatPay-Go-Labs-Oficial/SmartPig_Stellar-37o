import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Radius } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'flat';
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, variant = 'default', style }: CardProps) {
  if (variant === 'flat') {
    return (
      <LinearGradient
        colors={Gradients.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.94, y: 1 }}
        style={[styles.card, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={Gradients.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.94, y: 1 }}
      style={[styles.card, styles.elevated, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 22,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
});
