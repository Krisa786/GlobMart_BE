'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { User, ChevronDown, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileDropdownProps {
  className?: string;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Profile Icon Button */}
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-1 p-2 text-stone-600 hover:text-teal-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded-md"
        aria-label="Account menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <User className="h-5 w-5" />
        <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-stone-200 py-1 z-50">
          <div className="px-4 py-2 border-b border-stone-100">
            <p className="text-sm font-medium text-stone-800">Account</p>
          </div>
          
          <Link 
            href="/login" 
            className="flex items-center px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 hover:text-teal-800 transition-colors duration-200"
            onClick={() => setIsOpen(false)}
          >
            <LogIn className="h-4 w-4 mr-3" />
            Sign In
          </Link>
          
          {/* <Link 
            href="/register" 
            className="flex items-center px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 hover:text-teal-800 transition-colors duration-200"
            onClick={() => setIsOpen(false)}
          >
            <UserPlus className="h-4 w-4 mr-3" />
            Sign Up
          </Link> */}
        </div>
      )}
    </div>
  );
};
