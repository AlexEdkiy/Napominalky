import React from 'react'
import { View } from 'react-native'

/**
 * Пустой экран-заглушка. Используется для вкладки create-placeholder —
 * она никогда не отображается напрямую (tabBarButton перехватывает нажатие).
 */
const NullScreen: React.FC = () => <View />

export default NullScreen
