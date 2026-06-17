import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'

type IoniconName = React.ComponentProps<typeof Ionicons>['name']
type MaterialName = React.ComponentProps<typeof MaterialIcons>['name']

interface IconSquareProps {
  icon: IoniconName | MaterialName
  iconSet?: 'ionicons' | 'material'
  iconColor: string
  bgColor: string
  size?: number
  radius?: number
}

const IconSquare: React.FC<IconSquareProps> = ({
  icon,
  iconSet = 'ionicons',
  iconColor,
  bgColor,
  size = 48,
  radius = 14,
}) => {
  const iconSize = Math.round(size * 0.5)

  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: radius, backgroundColor: bgColor },
      ]}
    >
      {iconSet === 'material' ? (
        <MaterialIcons name={icon as MaterialName} size={iconSize} color={iconColor} />
      ) : (
        <Ionicons name={icon as IoniconName} size={iconSize} color={iconColor} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default IconSquare
