import { useMemo } from 'react'
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

// Custom X-axis tick: shows label only for Mondays
function ChartTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string | { isMonday?: boolean; dateStr?: string } } }) {
  if (x === undefined || y === undefined || !payload) return null

  // Handle both string and object payloads
  let isMonday = false
  let dateStr = ''

  if (typeof payload.value === 'string') {
    // Legacy format (shouldn't happen, but for safety)
    const parts = payload.value.split('|')
    dateStr = parts[1] || ''
  } else if (typeof payload.value === 'object' && payload.value !== null) {
    isMonday = payload.value.isMonday || false
    dateStr = payload.value.dateStr || ''
  }

  // Only render label for Mondays
  if (!isMonday) return null

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fontSize={12} fill="#374151">
        {dateStr}
      </text>
    </g>
  )
}

export function WeightChart({ data }: { data: WeightEntry[] }) {
  const chartData = useMemo(() => {
    const sorted = [...data].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    return sorted.map((entry) => {
      const date = new Date(entry.timestamp)
      const dayOfWeek = date.getDay()
      const isMonday = dayOfWeek === 1

      const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`

      return {
        weight: entry.weight,
        dateDisplay: {
          isMonday,
          dateStr,
        },
      }
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
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="dateDisplay"
              tick={(props) => <ChartTick {...props} />}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
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
              labelFormatter={() => ''}
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
