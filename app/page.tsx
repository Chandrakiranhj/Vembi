'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { 
  ArrowRight, CheckCircle, BarChart3, Shield, Package, 
  Settings, Users, Database, Zap, Sparkles, 
  ChevronRight, CheckCheck
} from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white flex flex-col">
      {/* Modern Navbar */}
      <header className="py-6 px-4 sm:px-6 lg:px-8 border-b border-slate-100 backdrop-blur-sm bg-white/80 fixed w-full z-50">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#8B2131] to-[#6D1A27] rounded-lg flex items-center justify-center shadow-md text-white font-bold text-xl">
              V
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-[#8B2131]">VEMBI</span>
            </h1>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/sign-in" className="text-sm font-medium text-slate-600 hover:text-[#8B2131] transition-colors">
              Sign In
            </Link>
            <Link 
              href="/sign-up" 
              className="text-sm font-medium px-5 py-2.5 bg-[#8B2131] text-white rounded-lg hover:bg-[#6D1A27] shadow-sm transition-colors flex items-center gap-2"
            >
              Get Started <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="md:hidden flex items-center">
            <Link 
              href="/sign-in" 
              className="px-4 py-2 text-sm font-medium text-[#8B2131] hover:bg-slate-50 rounded-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>
      
      {/* Hero Section with 3D effect */}
      <main className="flex-grow pt-24">
        <section className="relative overflow-hidden">
          {/* Abstract background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-64 left-1/2 transform -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-[#8B2131]/5 via-[#6D1A27]/3 to-transparent blur-3xl"></div>
            <div className="absolute bottom-32 right-0 w-[600px] h-[600px] rounded-full bg-[#F5F1E4]/30 blur-3xl"></div>
          </div>
          
          <div className="container mx-auto py-16 md:py-28 px-4 sm:px-6 lg:px-8 relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8 max-w-2xl animate-fadeIn">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full text-[#8B2131] border border-[#8B2131]/10 shadow-sm w-fit">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-medium">VEMBI Inventory Management</span>
                </div>
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
                  Quality Control <span className="text-[#8B2131]">Reimagined</span>
                </h2>
                <p className="text-xl text-slate-600 leading-relaxed">
                  Streamline your manufacturing operations with our comprehensive inventory and quality control management platform designed specifically for VEMBI.
                </p>
                <div className="flex flex-col sm:flex-row gap-5">
                  <Link 
                    href="/sign-up" 
                    className="inline-flex items-center justify-center px-6 py-3 bg-[#8B2131] text-white rounded-lg shadow-lg hover:bg-[#6D1A27] transition-colors font-medium gap-2 group"
                  >
                    Create Account 
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link 
                    href="/sign-in" 
                    className="inline-flex items-center justify-center px-6 py-3 bg-white text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-[#8B2131]/30 transition font-medium shadow"
                  >
                    Sign In
                  </Link>
                </div>
                <div className="pt-4 flex items-center text-slate-600 text-sm">
                  <CheckCheck className="h-4 w-4 mr-2 text-emerald-500" />
                  Designed for VEMBI&apos;s specific manufacturing workflow
                </div>
              </div>
              
              <div className="relative hidden lg:block">
                <div className="relative bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden p-1">
                  <div className="h-8 w-full bg-slate-50 rounded-t-xl flex items-center space-x-2 px-4">
                    <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                    <div className="ml-4 w-1/3 h-4 bg-slate-100 rounded-md"></div>
                  </div>
                  
                  <div className="p-6 bg-slate-50/30">
                    {/* Dashboard UI mockup */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
                          <div className="w-8 h-8 rounded-lg mb-3 bg-[#8B2131]/10 flex items-center justify-center">
                            <div className="w-4 h-4 text-[#8B2131]">
                              {i === 1 && <Package className="w-4 h-4" />}
                              {i === 2 && <CheckCircle className="w-4 h-4" />}
                              {i === 3 && <BarChart3 className="w-4 h-4" />}
                            </div>
                          </div>
                          <div className="h-2 w-1/2 bg-slate-200 rounded-md mb-2"></div>
                          <div className="h-6 w-full bg-slate-100 rounded-md"></div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                      <div className="flex justify-between items-center mb-4">
                        <div className="h-4 w-40 bg-slate-200 rounded-md"></div>
                        <div className="h-8 w-24 bg-[#8B2131]/10 rounded-lg"></div>
                      </div>
                      
                      <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="flex items-center p-2 bg-slate-50 rounded-lg">
                            <div className="w-8 h-8 rounded-md bg-slate-100 mr-3"></div>
                            <div className="w-1/3 h-4 bg-slate-200 rounded-md"></div>
                            <div className="ml-auto flex gap-2">
                              <div className="w-16 h-6 bg-slate-100 rounded-md"></div>
                              <div className="w-6 h-6 rounded-md bg-[#8B2131]/10"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 3D effect decorative elements */}
                <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-[#F5F1E4]/40 rounded-full blur-3xl -z-10"></div>
                <div className="absolute -top-8 -left-8 w-16 h-16 bg-[#8B2131]/10 rounded-full -z-10"></div>
                <div className="absolute -top-4 right-1/3 w-4 h-4 bg-[#6D1A27]/20 rounded-full"></div>
                <div className="absolute -bottom-4 left-1/3 w-6 h-6 bg-[#8B2131]/20 rounded-full"></div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50/50 relative overflow-hidden">
          <div className="container mx-auto max-w-7xl relative">
            <div className="text-center mb-16">
              <div className="inline-block px-3 py-1 bg-[#8B2131]/5 rounded-lg text-[#8B2131] text-sm font-medium mb-3">
                Platform Features
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Everything you need to manage quality
              </h3>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Our comprehensive platform provides all the tools your team needs for efficient inventory management and quality control.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: <Package />,
                  title: "Inventory Tracking",
                  description: "Track components and manage stock levels with precision. Get alerts for low stock and streamline procurement."
                },
                {
                  icon: <CheckCircle />,
                  title: "Quality Control",
                  description: "Implement rigorous quality checks with customized inspection stages. Identify and track defects throughout production."
                },
                {
                  icon: <Settings />,
                  title: "Assembly Management",
                  description: "Track complex assemblies and their components. Manage the entire assembly process with detailed component traceability."
                },
                {
                  icon: <Shield />,
                  title: "Returns Processing",
                  description: "Efficiently process and assess returned items. Integrate quality inspection into the returns workflow."
                },
                {
                  icon: <BarChart3 />,
                  title: "Advanced Analytics",
                  description: "Make informed decisions with comprehensive reporting. Visualize trends and identify bottlenecks."
                },
                {
                  icon: <Zap />,
                  title: "Real-time Updates",
                  description: "Stay informed with real-time inventory and status updates. Collaborative features for seamless teamwork."
                }
              ].map((feature, index) => (
                <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-[#8B2131]/10 transition-all duration-200">
                  <div className="w-12 h-12 bg-[#8B2131]/5 rounded-xl flex items-center justify-center mb-5 text-[#8B2131]">
                    {feature.icon}
                  </div>
                  <h4 className="text-xl font-semibold mb-3 text-slate-900">{feature.title}</h4>
                  <p className="text-slate-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Role-based access section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAyMCAwIEwgMCAwIDAgMjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIwLjUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9InVybCgjZ3JpZCkiIC8+PC9zdmc+')] opacity-30"></div>
          
          <div className="container mx-auto max-w-7xl relative">
            <div className="text-center mb-16">
              <div className="inline-block px-3 py-1 bg-[#8B2131]/5 rounded-lg text-[#8B2131] text-sm font-medium mb-3">
                Role-Based Access
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Tailored for every team member
              </h3>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Each team member gets access to the tools they need based on their role in the organization.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Users />,
                  title: "Assembly Team",
                  description: "Streamlined component selection, batch tracking, and assembly processes.",
                  features: ["Component tracking", "Batch selection", "Assembly documentation"]
                },
                {
                  icon: <Shield />,
                  title: "QC Inspectors",
                  description: "Comprehensive tools for quality inspection and defect tracking.",
                  features: ["Inspection checklists", "Defect documentation", "Quality metrics"]
                },
                {
                  icon: <Database />,
                  title: "Inventory Management",
                  description: "Complete oversight of inventory levels and component tracking.",
                  features: ["Stock level monitoring", "Batch management", "Component lifecycle tracking"]
                }
              ].map((role, index) => (
                <div 
                  key={index} 
                  className="bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 group"
                >
                  <div className="h-1.5 w-full bg-[#8B2131]"></div>
                  <div className="p-6">
                    <div className="w-12 h-12 rounded-lg border border-slate-100 shadow-sm flex items-center justify-center mb-5 text-[#8B2131] group-hover:bg-[#8B2131]/5 transition-colors">
                      {role.icon}
                    </div>
                    <h4 className="text-xl font-semibold text-slate-900 mb-2">{role.title}</h4>
                    <p className="text-slate-600 mb-6">
                      {role.description}
                    </p>
                    <ul className="space-y-3">
                      {role.features.map((feature, i) => (
                        <li key={i} className="flex items-center text-slate-700">
                          <div className="w-5 h-5 rounded-full bg-[#8B2131]/5 flex items-center justify-center mr-3 text-[#8B2131]">
                            <CheckCircle className="w-3 h-3" />
                          </div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#8B2131] to-[#6D1A27] text-white relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          </div>
          
          <div className="container mx-auto max-w-4xl text-center relative">
            <h3 className="text-3xl font-bold mb-6">
              Access VEMBI Inventory QC System
            </h3>
            <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
              Sign in to access your account or create a new one to get started
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 justify-center">
              <Link 
                href="/sign-in" 
                className="px-8 py-3 bg-white text-[#8B2131] rounded-lg hover:bg-gray-100 transition shadow-lg inline-flex items-center justify-center font-medium group gap-2"
              >
                Sign In <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="bg-white py-8 border-t border-slate-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-6 md:mb-0">
              <div className="w-8 h-8 bg-[#8B2131] rounded-md flex items-center justify-center text-white font-bold text-sm">
                V
              </div>
              <div>
                <h4 className="font-semibold text-[#8B2131]">VEMBI</h4>
                <span className="text-slate-500 text-xs">
                  © {new Date().getFullYear()} VEMBI. All rights reserved.
                </span>
              </div>
            </div>
            <div className="text-slate-500 text-sm">
              Internal inventory management system
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

