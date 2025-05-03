'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { ArrowRight, CheckCircle, BarChart3, Shield, Package, Settings, Users, Database, Zap } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { isLoaded, userId, isSignedIn } = useAuth();
  
  useEffect(() => {
    if (!isLoaded) return; // Wait for auth to load
    
    if (isSignedIn && userId) {
      // User is signed in, check their account status in our database
      router.push('/api/auth/clerk-redirect');
    }
  }, [isLoaded, userId, isSignedIn, router]);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col">
      {/* Header */}
      <header className="container mx-auto py-6 px-4 sm:px-6 flex justify-between items-center">
        <div className="flex items-center">
          <div className="w-12 h-12 mr-3 bg-gradient-to-br from-[#8B2131] to-[#6D1A27] rounded-lg flex items-center justify-center shadow-sm text-white font-bold text-xl">
            V
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#8B2131] to-[#6D1A27] bg-clip-text text-transparent">
            VEMBI
          </h1>
        </div>
        <div className="flex space-x-4">
          <Link 
            href="/sign-in" 
            className="px-4 py-2 text-gray-600 hover:text-[#8B2131] transition-colors"
          >
            Sign In
          </Link>
          <Link 
            href="/sign-up" 
            className="px-4 py-2 bg-gradient-to-r from-[#8B2131] to-[#6D1A27] text-white rounded-md hover:from-[#7A1C2A] hover:to-[#5D1622] transition-all duration-300 shadow-md flex items-center"
          >
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </header>
      
      {/* Hero Section */}
      <main className="flex-grow">
        <section className="relative overflow-hidden">
          {/* Abstract background pattern */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#8B2131]/5 rounded-full blur-3xl"></div>
            <div className="absolute top-1/3 -left-24 w-80 h-80 bg-[#6D1A27]/5 rounded-full blur-3xl"></div>
            <div className="absolute top-2/3 right-1/4 w-64 h-64 bg-[#F5F1E4]/50 rounded-full blur-3xl"></div>
          </div>
          
          <div className="container mx-auto py-16 md:py-24 px-4 sm:px-6 relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="space-y-8 md:pr-8 animate-fadeIn">
                <div className="inline-block px-4 py-1.5 bg-[#F5F1E4] rounded-full text-[#8B2131] font-medium text-sm shadow-sm mb-2">
                  VEMBI Internal Management System
                </div>
                <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#8B2131] to-[#6D1A27] bg-clip-text text-transparent leading-tight">
                  Quality Control Inventory Management
                </h2>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Streamline your quality control processes with our comprehensive inventory management solution built specifically for VEMBI&apos;s manufacturing operations.
                </p>
                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                  <Link 
                    href="/sign-up" 
                    className="px-8 py-3.5 bg-gradient-to-r from-[#8B2131] to-[#6D1A27] text-white rounded-md hover:from-[#7A1C2A] hover:to-[#5D1622] transition-all duration-300 shadow-lg font-medium flex items-center justify-center group"
                  >
                    Create Account 
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link 
                    href="/sign-in" 
                    className="px-8 py-3.5 bg-white text-gray-800 border border-gray-200 rounded-md hover:bg-gray-50 hover:border-[#8B2131]/30 transition font-medium shadow flex items-center justify-center"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
              
              <div className="relative hidden md:block">
                <div className="w-full aspect-[4/3] bg-gradient-to-br from-[#F5F1E4] to-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-6">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#8B2131] to-[#6D1A27]"></div>
                  
                  {/* Dashboard UI mockup using pure CSS */}
                  <div className="w-full h-full bg-white rounded-lg shadow-sm p-4 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                      <div className="w-32 h-5 bg-[#8B2131]/10 rounded"></div>
                      <div className="flex space-x-2">
                        <div className="w-8 h-8 bg-[#F5F1E4] rounded-full"></div>
                        <div className="w-20 h-8 bg-[#F5F1E4] rounded"></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-[#F5F1E4]/50 rounded-lg flex flex-col justify-center items-center p-4">
                          <div className="w-12 h-12 mb-2 rounded-full bg-[#8B2131]/10 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-[#8B2131]/20"></div>
                          </div>
                          <div className="w-2/3 h-3 bg-[#8B2131]/10 rounded"></div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex-grow bg-gray-50 rounded-lg p-4">
                      <div className="h-4 w-1/3 bg-[#8B2131]/10 rounded mb-4"></div>
                      <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="flex items-center">
                            <div className="w-2/3 h-3 bg-[#8B2131]/5 rounded"></div>
                            <div className="ml-auto w-16 h-3 bg-[#8B2131]/10 rounded"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#F5F1E4] rounded-full flex items-center justify-center">
                    <div className="bg-[#8B2131] rounded-full w-16 h-16 flex items-center justify-center text-white font-bold">
                      v2.0
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Features Section with enhanced aesthetics */}
        <section className="bg-white py-16 md:py-24 px-4 sm:px-6 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute left-0 top-1/4 w-64 h-64 bg-[#F5F1E4] rounded-full opacity-30 blur-3xl"></div>
          <div className="absolute right-0 bottom-1/4 w-80 h-80 bg-[#F5F1E4] rounded-full opacity-30 blur-3xl"></div>
          
          <div className="container mx-auto max-w-6xl relative">
            <div className="text-center mb-16">
              <h3 className="text-3xl md:text-4xl font-bold text-center relative inline-block">
                <span className="bg-gradient-to-r from-[#8B2131] to-[#6D1A27] bg-clip-text text-transparent">
                  System Features
                </span>
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-24 h-1.5 bg-gradient-to-r from-[#8B2131] to-[#6D1A27] rounded-full"></div>
              </h3>
              <p className="text-gray-600 mt-8 max-w-2xl mx-auto text-lg">
                Access the tools you need for quality control and inventory management.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gray-50 p-8 rounded-xl hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 group">
                <div className="w-14 h-14 bg-gradient-to-br from-[#F5F1E4] to-[#E9DEC5] rounded-lg flex items-center justify-center mb-6 shadow-sm group-hover:bg-gradient-to-br group-hover:from-[#8B2131]/10 group-hover:to-[#6D1A27]/10 transition-all duration-300">
                  <Package className="h-7 w-7 text-[#8B2131]" />
                </div>
                <h4 className="text-xl font-semibold mb-3">Inventory Tracking</h4>
                <p className="text-gray-600 leading-relaxed">
                  Track components and manage stock levels with precision. Get alerts for low stock and streamline procurement.
                </p>
              </div>
              
              <div className="bg-gray-50 p-8 rounded-xl hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 group">
                <div className="w-14 h-14 bg-gradient-to-br from-[#F5F1E4] to-[#E9DEC5] rounded-lg flex items-center justify-center mb-6 shadow-sm group-hover:bg-gradient-to-br group-hover:from-[#8B2131]/10 group-hover:to-[#6D1A27]/10 transition-all duration-300">
                  <CheckCircle className="h-7 w-7 text-[#8B2131]" />
                </div>
                <h4 className="text-xl font-semibold mb-3">Quality Control</h4>
                <p className="text-gray-600 leading-relaxed">
                  Implement rigorous quality checks with customized inspection stages. Identify and track defects throughout the production cycle.
                </p>
              </div>
              
              <div className="bg-gray-50 p-8 rounded-xl hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 group">
                <div className="w-14 h-14 bg-gradient-to-br from-[#F5F1E4] to-[#E9DEC5] rounded-lg flex items-center justify-center mb-6 shadow-sm group-hover:bg-gradient-to-br group-hover:from-[#8B2131]/10 group-hover:to-[#6D1A27]/10 transition-all duration-300">
                  <Settings className="h-7 w-7 text-[#8B2131]" />
                </div>
                <h4 className="text-xl font-semibold mb-3">Assembly Management</h4>
                <p className="text-gray-600 leading-relaxed">
                  Track complex assemblies and their components. Manage the entire assembly process with detailed component traceability.
                </p>
              </div>
              
              <div className="bg-gray-50 p-8 rounded-xl hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 group">
                <div className="w-14 h-14 bg-gradient-to-br from-[#F5F1E4] to-[#E9DEC5] rounded-lg flex items-center justify-center mb-6 shadow-sm group-hover:bg-gradient-to-br group-hover:from-[#8B2131]/10 group-hover:to-[#6D1A27]/10 transition-all duration-300">
                  <Shield className="h-7 w-7 text-[#8B2131]" />
                </div>
                <h4 className="text-xl font-semibold mb-3">Returns Processing</h4>
                <p className="text-gray-600 leading-relaxed">
                  Efficiently process and assess returned items. Integrate quality inspection into the returns workflow for continuous improvement.
                </p>
              </div>
              
              <div className="bg-gray-50 p-8 rounded-xl hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 group">
                <div className="w-14 h-14 bg-gradient-to-br from-[#F5F1E4] to-[#E9DEC5] rounded-lg flex items-center justify-center mb-6 shadow-sm group-hover:bg-gradient-to-br group-hover:from-[#8B2131]/10 group-hover:to-[#6D1A27]/10 transition-all duration-300">
                  <BarChart3 className="h-7 w-7 text-[#8B2131]" />
                </div>
                <h4 className="text-xl font-semibold mb-3">Advanced Analytics</h4>
                <p className="text-gray-600 leading-relaxed">
                  Make informed decisions with comprehensive reporting. Visualize trends, identify bottlenecks, and optimize your processes.
                </p>
              </div>
              
              <div className="bg-gray-50 p-8 rounded-xl hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 group">
                <div className="w-14 h-14 bg-gradient-to-br from-[#F5F1E4] to-[#E9DEC5] rounded-lg flex items-center justify-center mb-6 shadow-sm group-hover:bg-gradient-to-br group-hover:from-[#8B2131]/10 group-hover:to-[#6D1A27]/10 transition-all duration-300">
                  <Zap className="h-7 w-7 text-[#8B2131]" />
                </div>
                <h4 className="text-xl font-semibold mb-3">Real-time Updates</h4>
                <p className="text-gray-600 leading-relaxed">
                  Stay informed with real-time inventory and status updates. Collaborative features allow your team to work together seamlessly.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Role Cards Section with enhanced aesthetics */}
        <section className="py-16 md:py-24 px-4 sm:px-6 bg-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAyMCAwIEwgMCAwIDAgMjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzhCMjEzMSIgc3Ryb2tlLXdpZHRoPSIwLjUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1Ii8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9InVybCgjZ3JpZCkiIC8+PC9zdmc+')] opacity-10"></div>
          
          <div className="container mx-auto max-w-6xl relative">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-bold text-center mb-4">
                <span className="bg-gradient-to-r from-[#8B2131] to-[#6D1A27] bg-clip-text text-transparent">
                  System Access by Role
                </span>
              </h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Each team member has access to features specific to their needs
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gradient-to-br from-[#F5F1E4] to-white rounded-xl shadow-md overflow-hidden border border-gray-100 group hover:shadow-lg transition-all duration-300">
                <div className="h-2 bg-gradient-to-r from-[#8B2131] to-[#6D1A27]"></div>
                <div className="p-6">
                  <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center mb-4 group-hover:bg-[#F5F1E4] transition-colors duration-300">
                    <Users className="h-6 w-6 text-[#8B2131]" />
                  </div>
                  <h4 className="text-lg font-semibold mb-2">Assembly Team</h4>
                  <p className="text-gray-600 mb-4">
                    Streamlined component selection, batch tracking, and assembly processes.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-[#8B2131] mr-2 flex-shrink-0" />
                      Component tracking
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-[#8B2131] mr-2 flex-shrink-0" />
                      Batch selection
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-[#8B2131] mr-2 flex-shrink-0" />
                      Assembly documentation
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-[#F5F1E4] to-white rounded-xl shadow-md overflow-hidden border border-gray-100 group hover:shadow-lg transition-all duration-300">
                <div className="h-2 bg-gradient-to-r from-[#8B2131] to-[#6D1A27]"></div>
                <div className="p-6">
                  <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center mb-4 group-hover:bg-[#F5F1E4] transition-colors duration-300">
                    <Shield className="h-6 w-6 text-[#8B2131]" />
                  </div>
                  <h4 className="text-lg font-semibold mb-2">QC Inspectors</h4>
                  <p className="text-gray-600 mb-4">
                    Comprehensive tools for quality inspection and defect tracking.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-[#8B2131] mr-2 flex-shrink-0" />
                      Inspection checklists
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-[#8B2131] mr-2 flex-shrink-0" />
                      Defect documentation
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-[#8B2131] mr-2 flex-shrink-0" />
                      Quality metrics
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-[#F5F1E4] to-white rounded-xl shadow-md overflow-hidden border border-gray-100 group hover:shadow-lg transition-all duration-300">
                <div className="h-2 bg-gradient-to-r from-[#8B2131] to-[#6D1A27]"></div>
                <div className="p-6">
                  <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center mb-4 group-hover:bg-[#F5F1E4] transition-colors duration-300">
                    <Database className="h-6 w-6 text-[#8B2131]" />
                  </div>
                  <h4 className="text-lg font-semibold mb-2">Inventory Management</h4>
                  <p className="text-gray-600 mb-4">
                    Complete oversight of inventory levels and component tracking.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-[#8B2131] mr-2 flex-shrink-0" />
                      Stock level monitoring
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-[#8B2131] mr-2 flex-shrink-0" />
                      Batch management
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-[#8B2131] mr-2 flex-shrink-0" />
                      Component lifecycle tracking
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section with enhanced aesthetics */}
        <section className="py-12 md:py-16 px-4 sm:px-6 bg-gradient-to-r from-[#8B2131] to-[#6D1A27] text-white relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          </div>
          
          <div className="container mx-auto max-w-4xl text-center relative">
            <h3 className="text-2xl md:text-3xl font-bold mb-6">
              Access VEMBI Inventory QC System
            </h3>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 justify-center">
              <Link 
                href="/sign-in" 
                className="px-10 py-4 bg-white text-[#8B2131] rounded-md hover:bg-gray-100 transition shadow-lg inline-flex items-center justify-center font-medium group"
              >
                Sign In <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer with enhanced aesthetics */}
      <footer className="bg-white py-8 border-t border-gray-100">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-6 md:mb-0">
              <div className="w-10 h-10 mr-3 bg-gradient-to-br from-[#8B2131] to-[#6D1A27] rounded-lg flex items-center justify-center text-white font-bold text-xl">
                V
              </div>
              <div>
                <h4 className="text-lg font-bold bg-gradient-to-r from-[#8B2131] to-[#6D1A27] bg-clip-text text-transparent">VEMBI</h4>
                <span className="text-gray-500 text-sm">
                  © {new Date().getFullYear()} VEMBI. All rights reserved.
                </span>
              </div>
            </div>
            <div className="text-gray-500 text-sm">
              Internal inventory management system
            </div>
          </div>
      </div>
      </footer>
    </div>
  );
}

