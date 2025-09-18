export interface User {
  id: number
  email: string
  full_name: string
  department: string
  job_title: string
  date_of_joining: string
  employment_type: string
  payout_terms: string
  address: string
  gender: string
  manager_name: string
  is_staff: boolean
  is_superuser: boolean
}

export interface RequestOtpResponse {
  success: boolean
  message: string
  expires_in?: string
}

export interface VerifyLoginResponse {
  success: boolean
  message: string
  access_token: string
  refresh_token: string
  user: User
}
