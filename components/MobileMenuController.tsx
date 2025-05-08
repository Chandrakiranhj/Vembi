'use client';

import React, { useState } from 'react';
import MobileSidebar from './MobileSidebar';

interface MobileMenuControllerProps {
  items: Array<{
    name: string;
    href: string;
    icon: () => React.ReactNode;
    showBadge?: boolean;
    badgeCount?: number;
  }>;
}

export default function MobileMenuController({ items }: MobileMenuControllerProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const openMenu = () => setIsMenuOpen(true);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      {/* Mobile menu button */}
      <button 
        className="md:hidden p-2 rounded-md hover:bg-gray-100 touch-target" 
        onClick={openMenu}
        aria-label="Open menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" x2="20" y1="12" y2="12" />
          <line x1="4" x2="20" y1="6" y2="6" />
          <line x1="4" x2="20" y1="18" y2="18" />
        </svg>
      </button>

      {/* Mobile sidebar component */}
      <MobileSidebar 
        items={items}
        isOpen={isMenuOpen}
        onClose={closeMenu}
      />
    </>
  );
} 