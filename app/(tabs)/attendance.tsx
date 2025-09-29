import CustomAlert from '@/src/components/CustomAlert'
import TimerDisplay from '@/src/components/TimerDisplay'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import React, { useEffect, useState } from 'react'
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

interface BreakEntry {
  start: Date
  end: Date | null
  durationSeconds?: number
  breakId?: number
  break_in?: string
  break_out?: string
  duration?: string
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

interface PersistedAttendanceState {
  isCheckedIn: boolean
  isOnBreak: boolean
  attendanceRecord: AttendanceRecord
  currentBreakStart: string | null // ISO string
  lastResetDate: string // ISO date string
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
  const [submittingCheckout, setSubmittingCheckout] = useState(false)
  const [submittingCheckin, setSubmittingCheckin] = useState(false)
  const [submittingBreak, setSubmittingBreak] = useState(false)

  // Track current break start for elapsed calculation
  const [currentBreakStart, setCurrentBreakStart] = useState<Date | null>(null)
  
  // Custom alert state
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    buttons: [] as Array<{ text: string; onPress: () => void; style?: 'default' | 'cancel' | 'destructive' }>
  })

  // Storage keys
  const ATTENDANCE_STATE_KEY = '@attendance_state'

  // Helper function to check if it's time to reset (8:30 AM)
  const shouldResetToday = (lastResetDate: string): boolean => {
    const now = new Date()
    const lastReset = new Date(lastResetDate)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const lastResetDay = new Date(lastReset.getFullYear(), lastReset.getMonth(), lastReset.getDate())
    
    // If it's a new day and current time is past 8:30 AM
    if (today > lastResetDay) {
      const resetTime = new Date(today)
      resetTime.setHours(8, 30, 0, 0) // 8:30 AM
      return now >= resetTime
    }
    return false
  }

  // Save attendance state to AsyncStorage
  const saveAttendanceState = async (state: Partial<PersistedAttendanceState>) => {
    try {
      const currentState = await loadAttendanceState()
      const newState: PersistedAttendanceState = {
        ...currentState,
        ...state,
        attendanceRecord: {
          ...currentState.attendanceRecord,
          ...state.attendanceRecord,
          // Convert Date objects to ISO strings for storage
          checkInTime: state.attendanceRecord?.checkInTime?.toISOString() || currentState.attendanceRecord.checkInTime,
          checkOutTime: state.attendanceRecord?.checkOutTime?.toISOString() || currentState.attendanceRecord.checkOutTime,
          breaks: state.attendanceRecord?.breaks?.map(b => ({
            ...b,
            start: b.start.toISOString(),
            end: b.end?.toISOString() || null
          })) || currentState.attendanceRecord.breaks
        } as any
      }
      await AsyncStorage.setItem(ATTENDANCE_STATE_KEY, JSON.stringify(newState))
    } catch (error) {
      console.error('Error saving attendance state:', error)
    }
  }

  // Load attendance state from AsyncStorage
  const loadAttendanceState = async (): Promise<PersistedAttendanceState> => {
    try {
      const stored = await AsyncStorage.getItem(ATTENDANCE_STATE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        
        // Check if we need to reset for the day
        if (shouldResetToday(parsed.lastResetDate)) {
          console.log('Resetting attendance state for new day')
          const resetState = getDefaultState()
          await AsyncStorage.setItem(ATTENDANCE_STATE_KEY, JSON.stringify(resetState))
          return resetState
        }
        
        // Convert ISO strings back to Date objects
        return {
          ...parsed,
          attendanceRecord: {
            ...parsed.attendanceRecord,
            checkInTime: parsed.attendanceRecord.checkInTime ? new Date(parsed.attendanceRecord.checkInTime) : null,
            checkOutTime: parsed.attendanceRecord.checkOutTime ? new Date(parsed.attendanceRecord.checkOutTime) : null,
            breaks: parsed.attendanceRecord.breaks?.map((b: any) => ({
              ...b,
              start: new Date(b.start),
              end: b.end ? new Date(b.end) : null
            })) || []
          }
        }
      }
    } catch (error) {
      console.error('Error loading attendance state:', error)
    }
    return getDefaultState()
  }

  // Get default state
  const getDefaultState = (): PersistedAttendanceState => ({
    isCheckedIn: false,
    isOnBreak: false,
    attendanceRecord: {
      checkInTime: null,
      checkOutTime: null,
      checkInLocation: null,
      checkOutLocation: null,
      checkInPhoto: null,
      checkOutPhoto: null,
      breaks: []
    },
    currentBreakStart: null,
    lastResetDate: new Date().toISOString()
  })

  // Clear attendance state (on checkout)
  const clearAttendanceState = async () => {
    try {
      const defaultState = getDefaultState()
      await AsyncStorage.setItem(ATTENDANCE_STATE_KEY, JSON.stringify(defaultState))
    } catch (error) {
      console.error('Error clearing attendance state:', error)
    }
  }

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

  // Load persisted attendance state on app startup
  useEffect(() => {
    const loadPersistedState = async () => {
      try {
        const persistedState = await loadAttendanceState()
        console.log('Loading persisted attendance state:', persistedState)
        
        setIsCheckedIn(persistedState.isCheckedIn)
        setIsOnBreak(persistedState.isOnBreak)
        setAttendanceRecord(persistedState.attendanceRecord)
        
        if (persistedState.currentBreakStart) {
          setCurrentBreakStart(new Date(persistedState.currentBreakStart))
        }
      } catch (error) {
        console.error('Error loading persisted state:', error)
      }
    }
    
    loadPersistedState()
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
        mediaTypes: 'images',
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

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', buttons?: Array<{ text: string; onPress: () => void; style?: 'default' | 'cancel' | 'destructive' }>) => {
    const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }))
    
    const wrappedButtons = buttons?.map(button => ({
      ...button,
      onPress: () => {
        button.onPress() // Execute the original button action
        closeAlert() // Always close the alert after button press
      }
    })) || [{ text: 'OK', onPress: closeAlert }]
    
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      buttons: wrappedButtons
    })
  }

  const handleCheckIn = async () => {
    // Pre-permission prompt (system will be used when requesting)
    const confirm = await new Promise<boolean>((res) => {
      showAlert(
        'Check In Confirmation',
        'We will request camera and location permissions. Continue?',
        'info',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => res(false) },
          { text: 'Continue', onPress: () => res(true) }
        ]
      )
    })

    if (!confirm) return

    try {
      setSubmittingCheckin(true)
      
      const hasPermissions = await requestPermissions()
      if (!hasPermissions) {
        setSubmittingCheckin(false)
        return
      }

      const location = await getCurrentLocation()
      const photo = await takePhoto()
      if (!photo) {
        showAlert('Error', 'Photo is required for check-in', 'error')
        setSubmittingCheckin(false)
        return
      }

      // API call first to validate with backend
      try {
        const { checkIn } = await import('@/src/api/attendance')
        const response = await checkIn({ latitude: location.coords.latitude, longitude: location.coords.longitude, photoUri: photo })
        
        console.log('Full checkin API response:', response)
        
        if (response.success) {
          // Success - update local state and start timer
          const checkInTime = new Date()
          const newAttendanceRecord = {
            checkInTime,
            checkInLocation: location.coords,
            checkInPhoto: photo,
            checkOutTime: null,
            checkOutLocation: null,
            checkOutPhoto: null,
            breaks: []
          }
          
          setAttendanceRecord(newAttendanceRecord)
          setIsCheckedIn(true)
          setElapsedTime(0)

          // Save check-in state to AsyncStorage
          await saveAttendanceState({
            isCheckedIn: true,
            isOnBreak: false,
            attendanceRecord: newAttendanceRecord,
            currentBreakStart: null
          })

          // Extract success message from backend response
          const successMessage = response.data?.message || 
                                response.data?.msg || 
                                'You have successfully checked in! Timer started.'
          
          showAlert('Check-in Successful', successMessage, 'success')
        } else {
          // Handle specific error cases
          if (response.error === 'already_checked_in') {
            showAlert('Already Checked In', response.message, 'warning')
          } else {
            showAlert('Check-in Failed', response.message || 'Unable to check in. Please try again.', 'error')
          }
        }
      } catch (apiError) {
        console.error('API check-in error', apiError)
        showAlert('Network Error', 'Failed to connect to server. Please check your internet connection and try again.', 'error')
      }

    } catch (error) {
      showAlert('Error', 'Failed to check in. Please try again.', 'error')
      console.error('Check-in error:', error)
    } finally {
      setSubmittingCheckin(false)
    }
  }

  const handleCheckOut = async () => {
    // Check if user is currently on break
    if (isOnBreak) {
      const breakAction = await new Promise<'end_break' | 'cancel'>((res) => {
        showAlert(
          'Active Break Detected',
          'You are currently on a break. You must end your break before checking out.',
          'warning',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => res('cancel') },
            { text: 'End Break & Check Out', style: 'destructive', onPress: () => res('end_break') }
          ]
        )
      })
      
      if (breakAction === 'cancel') return
      
      if (breakAction === 'end_break') {
        // Automatically end the break first
        try {
          setSubmittingBreak(true)
          const { breakOut } = await import('@/src/api/attendance')
          const breakResponse = await breakOut()
          
          if (breakResponse.success) {
            // Update break state with backend data
            const backendBreakEnd = breakResponse.data.break_out ? new Date(breakResponse.data.break_out) : new Date()
            setIsOnBreak(false)
            setCurrentBreakStart(null)

            const updatedRecord = { ...attendanceRecord }
            const breaks = [...updatedRecord.breaks]
            const last = breaks[breaks.length - 1]
            
            if (last && !last.end) {
              last.end = backendBreakEnd
              last.break_out = breakResponse.data.break_out
              last.duration = breakResponse.data.duration
              
              if (breakResponse.data.duration) {
                const [hours, minutes, seconds] = breakResponse.data.duration.split(':').map(Number)
                last.durationSeconds = (hours * 3600) + (minutes * 60) + seconds
              } else {
                last.durationSeconds = Math.floor((last.end.getTime() - last.start.getTime()) / 1000)
              }
            }
            
            setAttendanceRecord(updatedRecord)
            setBreakElapsed(0)
            
            console.log('Break automatically ended before checkout')
          } else {
            showAlert('Break End Failed', 'Unable to end break. Please try ending your break manually first.', 'error')
            setSubmittingBreak(false)
            return
          }
        } catch (breakError) {
          console.error('Auto break-out error:', breakError)
          showAlert('Break End Failed', 'Failed to end break automatically. Please try ending your break manually first.', 'error')
          setSubmittingBreak(false)
          return
        } finally {
          setSubmittingBreak(false)
        }
      }
    }

    const confirm = await new Promise<boolean>((res) => {
      showAlert(
        'Check Out Confirmation',
        'Are you sure you want to check out? This will stop your timer.',
        'warning',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => res(false) },
          { text: 'Yes, Check Out', style: 'destructive', onPress: () => res(true) }
        ]
      )
    })
    if (!confirm) return

    try {
      setSubmittingCheckout(true)
      
      const hasPermissions = await requestPermissions()
      if (!hasPermissions) {
        setSubmittingCheckout(false)
        return
      }

      const location = await getCurrentLocation()
      const photo = await takePhoto()
      if (!photo) {
        showAlert('Error', 'Photo is required for check-out', 'error')
        setSubmittingCheckout(false)
        return
      }

      // API call first to validate with backend
      try {
        const { checkOut } = await import('@/src/api/attendance')
        const response = await checkOut({ latitude: location.coords.latitude, longitude: location.coords.longitude, photoUri: photo })
        
        console.log('Full checkout API response:', response)
        
        if (response.success) {
          // Success - update local state and stop timer
          const checkOutTime = new Date()
          setAttendanceRecord(prev => ({
            ...prev,
            checkOutTime,
            checkOutLocation: location.coords,
            checkOutPhoto: photo
          }))
          setIsCheckedIn(false)
          setIsOnBreak(false)
          setCurrentBreakStart(null)

          // Clear attendance state from AsyncStorage after checkout
          await clearAttendanceState()

          // Extract success message from backend response
          const successMessage = response.data?.message || 
                                response.data?.msg || 
                                'You have successfully checked out! Timer stopped.'
          
          showAlert('Check-out Successful', successMessage, 'success')
        } else {
          // Handle specific error cases
          if (response.error === 'already_checked_out') {
            showAlert('Already Checked Out', response.message, 'warning')
          } else if (response.error === 'not_checked_in') {
            showAlert('Not Checked In', response.message, 'error')
          } else {
            showAlert('Check-out Failed', response.message || 'Unable to check out. Please try again.', 'error')
          }
        }
      } catch (apiError) {
        console.error('API check-out error', apiError)
        showAlert('Network Error', 'Failed to connect to server. Please check your internet connection and try again.', 'error')
      }

    } catch (error) {
      showAlert('Error', 'Failed to check out. Please try again.', 'error')
      console.error('Check-out error:', error)
    } finally {
      setSubmittingCheckout(false)
    }
  }

  const handleBreakIn = async () => {
    if (!isCheckedIn || isOnBreak) return
    
    try {
      setSubmittingBreak(true)
      
      // API call first to validate with backend
      const { breakIn } = await import('@/src/api/attendance')
      const response = await breakIn()
      
      console.log('Full break-in API response:', response)
      
      if (response.success) {
        // Use backend timestamp for accuracy
        const backendBreakStart = response.data.break_in ? new Date(response.data.break_in) : new Date()
        setCurrentBreakStart(backendBreakStart)
        setIsOnBreak(true)
        setBreakElapsed(0)
        
        const newBreakEntry: BreakEntry = {
          start: backendBreakStart,
          end: null,
          breakId: response.data.break_id,
          break_in: response.data.break_in
        }
        
        const newBreaks = [...attendanceRecord.breaks, newBreakEntry]
        setAttendanceRecord(prev => ({ ...prev, breaks: newBreaks }))

        // Save break state to AsyncStorage
        await saveAttendanceState({
          isOnBreak: true,
          currentBreakStart: backendBreakStart.toISOString(),
          attendanceRecord: {
            ...attendanceRecord,
            breaks: newBreaks
          }
        })

        const message = response.data.message || 'Break timer started. Your work timer is now paused.'
        showAlert('Break Started', message, 'info')
      } else {
        // Handle specific error cases
        if (response.error === 'not_checked_in') {
          showAlert('Cannot Start Break', response.message, 'error')
        } else {
          showAlert('Break Failed', response.message || 'Unable to start break. Please try again.', 'error')
        }
      }
    } catch (apiError) {
      console.error('API break-in error', apiError)
      showAlert('Network Error', 'Failed to connect to server. Please check your internet connection and try again.', 'error')
    } finally {
      setSubmittingBreak(false)
    }
  }

  const handleBreakOff = async () => {
    if (!isCheckedIn || !isOnBreak) return
    
    try {
      setSubmittingBreak(true)
      
      // API call first to validate with backend
      const { breakOut } = await import('@/src/api/attendance')
      const response = await breakOut()
      
      console.log('Full break-out API response:', response)
      
      if (response.success) {
        // Use backend timestamps and duration for accuracy
        const backendBreakEnd = response.data.break_out ? new Date(response.data.break_out) : new Date()
        setIsOnBreak(false)
        setCurrentBreakStart(null)

        const updatedRecord = { ...attendanceRecord }
        const breaks = [...updatedRecord.breaks]
        const last = breaks[breaks.length - 1]
        
        if (last && !last.end) {
          // Update with backend data
          last.end = backendBreakEnd
          last.break_out = response.data.break_out
          last.duration = response.data.duration
          
          // Parse backend duration (format: "HH:MM:SS") to seconds
          if (response.data.duration) {
            const [hours, minutes, seconds] = response.data.duration.split(':').map(Number)
            last.durationSeconds = (hours * 3600) + (minutes * 60) + seconds
          } else {
            // Fallback to calculated duration
            last.durationSeconds = Math.floor((last.end.getTime() - last.start.getTime()) / 1000)
          }
        }
        updatedRecord.breaks = breaks

        setAttendanceRecord(updatedRecord)
        setBreakElapsed(0)

        // Save break end state to AsyncStorage
        await saveAttendanceState({
          isOnBreak: false,
          currentBreakStart: null,
          attendanceRecord: updatedRecord
        })

        const backendDuration = response.data.duration || 'Unknown'
        const message = response.data.message || `Break ended. Duration: ${backendDuration}. Work timer resumed.`
        showAlert('Break Ended', message, 'info')
      } else {
        // Handle specific error cases
        if (response.error === 'no_active_break') {
          showAlert('No Active Break', response.message, 'warning')
        } else {
          showAlert('End Break Failed', response.message || 'Unable to end break. Please try again.', 'error')
        }
      }
    } catch (apiError) {
      console.error('API break-out error', apiError)
      showAlert('Network Error', 'Failed to connect to server. Please check your internet connection and try again.', 'error')
    } finally {
      setSubmittingBreak(false)
    }
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
 <ScrollView
      contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 32 }}
      showsVerticalScrollIndicator={false}
    >
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
                  <TimerDisplay
                    isRunning={isCheckedIn && !attendanceRecord.checkOutTime}
                    startTime={attendanceRecord.checkInTime}
                    carriedSeconds={
                      // If checked out, calculate total work time from check-in to check-out
                      attendanceRecord.checkOutTime && attendanceRecord.checkInTime
                        ? Math.floor((attendanceRecord.checkOutTime.getTime() - attendanceRecord.checkInTime.getTime()) / 1000)
                        : 0
                    }
                    deductedSeconds={
                      // Calculate total break time including current active break
                      attendanceRecord.breaks.reduce((acc, b) => acc + (b.durationSeconds ?? 0), 0) +
                      (isOnBreak && currentBreakStart ? Math.floor((new Date().getTime() - currentBreakStart.getTime()) / 1000) : 0)
                    }
                    label="Time Worked (excluding breaks)"
                    textStyle={{
                      label: { color: '#2563EB', fontSize: 14 },
                      time: { color: '#1D4ED8', fontSize: 24, fontWeight: 'bold' }
                    }}
                  />
                </View>
                {isOnBreak && (
                  <View className="bg-yellow-50 rounded-xl p-3 w-full items-center mb-3">
                    <TimerDisplay
                      isRunning={isOnBreak}
                      startTime={currentBreakStart}
                      label="On Break"
                      textStyle={{
                        label: { color: '#92400E', fontSize: 14 },
                        time: { color: '#78350F', fontSize: 18, fontWeight: '600' }
                      }}
                    />
                  </View>
                )}
              </>
            )}
          </View>
        </View>

       {/* Action Buttons */}
{!isCheckedOutToday() && (
  <>
    {/* Main Check In / Check Out button */}
    {isCheckedIn ? "" :  <TouchableOpacity
      className={`rounded-2xl py-4 px-6 items-center shadow-lg ${submittingCheckin ? 'bg-gray-400' : 'bg-[#289294]'}`}
      onPress={handleCheckIn}
      disabled={submittingCheckin}
    >
      <Text className="text-white text-lg font-semibold">
        {submittingCheckin ? '⏳ Checking In...' : '📥 Check In'}
      </Text>
      <Text className="text-white text-sm mt-1 opacity-90">
        {submittingCheckin ? 'Please wait...' : 'Start your work day'}
      </Text>
    </TouchableOpacity> }
   
    {/* When checked in, show break buttons */}
    {isCheckedIn && 
    (
      <View className="flex-row mt-4 w-full justify-between">
        {!isOnBreak ? (
          <TouchableOpacity
            className={`flex-1 mr-2 rounded-2xl py-4 px-6 items-center shadow-lg ${submittingBreak ? 'bg-gray-400' : 'bg-[#289294]'}`}
            onPress={handleBreakIn}
            disabled={submittingBreak}
          >
            <Text className="text-white text-lg font-semibold">
              {submittingBreak ? '⏳ Starting...' : '☕ Start Break'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className={`flex-1 mr-2 rounded-2xl py-4 px-6 items-center shadow-lg ${submittingBreak ? 'bg-gray-400' : 'bg-red-500'}`}
            onPress={handleBreakOff}
            disabled={submittingBreak}
          >
            <Text className="text-white text-lg font-semibold">
              {submittingBreak ? '⏳ Ending...' : '⏱ End Break'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Keep checkout button visible in same row if needed */}
        <TouchableOpacity
          className={`flex-1 ml-2 rounded-2xl py-4 px-6 items-center shadow-lg ${submittingCheckout ? 'bg-gray-400' : 'bg-red-400'}`}
          onPress={handleCheckOut}
          disabled={submittingCheckout}
        >
          <Text className="text-white text-lg font-semibold">
            {submittingCheckout ? '⏳ Checking Out...' : '📤 Check Out'}
          </Text>
        </TouchableOpacity>
      </View>
    )}
  </>
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
    </ScrollView>
      
    {/* Custom Alert Component */}
    <CustomAlert
      visible={alertConfig.visible}
      title={alertConfig.title}
      message={alertConfig.message}
      type={alertConfig.type}
      onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      buttons={alertConfig.buttons}
    />
    </View>
  )
}
export default AttendancePage