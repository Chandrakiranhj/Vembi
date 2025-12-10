import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

// Configuration for admin emails - from environment variables
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const NOTIFICATION_ENABLED = process.env.NOTIFICATION_ENABLED !== 'false';  // Enable/disable notifications

// Validate required email configuration
if (NOTIFICATION_ENABLED && (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
  console.warn('Email credentials not configured. Notifications will be disabled.');
}

// Configure email transporter
const transporter = process.env.EMAIL_USER && process.env.EMAIL_PASS
  ? nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

// Endpoint to notify admin about new user registrations
export async function POST(req: NextRequest) {
  try {
    const { userId, userName, userEmail } = await req.json();
    
    if (!userId || !userEmail) {
      return NextResponse.json(
        { success: false, error: "Missing required user information" },
        { status: 400 }
      );
    }
    
    console.log(`Sending admin notification for new user: ${userEmail}`);

    // Check if notifications are properly configured
    if (!NOTIFICATION_ENABLED || !transporter || !ADMIN_EMAIL) {
      console.log("Admin notifications are disabled or not configured properly.");
      return NextResponse.json({ success: true, message: "Notification disabled or not configured" });
    }

    // Send email notification to admin
    const adminUser = await prisma.user.findFirst({
      where: { email: ADMIN_EMAIL },
      select: { id: true, email: true }
    });

    if (!adminUser) {
      console.warn(`Admin email ${ADMIN_EMAIL} not found in database`);
      return NextResponse.json({ success: false, error: "Admin user not found" });
    }
    
    try {
      // Create approve link with token (in a real app, this would be more secure)
      const approveUrl = new URL("/users", req.url);
      
      // Send email
      await transporter.sendMail({
        from: `"Vembi System" <${process.env.EMAIL_USER}>`,
        to: ADMIN_EMAIL,
        subject: "New User Registration Pending Approval",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8B2131;">New User Registration</h2>
            <p>A new user has registered and is awaiting approval:</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Name:</strong> ${userName || 'Not provided'}</p>
              <p><strong>Email:</strong> ${userEmail}</p>
              <p><strong>User ID:</strong> ${userId}</p>
              <p><strong>Status:</strong> Pending Approval</p>
            </div>
            
            <p>
              <a href="${approveUrl}" 
                 style="background-color: #8B2131; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">
                 Review User
              </a>
            </p>
            
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              This is an automated message from the Vembi Inventory Management & QC System.
              Please do not reply directly to this email.
            </p>
          </div>
        `,
      });
      
      console.log(`Notification email sent to admin: ${ADMIN_EMAIL}`);
      return NextResponse.json({ success: true });
      
    } catch (emailError) {
      console.error("Error sending admin notification email:", emailError);
      return NextResponse.json(
        { success: false, error: "Failed to send admin notification email" },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error("Error in admin notification handler:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
} 