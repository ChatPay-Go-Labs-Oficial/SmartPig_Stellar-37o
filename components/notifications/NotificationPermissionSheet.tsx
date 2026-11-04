import { StyleSheet, Text, View } from 'react-native';
import { Button3D, SheetLink, V2Sheet } from '@/components/v2';
import { V2Colors, V2Font } from '@/constants/theme-v2';

interface NotificationPermissionSheetProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Pré-tela do pedido de permissão (Figma 39f/39g, no padrão da 28a). Vem antes
 * do diálogo do sistema porque um "não" no diálogo é definitivo no iOS (e no
 * Android, depois da segunda vez): o pedido real só sai se a pessoa tocar em
 * "Ativar notificações".
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
      title="Deseja receber as notificações do PigFi?"
      icon="bell"
    >
      <View style={styles.body}>
        <Text style={styles.text}>Dá para mudar quando quiser, em Preferências.</Text>
        <Button3D label="Ativar notificações" icon="bell" onPress={onAccept} />
        <SheetLink label="Agora não" onPress={onDecline} />
      </View>
    </V2Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 14,
  },
  text: {
    fontFamily: V2Font.medium,
    fontSize: 14,
    lineHeight: 21,
    color: V2Colors.textSecondary,
  },
});
