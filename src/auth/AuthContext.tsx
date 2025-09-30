import { getStatus } from '@/src/api/attendance'
import { requestOtp, verifyLogin } from '@/src/api/auth'
import { User, VerifyLoginResponse } from '@/src/types/auth'
import { getItem, removeItem, setItem } from '@/src/utils/storage'
import React, { createContext, useContext, useEffect, useState } from 'react'

// Key used by AttendancePage for persisted state
const ATTENDANCE_STATE_KEY = '@attendance_state'

// Map server /api/status/ JSON to the persisted state shape used by AttendancePage
function mapServerStatusToPersisted(server: any) {
  if (!server) return null
  try {
    const status = server.status || null
    const isCheckedIn = status === 'checkedin'
    const isCheckedOut = status === 'checkedout'
    const isOnBreak = !!server.isOnBreak || !!server.is_on_break || false

    // Compute client/server offset if serverTimestamp is provided
    let offset = 0
    if (server.serverTimestamp) {
      try {
        const serverNow = new Date(server.serverTimestamp).getTime()
        const clientNow = Date.now()
        offset = clientNow - serverNow
      } catch {
        offset = 0
      }
    }

    const applyOffset = (isoOrNull: any) => {
      if (!isoOrNull) return null
      try {
        const t = new Date(isoOrNull).getTime()
        return new Date(t + offset).toISOString()
      } catch {
        return isoOrNull
      }
    }

    const attendanceRecord: any = {
      checkInTime: applyOffset(server.checkInTime ?? server.check_in_time) || null,
      checkOutTime: applyOffset(server.checkOutTime ?? server.check_out_time) || null,
      checkInLocation: server.additional?.location?.checkIn || server.check_in_location || null,
      checkOutLocation: server.additional?.location?.checkOut || server.check_out_location || null,
      checkInPhoto: server.additional?.photoUris?.checkIn || server.check_in_photo || null,
      checkOutPhoto: server.additional?.photoUris?.checkOut || server.check_out_photo || null,
      breaks: Array.isArray(server.breaks)
        ? server.breaks.map((b: any) => ({
            start: applyOffset(b.breakIn ?? b.break_in) || null,
            end: applyOffset(b.breakOut ?? b.break_out) || null,
            durationSeconds: typeof b.durationSeconds === 'number' ? b.durationSeconds : (b.duration ? (() => { const p = b.duration.split(':').map(Number); return p[0]*3600 + p[1]*60 + p[2] })() : undefined)
          }))
        : []
    }

    const persisted: any = {
      isCheckedIn: isCheckedIn && !isCheckedOut,
      isOnBreak: isOnBreak,
      attendanceRecord,
      currentBreakStart: applyOffset(server.currentBreakStart ?? server.current_break_start) || null,
      lastResetDate: server.date ? new Date(server.date).toISOString() : new Date().toISOString()
    }

    return persisted
  } catch (e) {
    console.warn('mapServerStatusToPersisted failed', e)
    return null
  }
}

interface AuthContextType {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  attendanceStatus: any | null
  refreshAttendanceStatus: () => Promise<void>
  isAuthenticated: boolean
  loading: boolean
  loginWithOtp: (email: string, password: string) => Promise<void>
  verifyOtp: (email: string, otp: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [attendanceStatus, setAttendanceStatus] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  const loginWithOtp = async (email: string, password: string) => {
    // Call requestOtp endpoint
    try {
      await requestOtp(email, password)
    } catch (error: any) {
      throw error
    }
  }

  const verifyOtp = async (email: string, otp: string) => {
    try {
      const res: VerifyLoginResponse = await verifyLogin(email, otp)
      if (res.success) {
        // Store the JWT token and user data
        setAccessToken(res.access_token)
        setRefreshToken(res.refresh_token)
        setUser(res.user)

        const createdAt = new Date().toISOString()
        await setItem('auth.accessToken', res.access_token)
        await setItem('auth.refreshToken', res.refresh_token)
        await setItem('auth.user', JSON.stringify(res.user))
        await setItem('auth.createdAt', createdAt)
        
        console.log('User authenticated successfully:', res.user)
        // Fetch attendance status after successful login
        try {
          const status = await getStatus()
          setAttendanceStatus(status)
          await setItem('attendance.status', JSON.stringify(status))
          // Also map server status to the app's persisted attendance state and save it
          try {
            const persisted = mapServerStatusToPersisted(status)
            if (persisted) {
              await setItem(ATTENDANCE_STATE_KEY, JSON.stringify(persisted))
            }
          } catch (e) {
            console.warn('Failed to persist mapped attendance state after login', e)
          }
        } catch (e) {
          console.warn('Failed to fetch attendance status after login', e)
        }
      } else {
        throw new Error(res.message || 'Verification failed')
      }
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    setUser(null)
    setAccessToken(null)
    setRefreshToken(null)
    await removeItem('auth.accessToken')
    await removeItem('auth.refreshToken')
    await removeItem('auth.user')
    await removeItem('auth.createdAt')
  }

  const hydrateSession = async () => {
    try {
      const token = await getItem('auth.accessToken')
      const refresh = await getItem('auth.refreshToken')
      const userStr = await getItem('auth.user')
      const createdAt = await getItem('auth.createdAt')

      if (token && refresh && userStr && createdAt) {
        const created = new Date(createdAt)
        const now = new Date()
        const diff = now.getTime() - created.getTime()
        const days = diff / (1000 * 60 * 60 * 24)
        if (days <= 7) {
          setAccessToken(token)
          setRefreshToken(refresh)
          try {
            setUser(JSON.parse(userStr))
          } catch (_e) {
              console.warn('Failed to parse stored user', _e)
              setUser(null)
            }
            // Try to hydrate attendance status from storage or backend
            try {
              const stored = await getItem('attendance.status')
              if (stored) {
                setAttendanceStatus(JSON.parse(stored))
              }
              // Always attempt a fresh fetch in background
              (async () => {
                try {
                  const fresh = await getStatus()
                  setAttendanceStatus(fresh)
                  await setItem('attendance.status', JSON.stringify(fresh))
                  try {
                    const persisted = mapServerStatusToPersisted(fresh)
                    if (persisted) await setItem(ATTENDANCE_STATE_KEY, JSON.stringify(persisted))
                  } catch (e) {
                    console.warn('Failed to persist mapped attendance state during hydrate', e)
                  }
                } catch (e) {
                  console.warn('Background refresh of attendance status failed', e)
                }
              })()
            } catch (e) {
              console.warn('hydrateSession: attendance status hydrate failed', e)
            }
        } else {
          // expired
          await removeItem('auth.accessToken')
          await removeItem('auth.refreshToken')
          await removeItem('auth.user')
          await removeItem('auth.createdAt')
        }
      }
    } catch (error) {
      console.error('hydrateSession error', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    hydrateSession()
  }, [])

  const refreshAttendanceStatus = async () => {
    try {
      const fresh = await getStatus()
      setAttendanceStatus(fresh)
      await setItem('attendance.status', JSON.stringify(fresh))
    } catch (e) {
      console.warn('refreshAttendanceStatus failed', e)
      throw e
    }
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, refreshToken, attendanceStatus, refreshAttendanceStatus, isAuthenticated: !!accessToken && !!user, loading, loginWithOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
