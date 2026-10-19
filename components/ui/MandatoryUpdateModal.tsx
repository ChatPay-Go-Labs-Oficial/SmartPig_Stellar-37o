import { Linking, Modal } from "react-native";
import { EntryBlockScreen } from "@/components/entry/EntryBlockScreen";

interface MandatoryUpdateModalProps {
  storeUrl: string;
}

/** Atualização obrigatória (Figma 12c): bloqueia o app até atualizar. */
export function MandatoryUpdateModal({ storeUrl }: MandatoryUpdateModalProps) {
  return (
    <Modal
      visible
      animationType="none"
      transparent={false}
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {}}
    >
      <EntryBlockScreen
        icon="download"
        title="Atualize o PigFi"
        text="Uma nova versão obrigatória está disponível. Atualize para continuar usando o app."
        primary={{ label: "Atualizar agora", onPress: () => Linking.openURL(storeUrl) }}
      />
    </Modal>
  );
}
