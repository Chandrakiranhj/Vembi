import { NextResponse } from "next/server";

export async function GET() {
  // Simple test endpoint that always returns sample data
  return NextResponse.json({
    componentPerformance: [
      {
        vendorId: "test1", 
        vendorName: "Test Vendor A",
        totalComponents: 3,
        totalDefects: 7,
        defectRate: 0.28,
        components: [
          {
            componentId: "comp1",
            componentName: "Test Component 1",
            category: "Electronics",
            defectCount: 4,
            severity: "MEDIUM"
          },
          {
            componentId: "comp2",
            componentName: "Test Component 2",
            category: "Mechanical",
            defectCount: 2,
            severity: "LOW"
          },
          {
            componentId: "comp3",
            componentName: "Test Component 3",
            category: "Assembly",
            defectCount: 1,
            severity: "HIGH"
          }
        ]
      },
      {
        vendorId: "test2", 
        vendorName: "Test Vendor B",
        totalComponents: 2,
        totalDefects: 5,
        defectRate: 0.33,
        components: [
          {
            componentId: "comp4",
            componentName: "Test Component 4",
            category: "Electronics",
            defectCount: 3,
            severity: "HIGH"
          },
          {
            componentId: "comp5",
            componentName: "Test Component 5",
            category: "Mechanical",
            defectCount: 2,
            severity: "MEDIUM"
          }
        ]
      }
    ],
    timestamp: new Date().toISOString()
  });
} 