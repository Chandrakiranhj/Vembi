'use server';

import { redirect } from 'next/navigation';
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Role } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ApproveUserDialog } from './_components/ApproveUserDialog';
import { EditUserNameDialog } from './_components/EditUserNameDialog';
import { DeleteUserDialog } from './_components/DeleteUserDialog';
import { RejectUserDialog } from './_components/RejectUserDialog';
import { updateUserRole } from './_components/_actions/userActions';

interface User {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  image?: string;
  createdAt: Date;
  _count?: {
    assemblies: number;
    returns: number;
    defectReports: number;
  }
}

const RoleBadge = ({ role }: { role: Role }) => {
  const getColorClass = (roleValue: Role): string => {
    switch (roleValue) {
      case Role.ADMIN:
        return 'bg-red-100 text-red-800';
      case Role.SERVICE_PERSON:
        return 'bg-blue-100 text-blue-800';
      case Role.RETURN_QC:
        return 'bg-purple-100 text-purple-800';
      case Role.ASSEMBLER:
        return 'bg-green-100 text-green-800';
      case Role.QC_PERSON:
        return 'bg-indigo-100 text-indigo-800';
      case Role.PENDING_APPROVAL:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Badge className={getColorClass(role)}>
      {typeof role === 'string' ? role.replace('_', ' ') : role}
    </Badge>
  );
};

async function getUsers(roleFilter?: Role): Promise<{ users: User[], error?: Error }> {
  try {
    const whereClause: { role?: Role } = {};
    if (roleFilter) {
      whereClause.role = roleFilter;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: [
        { role: "asc" },
        { name: "asc" }
      ],
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assemblies: true,
            returns: true,
            defectReports: true
          }
        }
      }
    });

    return { users: users as User[] };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { users: [], error: error instanceof Error ? error : new Error('Unknown error fetching users') };
  }
}

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  if (!userId) {
    redirect('/sign-in');
  }

  const currentUser = await prisma.user.findFirst({
    where: { userId: userId },
    select: { role: true }
  });

  const isAdmin = currentUser?.role === Role.ADMIN;

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
          <CardContent><p>Only administrators can manage users.</p></CardContent>
        </Card>
      </div>
    );
  }

  const { users: pendingUsers, error: pendingError } = await getUsers(Role.PENDING_APPROVAL);
  const { users: allUsers, error: approvedError } = await getUsers();
  const approvedUsers = allUsers.filter(u => u.role !== Role.PENDING_APPROVAL);

  if (pendingError || approvedError) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader><CardTitle>Error Loading Users</CardTitle></CardHeader>
          <CardContent><p>{pendingError?.message || approvedError?.message || 'An unknown error occurred.'}</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <h1 className="text-2xl font-bold">User Management</h1>

      <Card>
        <CardHeader>
          <CardTitle>Pending Approval ({pendingUsers.length})</CardTitle>
          <CardDescription>New users awaiting role assignment.</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <p className="text-sm text-gray-500">No users awaiting approval.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8">
                            {user.image ? <AvatarImage src={user.image} alt={user.name} /> : <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>}
                          </Avatar>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-gray-500">{user.email}</td>
                      <td className="p-3 text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <ApproveUserDialog userId={user.id} userName={user.name} />
                          <RejectUserDialog userId={user.id} userName={user.name} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approved Users ({approvedUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {approvedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center">
                        <Avatar>
                          {user.image ? <AvatarImage src={user.image} alt={user.name} /> : <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>}
                        </Avatar>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">ID: {user.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-gray-500">{user.email}</td>
                    <td className="p-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="p-3">
                      <div className="text-sm text-gray-500">
                        <div>Assemblies: {user._count?.assemblies || 0}</div>
                        <div>Returns: {user._count?.returns || 0}</div>
                        <div>Defects: {user._count?.defectReports || 0}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="space-y-2">
                        <form action={updateUserRole}>
                          <input type="hidden" name="userId" value={user.id} />
                          <div className="flex items-center space-x-2">
                            <Select name="role" defaultValue={user.role}>
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={Role.ADMIN}>Admin</SelectItem>
                                <SelectItem value={Role.SERVICE_PERSON}>Service Person</SelectItem>
                                <SelectItem value={Role.RETURN_QC}>Return QC</SelectItem>
                                <SelectItem value={Role.ASSEMBLER}>Assembler</SelectItem>
                                <SelectItem value={Role.QC_PERSON}>QC Person</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button type="submit" size="sm">Update</Button>
                          </div>
                        </form>

                        <div className="flex items-center space-x-2 mt-2">
                          <EditUserNameDialog userId={user.id} userName={user.name} />
                          <DeleteUserDialog userId={user.id} userName={user.name} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}