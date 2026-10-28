import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { V2Colors, V2Font, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import type { DailyRewardStatus } from '@/lib/api/experience';
import { Button3D } from '../Button3D';
import { V2Icon } from '../V2Icon';

interface DailyRewardCardProps {
  reward: DailyRewardStatus;
  claiming: boolean;
  onClaim: () => void;
}

/**
 * Recompensa do dia no Seu nível: disponível com o "Pegar" (36a), recebida
 * com a pílula verde até o dia seguinte (36b).
 */
function DailyRewardCardView({ reward, claiming, onClaim }: DailyRewardCardProps) {
  const accent = useAccent();
  return (
    <View style={styles.card}>
      <View style={[styles.seal, { backgroundColor: accent.alpha(0.14), borderColor: accent.alpha(0.32) }]}>
        <V2Icon name="gift" size={20} color={accent.light} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.title}>Recompensa do dia</Text>
        <Text style={styles.support}>
          {reward.available
            ? `+${reward.xp} XP, uma vez por dia`
            : `+${reward.xp} XP hoje. Volte amanhã.`}
        </Text>
      </View>
      {reward.available ? (
        <Button3D
          label="Pegar"
          size="compact"
          onPress={onClaim}
          loading={claiming}
          style={styles.take}
          accessibilityHint={`Ganha ${reward.xp} XP`}
        />
      ) : (
        <View style={styles.received}>
          <V2Icon name="check" size={13} color={V2Colors.success} />
          <Text style={styles.receivedText}>Recebida</Text>
        </View>
      )}
    </View>
  );
}

export const DailyRewardCard = memo(DailyRewardCardView);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: V2Radius.list,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorderStrong,
    backgroundColor: V2Colors.surface,
  },
  seal: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    fontFamily: V2Font.extraBold,
    fontSize: 15,
    color: V2Colors.text,
  },
  support: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    color: V2Colors.textSecondary,
  },
  // Figma "botão Pegar": 84 de largura.
  take: {
    width: 84,
  },
  received: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(61,224,138,0.32)',
    backgroundColor: 'rgba(61,224,138,0.14)',
  },
  receivedText: {
    fontFamily: V2Font.extraBold,
    fontSize: 12.5,
    color: V2Colors.success,
  },
});
