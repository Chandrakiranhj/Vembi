import { UserButton } from "@clerk/nextjs";
import { Clock, CheckCircle2, RefreshCw, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@clerk/nextjs/server";

export default async function PendingApprovalPage() {
  const { userId } = await auth();
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <UserButton afterSignOutUrl="/" />
      </div>
      
      <div className="max-w-lg w-full bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-[#8B2131] to-[#6D1A27] p-6 text-white text-center">
          <Clock className="mx-auto h-12 w-12 mb-4" />
          <h1 className="text-2xl font-bold">Account Pending Approval</h1>
          <p className="mt-2 text-gray-100">Your account is being reviewed by our team</p>
        </div>
        
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid grid-cols-2 mx-6 mt-6">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="help">Help & FAQ</TabsTrigger>
          </TabsList>
          
          <TabsContent value="status" className="p-6 pt-4 space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium">Your account has been created</h3>
                <p className="text-gray-600 text-sm">
                  Thank you for registering. Your account has been successfully created.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Clock className="h-6 w-6 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium">Waiting for approval</h3>
                <p className="text-gray-600 text-sm">
                  Your account is pending approval from an administrator. This usually takes 1-2 business days.
                </p>
              </div>
            </div>
            
              <div className="border-t border-gray-100 pt-4 mt-4">
                <Card className="bg-gray-50">
                  <CardContent className="pt-6">
                    <div className="text-center mb-4">
                      <h3 className="font-medium text-[#8B2131]">Account ID</h3>
                      <p className="text-sm text-gray-500 mt-1 break-all">{userId}</p>
                    </div>
                    
                    <div className="space-y-3">
                      <Button 
                        variant="outline" 
                        className="w-full flex items-center justify-center" 
                        onClick={() => window.location.reload()}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" /> Check Status
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="w-full flex items-center justify-center"
                        asChild
                      >
                        <Link href={`mailto:support@vembi.com?subject=Account%20Approval%20Status&body=Hello%20VEMBI%20support,%0A%0AI%20recently%20registered%20for%20an%20account%20and%20would%20like%20to%20check%20on%20the%20status%20of%20my%20approval.%0A%0AMy%20account%20ID:%20${userId}%0A%0AThank%20you!`}>
                          <Mail className="h-4 w-4 mr-2" /> Email Support
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="help" className="p-6 pt-4 space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-[#8B2131]">What happens during approval?</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Our administrators review all new account requests to ensure appropriate access levels. 
                  You&apos;ll be assigned a role based on your responsibilities within the VEMBI system.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-[#8B2131]">How long does approval take?</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Approvals typically take 1-2 business days. If your request is urgent, please contact 
                  your supervisor or email our support team.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-[#8B2131]">What roles are available?</h3>
                <p className="text-gray-600 text-sm mt-1">
                  VEMBI offers several roles including Assembler, Return QC, Service Person, and Admin. 
                  Your role determines which features and data you can access in the system.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-[#8B2131]">Can I speed up the process?</h3>
                <p className="text-gray-600 text-sm mt-1">
                  If you need immediate access, please contact your manager to request expedited approval
                  or email our support team with your account details.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="p-6 pt-0 border-t border-gray-200 mt-4">
            <Button asChild variant="outline" className="w-full">
              <Link href="/sign-out">Sign Out</Link>
            </Button>
          </div>
        </div>
      
      <p className="text-center text-gray-500 text-sm mt-6">
        © {new Date().getFullYear()} VEMBI Quality Control · All rights reserved
      </p>
    </div>
  );
} 