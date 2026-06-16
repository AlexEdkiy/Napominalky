import React from 'react'

import ErrorScreen from './ErrorScreen'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
  info: string | null
}

/**
 * React Error Boundary — ловит render-ошибки и ошибки жизненного цикла детей.
 * Показывает полный текст ошибки, stack trace и componentStack для диагностики
 * release-сборок. Намеренно не зависит от темы/контекста.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error, info: null }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ error, info: errorInfo.componentStack ?? null })
  }

  render(): React.ReactNode {
    const { error, info } = this.state

    if (error !== null) {
      return (
        <ErrorScreen
          title="Ошибка приложения"
          message={error.message}
          stack={error.stack ?? null}
          extra={info}
        />
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
