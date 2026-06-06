import { PropsWithChildren, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PressableScale } from '@/components/ui/PressableScale';
import { Colors } from '@/constants/theme';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ThemedView>
      <PressableScale onPress={() => setIsOpen((value) => !value)}>
        <View style={styles.heading}>
          <IconSymbol
            name="chevron.right"
            size={18}
            weight="medium"
            color={Colors.mutedForeground}
            style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
          />
          <ThemedText type="defaultSemiBold">{title}</ThemedText>
        </View>
      </PressableScale>
      {isOpen && <ThemedView style={styles.content}>{children}</ThemedView>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    marginTop: 6,
    marginLeft: 24,
  },
});
