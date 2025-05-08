'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import MobileSidebarNav from './MobileSidebarNav';

interface NavItemProps {
  name: string;
  href: string;
  icon: () => React.ReactNode;
  showBadge?: boolean;
  badgeCount?: number;
}

export default function MobileSidebar({ 
  items,
  isOpen,
  onClose
}: { 
  items: NavItemProps[];
  isOpen: boolean;
  onClose: () => void;
}) {
  // Add escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    
    // Prevent body scrolling when sidebar is open
    if (isOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.classList.remove('overflow-hidden');
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`md:hidden fixed inset-0 bg-black/50 z-10 ${isOpen ? 'block' : 'hidden'}`} 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 w-80 max-w-[80%] bg-blue-900 text-blue-100 flex flex-col transform transition-transform duration-300 ease-in-out z-30 md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-blue-800 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">Vembi</span>
          </Link>
          <button 
            className="p-2 text-blue-200 hover:text-white touch-target rounded-full" 
            onClick={onClose}
            aria-label="Close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        
        <MobileSidebarNav 
          items={items} 
          onLinkClick={onClose} 
        />
      </div>
    </>
  );
} 