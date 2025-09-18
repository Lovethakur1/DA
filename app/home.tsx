import { useRouter } from 'expo-router'
import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

const Home = () => {
  const router = useRouter()

  const handleGetStarted = () => {
    router.replace('/(tabs)/attendance')
  }

  const handleLogout = () => {
    router.replace('/login')
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-16">
        <Text className="text-4xl font-bold text-center mb-2" style={{ color: '#289294' }}>
          🎉 Welcome!
        </Text>
        <Text className="text-base text-gray-600 text-center mb-10">
          You have successfully logged in
        </Text>
        
        <View className="flex-1 mb-10">
          <View className="bg-gray-50 rounded-2xl p-6 border-l-4 mb-6" style={{ borderLeftColor: '#289294' }}>
            <Text className="text-xl font-semibold text-black mb-2">
              Attendance System
            </Text>
            <Text className="text-sm text-gray-600 leading-5 mb-4">
              Track your daily attendance with check-in/check-out functionality and view your attendance history.
            </Text>
            <TouchableOpacity 
              className="rounded-xl py-3 px-4 items-center"
              style={{ backgroundColor: '#289294' }}
              onPress={handleGetStarted}
            >
              <Text className="text-white text-base font-semibold">Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          className="bg-black rounded-xl py-4 items-center mb-10"
          onPress={handleLogout}
        >
          <Text className="text-white text-base font-semibold">Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default Home