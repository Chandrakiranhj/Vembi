'use server';

import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Server Action to approve a user and assign a role.
 * 
 * @param userId - The database ID (ObjectId) of the user to approve.
 * @param role - The Role to assign to the user.
 * @returns Object indicating success or failure with an error message.
 */
export async function approveUserRole(userId: string, role: Role): Promise<{ success: boolean; error?: string }> {
  // 1. Verify the current user is an Admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminId = user?.id;

  if (!adminId) {
    return { success: false, error: "Unauthorized: No logged-in user." };
  }

  const adminUser = await prisma.user.findFirst({
    where: { userId: adminId },
    select: { role: true }
  });

  if (adminUser?.role !== Role.ADMIN) {
    return { success: false, error: "Forbidden: Only admins can approve users." };
  }

  // 2. Validate the provided role
  if (role === "PENDING_APPROVAL") {
    return { success: false, error: "Invalid role: Cannot assign PENDING_APPROVAL." };
  }
  // Ensure the role is a valid value from the enum
  if (!Object.values(Role).includes(role)) {
    return { success: false, error: `Invalid role specified: ${role}` };
  }

  // 3. Update the user in the database
  try {
    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: { role: role },
    });

    if (!updatedUser) {
      // This might happen if the user ID was invalid or the user wasn't pending
      throw new Error("User not found or could not be updated.");
    }

    // 4. Revalidate the users page path to reflect changes
    revalidatePath('/users');

    return { success: true };

  } catch (error) {
    console.error("Error approving user role:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected server error occurred." };
  }
}

/**
 * Server Action to reject (delete) a user.
 * 
 * @param formData - The form data containing the userId.
 * @returns Promise<void> - Adjusted return type for form action compatibility.
 */
export async function rejectUser(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminId = user?.id;

  // Validate admin permissions
  if (!adminId) {
    console.error("Unauthorized attempt to reject user.");
    throw new Error("Unauthorized: No logged-in user.");
  }

  const adminUser = await prisma.user.findFirst({
    where: { userId: adminId },
    select: { role: true }
  });

  if (adminUser?.role !== Role.ADMIN) {
    console.error("Forbidden attempt to reject user.");
    throw new Error("Forbidden: Only admins can reject users.");
  }

  // Get and validate userId
  const userId = formData.get('userId') as string;
  if (!userId) {
    console.error('User ID missing in reject form data.');
    throw new Error('User ID missing.');
  }

  try {
    // First check that the user exists
    const userToReject = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true }
    });

    if (!userToReject) {
      throw new Error('User not found.');
    }

    // Extra validation: ensure we're rejecting a pending user
    if (userToReject.role !== Role.PENDING_APPROVAL) {
      console.warn(`Attempted to reject user with non-pending role: ${userToReject.role}`);
    }

    // Delete the user from the database
    await prisma.user.delete({
      where: { id: userId }
    });

    // Refresh the users page
    revalidatePath('/users');
  } catch (error) {
    console.error("Error rejecting user:", error);
    // Re-throw the error so it can be caught by the client
    throw new Error(error instanceof Error ? error.message : 'Failed to reject user.');
  }
}

/**
 * Server Action to update an existing user's role.
 * 
 * @param formData - The form data containing the userId and the new role.
 * @returns void - Server actions used in forms should ideally return void or Promise<void>.
 */
export async function updateUserRole(formData: FormData): Promise<void> { // Return void
  const role = formData.get('role') as Role;
  const userId = formData.get('userId') as string; // Need to get userId from form data

  // Basic validation
  if (!role || !userId || !Object.values(Role).includes(role)) {
    console.error('Invalid role update data:', { userId, role });
    // Consider throwing an error or returning feedback
    // For form actions, throwing an error is often preferred
    throw new Error('Invalid data for role update.');
  }

  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminId = user?.id;

  if (!adminId) {
    console.error('Unauthorized attempt to update role');
    throw new Error("Unauthorized");
  }
  const adminUser = await prisma.user.findFirst({ where: { userId: adminId } });
  if (adminUser?.role !== Role.ADMIN) {
    console.error('Forbidden attempt to update role');
    throw new Error("Forbidden");
  }

  // Database update
  try {
    await prisma.user.update({ where: { id: userId }, data: { role } });
    revalidatePath('/users');
  } catch (error) {
    console.error('Error updating user role:', error);
    throw new Error('Failed to update user role.');
  }
}

/**
 * Server Action to completely remove a user from the database.
 * This is different from reject as it's used for approved users.
 * 
 * @param formData - The form data containing the userId.
 * @returns Promise<void> - Form action return type.
 */
export async function removeUser(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminId = user?.id;

  // Validate admin permissions
  if (!adminId) {
    throw new Error("Unauthorized: No logged-in user.");
  }

  const adminUser = await prisma.user.findFirst({
    where: { userId: adminId },
    select: { role: true }
  });

  if (adminUser?.role !== Role.ADMIN) {
    throw new Error("Forbidden: Only admins can remove users.");
  }

  // Get and validate userId
  const userId = formData.get('userId') as string;
  if (!userId) {
    throw new Error('User ID missing.');
  }

  try {
    // First check that the user exists
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userToDelete) {
      throw new Error('User not found.');
    }

    // Delete user from database
    await prisma.user.delete({
      where: { id: userId }
    });

    // Refresh the page
    revalidatePath('/users');
  } catch (error) {
    console.error("Error removing user:", error);
    throw new Error(error instanceof Error ? error.message : 'Failed to remove user.');
  }
}

/**
 * Server Action to update a user's name.
 * 
 * @param formData - The form data containing the userId and new name.
 * @returns Promise<{success: boolean, error?: string}> - Response to be used by client.
 */
export async function updateUserName(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminId = user?.id;

  // Validate admin permissions
  if (!adminId) {
    return { success: false, error: "Unauthorized: No logged-in user." };
  }

  const adminUser = await prisma.user.findFirst({
    where: { userId: adminId },
    select: { role: true }
  });

  if (adminUser?.role !== Role.ADMIN) {
    return { success: false, error: "Forbidden: Only admins can edit user names." };
  }

  // Get and validate parameters
  const userId = formData.get('userId') as string;
  const newName = formData.get('name') as string;

  if (!userId) {
    return { success: false, error: "User ID is required." };
  }

  if (!newName || newName.trim() === '') {
    return { success: false, error: "Name cannot be empty." };
  }

  try {
    // Update the user's name
    await prisma.user.update({
      where: { id: userId },
      data: { name: newName.trim() },
      select: { id: true, name: true }
    });

    // Refresh the page
    revalidatePath('/users');

    return {
      success: true
    };
  } catch (error) {
    console.error("Error updating user name:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update user name."
    };
  }
}