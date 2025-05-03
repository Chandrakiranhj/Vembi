import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Simple webhook handler for Clerk
export async function POST(req: NextRequest) {
  try {
    // Parse the webhook payload
    const payload = await req.json();
    
    // Log for debugging
    console.log(`Received webhook: ${payload.type}`);
    
    // Handle user events
    if (payload.type === 'user.created' || payload.type === 'user.updated') {
      const data = payload.data;
      const clerkUserId = data.id;
      const firstName = data.first_name || '';
      const lastName = data.last_name || '';
      const name = `${firstName} ${lastName}`.trim() || 'User';
      
      // Find primary email
      let emailAddress = null;
      if (data.email_addresses && data.email_addresses.length > 0 && data.primary_email_address_id) {
        const emailObj = data.email_addresses.find(
          (email: { id: string; email_address: string }) => email.id === data.primary_email_address_id
        );
        emailAddress = emailObj?.email_address;
      }
      
      if (!emailAddress) {
        console.warn(`No email found for Clerk user ${clerkUserId}`);
        return NextResponse.json({ success: false, error: 'No email found' });
      }
      
      console.log(`Processing user: ${emailAddress}`);
      
      // Check if this is a special admin email
      const isAdminEmail = emailAddress === 'chandrakiranhj@gmail.com';
      
      try {
        // Check if user already exists in our database
        const existingUser = await prisma.user.findFirst({
          where: { 
            OR: [
              { userId: clerkUserId },
              { email: emailAddress }
            ]
          }
        });
        
        if (existingUser) {
          // Update existing user
          console.log(`Updating existing user: ${emailAddress}`);
          
          const updatedUser = await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              userId: clerkUserId, // Update with the actual Clerk ID
              name: name,
              email: emailAddress, // Also update email in case it changed
              image: data.image_url || null,
              // Don't change the role if it's already set
            }
          });
          
          console.log(`User updated: ${emailAddress} (${updatedUser.role})`);
          return NextResponse.json({ success: true, user: updatedUser });
        } else {
          // Create new user with appropriate role
          console.log(`Creating new user: ${emailAddress}`);
          
          const newUser = await prisma.user.create({
            data: {
              userId: clerkUserId,
              name: name,
              email: emailAddress,
              image: data.image_url || null,
              role: isAdminEmail ? 'ADMIN' : 'PENDING_APPROVAL' // Assign admin role to your email
            }
          });
          
          console.log(`User created: ${emailAddress} (${newUser.role})`);
          return NextResponse.json({ success: true, user: newUser });
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        return NextResponse.json(
          { success: false, error: 'Database operation failed' },
          { status: 500 }
        );
      }
    }
    
    // Handle other webhook events
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
} 