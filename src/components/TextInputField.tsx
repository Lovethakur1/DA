import React from 'react'
import { Text, TextInput, View } from 'react-native'

interface Props {
  label?: string
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  secureTextEntry?: boolean
  keyboardType?: any
  error?: string | null
  editable?: boolean
}

const TextInputField = ({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, error, editable = true }: Props) => {
  return (
    <View className="mb-4">
      {label && <Text className="text-sm font-medium text-gray-700 mb-1">{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        editable={editable}
        className="border border-gray-200 rounded-xl px-4 py-3 text-base bg-white"
      />
      {error ? <Text className="text-xs text-red-500 mt-1">{error}</Text> : null}
    </View>
  )
}

export default TextInputField
