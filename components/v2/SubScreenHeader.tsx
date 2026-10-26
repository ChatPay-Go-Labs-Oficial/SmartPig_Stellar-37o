import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { V2Colors, V2Font, V2Layout, V2Radius } from '@/constants/theme-v2';
import { V2Icon } from './V2Icon';

interface SubScreenHeaderProps {
  title: string;
}

/**
 * Barra superior das telas internas (Figma "barra superior"): voltar no círculo
 * de vidro e o título. Perfil (26i–26p) e Seu nível (36a).
 */
export function SubScreenHeader({ title }: SubScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        style={styles.back}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        hitSlop={8}
      >
        <V2Icon name="chevron-left" size={22} color={V2Colors.text} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: V2Layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 4,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: V2Radius.full,
    backgroundColor: V2Colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flexShrink: 1,
    fontFamily: V2Font.black,
    fontSize: 22,
    letterSpacing: -0.44,
    color: V2Colors.text,
  },
});
