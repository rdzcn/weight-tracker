import { useState, useEffect, useRef } from 'react'
import './App.css'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Trash2 } from 'lucide-react'

interface WeightEntry {
  id: number;
  weight: number;
  timestamp: string;
  method: string;
}

function App() {
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
      const response = await fetch('http://localhost:8000/weights')
      const weights = await response.json()
      setData(weights)
    } catch (error) {
      alert('Failed to fetch weights')
      console.error(error)
    }
  }

  const submitWeight = async () => {
    if (!weight) return
    
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('weight', weight)
      
      await fetch('http://localhost:8000/weight', {
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
      const response = await fetch(`http://localhost:8000/weight/${id}`, {
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

      await fetch('http://localhost:8000/weight', {
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
        <h1 className="text-4xl font-bold text-center mb-8">Weight Tracker</h1>
        
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

export default App
