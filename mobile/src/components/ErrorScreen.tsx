import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

interface ErrorScreenProps {
  title: string
  message: string
  stack?: string | null
  extra?: string | null
}

/**
 * Аварийный экран для отображения необработанных ошибок.
 * Намеренно не зависит от темы/контекста — работает, даже если
 * ThemeProvider или DbProvider упали.
 */
const ErrorScreen: React.FC<ErrorScreenProps> = ({ title, message, stack, extra }) => (
  <ScrollView
    style={styles.scroll}
    contentContainerStyle={styles.container}
    testID="error-screen"
  >
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.hint}>Перезапустите приложение</Text>
    </View>

    <Text style={styles.label}>Сообщение об ошибке:</Text>
    <Text style={styles.message} selectable>
      {message}
    </Text>

    {!!stack && (
      <>
        <Text style={styles.label}>Stack trace:</Text>
        <Text style={styles.mono} selectable>
          {stack}
        </Text>
      </>
    )}

    {!!extra && (
      <>
        <Text style={styles.label}>Component stack:</Text>
        <Text style={styles.mono} selectable>
          {extra}
        </Text>
      </>
    )}
  </ScrollView>
)

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#b00020',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#555',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 4,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 22,
  },
  mono: {
    fontSize: 11,
    color: '#333',
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 4,
    lineHeight: 16,
  },
})

export default ErrorScreen
