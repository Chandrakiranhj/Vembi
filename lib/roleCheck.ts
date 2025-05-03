import { prisma } from './prisma'; // Assuming prisma client is in the same lib folder
import { Role } from '@prisma/client';

/**
 * Checks if a user identified by their Clerk ID has one of the allowed roles.
 * 
 * @param userId - The Clerk user ID (can be null if user is not logged in).
 * @param allowedRoles - An array of Role enum values that are permitted.
 * @returns Promise<boolean> - True if the user has an allowed role, false otherwise.
 */
export async function checkUserRole(userId: string | null, allowedRoles: Role[]): Promise<boolean> {
  // If no userId is provided (user not logged in), they are not authorized
  if (!userId) {
    return false;
  }

  try {
    // Fetch the user's role from your database using the Clerk userId
    const user = await prisma.user.findFirst({
      where: { userId },
      select: { role: true }
    });

    // If user doesn't exist in your DB or doesn't have an allowed role, return false
    if (!user || !allowedRoles.includes(user.role)) {
      return false;
    }

    // User exists and has an allowed role
    return true;

  } catch (error) {
    console.error("Error checking user role:", error);
    // Default to false in case of error to be safe
    return false;
  }
} 