import { Pressable, StyleSheet, Text, View } from 'react-native';
import { V2Colors, V2Font, withAlpha } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { Button3D, V2Icon, type V2IconName } from '@/components/v2';
import { EntryBackdrop } from './EntryBackdrop';

interface EntryBlockScreenProps {
  icon: V2IconName;
  /** Destaque (biometria, atualização) ou erro (sessão não carregou). */
  tone?: 'accent' | 'error';
  title: string;
  text: string;
  /** Linha vermelha abaixo do texto ("Biometria não confirmada..."). */
  alert?: string;
  /** Diagnóstico técnico, pequeno e apagado. */
  detail?: string | null;
  primary: { label: string; onPress: () => void; loading?: boolean; loadingLabel?: string };
  secondary?: { label: string; onPress: () => void; disabled?: boolean };
}

/**
 * Telas de bloqueio da entrada (Figma "Entrada · Bloqueios de acesso"): selo
 * com ícone, título, texto, um alerta opcional, o botão principal e, quando
 * há, a saída ("Sair da conta"). Usada na biometria, na sessão que não
 * carregou e na atualização obrigatória.
 */
export function EntryBlockScreen({
  icon,
  tone = 'accent',
  title,
  text,
  alert,
  detail,
  primary,
  secondary,
}: EntryBlockScreenProps) {
  const accent = useAccent();
  const color = tone === 'error' ? V2Colors.error : accent.base;

  return (
    <View style={styles.screen}>
      <EntryBackdrop stars={false} />
      <View style={styles.content}>
        <View
          style={[
            styles.seal,
            {
              backgroundColor: withAlpha(tone === 'error' ? '#ff5a7f' : accent.base, tone === 'error' ? 0.12 : 0.14),
              borderColor: withAlpha(tone === 'error' ? '#ff5a7f' : accent.base, tone === 'error' ? 0.3 : 0.32),
            },
          ]}
        >
          <V2Icon name={icon} size={36} color={tone === 'error' ? color : accent.light} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.text}>{text}</Text>
        {alert ? <Text style={styles.alert}>{alert}</Text> : null}
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        <View style={styles.actions}>
          <Button3D
            label={primary.label}
            onPress={primary.onPress}
            loading={primary.loading}
            loadingLabel={primary.loadingLabel}
          />
          {secondary ? (
            <Pressable
              onPress={secondary.onPress}
              disabled={secondary.disabled}
              hitSlop={8}
              style={styles.secondary}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryText}>{secondary.label}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: V2Colors.background,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 22,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  seal: {
    width: 80,
    height: 80,
    marginBottom: 10,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: V2Font.black,
    fontSize: 24,
    letterSpacing: -0.72,
    color: V2Colors.text,
    textAlign: 'center',
  },
  text: {
    maxWidth: 310,
    fontFamily: V2Font.medium,
    fontSize: 15,
    lineHeight: 22,
    color: V2Colors.textSecondary,
    textAlign: 'center',
  },
  alert: {
    maxWidth: 310,
    fontFamily: V2Font.medium,
    fontSize: 13,
    lineHeight: 19,
    color: V2Colors.error,
    textAlign: 'center',
  },
  detail: {
    maxWidth: 330,
    fontFamily: V2Font.medium,
    fontSize: 12,
    lineHeight: 18,
    color: V2Colors.textTertiary,
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 4,
    paddingTop: 12,
  },
  secondary: {
    paddingVertical: 12,
  },
  secondaryText: {
    fontFamily: V2Font.bold,
    fontSize: 12,
    letterSpacing: 0.12,
    color: V2Colors.textSecondary,
    textAlign: 'center',
  },
});
