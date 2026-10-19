import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenGlow, V2Icon } from '@/components/v2';
import { V2Colors, V2Font, V2Layout, V2Radius } from '@/constants/theme-v2';
import { useScreenInsets } from '@/hooks/use-screen-insets';

interface ProfileSubScreenProps {
  title: string;
  children: ReactNode;
}

/**
 * Moldura das telas internas do Perfil (Figma 26i–26p): brilho do tema no
 * topo, voltar e título, como o Histórico da Carteira.
 */
export function ProfileSubScreen({ title, children }: ProfileSubScreenProps) {
  const screenInsets = useScreenInsets();
  return (
    <View style={styles.screen}>
      {/* Figma "brilho": tema a 24% no centro. */}
      <ScreenGlow peak={0.24} />
      <ScrollView
        style={{ marginTop: screenInsets.top }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: screenInsets.topGap, paddingBottom: screenInsets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
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
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: V2Colors.background,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: V2Layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: V2Layout.gutter,
    gap: 14,
  },
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
