import { useAuth } from '@/src/auth/AuthContext'
import Button from '@/src/components/Button'
import KeyboardAwareView from '@/src/components/KeyboardAwareView'
import TextInputField from '@/src/components/TextInputField'
import { useNavigation, useRoute } from '@react-navigation/native'
import React, { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { z } from 'zod'

const schema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits')
})

const OtpScreen = () => {
  const route = useRoute()
  // @ts-ignore
  const email = route.params?.email || ''
  const [otp, setOtp] = useState('')
  const [errors, setErrors] = useState<{ otp?: string; server?: string }>({})
  const [loading, setLoading] = useState(false)
  const auth = useAuth()
  const navigation = useNavigation()

  useEffect(() => {
    if (!auth.loading && auth.isAuthenticated) {
      // @ts-ignore
      navigation.reset({ index: 0, routes: [{ name: 'Profile' }] })
    }
  }, [auth.loading, auth.isAuthenticated, navigation])

  const handleSubmit = async () => {
    setErrors({})
    const parsed = schema.safeParse({ otp })
    if (!parsed.success) {
      setErrors({ otp: parsed.error.issues[0].message })
      return
    }

    setLoading(true)
    try {
      await auth.verifyOtp(email, otp)
      // @ts-ignore
      navigation.reset({ index: 0, routes: [{ name: 'Profile' }] })
    } catch (error: any) {
      setErrors({ server: error?.message || 'Verification failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAwareView>
      <View className="flex-1 bg-white px-6 justify-center">
        <Text className="text-2xl font-semibold mb-4" style={{ color: '#289294' }}>Enter OTP</Text>
        <Text className="text-sm text-gray-600 mb-6">OTP sent to: {email}</Text>
        {errors.server ? <Text className="text-sm text-red-500 mb-3">{errors.server}</Text> : null}
        <TextInputField label="OTP" value={otp} onChangeText={setOtp} placeholder="Enter 6-digit code" keyboardType="numeric" error={errors.otp} />
        <Button title="Verify OTP" onPress={handleSubmit} loading={loading} />
      </View>
    </KeyboardAwareView>
  )
}

export default OtpScreen
