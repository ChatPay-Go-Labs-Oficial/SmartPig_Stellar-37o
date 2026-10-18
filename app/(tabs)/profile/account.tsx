import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ProfileSubScreen } from "@/components/profile/ProfileSubScreen";
import { DeleteAccountSheet } from "@/components/profile/DeleteAccountSheet";
import { V2Colors, V2Font, V2Radius, withAlpha } from "@/constants/theme-v2";

/**
 * Gerenciar conta (Figma 26q). Por enquanto só a exclusão; o fluxo dela vive
 * no DeleteAccountSheet (Figma 29a–29u).
 */
export default function ManageAccountScreen() {
  const [showDeletion, setShowDeletion] = useState(false);
  return (
    <ProfileSubScreen title="Gerenciar conta">
      <View style={styles.card}>
        <Text style={styles.title}>Excluir conta</Text>
        <Text style={styles.text}>
          Antes de excluir, saque todo o saldo da carteira e dos porquinhos. Essa ação não pode
          ser desfeita.
        </Text>
        <Text style={styles.hint}>
          Sair da conta encerra a sessão neste aparelho e você entra de novo quando quiser.
          Excluir apaga seus dados e não tem volta.
        </Text>
        <Pressable
          onPress={() => setShowDeletion(true)}
          style={({ pressed }) => [styles.delete, pressed && styles.deletePressed]}
          accessibilityRole="button"
        >
          <Text style={styles.deleteText}>Excluir conta</Text>
        </Pressable>
      </View>

      <DeleteAccountSheet visible={showDeletion} onClose={() => setShowDeletion(false)} />
    </ProfileSubScreen>
  );
}

const styles = StyleSheet.create({
  // Figma "card": a borda no vermelho de erro avisa que a ação é destrutiva.
  card: {
    gap: 6,
    padding: 16,
    borderRadius: V2Radius.list,
    borderWidth: 1,
    borderColor: withAlpha(V2Colors.error, 0.25),
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  title: {
    fontFamily: V2Font.extraBold,
    fontSize: 15,
    color: V2Colors.text,
  },
  text: {
    fontFamily: V2Font.medium,
    fontSize: 13,
    lineHeight: 19,
    color: V2Colors.textSecondary,
  },
  hint: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    lineHeight: 18,
    color: V2Colors.textSecondary,
  },
  delete: {
    marginTop: 8,
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: withAlpha(V2Colors.error, 0.35),
    backgroundColor: withAlpha(V2Colors.error, 0.08),
  },
  deletePressed: {
    backgroundColor: withAlpha(V2Colors.error, 0.16),
  },
  deleteText: {
    fontFamily: V2Font.extraBold,
    fontSize: 14.5,
    color: V2Colors.error,
  },
});
