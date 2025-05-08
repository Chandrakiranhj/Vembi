'use client';

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Client-side navigation component props
interface NavLinkProps {
  href: string;
  icon: React.ComponentType;
  name: string;
  showBadge?: boolean;
  pendingCount?: number;
  isAdmin?: boolean;
}

// This component will handle active states client-side
export default function NavLink({ 
  href, 
  icon: Icon, 
  name, 
  showBadge, 
  pendingCount = 0, 
  isAdmin = false 
}: NavLinkProps) {
  const pathname = usePathname() || '';
  const [currentPath, setCurrentPath] = React.useState('');
  
  // Update path after hydration to ensure client-side navigation works
  React.useEffect(() => {
    setCurrentPath(pathname);
  }, [pathname]);

  // Use the same path value for both server and client initial render
  const isActive = React.useMemo(() => {
    if (currentPath === '') return false;
    return currentPath === href || currentPath.startsWith(`${href}/`);
  }, [currentPath, href]);

  return (
    <Link
      href={href}
      className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium text-[#F5F1E4] transition-colors duration-150 group ${
        isActive 
          ? 'bg-[#8B2131] text-white' 
          : 'hover:bg-[#8B2131]/60 hover:text-white'
      }`}
    >
      <span className={`p-1.5 rounded-md mr-3 ${
        isActive 
          ? 'bg-[#8B2131]/70' 
          : 'bg-[#8B2131]/40 group-hover:bg-[#8B2131]/70'
      }`}>
        <Icon />
      </span>
      <span className="flex-1">{name}</span>
      {showBadge && isAdmin && pendingCount > 0 && (
        <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-[#D4BC7D] rounded-full">
          {pendingCount}
        </span>
      )}
    </Link>
  );
} 