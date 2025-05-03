import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Simple health check endpoint for API and database
export async function GET() {
  try {
    // Check database connection
    await prisma.$connect();
    
    // Count basic entities to verify DB access
    const componentCount = await prisma.component.count();
    const vendorCount = await prisma.vendor.count();
    const batchCount = await prisma.stockBatch.count();
    
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        counts: {
          components: componentCount,
          vendors: vendorCount,
          batches: batchCount
        }
      }
    });
  } catch (error) {
    console.error("Health check failed:", error);
    
    return NextResponse.json({
      status: "error",
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }, { status: 500 });
  }
} 