import React from 'react'
import { TextInput, View } from 'react-native'

interface SearchBarProps {
  placeholder?: string
  onChangeText?: (text: string) => void
}

const SearchBar = ({ placeholder = "Search...", onChangeText }: SearchBarProps) => {
  return (
    <View style={{ 
      backgroundColor: '#f0f0f0', 
      borderRadius: 8, 
      paddingHorizontal: 16, 
      paddingVertical: 12 
    }}>
      <TextInput
        placeholder={placeholder}
        onChangeText={onChangeText}
        style={{ fontSize: 16 }}
      />
    </View>
  )
}

export default SearchBar