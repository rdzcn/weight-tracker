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
import { User, API_URL } from '../lib/auth'

interface ModalState {
  isOpen: boolean
  title: string
  message: string
  type: 'error' | 'success' | 'info'
  action?: () => void
  actionLabel?: string
}

export function LandingPage({ onLogin }: { onLogin: (user: User, token: string) => void }) {
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

  useEffect(() => {
    // Check for magic link token in URL
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const path = window.location.pathname

    if (path === '/auth/verify' && token) {
      verifyMagicLink(token)
    }
  }, [])

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
      // Clear URL params
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
              onKeyDown={handleKeyPress}
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
    </div>
  )
}
