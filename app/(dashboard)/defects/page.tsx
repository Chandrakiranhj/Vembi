import { Metadata } from 'next';
import DefectsManagement from '@/components/DefectsManagement';

export const metadata: Metadata = {
  title: 'Defects Management | Vembi Inventory QC',
  description: 'View and manage defects from both returns and inventory',
};

export default function DefectsPage() {
  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold mb-6">Defects Management</h1>
      <DefectsManagement />
    </div>
  );
} 