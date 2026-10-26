import { Fragment, memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { V2Colors, V2Font, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { V2Icon, type V2IconName } from '../V2Icon';

interface XpWaysCardProps {
  /** XP de cada forma de ganhar, vindo do backend; null enquanto não chega. */
  dailyRewardXp: number | null;
  lessonXp: number | null;
  moduleXp: number | null;
}

/**
 * Como ganhar XP (Figma 36c): só aprender dá XP. Recompensa do dia, lição
 * concluída e módulo concluído; dinheiro nunca.
 */
function XpWaysCardView({ dailyRewardXp, lessonXp, moduleXp }: XpWaysCardProps) {
  const accent = useAccent();
  const ways: { icon: V2IconName; label: string; xp: number | null }[] = [
    { icon: 'gift', label: 'Recompensa do dia', xp: dailyRewardXp },
    { icon: 'book', label: 'Lição concluída', xp: lessonXp },
    { icon: 'trophy', label: 'Módulo concluído', xp: moduleXp },
  ];
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Como ganhar XP</Text>
      {ways.map((way, index) => (
        <Fragment key={way.label}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <View style={[styles.row, index === 0 && styles.firstRow]}>
            <View
              style={[
                styles.seal,
                { backgroundColor: accent.alpha(0.14), borderColor: accent.alpha(0.32) },
              ]}
            >
              <V2Icon name={way.icon} size={17} color={accent.light} />
            </View>
            <Text style={styles.label}>{way.label}</Text>
            {way.xp !== null ? (
              <Text style={[styles.xp, { color: accent.light }]}>+{way.xp} XP</Text>
            ) : null}
          </View>
        </Fragment>
      ))}
      <Text style={styles.note}>
        Guardar, tirar, trocar e enviar dinheiro não dão XP. Seu nível mostra o que você aprendeu; a
        evolução do porquinho mostra o que você guardou.
      </Text>
    </View>
  );
}

export const XpWaysCard = memo(XpWaysCardView);

const styles = StyleSheet.create({
  card: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderRadius: V2Radius.list,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorderStrong,
    backgroundColor: V2Colors.surface,
  },
  title: {
    fontFamily: V2Font.extraBold,
    fontSize: 15,
    color: V2Colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  firstRow: {
    paddingTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  seal: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontFamily: V2Font.medium,
    fontSize: 14,
    color: V2Colors.text,
  },
  xp: {
    fontFamily: V2Font.extraBold,
    fontSize: 14,
  },
  note: {
    paddingTop: 10,
    fontFamily: V2Font.medium,
    fontSize: 12,
    lineHeight: 17.4,
    color: V2Colors.textTertiary,
  },
});
