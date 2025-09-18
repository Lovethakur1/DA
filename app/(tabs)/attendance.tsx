import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import React, { useEffect, useState } from 'react'
import {
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

interface BreakEntry {
  start: Date
  end: Date | null
  durationSeconds?: number
}

interface AttendanceRecord {
  checkInTime: Date | null
  checkOutTime: Date | null
  checkInLocation: { latitude: number; longitude: number } | null
  checkOutLocation: { latitude: number; longitude: number } | null
  checkInPhoto: string | null
  checkOutPhoto: string | null
  breaks: BreakEntry[]
}

const AttendancePage = () => {
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [breakElapsed, setBreakElapsed] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [attendanceRecord, setAttendanceRecord] = useState<AttendanceRecord>({
    checkInTime: null,
    checkOutTime: null,
    checkInLocation: null,
    checkOutLocation: null,
    checkInPhoto: null,
    checkOutPhoto: null,
    breaks: []
  })
  const [permissionsGranted, setPermissionsGranted] = useState<boolean | null>(null)

  // Track current break start for elapsed calculation
  const [currentBreakStart, setCurrentBreakStart] = useState<Date | null>(null)

  useEffect(() => {
    // Check current permission status on mount
    ;(async () => {
      try {
        const loc = await Location.getForegroundPermissionsAsync()
        const cam = await ImagePicker.getCameraPermissionsAsync()
        setPermissionsGranted(loc.status === 'granted' && cam.status === 'granted')
      } catch (_e) {
        console.warn('permission check failed', _e)
        setPermissionsGranted(false)
      }
    })()
  }, [])

  // Timer to update elapsed times
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      if (isCheckedIn && attendanceRecord.checkInTime) {
        // total break seconds so far
        const totalBreakSeconds = attendanceRecord.breaks.reduce((acc, b) => acc + (b.durationSeconds ?? (b.end && b.start ? Math.floor((b.end.getTime() - b.start.getTime()) / 1000) : 0)), 0)
        const baseElapsed = Math.floor((now.getTime() - attendanceRecord.checkInTime.getTime()) / 1000)
        const activeElapsed = baseElapsed - totalBreakSeconds
        setElapsedTime(activeElapsed >= 0 ? activeElapsed : 0)
      }

      if (isOnBreak && currentBreakStart) {
        const be = Math.floor((now.getTime() - currentBreakStart.getTime()) / 1000)
        setBreakElapsed(be >= 0 ? be : 0)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [isCheckedIn, attendanceRecord, isOnBreak, currentBreakStart])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const requestPermissions = async () => {
    try {
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync()
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync()
      const ok = locationStatus === 'granted' && cameraStatus === 'granted'
      setPermissionsGranted(ok)
      if (!ok) {
        Alert.alert('Permissions required', 'Please enable location and camera permissions in system settings.')
      }
      return ok
    } catch (error) {
      console.error('Error requesting permissions:', error)
      setPermissionsGranted(false)
      return false
    }
  }

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })
      return location
    } catch (error) {
      console.error('Error getting location:', error)
      throw new Error('Unable to get current location')
    }
  }

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
      })

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri
      }
      return null
    } catch (error) {
      console.error('Error taking photo:', error)
      throw new Error('Unable to take photo')
    }
  }

  const handleCheckIn = async () => {
    // Pre-permission prompt (system will be used when requesting)
    const confirm = await new Promise<boolean>((res) => {
      Alert.alert('Check In', 'We will request camera and location permissions (system dialog). Continue?', [
        { text: 'Cancel', style: 'cancel', onPress: () => res(false) },
        { text: 'Continue', onPress: () => res(true) }
      ])
    })

    if (!confirm) return

    try {
      const hasPermissions = await requestPermissions()
      if (!hasPermissions) return

      const location = await getCurrentLocation()
      const photo = await takePhoto()
      if (!photo) {
        Alert.alert('Error', 'Photo is required for check-in')
        return
      }

      const checkInTime = new Date()
      setAttendanceRecord(prev => ({
        ...prev,
        checkInTime,
        checkInLocation: location.coords,
        checkInPhoto: photo
      }))
      setIsCheckedIn(true)
      setElapsedTime(0)

      // API call (no photo)
      try {
                try { console.log('CHECKIN_PAYLOAD:', JSON.stringify({ checkin_latitude: location.coords.latitude, checkin_longitude: location.coords.longitude }, null, 2)) } catch { console.log('CHECKIN_PAYLOAD:', { checkin_latitude: location.coords.latitude, checkin_longitude: location.coords.longitude }) }
                const { checkIn } = await import('@/src/api/attendance')
                await checkIn({ latitude: location.coords.latitude, longitude: location.coords.longitude, photoUri: photo })
        Alert.alert('Success', 'You have successfully checked in!')
      } catch (apiError) {
        console.error('API check-in error', apiError)
        Alert.alert('Warning', 'Checked in locally but failed to sync to server')
      }

    } catch (error) {
      Alert.alert('Error', 'Failed to check in. Please try again.')
      console.error('Check-in error:', error)
    }
  }

  const handleCheckOut = async () => {
    const confirm = await new Promise<boolean>((res) => {
      Alert.alert('Check Out', 'Are you sure you want to check out?', [
        { text: 'Cancel', style: 'cancel', onPress: () => res(false) },
        { text: 'Yes, Check Out', onPress: () => res(true) }
      ])
    })
    if (!confirm) return

    try {
      const hasPermissions = await requestPermissions()
      if (!hasPermissions) return

      const location = await getCurrentLocation()
      const photo = await takePhoto()
      if (!photo) {
        Alert.alert('Error', 'Photo is required for check-out')
        return
      }

      const checkOutTime = new Date()
      setAttendanceRecord(prev => ({
        ...prev,
        checkOutTime,
        checkOutLocation: location.coords,
        checkOutPhoto: photo
      }))
      setIsCheckedIn(false)
      setIsOnBreak(false)

      // API call (no photo)
      try {
                try { console.log('CHECKOUT_PAYLOAD:', JSON.stringify({ checkout_latitude: location.coords.latitude, checkout_longitude: location.coords.longitude }, null, 2)) } catch { console.log('CHECKOUT_PAYLOAD:', { checkout_latitude: location.coords.latitude, checkout_longitude: location.coords.longitude }) }
                const { checkOut } = await import('@/src/api/attendance')
                await checkOut({ latitude: location.coords.latitude, longitude: location.coords.longitude, photoUri: photo })
        Alert.alert('Success', 'You have successfully checked out!')
      } catch (apiError) {
        console.error('API check-out error', apiError)
        Alert.alert('Warning', 'Checked out locally but failed to sync to server')
      }

    } catch (error) {
      Alert.alert('Error', 'Failed to check out. Please try again.')
      console.error('Check-out error:', error)
    }
  }

  const handleBreakIn = async () => {
    if (!isCheckedIn || isOnBreak) return
    // start break
    const start = new Date()
    setCurrentBreakStart(start)
    setIsOnBreak(true)
    setBreakElapsed(0)
    setAttendanceRecord(prev => ({ ...prev, breaks: [...prev.breaks, { start, end: null }] }))
  }

  const handleBreakOff = async () => {
    if (!isCheckedIn || !isOnBreak) return
    const end = new Date()
    setIsOnBreak(false)
    setCurrentBreakStart(null)

    setAttendanceRecord(prev => {
      const breaks = [...prev.breaks]
      const last = breaks[breaks.length - 1]
      if (last && !last.end) {
        last.end = end
        last.durationSeconds = Math.floor((last.end.getTime() - last.start.getTime()) / 1000)
      }
      return { ...prev, breaks }
    })
    setBreakElapsed(0)
  }

  const isCheckedOutToday = () => {
    if (!attendanceRecord.checkOutTime) return false
    const now = new Date()
    const co = attendanceRecord.checkOutTime
    return co.getFullYear() === now.getFullYear() && co.getMonth() === now.getMonth() && co.getDate() === now.getDate()
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-white pt-12 pb-6 px-6 border-b border-gray-100">
        <Text className="text-2xl font-bold text-center" style={{ color: '#289294' }}>
          Attendance
        </Text>
        <Text className="text-center text-gray-600 mt-1">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>
      </View>

      <View className="flex-1 px-6 py-8">
        {/* Permission Banner */}
        {permissionsGranted === false && (
          <View className="bg-red-50 rounded-xl p-4 mb-4">
            <Text className="text-red-800 font-medium">Permissions needed</Text>
            <Text className="text-red-700 text-xs mt-1">This app needs location and camera permissions to record attendance.</Text>
            <TouchableOpacity className="mt-3 bg-[#289294] rounded-xl py-2 px-3 items-center" onPress={requestPermissions}>
              <Text className="text-white">Grant permissions</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status Card */}
        <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100">
          <View className="items-center">
            <View 
              className={`w-4 h-4 rounded-full mb-3 ${isCheckedIn ? 'bg-green-500' : 'bg-gray-400'}`}
            />
            <Text className="text-lg font-semibold text-gray-800 mb-2">
              {isCheckedIn ? 'Checked In' : attendanceRecord.checkOutTime ? 'Checked Out' : 'Not Checked In'}
            </Text>

            {attendanceRecord.checkInTime && (
              <>
                <Text className="text-sm text-gray-600 mb-2">Checked in at: {formatTime(attendanceRecord.checkInTime)}</Text>
                <View className="bg-blue-50 rounded-xl p-4 w-full items-center mb-3">
                  <Text className="text-sm text-blue-600 mb-1">Time Worked (excluding breaks)</Text>
                  <Text className="text-2xl font-bold text-blue-700">{formatElapsedTime(elapsedTime)}</Text>
                </View>
                {isOnBreak && (
                  <View className="bg-yellow-50 rounded-xl p-3 w-full items-center mb-3">
                    <Text className="text-sm text-yellow-800">On Break</Text>
                    <Text className="text-lg font-semibold text-yellow-900">{formatElapsedTime(breakElapsed)}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        {!isCheckedOutToday() && (
          <>
            <TouchableOpacity
              className={`rounded-2xl py-4 px-6 items-center shadow-lg ${isCheckedIn ? 'bg-red-500' : 'bg-[#289294]'}`}
              onPress={isCheckedIn ? handleCheckOut : handleCheckIn}
            >
              <Text className="text-white text-lg font-semibold">{isCheckedIn ? '📤 Check Out' : '📥 Check In'}</Text>
              <Text className="text-white text-sm mt-1 opacity-90">{isCheckedIn ? 'End your work day' : 'Start your work day'}</Text>
            </TouchableOpacity>

            {isCheckedIn && !isOnBreak && (
              <TouchableOpacity className="mt-4 items-center" onPress={handleBreakIn}>
                <Text className="text-sm text-gray-600">Start Break</Text>
              </TouchableOpacity>
            )}

            {isCheckedIn && isOnBreak && (
              <TouchableOpacity className="mt-4 items-center" onPress={handleBreakOff}>
                <Text className="text-sm text-gray-600">End Break</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Breaks table */}
        {attendanceRecord.breaks.length > 0 && (
          <View className="mt-6 bg-gray-50 rounded-xl p-3">
            <Text className="font-semibold mb-2">Breaks Today</Text>
            <FlatList
              data={attendanceRecord.breaks}
              keyExtractor={(item, idx) => `${item.start.toISOString()}-${idx}`}
              renderItem={({ item, index }) => (
                <View className="flex-row justify-between py-2 border-b border-gray-100">
                  <View>
                    <Text className="text-sm text-gray-700">Start: {formatTime(item.start)}</Text>
                    <Text className="text-sm text-gray-700">End: {item.end ? formatTime(item.end) : '-'}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm text-gray-700">Duration</Text>
                    <Text className="font-semibold">{item.durationSeconds ? formatElapsedTime(item.durationSeconds) : '-'}</Text>
                  </View>
                </View>
              )}
            />
          </View>
        )}

        {/* Day summary after check-out */}
        {attendanceRecord.checkOutTime && (
          <View className="mt-6 bg-green-50 rounded-xl p-4">
            <Text className="font-semibold mb-2">Today Summary</Text>
            <Text className="text-sm">Check In: {attendanceRecord.checkInTime ? formatTime(attendanceRecord.checkInTime) : '-'}</Text>
            <Text className="text-sm">Check Out: {attendanceRecord.checkOutTime ? formatTime(attendanceRecord.checkOutTime) : '-'}</Text>
            <Text className="text-sm mt-2 font-semibold">Breaks</Text>
            {attendanceRecord.breaks.length === 0 && <Text className="text-sm">No breaks recorded</Text>}
            {attendanceRecord.breaks.map((b, i) => (
              <View key={i} className="flex-row justify-between py-1">
                <Text className="text-sm">{formatTime(b.start)} - {b.end ? formatTime(b.end) : '-'}</Text>
                <Text className="text-sm">{b.durationSeconds ? formatElapsedTime(b.durationSeconds) : '-'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Info Section */}
        <View className="mt-6 bg-yellow-50 rounded-xl p-4">
          <Text className="text-yellow-800 text-sm font-medium mb-2">📝 Note:</Text>
          <Text className="text-yellow-700 text-xs leading-4">
            • Location and photo are required for attendance tracking{"\n"}
            • Breaks are recorded and will pause the working timer{"\n"}
            • Check actions are disabled after check-out for the day
          </Text>
        </View>
      </View>
    </View>
  )
}

export default AttendancePage