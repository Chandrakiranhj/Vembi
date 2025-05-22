'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Loader2 } from 'lucide-react';

interface NavItemType {
  name: string;
  href: string;
  icon: () => React.ReactNode;
  showBadge?: boolean;
  badgeCount?: number;
}

interface NavWrapperProps {
  items: NavItemType[];
  isAdmin: boolean;
  pendingUsersCount: number;
  isMobile?: boolean;
  onLinkClick?: () => void;
}

export default function NavWrapper({ 
  items, 
  isAdmin, 
  pendingUsersCount, 
  isMobile = false,
  onLinkClick
}: NavWrapperProps) {
  const pathname = usePathname() || '';
  // Use state to ensure consistent rendering between server and client
  const [currentPath, setCurrentPath] = useState('');
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  
  // Update path after hydration to ensure client-side navigation works
  useEffect(() => {
    setCurrentPath(pathname);
    setLoadingPath(null); // Reset loading state when navigation completes
  }, [pathname]);
  
  // Use the same path value for both server and client initial render
  const isActive = (href: string) => {
    // During initial render, use an empty check to avoid mismatches
    if (currentPath === '') {
      return false;
    }
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };

  const handleNavClick = (href: string) => {
    if (href !== pathname) {
      setLoadingPath(href);
      if (onLinkClick) onLinkClick();
    }
  };

  // Custom Link wrapper that provides loading feedback
  const NavLink = ({ href, children, className }: { href: string, children: React.ReactNode, className: string }) => {
    const isLoading = loadingPath === href;
    
    return (
      <div className="relative">
        <Link
          href={href}
          className={`${className} ${isLoading ? 'opacity-70' : ''}`}
          onClick={() => handleNavClick(href)}
        >
          {children}
        </Link>
        {isLoading && (
          <div className="absolute inset-0 bg-[#8B2131]/40 flex items-center justify-center rounded-lg z-10">
            <div className="flex flex-row items-center gap-2 bg-[#8B2131] px-3 py-2 rounded-md shadow-md">
              <Loader2 className="h-5 w-5 text-white animate-spin" />
              <span className="text-white text-sm font-medium">Loading...</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="flex-1 mt-6 px-4">
      <div className="text-xs uppercase tracking-wider font-semibold text-[#F5F1E4] pl-4 mb-3">
        Main Navigation
      </div>
      <ul className={`space-y-1 ${isMobile ? 'pb-20' : ''}`}>
        {items.map((item) => (
          <li key={item.name}>
            <NavLink
              href={item.href}
              className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium text-[#F5F1E4] transition-colors duration-150 group
                ${isActive(item.href) 
                  ? 'bg-[#8B2131] text-white' 
                  : 'hover:bg-[#8B2131]/60 hover:text-white'
                }`}
            >
              <span className={`p-1.5 rounded-md mr-3 ${isActive(item.href) ? 'bg-[#8B2131]/70' : 'bg-[#8B2131]/40 group-hover:bg-[#8B2131]/70'}`}>
                <item.icon />
              </span>
              <span className="flex-1">{item.name}</span>
              {item.showBadge && isAdmin && pendingUsersCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-[#D4BC7D] rounded-full">
                  {pendingUsersCount}
                </span>
              )}
            </NavLink>
          </li>
        ))}
        {isAdmin && (
          <li>
            <NavLink
              href="/admin"
              className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium text-[#F5F1E4] transition-colors duration-150 group
                ${isActive("/admin") 
                  ? 'bg-[#8B2131] text-white' 
                  : 'hover:bg-[#8B2131]/60 hover:text-white'
                }`}
            >
              <span className={`p-1.5 rounded-md mr-3 ${isActive("/admin") ? 'bg-[#8B2131]/70' : 'bg-[#8B2131]/40 group-hover:bg-[#8B2131]/70'}`}>
                <Settings className="h-5 w-5" />
              </span>
              <span className="flex-1">Admin</span>
            </NavLink>
          </li>
        )}
      </ul>
    </nav>
  );
} 