import React from 'react'
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, ViewStyle } from 'react-native'

interface Props {
  children: React.ReactNode
  contentContainerStyle?: ViewStyle
}

const KeyboardAwareView: React.FC<Props> = ({ children, contentContainerStyle }) => {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={[{ flexGrow: 1, paddingBottom: 24 }, contentContainerStyle as any]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  )
}

export default KeyboardAwareView
