import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { beginNativePicker, endNativePicker } from '@/lib/security/native-picker-guard';

export type PickPhotoResult = { uri: string } | { error: string } | null;

/**
 * Compressão JPEG da foto. Não é recorte — a imagem sai em resolução cheia.
 * Fica em 0.8 porque o backend recusa upload acima de 3 MB e uma foto de
 * celular moderno em qualidade 1.0 passa disso com folga.
 */
const PHOTO_QUALITY = 0.8;

async function captureFrom(source: 'camera' | 'library'): Promise<PickPhotoResult> {
  beginNativePicker();
  try {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return { error: 'Permita o acesso à câmera nas configurações do aparelho para continuar.' };
      }
    }
    // `allowsEditing` é explicitamente false: no Android ele abre um recorte
    // quadrado obrigatório, que é exatamente o que faz a BlindPay rejeitar o
    // documento por "some edges or corners were cut off". É o default do
    // expo-image-picker, mas fica escrito para ninguém "melhorar" isso depois.
    const options = { allowsEditing: false, quality: PHOTO_QUALITY } as const;

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync({
            ...options,
            mediaTypes: ['images'],
          });

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
