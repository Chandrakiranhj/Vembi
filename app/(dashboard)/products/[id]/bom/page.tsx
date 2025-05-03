import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import ProductBOMClientPage from './ProductBOMClientPage'; // Import the new client component

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
  // Get authenticated user ID
  const authData = await auth();
  const userId = authData.userId;

  // Check if the user is an admin
  const isAuthorized = userId ? await checkAdminRole(userId) : false;

  // Render the client component, passing the authorization status
  return <ProductBOMClientPage isAuthorized={isAuthorized} />;
}