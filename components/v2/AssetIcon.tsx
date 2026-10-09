import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { V2Colors } from '@/constants/theme-v2';
import { V2Icon } from './V2Icon';

const LOGOS = {
  USDC: require('@/assets/images/assets/usdc.png'),
  EURC: require('@/assets/images/assets/eurc.png'),
  XLM: require('@/assets/images/assets/xlm.png'),
} as const;

export type AssetLogoId = keyof typeof LOGOS;

interface AssetIconProps {
  asset: AssetLogoId;
  size?: number;
  /** Ativo ainda não liberado: logo esmaecido com cadeado. */
  locked?: boolean;
}

/** Logo do ativo (Figma "v2/Ativo/<código>"). */
export function AssetIcon({ asset, size = 40, locked = false }: AssetIconProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Image
        source={LOGOS[asset]}
        style={{ width: size, height: size, borderRadius: size * 0.225, opacity: locked ? 0.4 : 1 }}
        contentFit="contain"
        accessibilityIgnoresInvertColors
      />
      {locked && (
        <View style={styles.lock}>
          <V2Icon name="lock" size={10} color={V2Colors.textSecondary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  lock: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: V2Colors.sheetTop,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
