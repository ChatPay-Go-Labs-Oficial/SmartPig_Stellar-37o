import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { V2Colors, V2Font, V2Radius, withAlpha } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { Button3D, ListCard, V2Icon, type V2IconName } from '@/components/v2';
import type { TermKey } from '@/lib/copy/terms';
import { formatApy } from '@/lib/utils/format';
import type { Piggy } from '@/lib/utils/piggy';

/** Margem das seções abaixo do carrossel (Figma: 18; o título entra mais 4). */
export const SECTION_GUTTER = 18;

// Lista das seções da Guardar: raio 20 e divisor 6% (Figma), um pouco mais
// justos que o padrão do ListCard.
const LIST_RADIUS = 20;
const LIST_DIVIDER = 'rgba(255,255,255,0.06)';

interface PiggyNoticeProps {
  piggy: Piggy;
}

/**
 * Aviso do porquinho selecionado (Figma 10g e 10h): depósitos pausados ou
 * aceite de riscos pendente. Sem aviso, não renderiza nada.
 */
export const PiggyNotice = memo(function PiggyNotice({ piggy }: PiggyNoticeProps) {
  const { t } = useTerms();

  if (piggy.depositsPaused) {
    return <Notice icon="alert" text={t('guardar.notice.paused')} />;
  }
  if (piggy.risksPending) {
    // "Ler os riscos" abre o aceite (Figma 10g → 13a).
    return (
      <Notice icon="shield" text={t('guardar.notice.risks')}>
        <Button3D
          label={t('guardar.notice.risks.cta')}
          variant="glass"
          onPress={() => router.push({ pathname: '/vault/[id]/risks', params: { id: piggy.vault.id } })}
        />
      </Notice>
    );
  }
  return null;
});

function Notice({ icon, text, children }: { icon: V2IconName; text: string; children?: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.notice} accessibilityRole="alert">
        <View style={styles.noticeRow}>
          <V2Icon name={icon} size={18} color={V2Colors.warning} />
          <Text style={styles.noticeText}>{text}</Text>
        </View>
        {children}
      </View>
    </View>
  );
}

interface PiggyHowItWorksProps {
  piggy: Piggy;
}

/** "Como ele funciona" do porquinho selecionado (Figma 10a / 10d). */
export const PiggyHowItWorks = memo(function PiggyHowItWorks({ piggy }: PiggyHowItWorksProps) {
  const { t, p } = useTerms();
  const { asset, vault } = piggy;
  const apy = vault.apy != null ? formatApy(vault.apy) : null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {t('guardar.how.title')}
        </Text>
      </View>
      <ListCard style={styles.list} dividerColor={LIST_DIVIDER}>
        {apy && (
          <HowRow
            icon="trending"
            title={p('guardar.rate', { apy })}
            caption={t('guardar.how.rate.caption')}
          />
        )}
        <HowRow
          icon="arrow-up"
          title={t('guardar.how.withdraw.title')}
          caption={t('guardar.how.withdraw.caption')}
        />
        {asset && (
          <HowRow
            icon="shield"
            title={t(`guardar.how.${asset}.title` as TermKey)}
            caption={t(`guardar.how.${asset}.caption` as TermKey)}
          />
        )}
        <DetailsLink vaultId={vault.id} />
      </ListCard>
    </View>
  );
});

/** Última linha da lista: abre a tela Detalhes (Figma 12a–12f). */
function DetailsLink({ vaultId }: { vaultId: string }) {
  const accent = useAccent();
  const { t } = useTerms();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/vault/[id]', params: { id: vaultId } })}
      style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
      accessibilityRole="link"
    >
      <Text style={[styles.linkText, { color: accent.base }]}>{t('guardar.details.link')}</Text>
      <V2Icon name="chevron-right" size={15} color={accent.base} />
    </Pressable>
  );
}

function HowRow({ icon, title, caption }: { icon: V2IconName; title: string; caption: string }) {
  const accent = useAccent();
  return (
    <View style={styles.row} accessible accessibilityLabel={`${title}. ${caption}`}>
      <View style={[styles.rowBadge, { backgroundColor: accent.alpha(0.16) }]}>
        <V2Icon name={icon} size={18} color={accent.light} />
      </View>
      <View style={styles.rowTexts}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowCaption}>{caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: 24,
    paddingHorizontal: SECTION_GUTTER,
  },
  sectionTitleRow: {
    paddingHorizontal: 4,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontFamily: V2Font.black,
    fontSize: 17,
    letterSpacing: -0.34,
    color: V2Colors.onPrimary,
  },
  list: {
    borderRadius: LIST_RADIUS,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTexts: {
    flex: 1,
    gap: 1,
  },
  rowTitle: {
    fontFamily: V2Font.extraBold,
    fontSize: 14,
    color: V2Colors.onPrimary,
  },
  rowCaption: {
    fontFamily: V2Font.medium,
    fontSize: 12,
    color: V2Colors.textTertiary,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 13,
  },
  linkPressed: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  linkText: {
    fontFamily: V2Font.extraBold,
    fontSize: 13,
  },
  notice: {
    gap: 12,
    padding: 16,
    borderRadius: V2Radius.key,
    borderWidth: 1,
    borderColor: withAlpha(V2Colors.warning, 0.3),
    backgroundColor: withAlpha(V2Colors.warning, 0.1),
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontFamily: V2Font.medium,
    fontSize: 13,
    lineHeight: 13 * 1.45,
    color: V2Colors.textSecondary,
  },
});
