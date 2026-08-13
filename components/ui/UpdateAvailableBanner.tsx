import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Accent, Colors, Font, FontSize, Radius, Spacing } from "@/constants/theme";

interface UpdateAvailableBannerProps {
  storeUrl: string;
  onDismiss: () => void;
}

export function UpdateAvailableBanner({
  storeUrl,
  onDismiss,
}: UpdateAvailableBannerProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + Spacing[2] }]}
    >
      <View style={styles.banner}>
        <Text style={styles.text} numberOfLines={2}>
          Nova versão do PigFi disponível
        </Text>

        <Pressable
          onPress={() => Linking.openURL(storeUrl)}
          accessibilityRole="button"
          accessibilityLabel="Atualizar agora"
        >
          <Text style={styles.action}>Atualizar</Text>
        </Pressable>

        <Pressable
          onPress={onDismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Fechar aviso de atualização"
        >
          <MaterialIcons name="close" size={18} color={Colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 20,
    paddingHorizontal: Spacing[4],
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    width: "100%",
  },
  text: {
    flex: 1,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.foreground,
  },
  action: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Accent.primary,
  },
});
