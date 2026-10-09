import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { StyleProp, TextStyle } from 'react-native';
import { V2Colors } from '@/constants/theme-v2';

// Os ícones V2 do Figma são do Lucide (traço 2). O Lucide nasceu como fork do
// Feather, que já vem no @expo/vector-icons — mesmo desenho e mesmo traço, sem
// adicionar react-native-svg (dependência nativa, exigiria build novo).
//
// O nome é o do ícone no Figma ("v2/Ícone/<nome>"); o mapa resolve o glifo.
// Ícone novo entra aqui, nunca como glifo solto na tela.
const FEATHER = {
  plus: 'plus',
  'arrow-up': 'arrow-up',
  'arrow-down': 'arrow-down',
  'refresh-cw': 'refresh-cw',
  send: 'send',
  copy: 'copy',
  info: 'info',
  // Lucide "history" não tem par no Feather; rotate-ccw é o mais próximo.
  history: 'rotate-ccw',
  'chevron-right': 'chevron-right',
  'chevron-left': 'chevron-left',
  lock: 'lock',
  x: 'x',
  gift: 'gift',
  check: 'check',
  alert: 'alert-circle',
} as const;

// Sem par no Feather: cai para o contorno do Material Community.
const COMMUNITY = {
  piggy: 'piggy-bank-outline',
} as const;

export type V2IconName = keyof typeof FEATHER | keyof typeof COMMUNITY;

interface V2IconProps {
  name: V2IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function V2Icon({ name, size = 24, color = V2Colors.text, style }: V2IconProps) {
  if (name in COMMUNITY) {
    return (
      <MaterialCommunityIcons
        name={COMMUNITY[name as keyof typeof COMMUNITY]}
        size={size}
        color={color}
        style={style}
      />
    );
  }
  return (
    <Feather name={FEATHER[name as keyof typeof FEATHER]} size={size} color={color} style={style} />
  );
}
