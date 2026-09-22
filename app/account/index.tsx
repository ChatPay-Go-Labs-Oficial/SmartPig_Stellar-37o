import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import {
  DeleteAccountSheet,
  IconSymbol,
  PressableScale,
  SettingsRow,
} from '@/components/ui';
import { Colors, Font, FontSize, Gradients, Spacing } from '@/constants/theme';

/**
 * Precisa ser rota, não modal: o sheet de exclusão é `Modal`, e um Modal sobe
 * acima de todas as rotas, deixando esta tela visível atrás dele.
 */
export default function AccountSettingsScreen() {
  const [showDeletion, setShowDeletion] = useState(false);
  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={Gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerRow}>
            <PressableScale onPress={() => router.back()}>
              <View style={styles.backBtn}>
                <IconSymbol
                  name="chevron.right"
                  size={24}
                  color={Colors.foreground}
                  style={{ transform: [{ rotate: '180deg' }] }}
                />
              </View>
            </PressableScale>
            <Text style={styles.headerTitle}>Configurações da conta</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Encerrar conta</Text>
        <SettingsRow
          icon="delete-outline"
          tone="destructive"
          title="Excluir minha conta"
          subtitle="Apaga seus dados e encerra sua conta em definitivo"
          hint="Sair da conta encerra a sessão neste aparelho e você entra de novo quando quiser. Excluir apaga seus dados e não tem volta."
          onPress={() => setShowDeletion(true)}
        />
      </ScrollView>

      <DeleteAccountSheet
        visible={showDeletion}
        onClose={() => setShowDeletion(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  header: {
    paddingTop: 56,
    paddingBottom: Spacing[8],
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerContent: {
    paddingHorizontal: Spacing[6],
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.subheading,
    fontFamily: Font.extraBold,
    color: '#fff',
  },

  body: {
    paddingHorizontal: 20,
    paddingTop: Spacing[6],
    paddingBottom: 40,
    gap: Spacing[3],
  },
  sectionLabel: {
    paddingHorizontal: Spacing[1],
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
