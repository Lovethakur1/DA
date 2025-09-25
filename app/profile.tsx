import ProtectedRoute from '@/src/components/ProtectedRoute'
import ProfileScreen from '@/src/screens/ProfileScreen'
import React from 'react'

const ProfileRoute = () => {
  return (
    <ProtectedRoute>
      <ProfileScreen />
    </ProtectedRoute>
  )
}

export default ProfileRoute
