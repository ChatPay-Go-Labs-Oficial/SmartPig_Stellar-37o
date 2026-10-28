import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { V2Colors, V2Font } from '@/constants/theme-v2';
import { Button3D } from '../Button3D';
import { V2Icon } from '../V2Icon';
import { V2Spinner } from '../V2Spinner';

interface LessonStateProps {
  kind: 'loading' | 'error';
  /** "Tentar novamente" do erro (35l). */
  onRetry?: () => void;
}

/**
 * Abrindo a lição (35k) e erro ao abrir (35l): o estado centrado no corpo da
 * moldura, com "Tentar novamente" embaixo no erro.
 */
function LessonStateView({ kind, onRetry }: LessonStateProps) {
  const error = kind === 'error';
  return (
    <View style={styles.body}>
      <View style={styles.spacer} />
      <View style={styles.state} accessibilityLiveRegion="polite">
        {error ? (
          <View style={styles.seal}>
            <V2Icon name="cloud-off" size={35} color={V2Colors.error} />
          </View>
        ) : (
          <V2Spinner size={18} />
        )}
        <Text style={styles.title}>{error ? 'Não foi possível abrir a lição' : 'Abrindo a lição'}</Text>
        <Text style={styles.text}>
          {error ? 'Confira sua conexão e tente de novo.' : 'Isso leva só um instante.'}
        </Text>
      </View>
      <View style={styles.spacer} />
      {error && onRetry ? <Button3D label="Tentar novamente" onPress={onRetry} /> : null}
    </View>
  );
}

export const LessonState = memo(LessonStateView);

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: 12,
  },
  spacer: {
    flex: 1,
  },
  state: {
    alignItems: 'center',
    gap: 12,
  },
  seal: {
    width: 76,
    height: 76,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(255,90,127,0.32)',
    backgroundColor: 'rgba(255,90,127,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: V2Font.black,
    fontSize: 20,
    textAlign: 'center',
    color: V2Colors.text,
  },
  text: {
    fontFamily: V2Font.medium,
    fontSize: 14,
    textAlign: 'center',
    color: V2Colors.textSecondary,
  },
});
