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
import { WeightEntry } from '../lib/auth'

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

export function WeightChart({ data }: { data: WeightEntry[] }) {
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
