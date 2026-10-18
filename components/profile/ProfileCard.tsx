import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { V2Colors, V2Font, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { V2Icon, type V2IconName } from '@/components/v2';

interface ProfileCardProps {
  icon: V2IconName;
  title: string;
  /** À direita do título (a pílula de status da Verificação). */
  trailing?: ReactNode;
  /** Texto de apoio abaixo do cabeçalho. */
  description: string;
  children?: ReactNode;
}

/**
 * Card das telas internas do Perfil (Figma "card" de Preferências e de
 * Verificação): selo do tema, título, texto de apoio e o controle embaixo.
 */
export function ProfileCard({ icon, title, trailing, description, children }: ProfileCardProps) {
  const accent = useAccent();
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.seal, { backgroundColor: accent.alpha(0.16) }]}>
          <V2Icon name={icon} size={19} color={accent.base} />
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {trailing}
      </View>
      <Text style={styles.description}>{description}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: V2Radius.list,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
  },
  seal: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: V2Font.extraBold,
    fontSize: 15,
    color: V2Colors.text,
  },
  description: {
    fontFamily: V2Font.medium,
    fontSize: 13,
    lineHeight: 19,
    color: V2Colors.textSecondary,
  },
});
