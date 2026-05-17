import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Font, FontSize, Gradients } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function WithdrawScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={Gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBanner}
      >
        <Text style={styles.heading}>Sacar</Text>
        <Text style={styles.sub}>Vault {id}</Text>
      </LinearGradient>

      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Em breve — saque via WalletConnect</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing[8] },
  headerBanner: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: Spacing[6],
  },
  heading: {
    fontSize: FontSize.displaySm,
    fontFamily: Font.black,
    color: '#fff',
  },
  sub: {
    fontSize: FontSize.body,
    fontFamily: Font.semiBold,
    color: 'rgba(255,255,255,0.7)',
    marginTop: Spacing[1],
  },
  placeholder: {
    paddingHorizontal: Spacing[6],
    alignItems: 'center',
    paddingTop: Spacing[12],
  },
  placeholderText: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
});
