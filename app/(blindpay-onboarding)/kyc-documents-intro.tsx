import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Accent, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { OnboardingBackButton, OnboardingProgress, PressableScale } from '@/components/ui';
import { useBlindPayStore } from '@/lib/stores/blindpay.store';
import { safeReplace } from '@/lib/navigation/safe-replace';

interface ChecklistItem {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
}

const CHECKLIST: ChecklistItem[] = [
  {
    icon: 'face',
    title: 'Uma selfie',
    description: 'Seu rosto visível, sem óculos escuros ou boné, em um lugar bem iluminado',
  },
  {
    icon: 'credit-card',
    title: 'Frente do documento',
    description: 'RG, CNH ou passaporte, com todos os dados legíveis',
  },
  {
    icon: 'credit-card',
    title: 'Verso do documento',
    description: 'Foto completa, sem cortes nas bordas',
  },
];

export default function KycDocumentsIntroScreen() {
  const setCurrentStep = useBlindPayStore((s) => s.setCurrentStep);

  function handleContinue() {
    setCurrentStep('kyc-selfie');
    safeReplace('/(blindpay-onboarding)/kyc-selfie');
  }

  return (
    <View style={styles.container}>
      <OnboardingBackButton />
      <OnboardingProgress step={5} total={10} />

      <View style={styles.iconWrap}>
        <MaterialIcons name="photo-camera" size={32} color={Accent.primary} />
      </View>

      <Text style={styles.title}>Vamos confirmar sua identidade</Text>
      <Text style={styles.subtitle}>
        Precisamos de 3 fotos rápidas para liberar depósitos e saques via Pix.
      </Text>

      <View style={styles.list}>
        {CHECKLIST.map((item, index) => (
          <View key={item.title} style={styles.listItem}>
            <View style={styles.listIconWrap}>
              <MaterialIcons name={item.icon} size={20} color={Accent.primary} />
            </View>
            <View style={styles.listText}>
              <Text style={styles.listTitle}>{item.title}</Text>
              <Text style={styles.listDescription}>{item.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.privacyRow}>
        <MaterialIcons name="shield" size={16} color={Colors.mutedForeground} />
        <Text style={styles.privacyText}>
          Suas fotos são usadas somente para verificação de identidade e tratadas com segurança.
        </Text>
      </View>

      <View style={styles.footer}>
        <PressableScale onPress={handleContinue}>
          <LinearGradient colors={Gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
            <Text style={styles.btnText}>Começar</Text>
          </LinearGradient>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing[6],
    paddingTop: 60,
    paddingBottom: Spacing[8],
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(244,52,180,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[4],
  },
  title: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
    color: Colors.foreground,
    marginBottom: Spacing[1],
  },
  subtitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 20,
    marginBottom: Spacing[6],
  },
  list: {
    gap: Spacing[4],
  },
  listItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  listIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  listText: {
    flex: 1,
    gap: 2,
  },
  listTitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  listDescription: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 17,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.muted,
    borderRadius: Radius.sm,
    padding: 12,
    marginTop: Spacing[6],
  },
  privacyText: {
    flex: 1,
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    lineHeight: 17,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  btn: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontWeight: '700',
    fontFamily: Font.bold,
  },
});
