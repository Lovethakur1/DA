import { RequestOtpResponse, VerifyLoginResponse } from '@/src/types/auth'
import api from './http'

export const requestOtp = async (email: string, password: string): Promise<RequestOtpResponse> => {
  const payload = { email, password }
  const res = await api.post('/api/request-otp/', payload)
  return res.data as RequestOtpResponse
}

export const verifyLogin = async (email: string, otp_code: string): Promise<VerifyLoginResponse> => {
  const payload = { email, otp_code }
  const res = await api.post('/api/verify-login/', payload)
  return res.data as VerifyLoginResponse
}
