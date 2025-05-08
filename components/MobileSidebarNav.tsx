'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItemProps {
  name: string;
  href: string;
  icon: () => ReactNode;
  showBadge?: boolean;
  badgeCount?: number;
}

export default function MobileSidebarNav({ 
  items, 
  className = '',
  onLinkClick 
}: { 
  items: NavItemProps[]; 
  className?: string;
  onLinkClick?: () => void;
}) {
  const pathname = usePathname() || '';

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className={`flex-1 mt-6 px-3 overflow-y-auto ${className}`}>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.name}>
            <Link
              href={item.href}
              className={`flex items-center px-3 py-3 rounded-md text-base font-medium transition-colors duration-150 touch-target
                ${isActive(item.href) 
                  ? 'bg-[#8B2131] text-white' 
                  : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`}
              onClick={onLinkClick}
            >
              <item.icon />
              <span className="ml-3 flex-1 truncate">{item.name}</span>
              {item.showBadge && item.badgeCount && item.badgeCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-[#D4BC7D] rounded-full">
                  {item.badgeCount}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
} 