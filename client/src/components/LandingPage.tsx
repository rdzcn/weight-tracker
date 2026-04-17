import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { type User, API_URL } from '../lib/auth'
import { Zap, TrendingDown, BarChart3, Camera } from 'lucide-react'

interface ModalState {
  isOpen: boolean
  title: string
  message: string
  type: 'error' | 'success' | 'info'
  action?: () => void
}

interface LoginFormProps {
  onLogin: (user: User, token: string) => void
}

function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [verifyingToken, setVerifyingToken] = useState(false)
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error',
  })

  const showModal = (title: string, message: string, type: 'error' | 'success' | 'info' = 'info', action?: () => void) => {
    setModal({ isOpen: true, title, message, type, action })
  }

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
      window.history.replaceState({}, '', '/')
    } catch (error) {
      showModal(
        'Verification Failed',
        error instanceof Error ? error.message : 'Failed to verify magic link',
        'error',
        () => {
          window.history.replaceState({}, '', '/')
        }
      )
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
      showModal('Failed to Send Magic Link', error instanceof Error ? error.message : 'Failed to send magic link', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      requestMagicLink()
    }
  }

  // Check for magic link on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const path = window.location.pathname

    if (path === '/auth/verify' && token) {
      verifyMagicLink(token)
    }
  }, [])

  if (verifyingToken) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying your magic link...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (emailSent) {
    return (
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
    )
  }

  return (
    <>
      <Card className="w-full max-w-md border-2 border-blue-100">
        <CardHeader className="text-center bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="text-2xl text-blue-900">Get Started</CardTitle>
          <CardDescription>No password needed, just your email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isLoading}
              className="border-blue-200"
            />
          </div>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={requestMagicLink}
            disabled={isLoading || !email}
          >
            {isLoading ? 'Sending...' : 'Send Magic Link'}
          </Button>
          <p className="text-xs text-gray-500 text-center">
            We'll email you a secure link to sign in instantly.
          </p>
        </CardContent>
      </Card>

      <Dialog open={modal.isOpen} onOpenChange={(isOpen) => !isOpen && setModal({ ...modal, isOpen: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modal.title}</DialogTitle>
            <DialogDescription>{modal.message}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                modal.action?.()
                setModal({ ...modal, isOpen: false })
              }}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function LandingPage({ onLogin }: { onLogin: (user: User, token: string) => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navbar */}
      <nav className="border-b border-blue-100 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Weight Tracker</span>
          </div>
          <div className="text-sm text-gray-600">Track your progress</div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Track Your Weight, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Achieve Your Goals</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Simple, intuitive weight tracking with powerful insights. Log daily entries manually or capture photos for automatic weight extraction.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex gap-3 items-start">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Quick Entry</h3>
                  <p className="text-sm text-gray-600">Log weight in seconds</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Camera className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Photo Mode</h3>
                  <p className="text-sm text-gray-600">OCR extracts weight</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Visual Progress</h3>
                  <p className="text-sm text-gray-600">See trends at a glance</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingDown className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Export Data</h3>
                  <p className="text-sm text-gray-600">CSV download available</p>
                </div>
              </div>
            </div>

            {/* Testimonial */}
            <div className="bg-white rounded-xl p-6 border border-blue-100 shadow-sm">
              <p className="text-gray-700 italic mb-3">
                "Finally a weight tracker that doesn't overcomplicate things. Love the photo feature!"
              </p>
              <p className="text-sm font-semibold text-gray-900">— Happy User</p>
            </div>
          </div>

          {/* Right side - Login Form */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md">
              <LoginForm onLogin={onLogin} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Benefits */}
      <div className="bg-white border-t border-blue-100 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">∞</div>
              <h3 className="font-semibold text-gray-900 mb-2">No Limits</h3>
              <p className="text-gray-600 text-sm">Track as many entries as you want, for as long as you want.</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">🔒</div>
              <h3 className="font-semibold text-gray-900 mb-2">Private & Secure</h3>
              <p className="text-gray-600 text-sm">Your data is yours alone. Magic link auth, no passwords.</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">📱</div>
              <h3 className="font-semibold text-gray-900 mb-2">All Devices</h3>
              <p className="text-gray-600 text-sm">Works seamlessly on web, mobile, and desktop.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-16">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to start tracking?</h2>
          <p className="text-blue-100 mb-8">Join thousands of users taking control of their health journey.</p>
          <Button className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8 py-2 h-auto">
            Scroll up to get started
          </Button>
        </div>
      </div>
    </div>
  )
}
