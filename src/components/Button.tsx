import React from 'react'
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native'

interface Props {
  title: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  style?: any
}

const Button = ({ title, onPress, loading = false, disabled = false, style }: Props) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className="rounded-xl py-3 px-4 items-center"
      style={[{ backgroundColor: '#289294' }, style]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="text-white text-base font-semibold">{title}</Text>
      )}
    </TouchableOpacity>
  )
}

export default Button
