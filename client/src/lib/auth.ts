export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface WeightEntry {
  id: number;
  weight: number;
  timestamp: string;
  method: string;
}

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

// Auth helper functions
export const getToken = () => localStorage.getItem('token')
export const setToken = (token: string) => localStorage.setItem('token', token)
export const removeToken = () => localStorage.removeItem('token')

export const getUser = (): User | null => {
  const user = localStorage.getItem('user')
  return user ? JSON.parse(user) : null
}
export const setUser = (user: User) => localStorage.setItem('user', JSON.stringify(user))
export const removeUser = () => localStorage.removeItem('user')

export const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = getToken()
  const headers: HeadersInit = {
    ...options.headers,
  }
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  const response = await fetch(url, { ...options, headers })
  if (response.status === 401) {
    removeToken()
    removeUser()
    window.location.reload()
  }
  return response
}

export { API_URL }
