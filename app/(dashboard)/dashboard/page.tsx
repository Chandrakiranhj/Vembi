'use client';

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  CircleDollarSign,
  Clock,
  History
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Activity interface
interface Activity {
  id: string;
  type: 'defect' | 'returnqc' | 'assembly' | 'batch';
  title: string;
  description: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

// Stats interface
interface ActivityStats {
  totalDefects: number;
  totalReturnQcItems: number;
  totalAssemblies: number;
  totalBatches: number;
  totalActivities: number;
  totalDefectsIncludingReturns?: number; // Optional for backward compatibility
}

// Stats card component
const StatsCard = ({ title, value, icon, color }: { 
  title: string; 
  value: number; 
  icon: React.ReactNode;
  color: string;
}) => {
  return (
    <div className={`bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-full bg-opacity-20 ${color.replace('text-', 'bg-')}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// User activities component
const UserActivities = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserActivities = async () => {
      try {
        setIsLoading(true);
        setDebugInfo("Starting data fetch");
        
        // Try a simple request to the new endpoint with error handling
        try {
          setDebugInfo("Trying simple fetch from user-activities endpoint");
          const userActivitiesResponse = await fetch('/api/analytics/user-activities?limit=20');
          const responseText = await userActivitiesResponse.text();
          
          try {
            // Try to parse as JSON
            const responseData = JSON.parse(responseText);
            setDebugInfo(`Response received: ${JSON.stringify(responseData).substring(0, 150)}...`);
            
            // Check if we have valid activities data
            if (responseData.activities && Array.isArray(responseData.activities)) {
              setActivities(responseData.activities);
              setStats(responseData.stats || null);
              return; // Success, exit early
            } else {
              setDebugInfo(`Invalid activities data structure: ${JSON.stringify(responseData).substring(0, 100)}...`);
            }
          } catch {
            // Not JSON, show raw response
            setDebugInfo(`Non-JSON response: ${responseText.substring(0, 200)}...`);
          }
        } catch (err) {
          setDebugInfo(`Error with user-activities: ${err instanceof Error ? err.message : String(err)}`);
        }
        
        // Try the test endpoint
        try {
          setDebugInfo("Trying test endpoint");
          const testResponse = await fetch('/api/analytics/test');
          const testData = await testResponse.json();
          
          setDebugInfo(`Test endpoint response: ${JSON.stringify(testData).substring(0, 150)}...`);
          
          if (testData.activities && Array.isArray(testData.activities)) {
            setActivities(testData.activities);
            setStats(testData.stats || null);
            return; // Success, exit early
          }
        } catch (testErr) {
          setDebugInfo(`Test endpoint failed: ${testErr instanceof Error ? testErr.message : String(testErr)}`);
        }
        
        // Try the simple activities endpoint
        try {
          setDebugInfo("Trying simple-activities endpoint");
          const simpleResponse = await fetch('/api/analytics/simple-activities?limit=20');
          const simpleData = await simpleResponse.json();
          
          setDebugInfo(`Simple activities response: ${JSON.stringify(simpleData).substring(0, 150)}...`);
          
          if (simpleData.activities && Array.isArray(simpleData.activities)) {
            setActivities(simpleData.activities);
            setStats(simpleData.stats || null);
            return; // Success, exit early
          }
        } catch (simpleErr) {
          setDebugInfo(`Simple activities endpoint failed: ${simpleErr instanceof Error ? simpleErr.message : String(simpleErr)}`);
        }
        
        // Fall back to the original endpoint
        try {
          setDebugInfo("Falling back to recent-activity endpoint");
          const response = await fetch('/api/analytics/recent-activity?limit=20');
          const responseData = await response.json();
          
          setDebugInfo(`Using data from recent-activity: ${JSON.stringify(responseData).substring(0, 100)}...`);
          setActivities(responseData.activities || []);
          setStats(responseData.stats || null);
        } catch (fallbackErr) {
          setDebugInfo(`Both endpoints failed. Fallback error: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`);
          throw fallbackErr;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        setDebugInfo(`Final error: ${errorMessage}`);
        console.error('Error fetching user activities:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserActivities();
  }, []);

  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'defect':
        return <AlertCircle className="h-5 w-5 text-rose-600" />;
      case 'returnqc':
        return <Package className="h-5 w-5 text-amber-600" />;
      case 'assembly':
        return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
      case 'batch':
        return <CircleDollarSign className="h-5 w-5 text-[#8B2131]" />;
      default:
        return <Activity className="h-5 w-5 text-[#8B2131]" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStats = () => {
    if (!stats) return null;

    // Use the combined defects count if available, otherwise calculate it
    const totalDefectsCount = stats.totalDefectsIncludingReturns !== undefined
      ? stats.totalDefectsIncludingReturns
      : stats.totalDefects + stats.totalReturnQcItems;

  return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard 
          title="Total Defects" 
          value={totalDefectsCount} 
          icon={<AlertCircle className="h-5 w-5 text-rose-600" />}
          color="text-rose-600"
        />
        <StatsCard 
          title="Returns Processed" 
          value={stats.totalReturnQcItems} 
          icon={<Package className="h-5 w-5 text-amber-600" />}
          color="text-amber-600"
        />
        <StatsCard 
          title="Assemblies Created" 
          value={stats.totalAssemblies} 
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          color="text-emerald-600"
        />
        <StatsCard 
          title="Batches Added" 
          value={stats.totalBatches} 
          icon={<CircleDollarSign className="h-5 w-5 text-[#8B2131]" />}
          color="text-[#8B2131]"
        />
    </div>
  );
};

  if (isLoading) {
    return (
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-medium text-[#8B2131] mb-6 flex items-center">
            <span className="w-1.5 h-6 bg-[#8B2131] rounded-full mr-3"></span>
            Your Recent Activities
          </h3>
          <div className="space-y-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-xl border border-rose-100 shadow-sm">
        <h3 className="text-lg font-medium text-[#8B2131] mb-4 flex items-center">
          <span className="w-1.5 h-6 bg-[#8B2131] rounded-full mr-3"></span>
          Your Activity Dashboard
        </h3>
        <div className="bg-rose-50 p-6 rounded-lg flex items-start text-rose-700">
          <AlertTriangle className="h-6 w-6 mr-3 flex-shrink-0 mt-1" />
          <div>
            <p className="font-medium">Error loading your recent activities</p>
            <p className="mt-1">{error}</p>
            {debugInfo && (
              <div className="mt-3 p-3 bg-rose-100 rounded text-xs font-mono overflow-auto max-h-32">
                <p className="font-medium mb-1">Debug Info:</p>
                <p>{debugInfo}</p>
              </div>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="mt-3 bg-rose-700 text-white px-4 py-2 rounded-md text-sm hover:bg-rose-800 transition-colors"
            >
              Try Again
            </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {renderStats()}
      
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-[#8B2131] flex items-center">
            <span className="w-1.5 h-6 bg-[#8B2131] rounded-full mr-3"></span>
            Your Recent Activities
          </h3>
          
          <div className="flex items-center text-sm text-gray-500">
            <History className="h-4 w-4 mr-1" />
            Last {activities.length} activities
          </div>
        </div>
        
        {activities.length === 0 ? (
          <div className="py-16 text-center">
            <div className="bg-[#F5F1E4] p-4 rounded-full inline-flex mx-auto mb-4">
              <Clock className="h-8 w-8 text-[#8B2131]" />
            </div>
            <p className="text-gray-600 font-medium text-lg">No recent activities found</p>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">Activities will appear here as you work with the system. Try adding components, creating assemblies, or processing returns.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activities.map((activity) => (
              <div key={activity.id} className="py-5 first:pt-0 last:pb-0">
                <div className="flex items-start">
                  <div className="p-2 rounded-full bg-[#F5F1E4] mr-4 flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{activity.title}</p>
                    <div className="flex items-center mt-1">
                      <p className="text-sm text-gray-600">{activity.description}</p>
                      <span className="mx-2 text-gray-300">•</span>
                      <p className="text-xs text-gray-500">{formatDate(activity.timestamp)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useUser();
  const today = new Date();
  
  const username = user?.username || user?.emailAddresses?.[0]?.emailAddress || "User";

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <div className="w-1.5 h-8 bg-gradient-to-b from-[#8B2131] to-[#6D1A27] rounded-full mr-3"></div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#8B2131] to-[#6D1A27] bg-clip-text text-transparent">
              Welcome, {username}
            </h1>
            <p className="text-[#5A4C3A] text-sm mt-1">
              {today.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
      </div>
      </div>
      </div>

        <div>
        <div className="mb-4 p-4 bg-[#F5F1E4] rounded-xl">
          <p className="text-[#5A4C3A] font-medium">
            This dashboard shows your personal activity in the system. All statistics and activities listed below are related to items you have worked on.
          </p>
        </div>
        <UserActivities />
      </div>
    </div>
  );
} 