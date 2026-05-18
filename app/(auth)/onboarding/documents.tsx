import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OnboardingHeader } from '@/components/ui/OnboardingHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useOnboardingStore } from '@/lib/stores/onboarding.store';
import { OnboardingService } from '@/lib/services/onboarding.service';
import { Colors, Font, FontSize, Spacing, Radius, Accent } from '@/constants/theme';
import { ComponentProps, useState } from 'react';

const ChevronRight = () => <IconSymbol name="chevron.right" size={18} color="#fff" />;

async function pickImage() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
  });
  if (!result.canceled) return result.assets[0].uri;
  return null;
}

export default function DocumentsScreen() {
  const documents = useOnboardingStore((s) => s.documents);
  const saveDocuments = useOnboardingStore((s) => s.saveDocuments);
  const [loading, setLoading] = useState(false);

  async function handlePickSelfie() {
    const uri = await pickImage();
    if (uri) saveDocuments({ selfieUri: uri });
  }

  async function handlePickDocument() {
    const uri = await pickImage();
    if (uri) saveDocuments({ documentUri: uri });
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      await OnboardingService.submitDocuments(documents);
      router.push('/(auth)/onboarding/pix');
    } finally {
      setLoading(false);
    }
  }

  const bothReady = !!documents.selfieUri && !!documents.documentUri;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <OnboardingHeader />
        <ProgressBar currentStep={3} />

        <View style={styles.body}>
          <Text style={styles.title}>Verificação de Identidade</Text>
          <Text style={styles.description}>
            Para sua segurança, precisamos de uma selfie e uma foto do seu documento de identidade
            (RG ou CNH).
          </Text>

          <View style={styles.cards}>
            <DocCard
              icon="camera.fill"
              title="Selfie"
              subtitle="Posicione seu rosto claramente"
              uri={documents.selfieUri}
              onPress={handlePickSelfie}
            />
            <DocCard
              icon="person.text.rectangle.fill"
              title="Documento de Identidade"
              subtitle="RG ou CNH (frente e verso)"
              uri={documents.documentUri}
              onPress={handlePickDocument}
            />
          </View>
        </View>

        <Button
          label="Enviar para Análise"
          rightIcon={<ChevronRight />}
          variant="primary"
          size="lg"
          fullWidth
          disabled={!bothReady}
          loading={loading}
          onPress={handleSubmit}
        />
      </View>
    </SafeAreaView>
  );
}

function DocCard({
  icon,
  title,
  subtitle,
  uri,
  onPress,
}: {
  icon: ComponentProps<typeof IconSymbol>['name'];
  title: string;
  subtitle: string;
  uri: string | null;
  onPress: () => void;
}) {
  return (
    <View style={[docStyles.card, uri ? docStyles.cardDone : null]}>
      {uri ? (
        <Image source={{ uri }} style={docStyles.preview} resizeMode="cover" />
      ) : (
        <View style={docStyles.iconBox}>
          <IconSymbol name={icon} size={26} color={Accent.primary} />
        </View>
      )}

      <View style={docStyles.info}>
        <Text style={docStyles.title}>{title}</Text>
        <Text style={docStyles.subtitle}>{subtitle}</Text>
        {uri ? <Badge label="Verificado" variant="sucesso" /> : null}
      </View>

      <Pressable onPress={onPress} style={docStyles.editBtn} hitSlop={8}>
        <IconSymbol name={uri ? 'pencil' : 'plus'} size={16} color={Colors.foreground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flex: 1,
    paddingHorizontal: Spacing[6],
    paddingBottom: Spacing[8],
    gap: Spacing[4],
  },
  body: {
    flex: 1,
    gap: Spacing[4],
    paddingTop: Spacing[2],
  },
  title: {
    fontFamily: Font.black,
    fontSize: FontSize.heading,
    color: Colors.foreground,
  },
  description: {
    fontFamily: Font.regular,
    fontSize: FontSize.body,
    color: Colors.mutedForeground,
    lineHeight: 24,
  },
  cards: {
    gap: Spacing[4],
    marginTop: Spacing[2],
  },
});

const docStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing[4],
  },
  cardDone: {
    borderColor: 'rgba(25, 213, 96, 0.35)',
    backgroundColor: 'rgba(25, 213, 96, 0.05)',
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(244, 52, 180, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: Font.bold,
    fontSize: FontSize.body,
    color: Colors.foreground,
  },
  subtitle: {
    fontFamily: Font.regular,
    fontSize: FontSize.bodySmall,
    color: Colors.mutedForeground,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
