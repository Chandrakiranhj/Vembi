import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
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
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }
  
  const isUserAdmin = await isAdmin(session.user.id);
  
  if (!isUserAdmin) {
    redirect('/dashboard');
  }
  
  // Fetch all products
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      modelNumber: true,
    },
  });
  
  // Fetch all components
  const components = await prisma.component.findMany({
    where: { isActive: true },
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