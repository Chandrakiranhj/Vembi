import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Analytics | Vembi",
    description: "Inventory quality and defect analytics",
};

export default function AnalyticsPage() {
    return <AnalyticsDashboard />;
}
