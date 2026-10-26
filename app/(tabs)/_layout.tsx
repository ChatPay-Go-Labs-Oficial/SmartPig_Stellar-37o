import { Tabs } from 'expo-router';
import { TabBar, type TabBarItem } from '@/components/v2';
import { useAutoWalletActivation } from '@/hooks/use-auto-wallet-activation';
import { useExperienceModeSync } from '@/hooks/use-experience-mode-sync';

const TABS: readonly TabBarItem[] = [
  { name: 'index',   title: 'Home',     icon: 'home' },
  // A rota segue "vaults": links e históricos apontam para ela.
  { name: 'vaults',  title: 'Guardar',  icon: 'piggy' },
  { name: 'learn',   title: 'Trilha',   icon: 'graduation' },
  { name: 'wallet',  title: 'Carteira', icon: 'wallet' },
  { name: 'profile', title: 'Perfil',   icon: 'user' },
];

// Abas já migradas para o V2 (fundo V2Colors.background). Sai quando todas forem.
const V2_ROUTES: ReadonlySet<string> = new Set(['vaults', 'wallet', 'profile']);

export default function TabLayout() {
  useAutoWalletActivation();
  useExperienceModeSync();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} items={TABS} v2Routes={V2_ROUTES} />}
      screenOptions={{ headerShown: false }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
    </Tabs>
  );
}
