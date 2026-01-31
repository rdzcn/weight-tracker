import { useState, useEffect, useRef } from 'react'
import './App.css'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card'
import { Trash2, LogOut } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface WeightEntry {
  id: number;
  weight: number;
  timestamp: string;
  method: string;
}

interface User {
  id: number;
  email: string;
  created_at: string;
}

// Auth helper functions
const getToken = () => localStorage.getItem('token')
const setToken = (token: string) => localStorage.setItem('token', token)
const removeToken = () => localStorage.removeItem('token')
const getUser = (): User | null => {
  const user = localStorage.getItem('user')
  return user ? JSON.parse(user) : null
}
const setUser = (user: User) => localStorage.setItem('user', JSON.stringify(user))
const removeUser = () => localStorage.removeItem('user')

const authFetch = async (url: string, options: RequestInit = {}) => {
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

// Landing Page Component
function LandingPage({ onLogin }: { onLogin: (user: User, token: string) => void }) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [verifyingToken, setVerifyingToken] = useState(false)

  useEffect(() => {
    // Check for magic link token in URL
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const path = window.location.pathname
    
    if (path === '/auth/verify' && token) {
      verifyMagicLink(token)
    }
  }, [])

  const verifyMagicLink = async (token: string) => {
    setVerifyingToken(true)
    try {
      const response = await fetch(`${API_URL}/auth/verify?token=${token}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Verification failed')
      }
      const data = await response.json()
      onLogin(data.user, data.access_token)
      // Clear URL params
      window.history.replaceState({}, '', '/')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to verify magic link')
      window.history.replaceState({}, '', '/')
    } finally {
      setVerifyingToken(false)
    }
  }

  const requestMagicLink = async () => {
    if (!email) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/auth/request-magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to send magic link')
      }
      
      setEmailSent(true)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to send magic link')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      requestMagicLink()
    }
  }

  if (verifyingToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Verifying your magic link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Check your email! 📧</CardTitle>
            <CardDescription>
              We sent a magic link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Click the link in the email to sign in. The link expires in 15 minutes.
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setEmailSent(false)}
            >
              Use a different email
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Weight Tracker</CardTitle>
          <CardDescription>
            Track your weight with manual entries or photos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
          </div>
          <Button 
            className="w-full" 
            onClick={requestMagicLink}
            disabled={isLoading || !email}
          >
            {isLoading ? 'Sending...' : 'Send Magic Link'}
          </Button>
          <p className="text-xs text-gray-500 text-center">
            We'll email you a magic link to sign in. No password needed!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// Main App Component (Protected)
function WeightTracker({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [weight, setWeight] = useState('')
  const [data, setData] = useState<WeightEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchWeights()
  }, [])

  const fetchWeights = async () => {
    try {
      const response = await authFetch(`${API_URL}/weights`)
      if (response.ok) {
        const weights = await response.json()
        setData(weights)
      }
    } catch (error) {
      console.error('Failed to fetch weights', error)
    }
  }

  const submitWeight = async () => {
    if (!weight) return
    
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('weight', weight)
      
      await authFetch(`${API_URL}/weight`, {
        method: 'POST',
        body: formData,
      })
      
      setWeight('')
      fetchWeights()
    } catch (error) {
      alert('Failed to submit weight')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteWeight = async (id: number) => {
    if (!confirm('Are you sure you want to delete this entry?')) return
    
    setDeletingId(id)
    try {
      const response = await authFetch(`${API_URL}/weight/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete')
      }
      
      fetchWeights()
    } catch (error) {
      alert('Failed to delete weight entry')
      console.error(error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      await authFetch(`${API_URL}/weight`, {
        method: 'POST',
        body: formData,
      })

      fetchWeights()
      alert('Weight extracted from photo!')
    } catch (error) {
      alert('Failed to upload photo')
      console.error(error)
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      submitWeight()
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayOfWeek = days[date.getDay()]
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    return `${dayOfWeek}, ${day}/${month}/${year} ${hours}:${minutes}`
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Weight Tracker</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut size={16} className="mr-2" />
              Logout
            </Button>
          </div>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add Weight Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Enter weight (kg)"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={submitWeight} disabled={isLoading || !weight}>
                Submit
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="flex-1"
              >
                Upload Photo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weight History</CardTitle>
          </CardHeader>
          <CardContent>
            {data.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No entries yet</p>
            ) : (
              <div className="space-y-2">
                {data.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <span className="font-semibold">{item.weight} kg</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({item.method === 'ocr' ? 'Photo' : 'Manual'})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">
                        {formatDate(item.timestamp)}
                      </span>
                      <button
                        onClick={() => deleteWeight(item.id)}
                        disabled={deletingId === item.id}
                        className="p-2 hover:bg-red-100 text-red-600 rounded-md transition-colors disabled:opacity-50"
                        title="Delete entry"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Root App Component
function App() {
  const [user, setUserState] = useState<User | null>(getUser())
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Check if we have a valid token on mount
    const token = getToken()
    const storedUser = getUser()
    
    if (token && storedUser) {
      setUserState(storedUser)
    }
    setIsInitialized(true)
  }, [])

  const handleLogin = (newUser: User, token: string) => {
    setToken(token)
    setUser(newUser)
    setUserState(newUser)
  }

  const handleLogout = () => {
    removeToken()
    removeUser()
    setUserState(null)
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <LandingPage onLogin={handleLogin} />
  }

  return <WeightTracker user={user} onLogout={handleLogout} />
}

export default App
