'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { StatsCards } from './_components/stats-cards';
import { RecentActivity } from './_components/recent-activity';
import { ActivityChart } from './_components/activity-chart';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Add this line to tell Next.js not to pre-render this page
export const dynamic = 'force-dynamic';

interface Activity {
  id: string;
  type: 'defect' | 'returnqc' | 'assembly' | 'batch';
  title: string;
  description: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

interface ActivityStats {
  totalDefects: number;
  totalReturnQcItems: number;
  totalAssemblies: number;
  totalBatches: number;
  totalActivities: number;
  totalDefectsIncludingReturns?: number;
  defectsGrowth?: number;
  returnsGrowth?: number;
  assembliesGrowth?: number;
  batchesGrowth?: number;
}

export default function DashboardPage() {
  const { user } = useUser();
  const username = user?.email?.split('@')[0] || 'User';
  const today = new Date();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserActivities = async () => {
      try {
        setIsLoading(true);

        // Try the primary endpoint
        try {
          const response = await fetch('/api/analytics/user-activities?limit=20');
          if (response.ok) {
            const data = await response.json();
            if (data.activities && Array.isArray(data.activities)) {
              setActivities(data.activities);
              setStats(data.stats || null);
              return;
            }
          }
        } catch (e) {
          console.warn("Primary fetch failed", e);
        }

        // Fallback to recent-activity
        try {
          const response = await fetch('/api/analytics/recent-activity?limit=20');
          if (response.ok) {
            const data = await response.json();
            setActivities(data.activities || []);
            setStats(data.stats || null);
            return;
          }
        } catch (e) {
          console.warn("Fallback fetch failed", e);
          throw e;
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred fetching activities';
        setError(errorMessage);
        console.error('Error fetching user activities:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserActivities();
  }, []);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {username}. Here&apos;s an overview of your activity.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground hidden md:inline-block">
            {today.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load dashboard data: {error}
          </AlertDescription>
        </Alert>
      )}

      <StatsCards stats={stats} isLoading={isLoading} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <ActivityChart activities={activities} isLoading={isLoading} />
        <RecentActivity activities={activities} isLoading={isLoading} />
      </div>
    </div>
  );
}