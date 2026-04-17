import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from './ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Trash2, LogOut, Download, Pencil } from 'lucide-react'
import { WeightChart } from './WeightChart'
import { type User, type WeightEntry, API_URL, authFetch } from '../lib/auth'

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

const editFormSchema = z.object({
  weight: z.string().min(1, 'Weight is required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
})
type EditFormValues = z.infer<typeof editFormSchema>

export function WeightTracker({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [weight, setWeight] = useState('')
  const [data, setData] = useState<WeightEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [editEntry, setEditEntry] = useState<WeightEntry | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: { weight: '', date: '', time: '' },
    mode: 'onChange',
  })
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
    editForm.reset({
      weight: String(item.weight),
      date: `${yyyy}-${mm}-${dd}`,
      time: `${hh}:${min}`,
    })
    setEditEntry(item)
  }

  const onEditSubmit = async (values: EditFormValues) => {
    if (!editEntry) return
    setIsSavingEdit(true)
    try {
      const newTimestamp = new Date(`${values.date}T${values.time}:00`).toISOString()
      const response = await authFetch(`${API_URL}/weight/${editEntry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight: parseFloat(values.weight), timestamp: newTimestamp }),
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

        {data.length >= 2 && <WeightChart data={data} />}

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
                      <span className="text-sm text-gray-600">{formatDate(item.timestamp)}</span>
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
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-2">
              <FormField
                control={editForm.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditEntry(null)} disabled={isSavingEdit}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingEdit || !editForm.formState.isValid}>
                  {isSavingEdit ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </Form>
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
            <AlertDialogCancel
              onClick={() => {
                confirmModal.onCancel?.()
                setConfirmModal({ ...confirmModal, isOpen: false })
              }}
            >
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
