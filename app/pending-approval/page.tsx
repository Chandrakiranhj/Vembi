import Link from "next/link";
import { ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md w-full space-y-8 bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-amber-500/10 rounded-full flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-amber-500" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-white">Account Pending Approval</h1>
          <p className="text-slate-400">
            Your account has been created and verified, but it requires administrator approval before you can access the Vembi QC Dashboard.
          </p>
          <div className="p-4 bg-slate-900/50 rounded-lg border border-white/5 text-sm text-slate-500">
            Please contact your system administrator to expedite the approval process.
          </div>
        </div>

        <div className="pt-4">
          <form action="/auth/sign-out" method="post">
            <Button variant="outline" className="w-full border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </form>
        </div>
      </div>

      <div className="mt-8 text-slate-600 text-sm">
        © Vembi Technologies • Internal System
      </div>
    </div>
  );
}