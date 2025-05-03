import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { checkUserRole } from "@/lib/roleCheck";

// Define range in days for queries
const getRangeDays = (range: string): number => {
  switch (range) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case '1y': return 365;
    case 'all': return 9999; // Very large number to get all data
    default: return 30; // Default to 30 days
  }
};

// GET: Fetch analytics data based on requested tab and date range
export async function GET(req: NextRequest) {
  try {
    // Authentication and authorization
    const { userId } = await getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") || "overview";
    const range = searchParams.get("range") || "30d";
    
    // Calculate the date range
    const days = getRangeDays(range);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Initialize response object
    const response: Record<string, any> = {};
    
    // Handle each tab's data
    switch (tab) {
      case 'overview':
        response.overview = await getOverviewData(startDate);
        break;
      case 'defects':
        response.defects = await getDefectsAnalysis(startDate);
        break;
      case 'inventory':
        response.inventory = await getInventoryHealth();
        break;
      case 'vendors':
        response.vendors = await getVendorPerformance(startDate);
        break;
      default:
        // Handle multiple tabs for dashboard view
        response.overview = await getOverviewData(startDate);
        response.defects = await getDefectsAnalysis(startDate);
        response.inventory = await getInventoryHealth();
        response.vendors = await getVendorPerformance(startDate);
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}

// Get overview dashboard data
async function getOverviewData(startDate: Date) {
  // 1. Get total defects from inventory defects
  // @ts-expect-error - Prisma client methods
  const inventoryDefectsCount = await prisma.defect.count({
    where: {
      createdAt: { gte: startDate }
    }
  });
  
  // Get total defects from return QC
  // @ts-expect-error - Prisma client methods
  const returnQCDefectsCount = await prisma.returnQCDefect.count({
    where: {
      createdAt: { gte: startDate }
    }
  });
  
  // Combined total defects
  const totalDefects = inventoryDefectsCount + returnQCDefectsCount;
  
  // 2. Get previous period for comparison (for both defect types)
  const previousStartDate = new Date(startDate);
  previousStartDate.setDate(previousStartDate.getDate() - (startDate.getDate() - new Date().getDate()));
  
  // @ts-expect-error - Prisma client methods
  const previousPeriodInventoryDefects = await prisma.defect.count({
    where: {
      createdAt: {
        gte: previousStartDate,
        lt: startDate
      }
    }
  });
  
  // @ts-expect-error - Prisma client methods
  const previousPeriodReturnQCDefects = await prisma.returnQCDefect.count({
    where: {
      createdAt: {
        gte: previousStartDate,
        lt: startDate
      }
    }
  });
  
  const previousPeriodDefects = previousPeriodInventoryDefects + previousPeriodReturnQCDefects;
  
  // Calculate trend percentage (handle division by zero)
  let defectsTrend = 0;
  if (previousPeriodDefects > 0) {
    defectsTrend = Math.round(((totalDefects - previousPeriodDefects) / previousPeriodDefects) * 100);
  }
  
  // 3. Get defects by severity from inventory defects
  // @ts-expect-error - Prisma client methods
  const inventoryDefectsBySeverity = await prisma.defect.groupBy({
    by: ['severity'],
    where: {
      createdAt: { gte: startDate }
    },
    _count: {
      id: true
    }
  });
  
  // Get defects by severity from return QC defects
  // Note: Assume returnQCDefects have a severity field similar to inventory defects
  // If they don't, this would need to be adjusted or mapped differently
  // @ts-expect-error - Prisma client methods
  const returnQCDefectsBySeverity = await prisma.returnQCDefect.groupBy({
    by: ['severity'],
    where: {
      createdAt: { gte: startDate }
    },
    _count: {
      id: true
    }
  });
  
  // Combine severity data
  const defectsBySeverityMap: Record<string, number> = {};
  
  // Process inventory defects
  inventoryDefectsBySeverity.forEach(item => {
    defectsBySeverityMap[item.severity] = item._count.id;
  });
  
  // Add return QC defects (or update counts if severity already exists)
  returnQCDefectsBySeverity.forEach(item => {
    defectsBySeverityMap[item.severity] = (defectsBySeverityMap[item.severity] || 0) + item._count.id;
  });
  
  // 4. Get inventory utilization (approximation based on components used vs total)
  // @ts-expect-error - Prisma client methods
  const totalComponents = await prisma.component.count();
  // @ts-expect-error - Prisma client methods
  const usedComponents = await prisma.assemblyComponentBatch.groupBy({
    by: ['componentId'],
    where: {
      assembly: {
        createdAt: { gte: startDate }
      }
    }
  });
  
  const inventoryUtilization = totalComponents > 0 
    ? Math.round((usedComponents.length / totalComponents) * 100) 
    : 0;
  
  // 5. Get top vendor rating
  // @ts-expect-error - Prisma client methods
  const vendors = await prisma.vendor.findMany({
    include: {
      stockBatches: {
        include: {
          component: true
        }
      }
    }
  });
  
  // 6. Calculate vendor ratings based on defect rates
  // @ts-expect-error - Prisma client methods
  const inventoryDefects = await prisma.defect.findMany({
    where: {
      createdAt: { gte: startDate }
    },
    include: {
      component: true
    }
  });
  
  // @ts-expect-error - Prisma client methods
  const returnQCDefects = await prisma.returnQCDefect.findMany({
    where: {
      createdAt: { gte: startDate }
    },
    include: {
      component: true,
      batch: {
        include: {
          vendor: true
        }
      }
    }
  });
  
  // Group defects by vendor
  const defectsByVendor: Record<string, { count: number, totalBatches: number }> = {};
  
  // Process regular defects (if we can associate with vendor)
  // This is simplified logic - in reality, you'd need more sophisticated tracking
  
  // Process return QC defects (these have batch and vendor info)
  for (const defect of returnQCDefects) {
    if (defect.batch?.vendor) {
      const vendorId = defect.batch.vendor.id;
      if (!defectsByVendor[vendorId]) {
        defectsByVendor[vendorId] = { count: 0, totalBatches: 0 };
      }
      defectsByVendor[vendorId].count += 1;
    }
  }
  
  // Count batches per vendor
  for (const vendor of vendors) {
    if (!defectsByVendor[vendor.id]) {
      defectsByVendor[vendor.id] = { count: 0, totalBatches: 0 };
    }
    defectsByVendor[vendor.id].totalBatches += vendor.stockBatches.length;
  }
  
  // Calculate ratings (5 - defect rate * 10, clamped between 0-5)
  // Higher rating = fewer defects
  const vendorRatings = vendors.map(vendor => {
    const stats = defectsByVendor[vendor.id] || { count: 0, totalBatches: 1 };
    const defectRate = stats.totalBatches > 0 ? stats.count / stats.totalBatches : 0;
    const rating = Math.max(0, Math.min(5, 5 - defectRate * 10));
    
    return {
      id: vendor.id,
      name: vendor.name,
      rating: rating
    };
  });
  
  // Sort by rating and get top vendor
  vendorRatings.sort((a, b) => b.rating - a.rating);
  const topVendorRating = vendorRatings[0] || { id: '', name: 'No data', rating: 0 };
  
  // 7. Get critical issues (high and critical severity defects) - from both sources
  // @ts-expect-error - Prisma client methods
  const criticalInventoryIssues = await prisma.defect.count({
    where: {
      createdAt: { gte: startDate },
      severity: { in: ['HIGH', 'CRITICAL'] }
    }
  });
  
  // @ts-expect-error - Prisma client methods
  const criticalReturnIssues = await prisma.returnQCDefect.count({
    where: {
      createdAt: { gte: startDate },
      severity: { in: ['HIGH', 'CRITICAL'] }
    }
  });
  
  const criticalIssues = criticalInventoryIssues + criticalReturnIssues;
  
  // 8. Generate defects trend data (daily counts) - combining both sources
  const defectsTrendData = await getDefectsTrendData(startDate);
  
  // Prepare defects by severity for chart from the combined map
  const defectsBySeverityData = Object.entries(defectsBySeverityMap).map(([severity, count]) => ({
    name: severity,
    value: count
  }));
  
  return {
    totalDefects,
    defectsTrend,
    defectsBySeverity: defectsBySeverityData,
    inventoryUtilization,
    topVendorRating,
    criticalIssues,
    defectsTrendData
  };
}

// Get defects analysis data
async function getDefectsAnalysis(startDate: Date) {
  // 1. Get top components with defects - from inventory defects
  // @ts-expect-error - Prisma client methods
  const inventoryDefects = await prisma.defect.findMany({
    where: {
      createdAt: { gte: startDate }
    },
    include: {
      component: true
    }
  });
  
  // Get defects from return QC
  // @ts-expect-error - Prisma client methods
  const returnQCDefects = await prisma.returnQCDefect.findMany({
    where: {
      createdAt: { gte: startDate }
    },
    include: {
      component: true
    }
  });
  
  // Group defects by component
  const defectsByComponent: Record<string, { id: string, name: string, count: number }> = {};
  
  // Process inventory defects
  for (const defect of inventoryDefects) {
    const componentId = defect.component.id;
    
    if (!defectsByComponent[componentId]) {
      defectsByComponent[componentId] = {
        id: componentId,
        name: defect.component.name,
        count: 0
      };
    }
    
    defectsByComponent[componentId].count += 1;
  }
  
  // Process return QC defects
  for (const defect of returnQCDefects) {
    const componentId = defect.component.id;
    
    if (!defectsByComponent[componentId]) {
      defectsByComponent[componentId] = {
        id: componentId,
        name: defect.component.name,
        count: 0
      };
    }
    
    defectsByComponent[componentId].count += 1;
  }
  
  // Convert to array and sort by count
  const topDefectsByComponent = Object.values(defectsByComponent)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10
  
  // 2. Get defects by source (inventory vs returns)
  // Count inventory defects
  const inventoryDefectsCount = inventoryDefects.length;
  
  // Count return defects
  const returnQCDefectsCount = returnQCDefects.length;
  
  const defectsBySource = [
    { name: 'Inventory', value: inventoryDefectsCount },
    { name: 'Returns', value: returnQCDefectsCount }
  ];
  
  // 3. Get defect severity by category
  // @ts-expect-error - Prisma client methods
  const components = await prisma.component.findMany({
    select: {
      id: true,
      category: true
    }
  });
  
  // Create a map of component ID to category
  const componentCategories: Record<string, string> = {};
  for (const component of components) {
    componentCategories[component.id] = component.category;
  }
  
  // Group defects by category and severity
  const defectsByCategoryAndSeverity: Record<string, Record<string, number>> = {};
  
  // Process inventory defects
  for (const defect of inventoryDefects) {
    const category = componentCategories[defect.component.id] || 'Unknown';
    const severity = defect.severity;
    
    if (!defectsByCategoryAndSeverity[category]) {
      defectsByCategoryAndSeverity[category] = {
        'LOW': 0,
        'MEDIUM': 0,
        'HIGH': 0,
        'CRITICAL': 0
      };
    }
    
    defectsByCategoryAndSeverity[category][severity] += 1;
  }
  
  // Process return QC defects
  for (const defect of returnQCDefects) {
    const category = componentCategories[defect.component.id] || 'Unknown';
    const severity = defect.severity;
    
    if (!defectsByCategoryAndSeverity[category]) {
      defectsByCategoryAndSeverity[category] = {
        'LOW': 0,
        'MEDIUM': 0,
        'HIGH': 0,
        'CRITICAL': 0
      };
    }
    
    defectsByCategoryAndSeverity[category][severity] += 1;
  }
  
  // Convert to array format for charts
  const defectSeverityByCategory = Object.entries(defectsByCategoryAndSeverity).map(([category, severities]) => ({
    category,
    ...severities
  }));
  
  return {
    topDefectsByComponent,
    defectsBySource,
    defectSeverityByCategory
  };
}

// Get inventory health data
async function getInventoryHealth() {
  // 1. Count total components
  // @ts-expect-error - Prisma client methods
  const totalComponents = await prisma.component.count();
  
  // 2. Count active batches (with stock > 0)
  // @ts-expect-error - Prisma client methods
  const activeBatches = await prisma.stockBatch.count({
    where: {
      currentQuantity: { gt: 0 }
    }
  });
  
  // 3. Get components with stock info
  // @ts-expect-error - Prisma client methods
  const components = await prisma.component.findMany({
    include: {
      stockBatches: {
        select: {
          currentQuantity: true
        }
      }
    }
  });
  
  // 4. Calculate low stock and out of stock items
  let lowStockItems = 0;
  let outOfStockItems = 0;
  
  for (const component of components) {
    const totalStock = component.stockBatches.reduce((sum, batch) => sum + batch.currentQuantity, 0);
    
    if (totalStock === 0) {
      outOfStockItems++;
    } else if (totalStock < component.minimumQuantity) {
      lowStockItems++;
    }
  }
  
  // 5. Calculate consumption rate based on assemblies
  // @ts-expect-error - Prisma client methods
  const recentAssemblies = await prisma.assemblyComponentBatch.findMany({
    where: {
      assembly: {
        createdAt: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
        }
      }
    },
    include: {
      component: true
    }
  });
  
  // Group by component and calculate monthly rate
  const consumptionByComponent: Record<string, { id: string, name: string, total: number }> = {};
  
  for (const usage of recentAssemblies) {
    const componentId = usage.component.id;
    
    if (!consumptionByComponent[componentId]) {
      consumptionByComponent[componentId] = {
        id: componentId,
        name: usage.component.name,
        total: 0
      };
    }
    
    consumptionByComponent[componentId].total += usage.quantityUsed;
  }
  
  // Convert to monthly rate (90 days = 3 months)
  const consumptionRate = Object.values(consumptionByComponent)
    .map(item => ({
      name: item.name,
      rate: Math.round(item.total / 3) // Monthly rate
    }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10); // Top 10
  
  // 6. Calculate stock health by category
  // Group components by category
  const stockByCategory: Record<string, { healthy: number, warning: number, critical: number }> = {};
  
  for (const component of components) {
    const category = component.category;
    const totalStock = component.stockBatches.reduce((sum, batch) => sum + batch.currentQuantity, 0);
    
    if (!stockByCategory[category]) {
      stockByCategory[category] = { healthy: 0, warning: 0, critical: 0 };
    }
    
    if (totalStock === 0) {
      stockByCategory[category].critical++;
    } else if (totalStock < component.minimumQuantity) {
      stockByCategory[category].warning++;
    } else {
      stockByCategory[category].healthy++;
    }
  }
  
  // Convert to array for chart
  const stockHealthByCategory = Object.entries(stockByCategory).map(([category, counts]) => ({
    category,
    ...counts
  }));
  
  return {
    totalComponents,
    activeBatches,
    lowStockItems,
    outOfStockItems,
    consumptionRate,
    stockHealthByCategory
  };
}

// Get vendor performance data
async function getVendorPerformance(startDate: Date) {
  // 1. Get all vendors with their batches
  // @ts-expect-error - Prisma client methods
  const vendors = await prisma.vendor.findMany({
    include: {
      stockBatches: {
        include: {
          component: true
        }
      }
    }
  });
  
  // 2. Get defects for calculation
  // @ts-expect-error - Prisma client methods
  const returnQCDefects = await prisma.returnQCDefect.findMany({
    where: {
      createdAt: { gte: startDate }
    },
    include: {
      batch: {
        include: {
          vendor: true
        }
      }
    }
  });
  
  // 3. Calculate quality ratings
  // Group defects by vendor
  const defectsByVendor: Record<string, number> = {};
  
  for (const defect of returnQCDefects) {
    if (defect.batch?.vendor) {
      const vendorId = defect.batch.vendor.id;
      defectsByVendor[vendorId] = (defectsByVendor[vendorId] || 0) + 1;
    }
  }
  
  // Calculate vendor quality ratings (5 - defect rate * 10, clamped between 0-5)
  const qualityRating = vendors.map(vendor => {
    const defectCount = defectsByVendor[vendor.id] || 0;
    const batchCount = vendor.stockBatches.length || 1; // Avoid division by zero
    const defectRate = defectCount / batchCount;
    const rating = Math.max(0, Math.min(5, 5 - defectRate * 10));
    
    return {
      name: vendor.name,
      rating: rating
    };
  })
  .sort((a, b) => b.rating - a.rating);
  
  // 4. Defects by vendor for pie chart
  const defectsByVendorChart = Object.entries(defectsByVendor)
    .map(([vendorId, count]) => {
      const vendor = vendors.find(v => v.id === vendorId);
      return {
        name: vendor ? vendor.name : 'Unknown',
        value: count
      };
    })
    .sort((a, b) => b.value - a.value);
  
  // 5. Simulate lead time performance (in the absence of actual order data)
  // In a real system, you would calculate this from actual order/delivery records
  const leadTimePerformance = vendors.map(vendor => {
    // Calculate a pseudo lead time based on the vendor ID to simulate variation
    // In a real system, replace this with actual lead time calculations
    const hash = vendor.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const baseLeadTime = 5; // Base lead time of 5 days
    const variation = (hash % 10) / 2; // 0-5 days variation
    
    return {
      name: vendor.name,
      leadTime: Math.round(baseLeadTime + variation)
    };
  })
  .sort((a, b) => a.leadTime - b.leadTime);
  
  return {
    qualityRating,
    defectsByVendor: defectsByVendorChart,
    leadTimePerformance
  };
}

// Helper to get daily defect trend data
async function getDefectsTrendData(startDate: Date) {
  // Get all inventory defects in date range
  // @ts-expect-error - Prisma client methods
  const inventoryDefects = await prisma.defect.findMany({
    where: {
      createdAt: { gte: startDate }
    },
    select: {
      createdAt: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });
  
  // Get all return QC defects in date range
  // @ts-expect-error - Prisma client methods
  const returnQCDefects = await prisma.returnQCDefect.findMany({
    where: {
      createdAt: { gte: startDate }
    },
    select: {
      createdAt: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });
  
  // Create map for daily counts
  const dailyCounts: Record<string, number> = {};
  
  // Initialize all days in the range
  const now = new Date();
  let currentDate = new Date(startDate);
  while (currentDate <= now) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dailyCounts[dateKey] = 0;
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Count inventory defects by day
  for (const defect of inventoryDefects) {
    const dateKey = defect.createdAt.toISOString().split('T')[0];
    dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
  }
  
  // Count return QC defects by day
  for (const defect of returnQCDefects) {
    const dateKey = defect.createdAt.toISOString().split('T')[0];
    dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
  }
  
  // Convert to array for chart
  return Object.entries(dailyCounts).map(([date, count]) => ({
    date,
    count
  }));
} 