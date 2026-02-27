import { useState, useEffect, useRef, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import './App.css'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from './components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog'
import { Trash2, LogOut, Download, Pencil } from 'lucide-react'

interface ModalState {
  isOpen: boolean
  title: string
  message: string
  type: 'error' | 'success' | 'info'
  action?: () => void
  actionLabel?: string
}

interface ConfirmModalState {
  isOpen: boolean
  title: string
  message: string
  onConfirm?: () => void
  onCancel?: () => void
}

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
      showModal('Verification Failed', error instanceof Error ? error.message : 'Failed to verify magic link', 'error', () => {
        window.history.replaceState({}, '', '/')
      })
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

// Custom X-axis tick: shows HH:mm on top, dd/MM below
function ChartTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  if (x === undefined || y === undefined || !payload) return null
  const [time, date] = (payload.value ?? '').split('|')
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fontSize={12} fill="#374151">
        {time}
      </text>
      <text x={0} y={0} dy={26} textAnchor="middle" fontSize={10} fill="#9ca3af">
        {date}
      </text>
    </g>
  )
}

// Weight Chart Component
function WeightChart({ data }: { data: WeightEntry[] }) {
  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((entry) => {
        const date = new Date(entry.timestamp)
        const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
        const day = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
        // pipe-separated so the custom tick can split them
        return { date: `${time}|${day}`, weight: entry.weight, time, day }
      })
  }, [data])

  const weights = chartData.map((d) => d.weight)
  const minWeight = Math.floor(Math.min(...weights)) - 1
  const maxWeight = Math.ceil(Math.max(...weights)) + 1

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={(props) => <ChartTick {...props} />}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <YAxis
              domain={[minWeight, maxWeight]}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v} kg`}
              width={54}
            />
            <Tooltip
              formatter={(value) => [`${value} kg`, 'Weight']}
              labelFormatter={(label: string) => {
                const [time, date] = label.split('|')
                return `${date} ${time}`
              }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Main App Component (Protected)
function WeightTracker({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [weight, setWeight] = useState('')
  const [data, setData] = useState<WeightEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [editEntry, setEditEntry] = useState<WeightEntry | null>(null)
  const [editWeight, setEditWeight] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error',
  })
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
  })

  useEffect(() => {
    fetchWeights()
  }, [])

  const showModal = (title: string, message: string, type: 'error' | 'success' | 'info' = 'info', action?: () => void) => {
    setModal({ isOpen: true, title, message, type, action })
  }

  const showConfirm = (title: string, message: string, onConfirm?: () => void, onCancel?: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, onCancel })
  }

  const fetchWeights = async () => {
    try {
      const response = await authFetch(`${API_URL}/weights`)
      if (response.ok) {
        const weights = await response.json()
        setData(weights)
      }
    } catch (error) {
      console.error('Failed to fetch weights', error)
      showModal('Error', 'Failed to fetch weight entries', 'error')
    }
  }

  const submitWeight = async () => {
    if (!weight) return
    
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('weight', weight)
      formData.append('timestamp', new Date().toISOString())
      
      await authFetch(`${API_URL}/weight`, {
        method: 'POST',
        body: formData,
      })
      
      setWeight('')
      fetchWeights()
    } catch (error) {
      showModal('Failed to Submit Weight', 'There was an error submitting your weight entry', 'error')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteWeight = async (id: number) => {
    showConfirm(
      'Delete Entry',
      'Are you sure you want to delete this weight entry? This action cannot be undone.',
      async () => {
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
          showModal('Deletion Failed', 'There was an error deleting the weight entry', 'error')
          console.error(error)
        } finally {
          setDeletingId(null)
        }
      }
    )
  }

  const openEditDialog = (item: WeightEntry) => {
    const d = new Date(item.timestamp)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    setEditEntry(item)
    setEditWeight(String(item.weight))
    setEditDate(`${yyyy}-${mm}-${dd}`)
    setEditTime(`${hh}:${min}`)
  }

  const saveEdit = async () => {
    if (!editEntry || !editWeight || !editDate || !editTime) return
    setIsSavingEdit(true)
    try {
      const newTimestamp = new Date(`${editDate}T${editTime}:00`).toISOString()
      const response = await authFetch(`${API_URL}/weight/${editEntry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight: parseFloat(editWeight), timestamp: newTimestamp }),
      })
      if (!response.ok) throw new Error('Failed to update')
      setEditEntry(null)
      fetchWeights()
    } catch (error) {
      showModal('Update Failed', 'There was an error updating the weight entry', 'error')
      console.error(error)
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('timestamp', new Date().toISOString())

      await authFetch(`${API_URL}/weight`, {
        method: 'POST',
        body: formData,
      })

      fetchWeights()
      showModal('Success', 'Weight extracted from photo successfully!', 'success')
    } catch (error) {
      showModal('Upload Failed', 'There was an error uploading the photo', 'error')
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

  const exportCSV = () => {
    const sorted = [...data].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    const rows = [
      ['Date', 'Time', 'Weight (kg)', 'Method'],
      ...sorted.map((entry) => {
        const date = new Date(entry.timestamp)
        const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
        const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
        return [dateStr, timeStr, entry.weight, entry.method === 'ocr' ? 'Photo' : 'Manual']
      }),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `weight-history-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
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

        {data.length >= 2 && (
          <WeightChart data={data} />
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Weight History</CardTitle>
            {data.length > 0 && (
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download size={15} className="mr-1.5" />
                Export CSV
              </Button>
            )}
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
                        onClick={() => openEditDialog(item)}
                        className="p-2 hover:bg-blue-100 text-blue-600 rounded-md transition-colors"
                        title="Edit entry"
                      >
                        <Pencil size={18} />
                      </button>
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

      {/* Edit Entry Modal */}
      <Dialog open={!!editEntry} onOpenChange={(isOpen) => !isOpen && setEditEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Weight Entry</DialogTitle>
            <DialogDescription>Update the weight, date, or time for this entry.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Weight (kg)</label>
              <Input
                type="number"
                step="0.1"
                value={editWeight}
                onChange={(e) => setEditWeight(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Date</label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Time</label>
              <Input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditEntry(null)} disabled={isSavingEdit}>
                Cancel
              </Button>
              <Button onClick={saveEdit} disabled={isSavingEdit || !editWeight || !editDate || !editTime}>
                {isSavingEdit ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error/Success/Info Modal */}
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

      {/* Confirmation Modal */}
      <AlertDialog open={confirmModal.isOpen} onOpenChange={(isOpen) => !isOpen && setConfirmModal({ ...confirmModal, isOpen: false })}>
        <AlertDialogContent>
          <AlertDialogTitle>{confirmModal.title}</AlertDialogTitle>
          <AlertDialogDescription>{confirmModal.message}</AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel onClick={() => {
              confirmModal.onCancel?.()
              setConfirmModal({ ...confirmModal, isOpen: false })
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmModal.onConfirm?.()
                setConfirmModal({ ...confirmModal, isOpen: false })
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
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
