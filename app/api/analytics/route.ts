import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { DefectSeverity, Severity } from "@prisma/client";

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
    // Authentication
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") || "overview";
    const range = searchParams.get("range") || "30d";

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - getRangeDays(range));

    interface AnalyticsResponse {
      overview?: Record<string, unknown>;
      defects?: Record<string, unknown>;
      inventory?: Record<string, unknown>;
      vendors?: {
        componentPerformance?: Array<Record<string, unknown>>;
        qualityRating?: Array<Record<string, unknown>>;
        defectsByVendor?: Array<Record<string, unknown>>;
        leadTimePerformance?: Array<Record<string, unknown>>;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    }

    const response: AnalyticsResponse = {};

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
  const inventoryDefectsCount = await prisma.defect.count({
    where: {
      createdAt: { gte: startDate }
    }
  });

  // Get total defects from return QC
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

  const previousPeriodInventoryDefects = await prisma.defect.count({
    where: {
      createdAt: {
        gte: previousStartDate,
        lt: startDate
      }
    }
  });

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
    defectsBySeverityMap[item.severity] = (defectsBySeverityMap[item.severity] || 0) + item._count.id;
  });

  // Add return QC defects (or update counts if severity already exists)
  returnQCDefectsBySeverity.forEach(item => {
    defectsBySeverityMap[item.severity] = (defectsBySeverityMap[item.severity] || 0) + item._count.id;
  });

  // 4. Get inventory utilization (approximation based on components used vs total)
  const totalComponents = await prisma.component.count();

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
  const criticalInventoryIssues = await prisma.defect.count({
    where: {
      createdAt: { gte: startDate },
      severity: { in: [DefectSeverity.HIGH, DefectSeverity.CRITICAL] }
    }
  });

  const criticalReturnIssues = await prisma.returnQCDefect.count({
    where: {
      createdAt: { gte: startDate },
      severity: { in: [Severity.HIGH, Severity.CRITICAL] }
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
  // 1. Get inventory defects
  const inventoryDefects = await prisma.defect.findMany({
    where: {
      createdAt: { gte: startDate }
    },
    include: {
      component: true
    }
  });

  // 2. Get return QC defects
  const returnQCDefects = await prisma.returnQCDefect.findMany({
    where: {
      createdAt: { gte: startDate }
    },
    include: {
      component: true,
      batch: {
        include: {
          vendor: true // For vendor information if needed later in this function
        }
      }
    }
  });

  // 3. Get all components for category mapping
  const components = await prisma.component.findMany({
    select: {
      id: true,
      name: true, // Keep name for defectsByComponent
      category: true
    }
  });
  const componentDetailsMap: Record<string, { name: string, category: string }> = {};
  for (const component of components) {
    componentDetailsMap[component.id] = { name: component.name, category: component.category };
  }

  // 4. Get all stock batches for batchMap and componentToBatches mapping (if used for inventory defect to batch linking)
  const stockBatches = await prisma.stockBatch.findMany({
    include: {
      component: true,
      vendor: true
    }
  });

  // The rest of the getDefectsAnalysis function logic can now use these directly fetched constants.
  // For example, topDefectsByComponent calculation:
  const defectsByComponent: Record<string, { id: string, name: string, count: number }> = {};

  for (const defect of inventoryDefects) {
    const componentId = defect.component.id;
    const compDetail = componentDetailsMap[componentId];
    if (!defectsByComponent[componentId]) {
      defectsByComponent[componentId] = {
        id: componentId,
        name: compDetail ? compDetail.name : defect.component.name, // Fallback to defect.component.name
        count: 0
      };
    }
    defectsByComponent[componentId].count += 1;
  }

  for (const defect of returnQCDefects) {
    const componentId = defect.component.id;
    const compDetail = componentDetailsMap[componentId];
    if (!defectsByComponent[componentId]) {
      defectsByComponent[componentId] = {
        id: componentId,
        name: compDetail ? compDetail.name : defect.component.name,
        count: 0
      };
    }
    defectsByComponent[componentId].count += 1;
  }

  const topDefectsByComponent = Object.values(defectsByComponent)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Defects by source
  const defectsBySource = [
    { name: 'Inventory', value: inventoryDefects.length },
    { name: 'Returns', value: returnQCDefects.length }
  ];

  // Defect severity by category
  const defectsByCategoryAndSeverity: Record<string, Record<string, number>> = {};
  const categories = [...new Set(Object.values(componentDetailsMap).map(c => c.category))];
  for (const category of categories) {
    defectsByCategoryAndSeverity[category] = { 'LOW': 0, 'MEDIUM': 0, 'HIGH': 0, 'CRITICAL': 0 };
  }

  for (const defect of inventoryDefects) {
    const compDetail = componentDetailsMap[defect.component.id];
    const category = compDetail ? compDetail.category : 'Unknown';
    defectsByCategoryAndSeverity[category][defect.severity] = (defectsByCategoryAndSeverity[category][defect.severity] || 0) + 1;
  }

  for (const defect of returnQCDefects) {
    const compDetail = componentDetailsMap[defect.component.id];
    const category = compDetail ? compDetail.category : 'Unknown';
    defectsByCategoryAndSeverity[category][defect.severity] = (defectsByCategoryAndSeverity[category][defect.severity] || 0) + 1;
  }

  const defectSeverityByCategory = Object.entries(defectsByCategoryAndSeverity).map(([category, severities]) => ({
    category,
    ...severities
  }));

  // Defects by Batch (Rebuild this logic carefully using stockBatches, inventoryDefects, returnQCDefects)
  const batchMap: Record<string, { id: string; batchNumber: string; componentName: string; componentId: string; vendorName: string; vendorId: string; }> = {};
  stockBatches.forEach(batch => {
    batchMap[batch.id] = {
      id: batch.id,
      batchNumber: batch.batchNumber,
      componentName: batch.component.name,
      componentId: batch.componentId,
      vendorName: batch.vendor.name,
      vendorId: batch.vendorId
    };
  });

  const componentToBatches: Record<string, string[]> = {};
  stockBatches.forEach(batch => {
    if (!componentToBatches[batch.componentId]) {
      componentToBatches[batch.componentId] = [];
    }
    componentToBatches[batch.componentId].push(batch.id);
  });

  const batchDefectsAgg: Record<string, { batchId: string; batchNumber: string; componentName: string; vendorName: string; inventoryDefects: number; returnDefects: number; totalDefects: number; highestSeverity: Severity; latestDate: Date; }> = {};

  for (const defect of returnQCDefects) {
    const batchId = defect.batchId;
    if (!batchId) continue;
    const batchInfo = batchMap[batchId];
    if (!batchInfo) continue;

    if (!batchDefectsAgg[batchId]) {
      batchDefectsAgg[batchId] = { batchId, batchNumber: batchInfo.batchNumber, componentName: batchInfo.componentName, vendorName: batchInfo.vendorName, inventoryDefects: 0, returnDefects: 0, totalDefects: 0, highestSeverity: defect.severity, latestDate: defect.createdAt };
    }
    batchDefectsAgg[batchId].returnDefects++;
    batchDefectsAgg[batchId].totalDefects++;
    if (defect.createdAt > batchDefectsAgg[batchId].latestDate) batchDefectsAgg[batchId].latestDate = defect.createdAt;
    if (getSeverityValue(defect.severity) > getSeverityValue(batchDefectsAgg[batchId].highestSeverity)) batchDefectsAgg[batchId].highestSeverity = defect.severity;
  }

  for (const defect of inventoryDefects) {
    const associatedBatchIds = componentToBatches[defect.componentId] || [];
    if (associatedBatchIds.length === 0) continue;
    const batchId = associatedBatchIds[0]; // Simple attribution to first batch
    const batchInfo = batchMap[batchId];
    if (!batchInfo) continue;

    if (!batchDefectsAgg[batchId]) {
      batchDefectsAgg[batchId] = { batchId, batchNumber: batchInfo.batchNumber, componentName: batchInfo.componentName, vendorName: batchInfo.vendorName, inventoryDefects: 0, returnDefects: 0, totalDefects: 0, highestSeverity: defect.severity, latestDate: defect.createdAt };
    }
    batchDefectsAgg[batchId].inventoryDefects++;
    batchDefectsAgg[batchId].totalDefects++;
    if (defect.createdAt > batchDefectsAgg[batchId].latestDate) batchDefectsAgg[batchId].latestDate = defect.createdAt;
    if (getSeverityValue(defect.severity) > getSeverityValue(batchDefectsAgg[batchId].highestSeverity)) batchDefectsAgg[batchId].highestSeverity = defect.severity;
  }

  const defectsByBatch = Object.values(batchDefectsAgg).map(d => ({ ...d, date: d.latestDate, defectCount: d.totalDefects, inventoryDefectCount: d.inventoryDefects, returnDefectCount: d.returnDefects, severity: d.highestSeverity })).sort((a, b) => b.totalDefects - a.totalDefects);

  // Component Performance (simplified for defects tab - this is NOT the main vendor performance component)
  // This section calculates a summary per vendor, not the detailed component list per vendor.
  const vendorComponentDefects: Record<string, Record<string, number>> = {};
  for (const defect of returnQCDefects) {
    if (defect.batch?.vendorId && defect.componentId) {
      const vendorId = defect.batch.vendorId;
      vendorComponentDefects[vendorId] = vendorComponentDefects[vendorId] || {};
      vendorComponentDefects[vendorId][defect.componentId] = (vendorComponentDefects[vendorId][defect.componentId] || 0) + 1;
    }
  }
  for (const defect of inventoryDefects) {
    const componentId = defect.componentId;
    const vendorIds = new Set<string>();
    stockBatches.forEach(sb => { if (sb.componentId === componentId) vendorIds.add(sb.vendorId); });
    vendorIds.forEach(vendorId => {
      vendorComponentDefects[vendorId] = vendorComponentDefects[vendorId] || {};
      vendorComponentDefects[vendorId][componentId] = (vendorComponentDefects[vendorId][componentId] || 0) + 1;
    });
  }

  const allDbVendors = await prisma.vendor.findMany(); // Fetch all vendors for this summary
  const componentPerformanceSummary = allDbVendors.map(v => {
    const defectsMap = vendorComponentDefects[v.id] || {};
    const totalDefectiveComponents = Object.keys(defectsMap).length;
    const totalVendorDefects = Object.values(defectsMap).reduce((s, c) => s + c, 0);
    // Simplified average severity for this summary view
    let tempSeverityTotal = 0;
    Object.values(defectsMap).forEach(c => tempSeverityTotal += c * 2); // Arbitrary severity calculation for summary
    const avgSev = totalVendorDefects > 0 ? getSeverityString(tempSeverityTotal / totalVendorDefects) : 'LOW';

    return {
      vendorId: v.id,
      vendorName: v.name,
      totalComponents: totalDefectiveComponents, // Note: This is count of *defective* components for this vendor
      totalDefects: totalVendorDefects,
      defectRate: totalDefectiveComponents > 0 ? totalVendorDefects / totalDefectiveComponents : 0,
      averageSeverity: avgSev
    };
  }).filter(v => v.totalDefects > 0).sort((a, b) => b.totalDefects - a.totalDefects);

  return {
    topDefectsByComponent,
    defectsBySource,
    defectSeverityByCategory,
    defectsByBatch,
    componentPerformance: componentPerformanceSummary // This is the summary, not the detailed list
  };
}

// Helper function to calculate severity value
function getSeverityValue(severity: Severity): number {
  switch (severity) {
    case 'CRITICAL':
      return 4;
    case 'HIGH':
      return 3;
    case 'MEDIUM':
      return 2;
    case 'LOW':
      return 1;
    default:
      return 1;
  }
}

// Helper function to convert severity value to string
function getSeverityString(value: number): string {
  if (value >= 3.5) return 'CRITICAL';
  if (value >= 2.5) return 'HIGH';
  if (value >= 1.5) return 'MEDIUM';
  return 'LOW';
}

// Get inventory health data
async function getInventoryHealth() {
  // 1. Count total components
  const totalComponents = await prisma.component.count();

  // 2. Count active batches (with stock > 0)
  const activeBatches = await prisma.stockBatch.count({
    where: {
      currentQuantity: { gt: 0 }
    }
  });

  // 3. Get components with stock info
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
  console.log("getVendorPerformance called with date:", startDate.toISOString());

  // 1. Get all Vendors
  const vendors = await prisma.vendor.findMany();
  if (!vendors.length) {
    console.log("No vendors found in the database.");
    // Return structure with empty componentPerformance if no vendors
    return {
      qualityRating: [],
      defectsByVendor: [],
      leadTimePerformance: [],
      componentPerformance: []
    };
  }
  console.log(`Fetched ${vendors.length} vendors.`);

  // 2. Get all Stock Batches to identify components supplied by each vendor
  const allStockBatches = await prisma.stockBatch.findMany({
    include: { component: true, vendor: true },
  });
  console.log(`Fetched ${allStockBatches.length} stock batches.`);

  // Create a master list of components and map vendors to the components they supply
  // vendorSuppliedComponents: Map<vendorId, Set<componentId>>
  const vendorSuppliedComponents = new Map<string, Set<string>>();
  // componentMasterList: Map<componentId, { name: string, category: string }>
  const componentMasterList = new Map<string, { name: string; category: string }>();

  // Map components to vendors through stock batches
  for (const batch of allStockBatches) {
    if (!batch.component) {
      console.warn(`StockBatch ${batch.id} is missing linked component data. Skipping for componentMasterList.`);
      // Decide if you want to skip adding to vendorSuppliedComponents as well if component data is crucial
    }
    if (!batch.vendorId || !batch.componentId) {
      console.warn(`StockBatch ${batch.id} is missing vendorId or componentId. Skipping.`);
      continue;
    }

    if (!vendorSuppliedComponents.has(batch.vendorId)) {
      vendorSuppliedComponents.set(batch.vendorId, new Set());
    }
    const componentsSet = vendorSuppliedComponents.get(batch.vendorId);
    if (componentsSet) {
      componentsSet.add(batch.componentId);
    }

    if (batch.component && !componentMasterList.has(batch.componentId)) { // ensure batch.component exists
      componentMasterList.set(batch.componentId, {
        name: batch.component.name,
        category: batch.component.category,
      });
    } else if (!batch.component && !componentMasterList.has(batch.componentId)) {
      // If component data is missing from batch, but we still want to register the ID
      // We may not have name/category, but the ID is known.
      // The fallback will be used later when constructing componentPerformanceData
      console.warn(`StockBatch ${batch.id} references componentId ${batch.componentId} but has no linked component details. Will use fallback name/category.`);
    }
  }
  console.log(`Processed stock batches. ${vendorSuppliedComponents.size} vendors supply components. ${componentMasterList.size} unique components in master list.`);

  // 3. Initialize defect aggregation structure
  // defectAggregates: Map<vendorId, Map<componentId, {data}>>
  const defectAggregates = new Map<string, Map<string, {
    returnDefects: number;
    inventoryDefects: number;
    totalSeverity: number;
    defectCount: number;
  }>>();

  for (const vendor of vendors) {
    const components = vendorSuppliedComponents.get(vendor.id) || new Set();
    const vendorDefectMap = new Map<string, { returnDefects: number; inventoryDefects: number; totalSeverity: number; defectCount: number; }>();
    for (const componentId of components) {
      vendorDefectMap.set(componentId, { returnDefects: 0, inventoryDefects: 0, totalSeverity: 0, defectCount: 0 });
    }
    defectAggregates.set(vendor.id, vendorDefectMap);
  }
  console.log("Initialized defect aggregation structure.");

  // 4. Fetch and process Return QC Defects
  const returnQCDefects = await prisma.returnQCDefect.findMany({
    where: { createdAt: { gte: startDate } },
    include: { batch: true }, // batch includes vendorId and componentId (if schema links batch to component directly, or rely on returnQCDefect.componentId)
  });
  console.log(`Fetched ${returnQCDefects.length} return QC defects.`);

  for (const defect of returnQCDefects) {
    // Ensure batch and componentId are present
    if (!defect.batch) {
      console.warn(`ReturnQCDefect ${defect.id} is missing batch information. Skipping defect attribution.`);
      continue;
    }
    if (!defect.batch.vendorId) {
      console.warn(`ReturnQCDefect ${defect.id} linked to batch ${defect.batchId} which is missing vendorId. Skipping defect attribution.`);
      continue;
    }
    if (!defect.componentId) {
      console.warn(`ReturnQCDefect ${defect.id} is missing componentId. Skipping defect attribution.`);
      continue;
    }

    if (defect.batch?.vendorId && defect.componentId) {
      const vendorId = defect.batch.vendorId;
      const componentId = defect.componentId; // Use componentId directly from ReturnQCDefect
      const vendorMap = defectAggregates.get(vendorId);

      if (vendorMap?.has(componentId)) {
        const stats = vendorMap.get(componentId)!;
        stats.returnDefects++;
        stats.defectCount++;
        stats.totalSeverity += getSeverityValue(defect.severity);
      } else {
        // This case might happen if a ReturnQCDefect is for a component a vendor doesn't usually supply via recorded stock batches
        // Or if the componentId on the ReturnQCDefect doesn't match one from stock batches for that vendor.
        // For now, we only count defects for components we know the vendor supplies.
        // console.warn(`ReturnQCDefect ${defect.id} for vendor ${vendorId} and component ${componentId} not in vendorSuppliedComponents.`);
      }
    }
  }

  // 5. Fetch and process Inventory Defects
  const inventoryDefects = await prisma.defect.findMany({
    where: { createdAt: { gte: startDate } },
    include: { component: true }, // component is for componentId
  });
  console.log(`Fetched ${inventoryDefects.length} inventory defects.`);

  for (const defect of inventoryDefects) {
    const componentId = defect.componentId;
    // Attribute this inventory defect to ALL vendors who supply this component
    for (const vendor of vendors) {
      const suppliedComponents = vendorSuppliedComponents.get(vendor.id);
      if (suppliedComponents?.has(componentId)) {
        const vendorMap = defectAggregates.get(vendor.id);
        // Ensure stats is defined before using it; it should be due to initialization
        const stats = vendorMap?.get(componentId);
        if (stats) {
          stats.inventoryDefects++;
          stats.defectCount++;
          stats.totalSeverity += getSeverityValue(defect.severity);
        }
      }
    }
  }
  console.log("Processed inventory defects.");

  // 6. Build the componentPerformance array for the response
  const componentPerformanceData = vendors.map(vendor => {
    const vendorId = vendor.id;
    const vendorName = vendor.name;
    const suppliedComponentIds = Array.from(vendorSuppliedComponents.get(vendorId) || []);

    let vendorOverallTotalDefects = 0;
    let vendorOverallTotalSeverityPoints = 0; // For calculating overall average severity for the vendor
    let vendorOverallDefectEntries = 0; // Count of defect entries for averaging severity

    const componentsData = suppliedComponentIds.map(componentId => {
      const compInfo = componentMasterList.get(componentId) || { name: 'Unknown', category: 'Unknown' };
      const defectStats = defectAggregates.get(vendorId)?.get(componentId) || { returnDefects: 0, inventoryDefects: 0, totalSeverity: 0, defectCount: 0 };

      const totalDefects = defectStats.returnDefects + defectStats.inventoryDefects;
      const avgSeverity = defectStats.defectCount > 0 ? getSeverityString(defectStats.totalSeverity / defectStats.defectCount) : 'LOW';

      vendorOverallTotalDefects += totalDefects;
      vendorOverallTotalSeverityPoints += defectStats.totalSeverity;
      vendorOverallDefectEntries += defectStats.defectCount;

      return {
        componentId: componentId,
        componentName: compInfo.name,
        category: compInfo.category,
        returnDefects: defectStats.returnDefects,
        inventoryDefects: defectStats.inventoryDefects,
        totalDefects: totalDefects,
        averageSeverity: avgSeverity
      };
    });

    // Calculate vendor-level aggregates
    const totalComponentsSupplied = suppliedComponentIds.length;
    // Defect rate: (Total Defects / Total Components Supplied) - simple metric
    const defectRate = totalComponentsSupplied > 0 ? vendorOverallTotalDefects / totalComponentsSupplied : 0;
    const overallAverageSeverity = vendorOverallDefectEntries > 0 ? getSeverityString(vendorOverallTotalSeverityPoints / vendorOverallDefectEntries) : 'LOW';

    return {
      vendorId: vendorId,
      vendorName: vendorName,
      totalComponentsSupplied: totalComponentsSupplied,
      totalDefects: vendorOverallTotalDefects,
      defectRate: defectRate,
      overallAverageSeverity: overallAverageSeverity,
      components: componentsData
    };
  });

  return {
    componentPerformance: componentPerformanceData,
    // Add other vendor metrics if needed (qualityRating, defectsByVendor, leadTimePerformance)
    // For now, componentPerformance contains the detailed breakdown requested.
  };
}

// Helper function to get defects trend data (placeholder implementation)
async function getDefectsTrendData(startDate: Date) {
  // This would ideally group defects by date
  // For now returning empty array or simplified data
  return [];
}