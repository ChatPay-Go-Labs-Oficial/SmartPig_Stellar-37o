import { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import {
  IconSymbol,
  PressableScale,
  MyGiftsModal,
  TransferModal,
} from '@/components/ui';
import {
  Accent,
  Colors,
  Font,
  FontSize,
  Radius,
  Spacing,
} from '@/constants/theme';
import { useTerms } from '@/hooks/use-terms';
import { blockerCopy } from '@/lib/copy/blockers';
import type { Blocker } from '@/lib/api/account-deletion';
import { useAccountDeletionEligibility } from '@/lib/queries/account-deletion.queries';

export default function DeleteAccountScreen() {
  const { mode } = useTerms();
  const { data, isPending, isError, refetch, isRefetching } =
    useAccountDeletionEligibility();

  const [showTransfer, setShowTransfer] = useState(false);
  const [showGifts, setShowGifts] = useState(false);

  function handleAction(blocker: Blocker) {
    const action = blocker.action;
    if (!action) return;

    switch (action.type) {
      case 'WITHDRAW_VAULT':
        if (action.vaultId) router.push(`/vault/${action.vaultId}/withdraw`);
        return;
      case 'WITHDRAW_WALLET':
        setShowTransfer(true);
        return;
      case 'OPEN_GIFTS':
        setShowGifts(true);
        return;
      case 'OPEN_RAMP':
        router.push('/(tabs)');
        return;
    }
  }

  const blockers = data?.blockers ?? [];
  const eligible = data?.eligible === true;

  return (
    <>
      <View style={styles.screen}>
        <LinearGradient
          colors={['hsl(0, 60%, 22%)', 'hsl(260, 20%, 8%)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
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
            <Text style={styles.headerTitle}>Excluir minha conta</Text>
          </View>
          <Text style={styles.headerSub}>
            Antes de tudo, vamos conferir se você pode sair sem perder nada.
          </Text>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={Colors.mutedForeground}
            />
          }
        >
          {isPending && (
            <View style={styles.centered}>
              <ActivityIndicator color={Accent.primary} />
              <Text style={styles.muted}>Verificando sua conta...</Text>
            </View>
          )}

          {isError && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Não conseguimos verificar sua conta
              </Text>
              <Text style={styles.cardDetail}>
                Tente de novo em alguns instantes.
              </Text>
              <PressableScale onPress={() => void refetch()}>
                <View style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Tentar de novo</Text>
                </View>
              </PressableScale>
            </View>
          )}

          {!isPending && !isError && blockers.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>
                Ainda não dá para excluir
              </Text>
              <Text style={styles.sectionSub}>
                Resolva os pontos abaixo primeiro. Eles existem para o seu
                dinheiro não se perder.
              </Text>

              {blockers.map((blocker, index) => {
                const copy = blockerCopy(blocker, mode);
                return (
                  <View key={`${blocker.code}-${index}`} style={styles.card}>
                    <View style={styles.cardHead}>
                      <MaterialIcons
                        name={blocker.resolvable ? 'error-outline' : 'schedule'}
                        size={20}
                        color={
                          blocker.resolvable
                            ? Accent.accent
                            : Colors.mutedForeground
                        }
                      />
                      <Text style={styles.cardTitle}>{copy.title}</Text>
                    </View>
                    <Text style={styles.cardDetail}>{copy.detail}</Text>
                    {copy.cta && (
                      <PressableScale onPress={() => handleAction(blocker)}>
                        <View style={styles.secondaryBtn}>
                          <Text style={styles.secondaryBtnText}>
                            {copy.cta}
                          </Text>
                        </View>
                      </PressableScale>
                    )}
                  </View>
                );
              })}

              <PressableScale onPress={() => void refetch()}>
                <View style={styles.ghostBtn}>
                  <Text style={styles.ghostBtnText}>Verificar de novo</Text>
                </View>
              </PressableScale>
            </>
          )}

          {!isPending && !isError && eligible && (
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <MaterialIcons
                  name="check-circle-outline"
                  size={20}
                  color={Accent.success}
                />
                <Text style={styles.cardTitle}>Sua conta pode ser excluída</Text>
              </View>
              <Text style={styles.cardDetail}>
                Não encontramos dinheiro parado nem operação em andamento.
              </Text>
            </View>
          )}

          {/*
            O botão de continuar nasce desabilitado e só habilita com
            `eligible: true`. Não existe "excluir mesmo assim": a checagem
            protege o dinheiro do usuário, não é um aviso que se possa dispensar.
            O passo 2 chega com a Fase 5.
          */}
          <View
            style={[styles.primaryBtn, !eligible && styles.primaryBtnDisabled]}
          >
            <Text
              style={[
                styles.primaryBtnText,
                !eligible && styles.primaryBtnTextDisabled,
              ]}
            >
              Continuar
            </Text>
          </View>
        </ScrollView>
      </View>

      <TransferModal
        visible={showTransfer}
        onClose={() => {
          setShowTransfer(false);
          void refetch();
        }}
      />
      <MyGiftsModal
        visible={showGifts}
        onClose={() => {
          setShowGifts(false);
          void refetch();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[6],
    gap: Spacing[3],
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    fontFamily: Font.bold,
    fontSize: FontSize.heading,
    color: Colors.foreground,
  },
  headerSub: {
    fontFamily: Font.regular,
    fontSize: FontSize.bodySmall,
    color: 'rgba(255,255,255,0.75)',
  },

  body: { padding: Spacing[4], gap: Spacing[3], paddingBottom: 120 },
  centered: { alignItems: 'center', gap: Spacing[3], paddingVertical: Spacing[8] },
  muted: {
    fontFamily: Font.regular,
    fontSize: FontSize.bodySmall,
    color: Colors.mutedForeground,
  },

  sectionTitle: {
    fontFamily: Font.bold,
    fontSize: FontSize.subheading,
    color: Colors.foreground,
  },
  sectionSub: {
    fontFamily: Font.regular,
    fontSize: FontSize.bodySmall,
    color: Colors.mutedForeground,
    marginBottom: Spacing[2],
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    gap: Spacing[2],
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  cardTitle: {
    flex: 1,
    fontFamily: Font.semiBold,
    fontSize: FontSize.body,
    color: Colors.foreground,
  },
  cardDetail: {
    fontFamily: Font.regular,
    fontSize: FontSize.bodySmall,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },

  secondaryBtn: {
    marginTop: Spacing[2],
    paddingVertical: Spacing[3],
    borderRadius: Radius.md,
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryBtnText: {
    fontFamily: Font.semiBold,
    fontSize: FontSize.bodySmall,
    color: Colors.foreground,
  },

  ghostBtn: { paddingVertical: Spacing[3], alignItems: 'center' },
  ghostBtnText: {
    fontFamily: Font.semiBold,
    fontSize: FontSize.bodySmall,
    color: Colors.mutedForeground,
  },

  primaryBtn: {
    marginTop: Spacing[4],
    paddingVertical: Spacing[4],
    borderRadius: Radius.md,
    alignItems: 'center',
    backgroundColor: Accent.destructive,
  },
  primaryBtnDisabled: { backgroundColor: Colors.muted },
  primaryBtnText: {
    fontFamily: Font.bold,
    fontSize: FontSize.body,
    color: Colors.foreground,
  },
  primaryBtnTextDisabled: { color: Colors.mutedForeground },
});
