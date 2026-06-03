import { StyleSheet, Text, View } from 'react-native'

export default function ListsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shopping Lists</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
  },
})
