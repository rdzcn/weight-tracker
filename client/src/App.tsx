import { useState, useEffect } from 'react'
import './App.css'
import { LandingPage } from './components/LandingPage'
import { WeightTracker } from './components/WeightTracker'
import { type User, getToken, setToken, getUser, setUser, removeToken, removeUser } from './lib/auth'

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
