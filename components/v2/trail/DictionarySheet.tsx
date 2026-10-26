import { Fragment, memo } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { V2Colors, V2Font } from '@/constants/theme-v2';
import type { GlossaryEntry } from '@/lib/api/learning';
import { V2Sheet } from '../V2Sheet';

/** Figma 34k: a lista rola dentro do sheet, que sobe até 19% da tela. */
const LIST_HEIGHT = 0.7;

interface DictionarySheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** As palavras do Lite e, no Pro, as dez a mais. */
  entries: readonly GlossaryEntry[];
}

/** Dicionário da trilha (Figma 34k): consulta opcional, com rolagem. */
function DictionarySheetView({ visible, onClose, title, entries }: DictionarySheetProps) {
  const { height } = useWindowDimensions();
  return (
    <V2Sheet visible={visible} onClose={onClose} title={title} icon="book">
      <ScrollView style={{ maxHeight: height * LIST_HEIGHT }} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>Consulta opcional. Volte aqui quando quiser lembrar uma palavra.</Text>
        <View style={styles.entries}>
          {entries.map((entry, index) => (
            <Fragment key={entry.term}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.entry}>
                <Text style={styles.term}>{entry.term}</Text>
                <Text style={styles.explanation}>{entry.explanation}</Text>
              </View>
            </Fragment>
          ))}
        </View>
      </ScrollView>
    </V2Sheet>
  );
}

export const DictionarySheet = memo(DictionarySheetView);

const styles = StyleSheet.create({
  intro: {
    fontFamily: V2Font.medium,
    fontSize: 13.5,
    color: V2Colors.textSecondary,
  },
  entries: {
    paddingTop: 10,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  entry: {
    gap: 3,
    paddingVertical: 12,
  },
  term: {
    fontFamily: V2Font.extraBold,
    fontSize: 15,
    lineHeight: 18.75,
    color: V2Colors.text,
  },
  explanation: {
    fontFamily: V2Font.medium,
    fontSize: 13.5,
    color: V2Colors.textSecondary,
  },
});
