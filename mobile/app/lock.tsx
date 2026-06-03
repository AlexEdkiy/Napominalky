import { SafeAreaView, StyleSheet, Text, View } from 'react-native'

export default function LockScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Приложение заблокировано</Text>
        <Text style={styles.note}>
          Разблокировка по PIN-коду и биометрии появится позже (MOB-18 / MOB-19).
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', textAlign: 'center' },
  note: { fontSize: 15, color: '#6a6a6a', textAlign: 'center', lineHeight: 22 },
})
