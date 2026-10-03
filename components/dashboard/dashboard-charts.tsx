'use client'

// Dashboard charts. They live in their own module so the dashboard page can
// load them with next/dynamic: recharts is ~120 KB compressed, and keeping it
// out of the first download lets the stat cards and appointments show first.

import { format } from 'date-fns'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS } from '@/lib/chart-theme'

type FormatCurrency = (amount: number) => string

export function RevenueLineChart({
  data,
  formatCurrency,
}: {
  data: any[]
  formatCurrency: FormatCurrency
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data.map((item: any) => ({
          date: format(new Date(item.date), 'MMM dd'),
          revenue: Number(item.revenue),
        }))}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip
          formatter={(value) => (typeof value === 'number' ? formatCurrency(value) : '')}
          labelStyle={{ color: 'inherit' }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          activeDot={{ r: 8 }}
          name="Revenue"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function AppointmentStatusPie({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data.map((item: any) => ({
            name: item.status,
            value: item.count,
          }))}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((_: unknown, index: number) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function MonthlyRevenueBarChart({
  data,
  formatCurrency,
}: {
  data: any[]
  formatCurrency: FormatCurrency
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data.map((item: any) => ({
          month: item.month,
          revenue: Number(item.revenue),
        }))}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip formatter={(value) => (typeof value === 'number' ? formatCurrency(value) : '')} />
        <Legend />
        <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function TopProceduresBarChart({
  data,
  formatCurrency,
}: {
  data: any[]
  formatCurrency: FormatCurrency
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data.map((proc: any) => ({
          name: proc.name.length > 20 ? proc.name.substring(0, 20) + '...' : proc.name,
          count: Number(proc.count),
          revenue: Number(proc.revenue),
        }))}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--chart-1))" />
        <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" />
        <Tooltip
          formatter={(value, _name, item) => {
            if (typeof value !== 'number') return ''
            // Match on dataKey, not name: the <Bar> sets a display
            // name ("Revenue (₹)"), and that is what recharts passes
            // as `name`, so comparing it to 'revenue' never matched.
            if (item?.dataKey === 'revenue') return formatCurrency(value)
            return value
          }}
        />
        <Legend />
        {/* Bar colours match their axes (chart-1 left, chart-2 right). */}
        <Bar yAxisId="left" dataKey="count" fill="hsl(var(--chart-1))" name="Count" />
        <Bar yAxisId="right" dataKey="revenue" fill="hsl(var(--chart-2))" name="Revenue (₹)" />
      </BarChart>
    </ResponsiveContainer>
  )
}
