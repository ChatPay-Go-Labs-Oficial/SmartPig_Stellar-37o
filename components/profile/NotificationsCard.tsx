import { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button3D, V2Spinner, V2Switch } from '@/components/v2';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { V2Colors, V2Font } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import type { NotificationPreferences } from '@/lib/api/notifications';
import { isPushSupported } from '@/lib/notifications/config';
import { refreshPushPermission, requestPushPermission } from '@/lib/notifications/push-token';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/lib/queries/notifications.queries';
import { useNotificationsStore } from '@/lib/stores/notifications.store';

const SWITCHES: readonly {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
}[] = [
  {
    key: 'transactions',
    label: 'Transações',
    description: 'Depósitos, saques, Pix, dinheiro recebido e presentes.',
  },
  {
    key: 'updates',
    label: 'Atualizações do app',
    description: 'Quando sair uma versão nova do PigFi.',
  },
  {
    key: 'marketing',
    label: 'Novidades',
    description: 'Recursos novos e promoções.',
  },
  {
    key: 'showDetails',
    label: 'Mostrar valores e remetente nas notificações',
    description: 'Desligado, o aviso não diz o valor nem quem enviou: mais discreto na tela bloqueada.',
  },
];

/**
 * Card "Notificações" das Preferências: o que o backend manda (por conta) e,
 * acima disso, a permissão do sistema (por aparelho). Sem a permissão as
 * escolhas continuam valendo, só não chegam a este aparelho; o card diz isso e
 * leva aos ajustes. Na web não aparece: não há push.
 */
export function NotificationsCard() {
  return isPushSupported ? <NotificationsCardContent /> : null;
}

function NotificationsCardContent() {
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

  return (
    <ProfileCard
      icon="bell"
      title="Notificações"
      description="Escolha o que o PigFi te avisa. Vale para todos os aparelhos em que você entrar."
    >
      {permission === 'denied' ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            As notificações estão desligadas nos ajustes do aparelho. Ligue por lá para receber os
            avisos.
          </Text>
          <Button3D
            label="Abrir ajustes"
            variant="glass"
            size="compact"
            onPress={() => {
              Linking.openSettings().catch(() => {});
            }}
          />
        </View>
      ) : permission === 'undetermined' ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Este aparelho ainda não recebe notificações do PigFi.
          </Text>
          <Button3D
            label="Ativar notificações"
            size="compact"
            icon="bell"
            onPress={enableOnDevice}
          />
        </View>
      ) : null}

      <View style={styles.switches}>
        {preferences.data ? (
          SWITCHES.map((item) => (
            <V2Switch
              key={item.key}
              label={item.label}
              description={item.description}
              value={preferences.data[item.key]}
              onChange={(value) => update.mutate({ [item.key]: value })}
            />
          ))
        ) : preferences.isError ? (
          <View style={styles.state}>
            <Text style={styles.stateText}>Não foi possível carregar suas preferências.</Text>
            <Pressable
              onPress={() => preferences.refetch()}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={[styles.stateAction, { color: accent.base }]}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.state}>
            <V2Spinner />
          </View>
        )}
      </View>

      {update.isError ? (
        <Text style={styles.error} accessibilityRole="alert">
          Não foi possível salvar a mudança. Tente de novo.
        </Text>
      ) : null}
    </ProfileCard>
  );
}

const styles = StyleSheet.create({
  notice: {
    gap: 10,
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: V2Colors.chipBorder,
    backgroundColor: V2Colors.chip,
  },
  noticeText: {
    fontFamily: V2Font.medium,
    fontSize: 13,
    lineHeight: 19,
    color: V2Colors.text,
  },
  switches: {
    paddingTop: 8,
  },
  state: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  stateText: {
    fontFamily: V2Font.medium,
    fontSize: 13,
    color: V2Colors.textSecondary,
    textAlign: 'center',
  },
  stateAction: {
    fontFamily: V2Font.bold,
    fontSize: 14,
  },
  error: {
    paddingTop: 6,
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    color: V2Colors.error,
  },
});
