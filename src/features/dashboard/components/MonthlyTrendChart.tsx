import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCompactCurrency, formatCurrency } from '@/lib/finance'

interface MonthlyTrendItem {
  month: string
  income: number
  expense: number
}

interface MonthlyTrendChartProps {
  data: MonthlyTrendItem[]
  year: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    dataKey: string
    value: number
    name: string
    color: string
  }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null

  const incomeItem = payload.find((p) => p.dataKey === 'income')
  const expenseItem = payload.find((p) => p.dataKey === 'expense')

  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1.5 min-w-[130px]">
      <p className="font-semibold text-card-foreground border-b border-border/40 pb-1">{label}</p>
      {incomeItem && (
        <div className="flex items-center justify-between gap-3 font-medium text-emerald-600 dark:text-emerald-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Thu:
          </span>
          <span className="font-bold text-card-foreground">{formatCurrency(incomeItem.value)}</span>
        </div>
      )}
      {expenseItem && (
        <div className="flex items-center justify-between gap-3 font-medium text-rose-600 dark:text-rose-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            Chi:
          </span>
          <span className="font-bold text-card-foreground">{formatCurrency(expenseItem.value)}</span>
        </div>
      )}
    </div>
  )
}

export function MonthlyTrendChart({ data, year }: MonthlyTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Xu hướng thu & chi năm {year}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(val) => formatCompactCurrency(val)} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar name="Thu" dataKey="income" fill="#16A34A" radius={[4, 4, 0, 0]} />
              <Bar name="Chi" dataKey="expense" fill="#DC2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

