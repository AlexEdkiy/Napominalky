import { Redirect } from 'expo-router'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { useAuthStore } from '@/stores/authStore'

export default function Index() {
  const isHydrated = useAuthStore((state) => state.isHydrated)
  const token = useAuthStore((state) => state.token)
  const guestMode = useAuthStore((state) => state.guestMode)

  if (!isHydrated) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  if (token || guestMode) {
    return <Redirect href="/(tabs)" />
  }

  return <Redirect href="/(onboarding)" />
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
})
