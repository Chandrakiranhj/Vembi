import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";
import { checkUserRole } from "@/lib/roleCheck";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await getAuth(req);
    
    if (!userId) {
      return NextResponse.json({ 
        authorized: false, 
        message: "Unauthorized: No user logged in." 
      }, { status: 401 });
    }
    
    // Get role parameter from query string
    const { searchParams } = new URL(req.url);
    const roleParam = searchParams.get("role");
    
    if (!roleParam) {
      return NextResponse.json({ 
        authorized: false, 
        message: "No role specified for authorization check." 
      }, { status: 400 });
    }
    
    // Parse roles from the query string (comma-separated list)
    const allowedRoles = roleParam.split(",").map(r => r.trim()) as Role[];
    
    // If no valid roles were provided, return error
    if (allowedRoles.length === 0) {
      return NextResponse.json({ 
        authorized: false, 
        message: "No valid roles specified for authorization check." 
      }, { status: 400 });
    }
    
    // Check if user has any of the allowed roles
    const isAuthorized = await checkUserRole(userId, allowedRoles);
    
    return NextResponse.json({ 
      authorized: isAuthorized,
      message: isAuthorized 
        ? "User is authorized." 
        : "User does not have the required role."
    });
    
  } catch (error) {
    console.error("Error checking authorization:", error);
    return NextResponse.json({ 
      authorized: false, 
      message: "Error checking authorization."
    }, { status: 500 });
  }
} 