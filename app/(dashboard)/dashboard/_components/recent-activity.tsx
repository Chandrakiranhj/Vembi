"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Package, CheckCircle2, CircleDollarSign, Activity, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ActivityItem {
    id: string;
    type: 'defect' | 'returnqc' | 'assembly' | 'batch';
    title: string;
    description: string;
    timestamp: string;
    metadata: Record<string, unknown>;
}

interface RecentActivityProps {
    activities: ActivityItem[];
    isLoading: boolean;
}

export function RecentActivity({ activities, isLoading }: RecentActivityProps) {
    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'defect':
                return <AlertCircle className="h-4 w-4 text-rose-600" />;
            case 'returnqc':
                return <Package className="h-4 w-4 text-amber-600" />;
            case 'assembly':
                return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
            case 'batch':
                return <CircleDollarSign className="h-4 w-4 text-primary" />;
            default:
                return <Activity className="h-4 w-4 text-primary" />;
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

    if (isLoading) {
        return (
            <Card className="col-span-4 lg:col-span-3">
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Your latest actions in the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-8">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center">
                                <div className="h-9 w-9 rounded-full bg-muted animate-pulse mr-4" />
                                <div className="space-y-1">
                                    <div className="h-4 w-[200px] bg-muted animate-pulse rounded" />
                                    <div className="h-3 w-[150px] bg-muted animate-pulse rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="col-span-4 lg:col-span-3">
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                    You have {activities.length} recent activities.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                    {activities.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-10">
                            <div className="bg-muted p-3 rounded-full mb-3">
                                <Clock className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground font-medium">No recent activities found</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {activities.map((activity) => (
                                <div key={activity.id} className="flex items-start">
                                    <div className="mt-0.5 bg-muted p-2 rounded-full mr-4">
                                        {getActivityIcon(activity.type)}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">{activity.title}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {activity.description}
                                        </p>
                                        <p className="text-xs text-muted-foreground pt-1">
                                            {formatDate(activity.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
