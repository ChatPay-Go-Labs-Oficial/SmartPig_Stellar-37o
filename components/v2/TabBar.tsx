import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import {
  V2Colors,
  V2Font,
  V2Layout,
  blendOver,
  tabBarBottomGap,
  withAlpha,
} from '@/constants/theme-v2';
import { Colors } from '@/constants/theme';
import { useAccent } from '@/hooks/use-accent';
import { V2Icon, type V2IconName } from './V2Icon';

export interface TabBarItem {
  /** Nome da rota no navegador de abas. */
  name: string;
  title: string;
  icon: V2IconName;
}

interface TabBarProps extends BottomTabBarProps {
  items: readonly TabBarItem[];
  /**
   * Abas que já estão no visual V2. Durante a migração as demais pintam o
   * fundo do V1, e o degradê atrás da barra acompanha o fundo de cada uma.
   */
  v2Routes: ReadonlySet<string>;
}

// Figma "v2/Tab bar": vidro rgba(28,22,40,.74) com desfoque. Sem expo-blur no
// build, a barra fica sobre o degradê que já chega a 98% do fundo; o vidro
// composto sobre esse fundo dá a mesma cor, agora opaca — e opaca a sombra do
// Android (elevation) não vaza por dentro da barra.
const BAR_FILL = blendOver('#1c1628', 0.74, V2Colors.background);
const INACTIVE = withAlpha('#f4f5f7', 0.42);

/**
 * Tab bar flutuante do V2 (Figma "v2/Tab bar"): ícone ativo no destaque e
 * rótulo branco 800; inativos a 42%. Inclui o degradê que esconde o conteúdo
 * rolando por baixo.
 */
export function TabBar({ state, descriptors, navigation, items, v2Routes }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const activeRoute = state.routes[state.index]?.name;
  const fade = v2Routes.has(activeRoute) ? V2Colors.background : Colors.background;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: tabBarBottomGap(insets.bottom) }]}
    >
      {/* O degradê esconde o conteúdo e também segura o toque: sem isso, um
          toque logo abaixo da barra acionava um botão invisível por trás. */}
      <LinearGradient
        colors={[withAlphaColor(fade, 0), withAlphaColor(fade, 0.98), withAlphaColor(fade, 0.98)]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
      />
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const item = items.find((t) => t.name === route.name);
          if (!item) return null;
          const { options } = descriptors[route.key];
          return (
            <TabButton
              key={route.key}
              title={options.title ?? item.title}
              icon={item.icon}
              focused={state.index === index}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (state.index !== index && !event.defaultPrevented) {
                  navigation.navigate(route.name as never);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

interface TabButtonProps {
  title: string;
  icon: V2IconName;
  focused: boolean;
  onPress: () => void;
}

const TabButton = memo(function TabButton({ title, icon, focused, onPress }: TabButtonProps) {
  const accent = useAccent();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [styles.tab, pressed && !focused && styles.tabPressed]}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={title}
    >
      <V2Icon name={icon} size={22} color={focused ? accent.base : INACTIVE} />
      <Text
        style={[styles.label, focused ? styles.labelActive : styles.labelInactive]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
      >
        {title}
      </Text>
    </Pressable>
  );
});

/** `#rrggbb` ou `hsl(...)` → mesma cor com opacidade (o fundo V1 é HSL). */
function withAlphaColor(color: string, alpha: number): string {
  if (color.startsWith('#')) return withAlpha(color, alpha);
  return color.replace(/^hsl\((.*)\)$/, `hsla($1, ${alpha})`);
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    // Figma: o degradê tem 98 de altura e a barra transborda o padding de 12
    // do componente, ficando a 4 do topo do degradê.
    paddingTop: 4,
    paddingHorizontal: 10,
  },
  bar: {
    width: '100%',
    maxWidth: V2Layout.maxWidth - 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: BAR_FILL,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 17,
    elevation: 14,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  tabPressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 10,
  },
  labelActive: {
    fontFamily: V2Font.extraBold,
    color: '#ffffff',
  },
  labelInactive: {
    fontFamily: V2Font.semiBold,
    color: INACTIVE,
  },
});
