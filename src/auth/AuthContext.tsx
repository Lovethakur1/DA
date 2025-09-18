import { requestOtp, verifyLogin } from '@/src/api/auth'
import { User, VerifyLoginResponse } from '@/src/types/auth'
import { getItem, removeItem, setItem } from '@/src/utils/storage'
import React, { createContext, useContext, useEffect, useState } from 'react'

interface AuthContextType {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
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
        setAccessToken(res.access_token)
        setRefreshToken(res.refresh_token)
        setUser(res.user)

        const createdAt = new Date().toISOString()
        await setItem('auth.accessToken', res.access_token)
        await setItem('auth.refreshToken', res.refresh_token)
        await setItem('auth.user', JSON.stringify(res.user))
        await setItem('auth.createdAt', createdAt)
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

  return (
    <AuthContext.Provider value={{ user, accessToken, refreshToken, isAuthenticated: !!accessToken && !!user, loading, loginWithOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
