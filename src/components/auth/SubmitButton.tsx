'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubmitButtonProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function SubmitButton({
  isLoading,
  children,
  className,
  disabled = false,
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      variant="primary"
      size="lg"
      className={cn('w-full', className)}
      disabled={isLoading || disabled}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        children
      )}
    </Button>
  );
}
