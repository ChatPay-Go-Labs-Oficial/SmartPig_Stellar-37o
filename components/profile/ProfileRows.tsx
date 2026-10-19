import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { V2Colors, V2Font } from '@/constants/theme-v2';
import { V2Icon, type V2IconName } from '@/components/v2';

/** Título de um grupo do Perfil (Figma "título do grupo": "Conta", "App"). */
export function ProfileGroupTitle({ title }: { title: string }) {
  return (
    <Text style={styles.groupTitle} accessibilityRole="header">
      {title}
    </Text>
  );
}

interface ProfileRowProps {
  icon: V2IconName;
  title: string;
  /** Linha de status embaixo do título ("Aprovado"), na cor do estado. */
  status?: { label: string; color: string };
  /** Valor à direita, antes da seta ("Lite"). */
  value?: string;
  onPress: () => void;
}

/**
 * Linha do Perfil dentro de um ListCard (Figma "verificação", "preferências",
 * "gerenciar conta"): selo com o ícone, título e seta.
 */
function ProfileRowView({ icon, title, status, value, onPress }: ProfileRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={[title, status?.label, value].filter(Boolean).join(', ')}
    >
      <View style={styles.seal}>
        <V2Icon name={icon} size={19} color={V2Colors.text} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {status ? (
          <Text style={[styles.status, { color: status.color }]} numberOfLines={1}>
            {status.label}
          </Text>
        ) : null}
      </View>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      <V2Icon name="chevron-right" size={18} color={V2Colors.text} />
    </Pressable>
  );
}

export const ProfileRow = memo(ProfileRowView);

const styles = StyleSheet.create({
  groupTitle: {
    paddingLeft: 4,
    paddingBottom: 8,
    fontFamily: V2Font.extraBold,
    fontSize: 11,
    letterSpacing: 1.54,
    textTransform: 'uppercase',
    color: V2Colors.textTertiary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  seal: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    fontFamily: V2Font.semiBold,
    fontSize: 15,
    color: V2Colors.onPrimary,
  },
  status: {
    fontFamily: V2Font.bold,
    fontSize: 12.5,
  },
  value: {
    fontFamily: V2Font.bold,
    fontSize: 12.5,
    color: V2Colors.textTertiary,
  },
});
