import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ScreenGlow, SubScreenHeader } from '@/components/v2';
import { V2Colors, V2Layout } from '@/constants/theme-v2';
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
        <SubScreenHeader title={title} />
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
});
