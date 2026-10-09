import { Fragment, Children } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { V2Colors, V2Radius } from '@/constants/theme-v2';

interface ListCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Cartão de lista V2: linhas separadas por divisor de 1 px. */
export function ListCard({ children, style }: ListCardProps) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.card, style]}>
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 && <View style={styles.divider} />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: V2Colors.surface,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorder,
    borderRadius: V2Radius.list,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: V2Colors.divider,
  },
});
