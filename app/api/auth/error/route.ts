import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reason = searchParams.get("reason") || "unknown";
  
  let title = "Authentication Error";
  let message = "An error occurred during authentication. Please try again.";
  
  switch (reason) {
    case "userCreationFailed":
      title = "User Creation Failed";
      message = "We couldn't create your user account in our database. Please contact support.";
      break;
      
    case "invalidRole":
      title = "Invalid User Role";
      message = "Your account does not have a valid role assigned. Please contact an administrator.";
      break;
      
    case "serverError":
      title = "Server Error";
      message = "A server error occurred during authentication. Please try again later.";
      break;
      
    case "clerkError":
      title = "Authentication Service Error";
      message = "The authentication service encountered a problem. Please try again later.";
      break;
  }
  
  // Return a JSON response with the error information
  return NextResponse.json({
    error: true,
    title,
    message,
    reason
  });
} 