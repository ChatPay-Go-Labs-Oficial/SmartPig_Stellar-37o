import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
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
  'chevron-right': 'chevron-right',
  'chevron-left': 'chevron-left',
  'chevron-down': 'chevron-down',
  download: 'download',
  lock: 'lock',
  x: 'x',
  gift: 'gift',
  check: 'check',
  alert: 'alert-circle',
  trending: 'trending-up',
  // Lucide volume-2 / volume-x (som da Home ligado e desligado).
  volume: 'volume-2',
  'volume-off': 'volume-x',
  home: 'home',
  user: 'user',
  settings: 'settings',
} as const;

// Sem par no Feather: cai para o contorno do Material Community.
const COMMUNITY = {
  piggy: 'piggy-bank-outline',
  // Lucide "history" (seta anti-horária com ponteiros); o Feather não tem.
  history: 'history',
  graduation: 'school-outline',
  wallet: 'wallet-outline',
  // Figma "shield" é o Lucide shield-check; o Feather só tem o escudo vazio.
  shield: 'shield-check-outline',
  // Lucide "coins": duas moedas sobrepostas.
  coins: 'circle-multiple-outline',
  // Lucide "sparkles" (estrela de quatro pontas): selo "Novo nível" e "Que legal!".
  sparkles: 'star-four-points-outline',
  // Lucide "fingerprint" (bloqueio por biometria).
  fingerprint: 'fingerprint',
} as const;

const MATERIAL = {
  pix: 'pix',
} as const;

export type V2IconName = keyof typeof FEATHER | keyof typeof COMMUNITY | keyof typeof MATERIAL;

interface V2IconProps {
  name: V2IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function V2Icon({ name, size = 24, color = V2Colors.text, style }: V2IconProps) {
  if (name in MATERIAL) {
    return (
      <MaterialIcons
        name={MATERIAL[name as keyof typeof MATERIAL]}
        size={size}
        color={color}
        style={style}
      />
    );
  }
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
