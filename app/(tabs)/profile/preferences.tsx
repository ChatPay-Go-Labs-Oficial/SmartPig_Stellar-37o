import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ListCard, SegmentedControl, type SegmentOption } from "@/components/v2";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { ProfileRow } from "@/components/profile/ProfileRows";
import { ProfileSubScreen } from "@/components/profile/ProfileSubScreen";
import { ProModeSheet } from "@/components/profile/ProModeSheet";
import {
  useAppMode,
  useAppModeActions,
  useAppModeReady,
  type AppMode,
} from "@/hooks/use-app-mode";
import { useSound } from "@/hooks/use-sound";
import { isPushSupported } from "@/lib/notifications/config";
import { refreshPushPermission } from "@/lib/notifications/push-token";
import { useNotificationsStore } from "@/lib/stores/notifications.store";

const MODE_OPTIONS: readonly SegmentOption<AppMode>[] = [
  { id: "lite", label: "Lite" },
  { id: "pro", label: "Pro" },
];

/**
 * Preferências (Figma 26i/26j): o modo do app e a entrada das notificações
 * (39a), que abre a tela Notificações. A Cor do app, que o Figma também
 * mostra aqui, entra na PR seguinte.
 */
export default function PreferencesScreen() {
  const mode = useAppMode();
  const modeReady = useAppModeReady();
  const { setMode, markProExplainerSeen, hasSeenProExplainer } = useAppModeActions();
  const { playInvestirConfirmacao } = useSound();
  const [showProSheet, setShowProSheet] = useState(false);
  const pushPermission = useNotificationsStore((s) => s.permission);

  useEffect(() => {
    refreshPushPermission();
  }, []);

  // "Desligadas" quando este aparelho não tem a permissão (negada ou nunca
  // pedida); nada enquanto o app ainda não leu.
  const notificationsValue =
    pushPermission === "granted" ? "Ligadas" : pushPermission ? "Desligadas" : undefined;

  /**
   * A pergunta vem *antes* da troca, não como aviso depois: quem toca em "Pro"
   * sem saber o que muda pode recuar sem nunca ter visto um endereço na tela.
   * Voltar para o Lite nunca a reabre.
   */
  function handleSelectMode(next: AppMode) {
    if (next === "pro" && !hasSeenProExplainer) {
      setShowProSheet(true);
      return;
    }
    setMode(next);
  }

  function handleConfirmPro() {
    setShowProSheet(false);
    markProExplainerSeen();
    setMode("pro");
    playInvestirConfirmacao();
  }

  return (
    <ProfileSubScreen title="Preferências">
      <ProfileCard
        icon="settings"
        title="Modo do app"
        description={
          mode === "pro"
            ? "Você está no modo Pro: endereços, transações e termos técnicos ficam à vista."
            : "Modo simples, do jeito que a maioria usa. Ative o Pro quando quiser ver os detalhes técnicos."
        }
      >
        <View style={styles.selector}>
          <SegmentedControl
            options={MODE_OPTIONS}
            value={mode}
            onChange={handleSelectMode}
            size="large"
            disabled={!modeReady}
          />
        </View>
      </ProfileCard>

      {/* Na web não há push. */}
      {isPushSupported ? (
        <ListCard>
          <ProfileRow
            icon="bell"
            title="Notificações"
            value={notificationsValue}
            onPress={() => router.push("/profile/notifications")}
          />
        </ListCard>
      ) : null}

      <ProModeSheet
        visible={showProSheet}
        onConfirm={handleConfirmPro}
        onClose={() => setShowProSheet(false)}
      />
    </ProfileSubScreen>
  );
}

const styles = StyleSheet.create({
  selector: {
    paddingTop: 14,
  },
});
