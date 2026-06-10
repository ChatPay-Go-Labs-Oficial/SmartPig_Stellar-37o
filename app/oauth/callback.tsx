import { Colors } from '@/constants/theme';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

export default function OAuthCallbackScreen() {
  useEffect(() => {
    router.replace('/(auth)');
  }, []);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
