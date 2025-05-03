import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { checkUserRole } from '@/lib/roleCheck';
import { Role } from '@prisma/client';
import AdminBOMManagementClient from './AdminBOMManagementClient';

export const metadata: Metadata = {
  title: 'Admin BOM Management',
  description: 'Manage product BOMs and inventory components',
};

async function isAdmin(userId: string) {
  return await checkUserRole(userId, [Role.ADMIN]);
}

export default async function AdminBOMManagementPage() {
  const authResult = await auth();
  const userId = authResult?.userId;
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  const isUserAdmin = await isAdmin(userId);
  
  if (!isUserAdmin) {
    redirect('/dashboard');
  }
  
  // Fetch all products
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      modelNumber: true,
    },
  });
  
  // Fetch all components
  const components = await prisma.component.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      sku: true,
      category: true,
    },
  });
  
  return (
    <AdminBOMManagementClient 
      products={products}
      components={components}
      isAdmin={isUserAdmin}
    />
  );
} 