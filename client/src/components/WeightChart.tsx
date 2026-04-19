import { useMemo, useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import type { WeightEntry } from '../lib/auth'

// Custom X-axis tick: shows label every 5 days on desktop, none on mobile
function ChartTick({ x, y, payload, isDesktop }: { x?: number; y?: number; payload?: { value: string }; isDesktop?: boolean }) {
  if (x === undefined || y === undefined || !payload) return null

  // If mobile, don't show any labels
  if (!isDesktop) return null

  // payload.value format: "index|DD/MM"
  const parts = (payload.value || '').split('|')
  const index = parseInt(parts[0] || '0', 10)
  const dateStr = parts[1] || ''

  // Only render label every 5 days
  if (index % 5 !== 0) return null

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fontSize={12} fill="#374151">
        {dateStr}
      </text>
    </g>
  )
}

export function WeightChart({ data }: { data: WeightEntry[] }) {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const chartData = useMemo(() => {
    const sorted = [...data].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    return sorted.map((entry, index) => {
      const date = new Date(entry.timestamp)

      const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
      const fullDateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
      const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

      // Format for x-axis: "index|DD/MM" so the custom tick can parse it
      return {
        dateDisplay: `${index}|${dateStr}`,
        fullDate: fullDateStr,
        time,
        weight: entry.weight,
      }
    })
  }, [data])

  if (chartData.length === 0) {
    return null
  }

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
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="dateDisplay"
              tick={(props) => <ChartTick {...props} isDesktop={isDesktop} />}
              tickLine={false}
              axisLine={false}
              interval={4}
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
              labelFormatter={(_, payload) => {
                if (payload && payload.length > 0) {
                  const data = payload[0].payload
                  return `${data.fullDate} ${data.time}`
                }
                return ''
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
