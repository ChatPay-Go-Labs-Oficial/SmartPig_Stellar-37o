import { StyleSheet, ViewStyle, StyleProp, View } from 'react-native';
import { Colors, Radius } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'flat' | 'elevated';
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, variant = 'default', style }: CardProps) {
  const isElevated = variant === 'elevated';

  return (
    <View
      style={[
        styles.card,
        isElevated && styles.elevated,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
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
