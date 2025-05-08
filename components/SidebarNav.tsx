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

export default function SidebarNav({ items, className = '' }: { 
  items: NavItemProps[]; 
  className?: string;
}) {
  const pathname = usePathname() || '';

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className={`flex-1 mt-6 px-3 ${className}`}>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.name}>
            <Link
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