'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-user';
import { useEffect } from 'react';
import {
  ArrowRight, CheckCircle, BarChart3, Shield, Package,
  Settings, Users, Database, Zap, Sparkles,
  ChevronRight, CheckCheck, Lock
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { isLoaded, userId, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && userId) {
      router.push('/dashboard');
    }
  }, [isLoaded, userId, isSignedIn, router]);

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-300 flex flex-col overflow-x-hidden selection:bg-slate-700 selection:text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-slate-800/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-slate-800/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
      </div>

      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0F172A]/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-32">
              <img
                src="/logo_vembi.svg"
                alt="Vembi Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-white sr-only">
              Vembi <span className="font-light text-slate-500">QC</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="group relative px-5 py-2.5 bg-white text-[#0F172A] text-sm font-bold rounded-lg hover:bg-slate-200 transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_-5px_rgba(255,255,255,0.5)]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Get Started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-grow pt-32 pb-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm animate-fade-in">
              <Shield className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">Internal Quality Control Platform</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight animate-fade-in [animation-delay:200ms]">
              Precision in Every <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-200 via-slate-400 to-slate-600">
                Component & Assembly
              </span>
            </h1>

            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed animate-fade-in [animation-delay:400ms]">
              The centralized hub for Vembi's inventory management, quality assurance, and defect tracking. Designed for operational excellence.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 animate-fade-in [animation-delay:600ms]">
              <Link
                href="/sign-up"
                className="w-full sm:w-auto px-8 py-4 bg-white text-[#0F172A] font-bold rounded-xl hover:bg-slate-100 transition-all shadow-lg shadow-white/5 flex items-center justify-center gap-2"
              >
                Request Access
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/sign-in"
                className="w-full sm:w-auto px-8 py-4 bg-white/5 text-white font-medium rounded-xl hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-2"
              >
                <Lock className="h-4 w-4" />
                Authorized Login
              </Link>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Package,
                title: "Inventory Tracking",
                desc: "Real-time visibility into component stock levels, batch tracking, and procurement needs."
              },
              {
                icon: CheckCircle,
                title: "Quality Assurance",
                desc: "Rigorous QC workflows for returns and assemblies with detailed defect reporting."
              },
              {
                icon: BarChart3,
                title: "Performance Analytics",
                desc: "Data-driven insights into vendor performance, defect rates, and assembly efficiency."
              }
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-8 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.07] hover:border-white/10 transition-all duration-300"
              >
                <div className="h-12 w-12 rounded-lg bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-6 w-6 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#0F172A] py-12 relative z-10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="relative h-8 w-24">
              <img
                src="/logo_vembi.svg"
                alt="Vembi Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-sm font-medium text-slate-500">
              © {new Date().getFullYear()} Vembi Technologies
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <span>Internal System</span>
            <span>v2.5.0</span>
            <span className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              System Operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
