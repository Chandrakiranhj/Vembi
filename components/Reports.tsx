'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Area,
} from 'recharts';

// Type definitions
interface DefectTrendDataPoint {
  date: string;
  count: number;
}

interface SeverityDataPoint {
  name: string;
  value: number;
}

interface ComponentDefectDataPoint {
  id: string;
  name: string;
  count: number;
}

interface DefectSeverityByCategory {
  category: string;
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  CRITICAL: number;
}

// Analytics tabs
type AnalyticsTab = 'defects' | 'inventory' | 'vendors' | 'overview';

// Date range for filtering
type DateRange = '7d' | '30d' | '90d' | '1y' | 'all';

export default function Reports() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  // Fetch analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', activeTab, dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics?tab=${activeTab}&range=${dateRange}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      return response.json();
    }
  });

  // Colors for charts - premium, modern palette with burgundy theme
  const COLORS = ['#8B2131', '#6D1A27', '#06b6d4', '#D4BC7D', '#4A1219', '#10b981'];
  
  // Severity colors
  const SEVERITY_COLORS = {
    LOW: '#3b82f6',
    MEDIUM: '#f59e0b',
    HIGH: '#ef4444',
    CRITICAL: '#8B2131'
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (analyticsLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#8B2131] mb-3" />
          <p className="text-sm text-gray-500">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#8B2131] to-[#6D1A27]">Analytics & Reports</h1>
        <p className="text-muted-foreground">
          Comprehensive analytics on defects, inventory, and vendor performance from all sources.
        </p>
      </div>

      {/* Date range selector */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700">Time period:</span>
        <div className="flex rounded-md overflow-hidden shadow-sm border border-gray-200">
          {(['7d', '30d', '90d', '1y', 'all'] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                dateRange === range
                  ? 'bg-gradient-to-r from-[#8B2131] to-[#6D1A27] text-white'
                  : 'bg-white hover:bg-gray-50 text-gray-700'
              }`}
            >
              {range === '7d' ? 'Week' : 
               range === '30d' ? 'Month' : 
               range === '90d' ? 'Quarter' : 
               range === '1y' ? 'Year' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={(v) => setActiveTab(v as AnalyticsTab)}
        className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
      >
        <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-gray-100/80 p-1 rounded-lg">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#8B2131] rounded-md font-medium">Overview</TabsTrigger>
          <TabsTrigger value="defects" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#8B2131] rounded-md font-medium">Defects Analysis</TabsTrigger>
          <TabsTrigger value="inventory" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#8B2131] rounded-md font-medium">Inventory Health</TabsTrigger>
          <TabsTrigger value="vendors" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#8B2131] rounded-md font-medium">Vendor Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Key metrics cards */}
            <Card className="border-none shadow-md bg-gradient-to-br from-[#F5F1E4] to-white overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Defects</CardTitle>
                <CardDescription className="text-xs">From all sources (inventory & returns)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#8B2131]">{analyticsData?.overview?.totalDefects || 0}</div>
                <p className={`text-xs flex items-center mt-1 font-medium ${analyticsData?.overview?.defectsTrend > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {analyticsData?.overview?.defectsTrend > 0 ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {analyticsData?.overview?.defectsTrend > 0 ? '+' : ''}
                  {analyticsData?.overview?.defectsTrend}% from previous period
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md bg-gradient-to-br from-[#F5F1E4] to-white overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Inventory Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#8B2131]">{analyticsData?.overview?.inventoryUtilization || 0}%</div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  Based on component usage rates
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md bg-gradient-to-br from-[#F5F1E4] to-white overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Top Vendor Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#8B2131]">{analyticsData?.overview?.topVendorRating?.rating ? Number(analyticsData.overview.topVendorRating.rating).toFixed(1) : '0'}</div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  {analyticsData?.overview?.topVendorRating?.name || 'No data'}
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md bg-gradient-to-br from-[#F5F1E4] to-white overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#8B2131]">{analyticsData?.overview?.criticalIssues || 0}</div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  Requires immediate attention
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Trend Chart */}
            <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-all">
              <CardHeader className="bg-gradient-to-r from-[#F5F1E4] to-white border-b border-gray-100 pb-4">
                <CardTitle className="text-lg font-semibold text-gray-800">Defects Trend</CardTitle>
                <CardDescription className="text-gray-600">
                  Defects reported over time from all sources
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={analyticsData?.overview?.defectsTrendData || []}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="colorDefects" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B2131" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8B2131" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => formatDate(value)}
                        stroke="#94a3b8"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={12}
                      />
                      <Tooltip 
                        labelFormatter={(value) => formatDate(value)}
                        formatter={(value: number) => [value, 'Defects']}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{
                          paddingBottom: "10px"
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#8B2131"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorDefects)"
                        activeDot={{ r: 6, stroke: "#6D1A27", strokeWidth: 2, fill: "#ffffff" }}
                        name="Defects"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Defects by Category Pie Chart */}
            <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-all">
              <CardHeader className="bg-gradient-to-r from-[#F5F1E4] to-white border-b border-gray-100 pb-4">
                <CardTitle className="text-lg font-semibold text-gray-800">Defects by Severity</CardTitle>
                <CardDescription className="text-gray-600">
                  Distribution of defects across severity levels
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData?.overview?.defectsBySeverity || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        innerRadius={60}
                        paddingAngle={2}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {(analyticsData?.overview?.defectsBySeverity || []).map((entry: SeverityDataPoint, index: number) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={SEVERITY_COLORS[entry.name as keyof typeof SEVERITY_COLORS] || COLORS[index % COLORS.length]} 
                            stroke="#ffffff"
                            strokeWidth={1}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => [`${value} defects`, name]} 
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                      <Legend 
                        layout="horizontal" 
                        verticalAlign="bottom" 
                        align="center" 
                        iconType="circle"
                        iconSize={8}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Defects Analysis Tab */}
        <TabsContent value="defects" className="space-y-6 mt-6">
          <div className="flex items-center gap-2 mb-4 p-4 bg-[#F5F1E4] border border-[#D4BC7D] rounded-lg">
            <Badge variant="outline" className="bg-[#F5F1E4] text-[#8B2131] hover:bg-[#D4BC7D] border-[#D4BC7D]">
              Combined Data Source
            </Badge>
            <p className="text-sm text-[#4A1219]">
              This analysis includes defects from both inventory inspections and customer returns
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Components with Defects */}
            <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-all">
              <CardHeader className="bg-gradient-to-r from-[#F5F1E4] to-white border-b border-gray-100 pb-4">
                <CardTitle className="text-lg font-semibold text-gray-800">Top Components with Defects</CardTitle>
                <CardDescription className="text-gray-600">
                  Components with the highest defect reports
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analyticsData?.defects?.topDefectsByComponent || []}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="colorDefectBar" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#8B2131" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#6D1A27" stopOpacity={0.8}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        type="number" 
                        stroke="#94a3b8" 
                        fontSize={12}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={70}
                        tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 12)}...` : value}
                        stroke="#94a3b8"
                        fontSize={12}
                      />
                      <Tooltip 
                        formatter={(value, name, props) => [value, props.payload.name]}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                        cursor={{ fill: 'rgba(236, 240, 249, 0.5)' }}
                      />
                      <Legend iconType="circle" iconSize={8} />
                      <Bar 
                        dataKey="count" 
                        fill="url(#colorDefectBar)" 
                        name="Defect Count" 
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Defects by Source */}
            <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-all">
              <CardHeader className="bg-gradient-to-r from-[#F5F1E4] to-white border-b border-gray-100 pb-4">
                <CardTitle className="text-lg font-semibold text-gray-800">Defects by Source</CardTitle>
                <CardDescription className="text-gray-600">
                  Distribution between inventory and returns
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData?.defects?.defectsBySource || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        innerRadius={60}
                        paddingAngle={2}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        <Cell key="cell-0" fill="#8B2131" stroke="#ffffff" strokeWidth={1} />
                        <Cell key="cell-1" fill="#D4BC7D" stroke="#ffffff" strokeWidth={1} />
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => [`${value} defects`, name]}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                      <Legend 
                        layout="horizontal" 
                        verticalAlign="bottom" 
                        align="center" 
                        iconType="circle"
                        iconSize={8}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="bg-gradient-to-r from-[#F5F1E4] to-white border-b border-gray-100 pb-4">
              <CardTitle className="text-lg font-semibold text-gray-800">Defect Severity by Component Category</CardTitle>
              <CardDescription className="text-gray-600">
                Analysis of defect severity across different component categories
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analyticsData?.defects?.defectSeverityByCategory || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="category" 
                      stroke="#94a3b8"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#94a3b8"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Legend 
                      iconType="circle"
                      iconSize={8}
                    />
                    <Bar dataKey="LOW" stackId="a" fill={SEVERITY_COLORS.LOW} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="MEDIUM" stackId="a" fill={SEVERITY_COLORS.MEDIUM} />
                    <Bar dataKey="HIGH" stackId="a" fill={SEVERITY_COLORS.HIGH} />
                    <Bar dataKey="CRITICAL" stackId="a" fill={SEVERITY_COLORS.CRITICAL} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Health Tab */}
        <TabsContent value="inventory" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Key inventory metrics */}
            <Card className="border-none shadow-md bg-gradient-to-br from-[#F5F1E4] to-white overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Components</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#8B2131]">{analyticsData?.inventory?.totalComponents || 0}</div>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md bg-gradient-to-br from-[#F5F1E4] to-white overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Batches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#8B2131]">{analyticsData?.inventory?.activeBatches || 0}</div>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md bg-gradient-to-br from-[#F5F1E4] to-white overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#8B2131]">{analyticsData?.inventory?.lowStockItems || 0}</div>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md bg-gradient-to-br from-[#F5F1E4] to-white overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#8B2131]">{analyticsData?.inventory?.outOfStockItems || 0}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stock Trends */}
            <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-all">
              <CardHeader className="bg-gradient-to-r from-[#F5F1E4] to-white border-b border-gray-100 pb-4">
                <CardTitle className="text-lg font-semibold text-gray-800">Inventory Consumption Rate</CardTitle>
                <CardDescription className="text-gray-600">
                  Top components by usage rate
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analyticsData?.inventory?.consumptionRate || []}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={90}
                        tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                      />
                      <Tooltip formatter={(value) => [`${value} units/month`, 'Consumption Rate']} />
                      <Legend />
                      <Bar dataKey="rate" fill="#6D1A27" name="Units/Month" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Stock Health by Category */}
            <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-all">
              <CardHeader className="bg-gradient-to-r from-[#F5F1E4] to-white border-b border-gray-100 pb-4">
                <CardTitle className="text-lg font-semibold text-gray-800">Stock Health by Category</CardTitle>
                <CardDescription className="text-gray-600">
                  Stock levels across component categories
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analyticsData?.inventory?.stockHealthByCategory || []}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="healthy" stackId="a" fill="#D4BC7D" name="Healthy" />
                      <Bar dataKey="warning" stackId="a" fill="#facc15" name="Low Stock" />
                      <Bar dataKey="critical" stackId="a" fill="#8B2131" name="Critical" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Vendor Performance Tab */}
        <TabsContent value="vendors" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vendor Quality Rating */}
            <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-all">
              <CardHeader className="bg-gradient-to-r from-[#F5F1E4] to-white border-b border-gray-100 pb-4">
                <CardTitle className="text-lg font-semibold text-gray-800">Vendor Quality Rating</CardTitle>
                <CardDescription className="text-gray-600">
                  Based on defect rates in components
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analyticsData?.vendors?.qualityRating || []}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        domain={[0, 5]}
                        ticks={[0, 1, 2, 3, 4, 5]}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={90}
                        tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                      />
                      <Tooltip formatter={(value) => [`${value.toFixed(1)}/5.0`, 'Rating']} />
                      <Legend />
                      <Bar dataKey="rating" fill="#8B2131" name="Quality Rating (0-5)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Defects by Vendor */}
            <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-all">
              <CardHeader className="bg-gradient-to-r from-[#F5F1E4] to-white border-b border-gray-100 pb-4">
                <CardTitle className="text-lg font-semibold text-gray-800">Defects by Vendor</CardTitle>
                <CardDescription className="text-gray-600">
                  Number of defects reported per vendor
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData?.vendors?.defectsByVendor || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={(entry) => entry.name.length > 10 ? `${entry.name.substring(0, 10)}...` : entry.name}
                      >
                        {analyticsData?.vendors?.defectsByVendor?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => [`${value} defects`, props.payload.name]} />
                      <Legend 
                        formatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="bg-gradient-to-r from-[#F5F1E4] to-white border-b border-gray-100 pb-4">
              <CardTitle className="text-lg font-semibold text-gray-800">Vendor Lead Time Performance</CardTitle>
              <CardDescription className="text-gray-600">
                Average days from order to delivery by vendor
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analyticsData?.vendors?.leadTimePerformance || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
                    />
                    <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => [`${value} days`, 'Lead Time']} />
                    <Legend />
                    <Bar dataKey="leadTime" fill="#D4BC7D" name="Avg. Lead Time (Days)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 