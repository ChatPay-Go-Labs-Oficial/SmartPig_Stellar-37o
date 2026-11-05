import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button3D, ListCard, V2Spinner, V2Switch, type V2IconName } from '@/components/v2';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { ProfileGroupTitle } from '@/components/profile/ProfileRows';
import { ProfileSubScreen } from '@/components/profile/ProfileSubScreen';
import { V2Colors, V2Font } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import type { NotificationPreferences } from '@/lib/api/notifications';
import {
  openNotificationSettings,
  refreshPushPermission,
  requestPushPermission,
} from '@/lib/notifications/push-token';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/lib/queries/notifications.queries';
import { useNotificationsStore } from '@/lib/stores/notifications.store';

type PreferenceKey = keyof NotificationPreferences;

const ALERTS: readonly {
  key: PreferenceKey;
  icon: V2IconName;
  label: string;
  description: string;
}[] = [
  { key: 'transactions', icon: 'coins', label: 'Movimentações', description: 'Pix, envios e presentes' },
  { key: 'updates', icon: 'download', label: 'Atualizações do app', description: 'Versões novas do PigFi' },
  { key: 'marketing', icon: 'sparkles', label: 'Novidades', description: 'Lançamentos e dicas' },
];

/**
 * Notificações (Figma 39b–39e), aberta pela linha das Preferências. Duas
 * camadas: a permissão do sistema, que é do aparelho (o cartão de cima só
 * aparece quando falta), e o que o PigFi avisa, que é da conta e vale em todos
 * os aparelhos.
 */
export default function NotificationsScreen() {
  const accent = useAccent();
  const permission = useNotificationsStore((s) => s.permission);
  const preferences = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  useEffect(() => {
    refreshPushPermission();
  }, []);

  // Pedido feito pela própria pessoa, aqui: conta como resposta à pré-tela.
  const enableOnDevice = () => {
    useNotificationsStore.getState().answerPrompt();
    requestPushPermission();
  };

  const toggle = (key: PreferenceKey) => (value: boolean) => update.mutate({ [key]: value });

  return (
    <ProfileSubScreen title="Notificações">
      <View style={styles.body}>
        {permission === 'undetermined' ? (
          <ProfileCard
            icon="bell"
            title="Ative neste aparelho"
            description="Para os avisos chegarem a este aparelho."
          >
            <View style={styles.cardAction}>
              <Button3D label="Ativar notificações" icon="bell" size="card" onPress={enableOnDevice} />
            </View>
          </ProfileCard>
        ) : permission === 'denied' ? (
          <ProfileCard
            icon="bell"
            title="Bloqueadas nos ajustes"
            description="Libere o PigFi nos ajustes do aparelho para receber os avisos."
          >
            <View style={styles.cardAction}>
              <Button3D
                label="Abrir ajustes"
                icon="settings"
                variant="glass"
                size="card"
                onPress={() => {
                  openNotificationSettings();
                }}
              />
            </View>
          </ProfileCard>
        ) : null}

        {preferences.data ? (
          <>
            <View>
              <ProfileGroupTitle title="Avisos" />
              <ListCard>
                {ALERTS.map((item) => (
                  <V2Switch
                    key={item.key}
                    icon={item.icon}
                    label={item.label}
                    description={item.description}
                    value={preferences.data[item.key]}
                    onChange={toggle(item.key)}
                  />
                ))}
              </ListCard>
            </View>

            <View>
              <ProfileGroupTitle title="Privacidade" />
              <ListCard>
                <V2Switch
                  icon="lock"
                  label="Mostrar valores"
                  description="E quem enviou o dinheiro"
                  value={preferences.data.showDetails}
                  onChange={toggle('showDetails')}
                />
              </ListCard>
              <Text style={styles.note}>
                Desligado, o aviso não mostra o valor nem quem enviou. Fica mais discreto na tela
                bloqueada.
              </Text>
            </View>

            {update.isError ? (
              <Text style={styles.error} accessibilityRole="alert">
                Não foi possível salvar a mudança. Tente de novo.
              </Text>
            ) : null}
          </>
        ) : preferences.isError ? (
          <View style={styles.state}>
            <Text style={styles.stateText}>Não foi possível carregar suas notificações.</Text>
            <Pressable onPress={() => preferences.refetch()} accessibilityRole="button" hitSlop={8}>
              <Text style={[styles.stateAction, { color: accent.base }]}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.state}>
            <V2Spinner />
          </View>
        )}
      </View>
    </ProfileSubScreen>
  );
}

const styles = StyleSheet.create({
  // Figma 39b: 22 entre os blocos, mais folga embaixo do título da tela.
  body: {
    flex: 1,
    gap: 22,
    paddingTop: 8,
  },
  cardAction: {
    paddingTop: 14,
  },
  note: {
    paddingTop: 8,
    paddingHorizontal: 4,
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: V2Colors.textTertiary,
  },
  error: {
    paddingHorizontal: 4,
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    color: V2Colors.error,
  },
  // Figma 39e, no padrão do erro da Carteira (17e).
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingBottom: 80,
  },
  stateText: {
    fontFamily: V2Font.semiBold,
    fontSize: 15,
    color: V2Colors.textSecondary,
    textAlign: 'center',
  },
  stateAction: {
    fontFamily: V2Font.extraBold,
    fontSize: 15,
  },
});
