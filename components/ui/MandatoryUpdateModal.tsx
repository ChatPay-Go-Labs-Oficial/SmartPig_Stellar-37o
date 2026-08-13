import { Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  Accent,
  Colors,
  Font,
  FontSize,
  Gradients,
  Radius,
  Spacing,
} from "@/constants/theme";

interface MandatoryUpdateModalProps {
  storeUrl: string;
}

export function MandatoryUpdateModal({ storeUrl }: MandatoryUpdateModalProps) {
  return (
    <Modal
      visible
      animationType="none"
      transparent={false}
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconWrap}
        >
          <MaterialIcons name="system-update" size={36} color="#fff" />
        </LinearGradient>

        <Text style={styles.title}>Atualize o PigFi</Text>
        <Text style={styles.text}>
          Uma nova versão obrigatória está disponível. Atualize para
          continuar usando o app.
        </Text>

        <Pressable
          onPress={() => Linking.openURL(storeUrl)}
          style={styles.primaryBtn}
          accessibilityRole="button"
          accessibilityLabel="Atualizar agora"
        >
          <Text style={styles.primaryText}>Atualizar agora</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing[6],
    gap: 14,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  title: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
    color: Colors.foreground,
    textAlign: "center",
  },
  text: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 300,
  },
  primaryBtn: {
    width: "100%",
    maxWidth: 320,
    borderRadius: Radius.sm,
    backgroundColor: Accent.primary,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  primaryText: {
    fontSize: FontSize.body,
    fontFamily: Font.black,
    color: "#fff",
  },
});
