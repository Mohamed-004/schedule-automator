"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreditCard, Download, DollarSign, TrendingUp, Calendar, Search, Filter, Plus, Eye } from "lucide-react"

const mockInvoices = [
  {
    id: "INV-001",
    client: "Sarah Johnson",
    service: "Plumbing Repair",
    amount: 285.0,
    status: "paid",
    date: "2024-12-01",
    dueDate: "2024-12-15",
  },
  {
    id: "INV-002",
    client: "Robert Davis",
    service: "HVAC Maintenance",
    amount: 450.0,
    status: "pending",
    date: "2024-12-03",
    dueDate: "2024-12-17",
  },
  {
    id: "INV-003",
    client: "Emily Wilson",
    service: "Electrical Installation",
    amount: 1250.0,
    status: "overdue",
    date: "2024-11-20",
    dueDate: "2024-12-04",
  },
]

const mockPayments = [
  {
    id: "PAY-001",
    invoice: "INV-001",
    client: "Sarah Johnson",
    amount: 285.0,
    method: "Credit Card",
    date: "2024-12-02",
    status: "completed",
  },
  {
    id: "PAY-002",
    invoice: "INV-004",
    client: "Michael Brown",
    amount: 175.0,
    method: "ACH Transfer",
    date: "2024-12-01",
    status: "completed",
  },
]

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState("overview")

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "overdue":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const totalRevenue = mockInvoices.reduce((sum, inv) => sum + inv.amount, 0)
  const paidAmount = mockInvoices.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + inv.amount, 0)
  const pendingAmount = mockInvoices.filter((inv) => inv.status === "pending").reduce((sum, inv) => sum + inv.amount, 0)
  const overdueAmount = mockInvoices.filter((inv) => inv.status === "overdue").reduce((sum, inv) => sum + inv.amount, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing & Payments</h1>
            <p className="text-sm text-gray-600">Manage invoices, payments, and financial reports</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </header>

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Revenue Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-100 p-2 sm:p-3 rounded-full">
                      <DollarSign className="h-5 sm:h-6 w-5 sm:w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600">+12.5%</span>
                    <span className="text-gray-500 ml-1">from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Paid</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-600">${paidAmount.toFixed(2)}</p>
                    </div>
                    <div className="bg-green-100 p-2 sm:p-3 rounded-full">
                      <CreditCard className="h-5 sm:h-6 w-5 sm:w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending</p>
                      <p className="text-xl sm:text-2xl font-bold text-yellow-600">${pendingAmount.toFixed(2)}</p>
                    </div>
                    <div className="bg-yellow-100 p-2 sm:p-3 rounded-full">
                      <Calendar className="h-5 sm:h-6 w-5 sm:w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Overdue</p>
                      <p className="text-xl sm:text-2xl font-bold text-red-600">${overdueAmount.toFixed(2)}</p>
                    </div>
                    <div className="bg-red-100 p-2 sm:p-3 rounded-full">
                      <Calendar className="h-5 sm:h-6 w-5 sm:w-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockInvoices.slice(0, 3).map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{invoice.client}</p>
                          <p className="text-sm text-gray-600">{invoice.service}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${invoice.amount.toFixed(2)}</p>
                          <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{payment.client}</p>
                          <p className="text-sm text-gray-600">{payment.method}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">${payment.amount.toFixed(2)}</p>
                          <p className="text-sm text-gray-500">{payment.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input placeholder="Search invoices..." className="pl-10" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 sm:flex-none">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button className="flex-1 sm:flex-none">
                      <Plus className="h-4 w-4 mr-2" />
                      New Invoice
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoices List */}
            <Card>
              <CardHeader>
                <CardTitle>All Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4 sm:mb-0">
                        <div>
                          <p className="font-medium">{invoice.id}</p>
                          <p className="text-sm text-gray-600">{invoice.client}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Service</p>
                          <p className="font-medium">{invoice.service}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Amount</p>
                          <p className="font-semibold">${invoice.amount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Due Date</p>
                          <p className="font-medium">{invoice.dueDate}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <Badge className={`${getStatusColor(invoice.status)} mb-2 sm:mb-0`}>{invoice.status}</Badge>
                        <Button size="sm" variant="outline" className="flex-1 sm:flex-none">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 sm:flex-none">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="font-medium">{payment.id}</p>
                          <p className="text-sm text-gray-600">{payment.client}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Invoice</p>
                          <p className="font-medium">{payment.invoice}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Method</p>
                          <p className="font-medium">{payment.method}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Date</p>
                          <p className="font-medium">{payment.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-green-600">${payment.amount.toFixed(2)}</p>
                        <Badge className={getStatusColor(payment.status)}>{payment.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Revenue chart would go here</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Credit Card</span>
                      <span className="font-semibold">65%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>ACH Transfer</span>
                      <span className="font-semibold">25%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Cash</span>
                      <span className="font-semibold">10%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
