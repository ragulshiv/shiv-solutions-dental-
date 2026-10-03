'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  Calendar,
  Receipt,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Package,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { formatTime } from '@/lib/appointment-utils'
import dynamic from 'next/dynamic'
import { InsightsPanel } from '@/components/ai/insights-panel'
import { EmptyHint } from '@/components/ui/empty-hint'
import { AiOnly } from '@/components/ai/ai-enabled'
import { labelFor } from '@/lib/labels'
import { useCurrentUser, can } from '@/components/layout/current-user'

// Charts load after the first paint (the chart library is ~120 KB compressed);
// the stat cards and appointments render without waiting for it.
const chartPlaceholder = () => <div className="h-[300px] animate-pulse rounded-md bg-muted/50" />
const RevenueLineChart = dynamic(
  () => import('@/components/dashboard/dashboard-charts').then((m) => m.RevenueLineChart),
  { ssr: false, loading: chartPlaceholder }
)
const AppointmentStatusPie = dynamic(
  () => import('@/components/dashboard/dashboard-charts').then((m) => m.AppointmentStatusPie),
  { ssr: false, loading: chartPlaceholder }
)
const MonthlyRevenueBarChart = dynamic(
  () => import('@/components/dashboard/dashboard-charts').then((m) => m.MonthlyRevenueBarChart),
  { ssr: false, loading: chartPlaceholder }
)
const TopProceduresBarChart = dynamic(
  () => import('@/components/dashboard/dashboard-charts').then((m) => m.TopProceduresBarChart),
  { ssr: false, loading: chartPlaceholder }
)

interface DashboardStats {
  overview: {
    totalPatients: number
    newPatientsThisMonth: number
    patientGrowth: number
    todayAppointments: number
    thisMonthAppointments: number
    appointmentGrowth: number
    pendingAppointments: number
    completedAppointmentsToday: number
    thisMonthRevenue: number
    todayRevenue: number
    revenueGrowth: number
    pendingPayments: number
    totalRevenue: number
  }
  charts: {
    last7DaysRevenue: Array<{ date: string; revenue: number }>
    last6MonthsRevenue: Array<{ month: string; revenue: number }>
    appointmentsByStatus: Array<{ status: string; count: number }>
    topProcedures: Array<{ name: string; count: number; revenue: number }>
  }
  recentActivity: {
    upcomingAppointments: Array<{
      id: string
      patientName: string
      doctorName: string
      date: string
      time?: string
      type: string
      status: string
    }>
    lowStockItems: Array<{
      id: string
      name: string
      currentStock: number
      minimumStock: number
      unit: string
    }>
  }
}

export default function DashboardPage() {
  const { role } = useCurrentUser()
  const showMoney = role !== 'DOCTOR' && role !== 'LAB_TECH'
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/stats')

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard statistics')
      }

      const data = await response.json()
      setStats(data.data)
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Month-on-month change as a compact pill: emerald up, rose down, neutral flat.
  const trendPill = (growth: number) => {
    const up = growth > 0
    const down = growth < 0
    const Arrow = up ? ArrowUpRight : down ? ArrowDownRight : null
    return (
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums',
          up &&
            'border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
          down &&
            'border-rose-200/60 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300',
          !up && !down && 'border-border bg-muted text-muted-foreground'
        )}
      >
        {Arrow && <Arrow className="h-3 w-3" />}
        {up ? '+' : ''}
        {growth.toFixed(1)}%
      </span>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Dashboard</h1>
          <p className="text-muted-foreground">Loading your practice data...</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 pb-2 md:p-6 md:pb-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 w-32 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Dashboard</h1>
          <p className="text-muted-foreground text-red-600">Failed to load dashboard data</p>
        </div>
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p>{error || 'An error occurred'}</p>
            </div>
            <Button onClick={fetchDashboardStats} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening at your dental practice today.
        </p>
      </div>

      {/* AI Insights */}
      <AiOnly>
        <InsightsPanel />
      </AiOnly>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {/* Total Patients */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 pb-2 md:p-6 md:pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground md:text-sm">
              Total Patients
            </CardTitle>
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className="text-xl font-semibold tabular-nums tracking-tight md:text-2xl">
              {stats.overview.totalPatients.toLocaleString()}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {trendPill(stats.overview.patientGrowth)}
              <span className="text-xs text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 pb-2 md:p-6 md:pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground md:text-sm">
              Today&apos;s Appointments
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className="text-xl font-semibold tabular-nums tracking-tight md:text-2xl">
              {stats.overview.todayAppointments}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.overview.completedAppointmentsToday} done, {stats.overview.pendingAppointments}{' '}
              still to see
            </p>
          </CardContent>
        </Card>

        {/* This Month Revenue */}
        {showMoney && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 pb-2 md:p-6 md:pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground md:text-sm">
                This Month Revenue
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
              <div className="text-xl font-semibold tabular-nums tracking-tight md:text-2xl">
                {formatCurrency(stats.overview.thisMonthRevenue)}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {trendPill(stats.overview.revenueGrowth)}
                <span className="text-xs text-muted-foreground">vs last month</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Payments */}
        {showMoney && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 pb-2 md:p-6 md:pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground md:text-sm">
                Pending Payments
              </CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
              <div className="text-xl font-semibold tabular-nums tracking-tight md:text-2xl">
                {formatCurrency(stats.overview.pendingPayments)}
              </div>
              <p className="text-xs text-muted-foreground">Outstanding receivables</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts and Activity */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Revenue Chart */}
        {showMoney && (
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription>Last 7 days revenue trend</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              {stats.charts.last7DaysRevenue && stats.charts.last7DaysRevenue.length > 0 ? (
                <RevenueLineChart
                  data={stats.charts.last7DaysRevenue}
                  formatCurrency={formatCurrency}
                />
              ) : (
                <EmptyHint
                  title="No revenue data available"
                  tip="Revenue appears here once invoices are paid."
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Upcoming Appointments */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>Next 5 scheduled appointments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity.upcomingAppointments &&
              stats.recentActivity.upcomingAppointments.length > 0 ? (
                stats.recentActivity.upcomingAppointments.map((apt) => (
                  <div key={apt.id} className="flex items-start gap-3 text-sm">
                    <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 space-y-1">
                      <p className="font-medium">{apt.patientName}</p>
                      <p className="text-muted-foreground text-xs">
                        {format(new Date(apt.date), 'MMM dd, yyyy')}
                        {apt.time ? ` · ${formatTime(apt.time)}` : ''} • {apt.doctorName}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyHint
                  title="No upcoming appointments"
                  tip="Book an appointment and it will show up here."
                />
              )}
            </div>
            <Link href="/appointments">
              <Button variant="outline" className="w-full mt-4">
                View All Appointments
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Appointment Status Chart */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Appointments by Status</CardTitle>
            <CardDescription>This month's appointment distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.charts.appointmentsByStatus && stats.charts.appointmentsByStatus.length > 0 ? (
              <AppointmentStatusPie
                data={stats.charts.appointmentsByStatus.map((d) => ({
                  ...d,
                  status: labelFor(d.status),
                }))}
              />
            ) : (
              <EmptyHint
                title="No appointment data available"
                tip="Appointment mix appears once this month has bookings."
              />
            )}
          </CardContent>
        </Card>

        {/* Monthly Revenue Trend */}
        {showMoney && (
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue Trend</CardTitle>
              <CardDescription>Last 6 months revenue comparison</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.charts.last6MonthsRevenue && stats.charts.last6MonthsRevenue.length > 0 ? (
                <MonthlyRevenueBarChart
                  data={stats.charts.last6MonthsRevenue}
                  formatCurrency={formatCurrency}
                />
              ) : (
                <EmptyHint
                  title="No revenue data available"
                  tip="Revenue appears here once invoices are paid."
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Top Procedures */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Top Procedures</CardTitle>
            <CardDescription>Most common procedures this month</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.charts.topProcedures && stats.charts.topProcedures.length > 0 ? (
              <TopProceduresBarChart
                data={stats.charts.topProcedures}
                formatCurrency={formatCurrency}
              />
            ) : (
              <EmptyHint
                title="No procedure data available"
                tip="Your most common procedures will appear here."
              />
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>Items below minimum stock level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentActivity.lowStockItems &&
              stats.recentActivity.lowStockItems.length > 0 ? (
                stats.recentActivity.lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Min: {item.minimumStock} {item.unit}
                      </p>
                    </div>
                    <div className="text-red-600 font-medium">
                      {item.currentStock} {item.unit}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">All items in stock</p>
              )}
            </div>
            <Link href="/inventory">
              <Button variant="outline" className="w-full mt-4">
                View Inventory
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks you can do right now</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[
            {
              href: '/appointments/queue',
              icon: Calendar,
              title: "Today's queue",
              sub: 'Walk-ins and waiting',
              show: true,
            },
            {
              href: '/patients/new',
              icon: Users,
              title: 'Add patient',
              sub: 'Register new',
              show: true,
            },
            {
              href: '/appointments/new',
              icon: Calendar,
              title: 'Book appointment',
              sub: 'Schedule visit',
              show: role !== 'LAB_TECH',
            },
            {
              href: '/billing/invoices/new',
              icon: Receipt,
              title: 'New bill',
              sub: 'Bill a patient',
              show: can.bill(role),
            },
            {
              href: '/reports',
              icon: TrendingUp,
              title: 'Reports',
              sub: 'Analytics',
              show: ['ADMIN', 'ACCOUNTANT'].includes(role),
            },
          ]
            .filter((a) => a.show)
            .slice(0, 4)
            .map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent md:gap-4 md:p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <a.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{a.sub}</p>
                </div>
              </Link>
            ))}
        </CardContent>
      </Card>
    </div>
  )
}
