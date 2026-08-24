import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Accent, Colors, Font } from '@/constants/theme';
import { useAutoWalletActivation } from '@/hooks/use-auto-wallet-activation';

type TabConfig = {
  name: string;
  title: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
};

const TABS: TabConfig[] = [
  { name: 'index',   title: 'Home',      icon: 'home' },
  { name: 'vaults',  title: 'Investir',  icon: 'bar-chart' },
  { name: 'learn',   title: 'Trilha',    icon: 'school' },
  { name: 'history', title: 'Histórico', icon: 'history' },
  { name: 'profile', title: 'Perfil',    icon: 'person' },
];

function PigFiTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const color = isFocused ? Accent.primary : Colors.mutedForeground;
          const tab = TABS.find((t) => t.name === route.name);

          const onPress = () => {
            Haptics.selectionAsync();
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.75}
              style={styles.tab}
            >
              <MaterialIcons name={tab?.icon ?? 'home'} size={24} color={color} />
              <Text style={[styles.tabLabel, { color }, isFocused && styles.tabLabelActive]}>
                {options.title ?? tab?.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  useAutoWalletActivation();

  return (
    <Tabs
      tabBar={(props) => <PigFiTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 26,
    height: 60,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: Font.semiBold,
  },
  tabLabelActive: {
    fontFamily: Font.bold,
  },
});
