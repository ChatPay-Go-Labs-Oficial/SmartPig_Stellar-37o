import { StyleSheet, Text, View } from 'react-native';
import { Button3D, SheetLink, V2Sheet } from '@/components/v2';
import { V2Colors, V2Font } from '@/constants/theme-v2';

interface NotificationPermissionSheetProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Pré-tela do pedido de permissão. Vem antes do diálogo do sistema porque um
 * "não" no diálogo é definitivo no iOS (e no Android, depois da segunda vez):
 * a pessoa só vê o pedido real depois de entender por que ele existe.
 */
export function NotificationPermissionSheet({
  visible,
  onAccept,
  onDecline,
}: NotificationPermissionSheetProps) {
  return (
    <V2Sheet
      visible={visible}
      onClose={onDecline}
      title="Quer saber quando o dinheiro chegar?"
      icon="bell"
    >
      <View style={styles.body}>
        <Text style={styles.text}>
          A gente avisa quando um depósito cair, um Pix sair ou alguém te enviar dinheiro. Nada de
          propaganda sem você pedir.
        </Text>
        <Text style={styles.text}>
          Você escolhe o que recebe em Perfil, Preferências, e pode mudar quando quiser.
        </Text>
        <View style={styles.actions}>
          <Button3D label="Ativar notificações" icon="bell" onPress={onAccept} />
          <SheetLink label="Agora não" onPress={onDecline} />
        </View>
      </View>
    </V2Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 12,
  },
  text: {
    fontFamily: V2Font.medium,
    fontSize: 14,
    lineHeight: 21,
    color: V2Colors.textSecondary,
  },
  actions: {
    gap: 8,
    paddingTop: 6,
  },
});
