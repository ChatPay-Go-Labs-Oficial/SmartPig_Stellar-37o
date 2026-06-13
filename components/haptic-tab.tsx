import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { useSound } from '@/hooks/use-sound';

export function HapticTab(props: BottomTabBarButtonProps) {
  const { playNav } = useSound();

  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        playNav();
        props.onPressIn?.(ev);
      }}
    />
  );
}
