import { useAuth } from '@/src/auth/AuthContext'
import CustomAlert from '@/src/components/CustomAlert'
import TimerDisplay from '@/src/components/TimerDisplay'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Platform
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

// Responsive utility functions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const isSmallDevice = SCREEN_WIDTH < 375
const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414
const isLargeDevice = SCREEN_WIDTH >= 414

// Responsive sizing
const getResponsiveSize = (small: number, medium: number, large: number) => {
  if (isSmallDevice) return small
  if (isMediumDevice) return medium
  return large
}

const getResponsivePadding = () => ({
  horizontal: getResponsiveSize(16, 20, 24),
  vertical: getResponsiveSize(12, 16, 20)
})

const getButtonPadding = () => ({
  horizontal: getResponsiveSize(16, 20, 24),
  vertical: getResponsiveSize(12, 14, 16)
})

const getFontSize = (base: number) => {
  const scale = isSmallDevice ? 0.9 : isMediumDevice ? 1 : 1.1
  return base * scale
}

const AttendancePage = () => {
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [isOnBreak, setIsOnBreak] = useState(false)
  // these state values are updated (timers) but referenced by child components indirectly
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_breakElapsed, setBreakElapsed] = useState(0)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_elapsedTime, setElapsedTime] = useState(0)
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
  
  // Countdown state for checkout confirmation
  const [checkoutCountdown, setCheckoutCountdown] = useState<number | null>(null)
  
  // Track if checkout process is active (to disable break button)
  const [checkoutInProgress, setCheckoutInProgress] = useState(false)
  
  // Custom alert state
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    buttons: [] as { text: string; onPress: () => void; style?: 'default' | 'cancel' | 'destructive'; disabled?: boolean }[]
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
  // Load persisted attendance state on app startup
  const loadAttendanceState = useCallback(async (): Promise<PersistedAttendanceState> => {
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
  }, [])

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
  }, [loadAttendanceState])

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

  // Consume attendance status from server (via AuthContext)
  const { attendanceStatus, refreshAttendanceStatus } = useAuth()

  // Refresh attendance status from server when app opens (only once on mount)
  useEffect(() => {
    const refreshOnMount = async () => {
      try {
        console.log('Refreshing attendance status from server on app open...')
        await refreshAttendanceStatus()
      } catch (error) {
        console.warn('Failed to refresh attendance status on app open:', error)
      }
    }
    refreshOnMount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Merge server-provided attendance status into local UI state when available
  useEffect(() => {
    if (!attendanceStatus) return
    try {
      // Server may send camelCase (e.g. checkInTime) or snake_case (check_in_time).
      const s = attendanceStatus as any
      const status = s.status

      const mapBreak = (b: any) => {
        const startStr = b.breakIn ?? b.break_in ?? null
        const endStr = b.breakOut ?? b.break_out ?? null
        const durationSeconds = typeof b.durationSeconds === 'number' ? b.durationSeconds : (b.duration ? (() => { const parts = b.duration.split(':').map(Number); return parts[0]*3600 + parts[1]*60 + parts[2] })() : undefined)
        return {
          start: startStr ? new Date(startStr) : null,
          end: endStr ? new Date(endStr) : null,
          durationSeconds
        }
      }

      const checkInStr = s.checkInTime ?? s.check_in_time ?? null
      const checkOutStr = s.checkOutTime ?? s.check_out_time ?? null

      const breaks = Array.isArray(s.breaks) ? s.breaks.map(mapBreak) : []

      // Detect if user is currently on break by checking if last break has no end time
      const hasActiveBreak = breaks.length > 0 && breaks[breaks.length - 1].end === null
      const activeBreakStart = hasActiveBreak ? breaks[breaks.length - 1].start : null

      const mergedRecord: any = {
        checkInTime: checkInStr ? new Date(checkInStr) : null,
        checkOutTime: checkOutStr ? new Date(checkOutStr) : null,
        checkInLocation: s.additional?.location?.checkIn ?? s.check_in_location ?? null,
        checkOutLocation: s.additional?.location?.checkOut ?? s.check_out_location ?? null,
        checkInPhoto: s.additional?.photoUris?.checkIn ?? s.check_in_photo ?? null,
        checkOutPhoto: s.additional?.photoUris?.checkOut ?? s.check_out_photo ?? null,
        breaks
      }

      if (status === 'checkedin') {
        setAttendanceRecord(mergedRecord)
        setIsCheckedIn(true)
        
        // Check for active break from server data or detect from breaks array
        const isOnBreakFromServer = s.isOnBreak ?? s.is_on_break ?? hasActiveBreak
        setIsOnBreak(isOnBreakFromServer)
        
        // Set current break start time if on break
        if (isOnBreakFromServer) {
          const currentBreakStartStr = s.currentBreakStart ?? s.current_break_start ?? null
          if (currentBreakStartStr) {
            setCurrentBreakStart(new Date(currentBreakStartStr))
          } else if (activeBreakStart) {
            // Fallback to detected active break start from breaks array
            setCurrentBreakStart(activeBreakStart)
          }
        } else {
          setCurrentBreakStart(null)
        }
      } else if (status === 'checkedout') {
        setAttendanceRecord(mergedRecord)
        setIsCheckedIn(false)
        setIsOnBreak(false)
      } else {
        // notchecking: clear in-memory checked-in flags but keep persisted record
        setIsCheckedIn(false)
        setIsOnBreak(false)
      }

      // Persist the mapped state into AsyncStorage so re-install/rehydrate can restore it quickly
      try {
        // Calculate isOnBreak state using same logic as above
        const persistedIsOnBreak = s.isOnBreak ?? s.is_on_break ?? hasActiveBreak
        
        // Get currentBreakStart from server or from detected active break
        let persistedBreakStart = s.currentBreakStart ?? s.current_break_start ?? null
        if (!persistedBreakStart && activeBreakStart) {
          persistedBreakStart = activeBreakStart.toISOString()
        }
        
        const persisted = {
          isCheckedIn: status === 'checkedin',
          isOnBreak: persistedIsOnBreak,
          attendanceRecord: {
            checkInTime: mergedRecord.checkInTime ? mergedRecord.checkInTime.toISOString() : null,
            checkOutTime: mergedRecord.checkOutTime ? mergedRecord.checkOutTime.toISOString() : null,
            checkInLocation: mergedRecord.checkInLocation,
            checkOutLocation: mergedRecord.checkOutLocation,
            checkInPhoto: mergedRecord.checkInPhoto,
            checkOutPhoto: mergedRecord.checkOutPhoto,
            breaks: (mergedRecord.breaks || []).map((b: any) => ({ start: b.start ? b.start.toISOString() : null, end: b.end ? b.end.toISOString() : null, durationSeconds: b.durationSeconds }))
          },
          currentBreakStart: persistedBreakStart,
          lastResetDate: s.date ? new Date(s.date).toISOString() : new Date().toISOString()
        }
        AsyncStorage.setItem(ATTENDANCE_STATE_KEY, JSON.stringify(persisted)).catch(e => console.warn('Failed to persist attendance state from server', e))
      } catch (e) {
        console.warn('Failed to persist attendance state from server', e)
      }
    } catch (e) {
      console.warn('Failed to merge server attendance status into UI', e)
    }
  }, [attendanceStatus])

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

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', buttons?: { text: string; onPress: () => void; style?: 'default' | 'cancel' | 'destructive' }[]) => {
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
        '📍 Permissions Required',
        'To record your attendance, we need:\n\n• Camera - To capture your photo\n• Location - To verify your location\n\nDo you want to continue?',
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
        showAlert('📷 Photo Required', 'You need to take a photo to check in. Please try again and allow camera access.', 'error')
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
          
          showAlert('✅ Check-in Successful', successMessage + '\n\nYour work timer has started. Have a productive day!', 'success')
        } else {
          // Handle specific error cases
          if (response.error === 'already_checked_in') {
            showAlert('⚠️ Already Checked In', response.message + '\n\nYou are already checked in for today. If this is incorrect, please contact support.', 'warning')
          } else {
            showAlert('❌ Check-in Failed', (response.message || 'Unable to complete check-in') + '\n\nPlease try again. If the problem persists, contact support.', 'error')
          }
        }
      } catch (apiError) {
        console.error('API check-in error', apiError)
        showAlert('🌐 Connection Error', 'Unable to connect to the server.\n\nPlease check:\n• Your internet connection\n• WiFi or mobile data is enabled\n\nThen try again.', 'error')
      }

    } catch (error) {
      showAlert('❌ Check-in Error', 'Something went wrong during check-in.\n\nPlease ensure you have granted camera and location permissions, then try again.', 'error')
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
          '⏸️ Break Still Active',
          'You are currently on a break.\n\nYou need to end your break first before you can check out.\n\nWhat would you like to do?',
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
            showAlert('❌ Cannot End Break', 'Unable to automatically end your break.\n\nPlease click the "End Break" button first, then try checking out again.', 'error')
            setSubmittingBreak(false)
            return
          }
        } catch (breakError) {
          console.error('Auto break-out error:', breakError)
          showAlert('❌ Auto-End Failed', 'Could not automatically end your break.\n\nPlease manually click "End Break" button, then try checking out.', 'error')
          setSubmittingBreak(false)
          return
        } finally {
          setSubmittingBreak(false)
        }
      }
    }

    // Show countdown confirmation
    setCheckoutInProgress(true) // Disable break button during checkout
    const confirm = await new Promise<boolean>((resolve) => {
      let countdown = 5
      let countdownInterval: ReturnType<typeof setInterval> | null = null
      let cancelled = false
      let checkoutEnabled = false

      const updateMessage = (seconds: number, enableCheckout: boolean = false) => {
        if (cancelled) return
        checkoutEnabled = enableCheckout
        
        const buttons: { text: string; onPress: () => void; style?: 'default' | 'cancel' | 'destructive'; disabled?: boolean }[] = [
          { 
            text: 'Cancel', 
            style: 'cancel', 
            onPress: () => {
              cancelled = true
              if (countdownInterval) clearInterval(countdownInterval)
              setAlertConfig(prev => ({ ...prev, visible: false }))
              setCheckoutInProgress(false) // Re-enable break button on cancel
              resolve(false)
            }
          }
        ]

        // Add "Check Out" button - disabled during countdown
        if (enableCheckout) {
          buttons.push({ 
            text: `Check Out`, 
            style: 'destructive', 
            onPress: () => {
              cancelled = true
              if (countdownInterval) clearInterval(countdownInterval)
              setAlertConfig(prev => ({ ...prev, visible: false }))
              resolve(true)
            },
            disabled: false
          })
        } else {
          buttons.push({ 
            text: `Wait (${seconds}s)`, 
            style: 'default', 
            onPress: () => {}, // Disabled - does nothing
            disabled: true
          })
        }

        setAlertConfig({
          visible: true,
          title: 'Check Out Confirmation',
          message: enableCheckout 
            ? 'You can now check out. This will stop your timer.' 
            : `Please wait ${seconds} seconds before checking out...`,
          type: 'warning',
          buttons
        })
      }

      // Show initial message with disabled button
      updateMessage(countdown, false)

      // Start countdown
      countdownInterval = setInterval(() => {
        countdown--
        if (countdown > 0) {
          updateMessage(countdown, false)
        } else {
          // Countdown finished - enable checkout button
          if (countdownInterval) clearInterval(countdownInterval)
          if (!cancelled) {
            updateMessage(0, true)
          }
        }
      }, 1000)
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
        showAlert('📷 Photo Required', 'You need to take a photo to check out.\n\nPlease try again and allow camera access.', 'error')
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
          
          showAlert('✅ Check-out Successful', successMessage + '\n\nYour work timer has stopped. Great job today!', 'success')
        } else {
          // Handle specific error cases
          if (response.error === 'already_checked_out') {
            showAlert('⚠️ Already Checked Out', response.message + '\n\nYou have already completed your check-out for today.', 'warning')
          } else if (response.error === 'not_checked_in') {
            showAlert('❌ Not Checked In', response.message + '\n\nYou need to check in first before you can check out.', 'error')
          } else {
            showAlert('❌ Check-out Failed', (response.message || 'Unable to complete check-out') + '\n\nPlease try again. If the problem continues, contact support.', 'error')
          }
        }
      } catch (apiError) {
        console.error('API check-out error', apiError)
        showAlert('🌐 Connection Error', 'Unable to connect to the server.\n\nPlease check:\n• Your internet connection\n• WiFi or mobile data is enabled\n\nThen try again.', 'error')
      }

    } catch (error) {
      showAlert('❌ Check-out Error', 'Something went wrong during check-out.\n\nPlease ensure you have granted camera and location permissions, then try again.', 'error')
      console.error('Check-out error:', error)
    } finally {
      setSubmittingCheckout(false)
      setCheckoutInProgress(false) // Re-enable break button after checkout completes
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
        showAlert('☕ Break Started', message + '\n\nYour work timer is paused. Enjoy your break!', 'info')
      } else {
        // Handle specific error cases
        if (response.error === 'not_checked_in') {
          showAlert('❌ Cannot Start Break', response.message + '\n\nMake sure you are checked in before taking a break.', 'error')
        } else {
          showAlert('❌ Break Failed', (response.message || 'Unable to start your break') + '\n\nPlease try again or contact support if this continues.', 'error')
        }
      }
    } catch (apiError) {
      console.error('API break-in error', apiError)
      showAlert('🌐 Connection Error', 'Unable to connect to the server.\n\nPlease check:\n• Your internet connection\n• WiFi or mobile data is enabled\n\nThen try again.', 'error')
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
        showAlert('✅ Break Ended', message + '\n\nYour work timer has resumed. Welcome back!', 'info')
      } else {
        // Handle specific error cases
        if (response.error === 'no_active_break') {
          showAlert('⚠️ No Active Break', response.message + '\n\nYou don\'t have any active break to end.', 'warning')
        } else {
          showAlert('❌ End Break Failed', (response.message || 'Unable to end your break') + '\n\nPlease try again. If it still fails, contact support.', 'error')
        }
      }
    } catch (apiError) {
      console.error('API break-out error', apiError)
      showAlert('🌐 Connection Error', 'Unable to connect to the server.\n\nPlease check:\n• Your internet connection\n• WiFi or mobile data is enabled\n\nThen try again.', 'error')
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
      <View className="bg-white pt-4 pb-6 px-6 border-b border-gray-100">
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
      contentContainerStyle={{ 
        paddingHorizontal: 24, 
        paddingVertical: 32,
        paddingBottom: Platform.OS === 'ios' ? 120 : 100 
      }}
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
            {/* Refresh server status button */}
            <TouchableOpacity
              className="mt-2 bg-gray-100 rounded-full px-3 py-1"
              onPress={async () => {
                try {
                  await refreshAttendanceStatus()
                  showAlert('✅ Status Refreshed', 'Your attendance status has been updated from the server.\n\nAll information is now current.', 'success')
                } catch (e) {
                  console.warn('refreshAttendanceStatus failed', e)
                  showAlert('❌ Refresh Failed', 'Unable to update your attendance status.\n\nPlease check your internet connection and try again.', 'error')
                }
              }}
            >
              <Text className="text-xs text-gray-700">Refresh Status</Text>
            </TouchableOpacity>

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
      style={{
        borderRadius: 16,
        paddingVertical: getButtonPadding().vertical,
        paddingHorizontal: getButtonPadding().horizontal,
        alignItems: 'center',
        backgroundColor: submittingCheckin ? '#9CA3AF' : '#289294',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        minHeight: getResponsiveSize(56, 60, 64)
      }}
      onPress={handleCheckIn}
      disabled={submittingCheckin}
      activeOpacity={0.8}
    >
      <Text style={{
        color: '#FFFFFF',
        fontSize: getFontSize(18),
        fontWeight: '600'
      }}>
        {submittingCheckin ? '⏳ Checking In...' : '📥 Check In'}
      </Text>
      <Text style={{
        color: '#FFFFFF',
        fontSize: getFontSize(14),
        marginTop: 4,
        opacity: 0.9
      }}>
        {submittingCheckin ? 'Please wait...' : 'Start your work day'}
      </Text>
    </TouchableOpacity> }
   
    {/* When checked in, show break buttons */}
    {isCheckedIn && 
    (
      <View style={{
        flexDirection: isSmallDevice ? 'column' : 'row',
        marginTop: 16,
        width: '100%',
        gap: isSmallDevice ? 12 : 8
      }}>
        {!isOnBreak ? (
          <TouchableOpacity
            style={{
              flex: isSmallDevice ? undefined : 1,
              width: isSmallDevice ? '100%' : undefined,
              marginRight: isSmallDevice ? 0 : 8,
              borderRadius: 16,
              paddingVertical: getButtonPadding().vertical,
              paddingHorizontal: getButtonPadding().horizontal,
              alignItems: 'center',
              backgroundColor: (submittingBreak || checkoutInProgress) ? '#9CA3AF' : '#289294',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
              minHeight: getResponsiveSize(52, 56, 60)
            }}
            onPress={handleBreakIn}
            disabled={submittingBreak || checkoutInProgress}
            activeOpacity={0.8}
          >
            <Text style={{
              color: '#FFFFFF',
              fontSize: getFontSize(16),
              fontWeight: '600'
            }}>
              {submittingBreak ? '⏳ Starting...' : checkoutInProgress ? '🚫 Wait...' : '☕ Start Break'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={{
              flex: isSmallDevice ? undefined : 1,
              width: isSmallDevice ? '100%' : undefined,
              marginRight: isSmallDevice ? 0 : 8,
              borderRadius: 16,
              paddingVertical: getButtonPadding().vertical,
              paddingHorizontal: getButtonPadding().horizontal,
              alignItems: 'center',
              backgroundColor: submittingBreak ? '#9CA3AF' : '#EF4444',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
              minHeight: getResponsiveSize(52, 56, 60)
            }}
            onPress={handleBreakOff}
            disabled={submittingBreak}
            activeOpacity={0.8}
          >
            <Text style={{
              color: '#FFFFFF',
              fontSize: getFontSize(16),
              fontWeight: '600'
            }}>
              {submittingBreak ? '⏳ Ending...' : '⏱ End Break'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Keep checkout button visible */}
        <TouchableOpacity
          style={{
            flex: isSmallDevice ? undefined : 1,
            width: isSmallDevice ? '100%' : undefined,
            marginLeft: isSmallDevice ? 0 : 8,
            borderRadius: 16,
            paddingVertical: getButtonPadding().vertical,
            paddingHorizontal: getButtonPadding().horizontal,
            alignItems: 'center',
            backgroundColor: submittingCheckout ? '#9CA3AF' : '#F87171',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
            minHeight: getResponsiveSize(52, 56, 60)
          }}
          onPress={handleCheckOut}
          disabled={submittingCheckout}
          activeOpacity={0.8}
        >
          <Text style={{
            color: '#FFFFFF',
            fontSize: getFontSize(16),
            fontWeight: '600'
          }}>
            {submittingCheckout ? 'Checking Out' : '📤 Check Out'}
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