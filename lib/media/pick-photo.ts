import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { beginNativePicker, endNativePicker } from '@/lib/security/native-picker-guard';

export type PickPhotoResult = { uri: string } | { error: string } | null;

async function captureFrom(source: 'camera' | 'library'): Promise<PickPhotoResult> {
  beginNativePicker();
  try {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return { error: 'Permita o acesso à câmera nas configurações do aparelho para continuar.' };
      }
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });

    if (!result.canceled && result.assets[0]) {
      return { uri: result.assets[0].uri };
    }
    return null;
  } finally {
    endNativePicker();
  }
}

/** Pergunta se o usuário quer tirar a foto na hora ou escolher uma já existente. */
export function pickPhoto(): Promise<PickPhotoResult> {
  return new Promise((resolve) => {
    Alert.alert(
      'Adicionar foto',
      'Como você quer enviar a foto?',
      [
        { text: 'Tirar foto', onPress: () => captureFrom('camera').then(resolve) },
        { text: 'Escolher da galeria', onPress: () => captureFrom('library').then(resolve) },
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
      ],
      // No Android o alerta é dismissível tocando fora da caixa por padrão —
      // nesse caminho nenhum onPress dispara, e sem onDismiss a Promise nunca
      // resolveria, travando a tela chamadora em "Selecionando foto...".
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
