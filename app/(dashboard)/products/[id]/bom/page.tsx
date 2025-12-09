import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import ProductBOMClientPage from './ProductBOMClientPage';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Helper function to check role (can be moved to a shared lib)
async function checkAdminRole(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { role: true }
    });
    return user?.role === Role.ADMIN;
  } catch (error) {
    console.error("Error checking admin role:", error);
    return false;
  }
}

export default async function ProductBOMPage() {
  // Get authenticated user session
  const session = await getServerSession(authOptions);
  // Note: Adjust this based on how your user ID is stored in the session. 
  // Often it's session.user.id or sub. Assuming session.user.email or similar for now if ID isn't directly exposed.
  // For now, let's assume we need to fetch the user by email if ID isn't there, or if we customized the session callback.
  // Since I don't see the session callback, I'll assume standard NextAuth behavior where we might not have the ID directly.
  // However, to keep it simple and fix the build, I'll use session?.user?.email as a proxy or just check if session exists.

  // Ideally we should have the ID. Let's assume for now we just check if logged in.
  // But the code uses userId. Let's assume we can get it or we just pass null if not logged in.

  const userId = session?.user?.email; // TEMPORARY: using email as ID or just checking existence. 
  // If the DB uses a specific ID, we need to ensure the session has it. 
  // Given the previous code used Clerk's userId (string), and we are migrating, 
  // we might need to look up the user by email in the DB to get the ID if NextAuth doesn't provide it by default.

  // Let's look up the user by email if we have it.
  let dbUserId = null;
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { userId: true }
    });
    dbUserId = user?.userId;
  }

  // Check if the user is an admin
  const isAuthorized = dbUserId ? await checkAdminRole(dbUserId) : false;

  // Render the client component, passing the authorization status
  return <ProductBOMClientPage isAuthorized={isAuthorized} />;
}