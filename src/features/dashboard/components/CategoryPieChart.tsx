import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/finance'

interface CategoryExpenseItem {
  name: string
  value: number
  color: string
}

interface CategoryPieChartProps {
  data: CategoryExpenseItem[]
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Phân tích chi tiêu theo danh mục</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-sm text-muted-foreground">
          Chưa có chi tiêu nào trong tháng này
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Phân tích chi tiêu theo danh mục</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Số tiền']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                  color: 'hsl(var(--card-foreground))',
                }}
                itemStyle={{ color: 'hsl(var(--card-foreground))' }}
                labelStyle={{ color: 'hsl(var(--card-foreground))' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

