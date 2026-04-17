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
function ChartTick({ x, y, payload, chartData }: { x?: number; y?: number; payload?: { value: string }; chartData?: Array<{ index: string; xAxisLabel: { isMonday: boolean; dateStr: string } }> }) {
  if (x === undefined || y === undefined || !payload || !chartData) return null

  const index = parseInt(payload.value || '0', 10)
  const dataPoint = chartData[index]

  if (!dataPoint || !dataPoint.xAxisLabel.isMonday) {
    return null
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fontSize={12} fill="#374151">
        {dataPoint.xAxisLabel.dateStr}
      </text>
    </g>
  )
}

export function WeightChart({ data }: { data: WeightEntry[] }) {
  const chartData = useMemo(() => {
    const sorted = [...data].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    return sorted.map((entry, index) => {
      const date = new Date(entry.timestamp)
      const dayOfWeek = date.getDay()
      const isMonday = dayOfWeek === 1

      const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`

      return {
        index: String(index),
        weight: entry.weight,
        xAxisLabel: {
          isMonday,
          dateStr,
        },
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
              dataKey="index"
              tick={(props) => <ChartTick chartData={chartData} {...props} />}
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
