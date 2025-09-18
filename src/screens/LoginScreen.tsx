import { useAuth } from '@/src/auth/AuthContext'
import Button from '@/src/components/Button'
import TextInputField from '@/src/components/TextInputField'
import { useNavigation } from '@react-navigation/native'
import React, { useState } from 'react'
import { Text, View } from 'react-native'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

const LoginScreen = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; server?: string }>({})
  const [loading, setLoading] = useState(false)
  const navigation = useNavigation()
  const auth = useAuth()

  const handleSubmit = async () => {
    setErrors({})
    const parsed = schema.safeParse({ email, password })
    if (!parsed.success) {
      const formErrors: any = {}
      parsed.error.errors.forEach(e => {
        if (e.path[0] === 'email') formErrors.email = e.message
        if (e.path[0] === 'password') formErrors.password = e.message
      })
      setErrors(formErrors)
      return
    }

    setLoading(true)
    try {
      await auth.loginWithOtp(email, password)
      // navigate to OTP screen with email param
      // @ts-ignore
      navigation.navigate('Otp', { email })
    } catch (error: any) {
      setErrors({ server: error?.message || 'Network error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="flex-1 bg-white px-6 justify-center">
      <Text className="text-3xl font-bold mb-6" style={{ color: '#289294' }}>Sign In</Text>
      {errors.server ? <Text className="text-sm text-red-500 mb-3">{errors.server}</Text> : null}
      <TextInputField label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" error={errors.email} keyboardType="email-address" />
      <TextInputField label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry error={errors.password} />
      <Button title="Request OTP" onPress={handleSubmit} loading={loading} />
    </View>
  )
}

export default LoginScreen
