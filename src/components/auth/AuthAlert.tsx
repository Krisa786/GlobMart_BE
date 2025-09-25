'use client';

import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthAlertProps {
  type: 'success' | 'error' | 'info';
  message: string;
  className?: string;
}

export function AuthAlert({ type, message, className }: AuthAlertProps) {
  const variants = {
    success: {
      icon: CheckCircle,
      styles: 'bg-green-50 border-green-200 text-green-800',
      iconStyles: 'text-green-600',
    },
    error: {
      icon: AlertCircle,
      styles: 'bg-red-50 border-red-200 text-red-800',
      iconStyles: 'text-red-600',
    },
    info: {
      icon: Info,
      styles: 'bg-blue-50 border-blue-200 text-blue-800',
      iconStyles: 'text-blue-600',
    },
  };

  const variant = variants[type];
  const Icon = variant.icon;

  return (
    <div
      className={cn(
        'flex items-start space-x-3 rounded-lg border p-4',
        variant.styles,
        className
      )}
      role="alert"
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', variant.iconStyles)} />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
