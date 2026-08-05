import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  Colors,
  Accent,
  Font,
  FontSize,
  Gradients,
  Radius,
  Spacing,
} from "@/constants/theme";
import { StarryBackground } from "@/components/ui";
import { OnboardingBackButton } from "@/components/ui/OnboardingBackButton";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useCreateEtherfuseCustomer } from "@/lib/queries/etherfuse.queries";
import { useEtherfuseStore } from "@/lib/stores/etherfuse.store";

export default function OrganizationScreen() {
  const contractId = useAuthStore((s) => s.contractId);
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const setCurrentStep = useEtherfuseStore((s) => s.setCurrentStep);
  const createCustomer = useCreateEtherfuseCustomer();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!firstName.trim() || !lastName.trim()) {
      setError("Nome e sobrenome são obrigatórios");
      return;
    }
    setError("");
    try {
      await createCustomer.mutateAsync({
        userId: contractId!,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        displayName: `${firstName.trim()} ${lastName.trim()}`,
      });
      setCurrentStep("kyc-form");
      router.replace("/(etherfuse-onboarding)/kyc-form" as any);
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || "Erro ao criar conta",
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="padding"
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <StarryBackground />
        <View style={styles.content}>
          <OnboardingBackButton />
          <Text style={styles.title}>Criar Conta Etherfuse</Text>
          <Text style={styles.subtitle}>
            Precisamos criar sua conta na Etherfuse para{" "}
            {walletAddress ? "realizar operações com PIX" : "continuar"}
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={styles.input}
              placeholder="Seu nome"
              placeholderTextColor={Colors.mutedForeground}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Sobrenome *</Text>
            <TextInput
              style={styles.input}
              placeholder="Seu sobrenome"
              placeholderTextColor={Colors.mutedForeground}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="email@exemplo.com"
              placeholderTextColor={Colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              inputMode="email"
              autoCapitalize="none"
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <LinearGradient
              colors={Gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.btn,
                createCustomer.isPending && styles.btnDisabled,
              ]}
            >
              <Text
                style={styles.btnText}
                onPress={handleSubmit}
                disabled={createCustomer.isPending}
              >
                {createCustomer.isPending ? "Criando..." : "Criar Conta"}
              </Text>
            </LinearGradient>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    minHeight: "100%",
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing[6],
    paddingTop: 80,
    paddingBottom: 60,
    zIndex: 10,
  },
  title: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
    color: Colors.foreground,
    marginBottom: Spacing[2],
  },
  subtitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 22,
    marginBottom: Spacing[8],
  },
  form: {
    gap: Spacing[3],
  },
  label: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing[4],
    paddingVertical: 14,
    color: Colors.foreground,
    fontSize: FontSize.body,
    fontFamily: Font.regular,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: "center",
    marginTop: Spacing[4],
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    color: "#fff",
    fontSize: FontSize.body,
    fontWeight: "700",
    fontFamily: Font.bold,
  },
  errorText: {
    color: Accent.destructive,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
  },
});
