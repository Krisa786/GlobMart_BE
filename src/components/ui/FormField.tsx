import React from 'react';
import { cn } from '@/lib/utils';
import { Label } from './Label';

export interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  className,
  children
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label required={required}>
          {label}
        </Label>
      )}
      {children}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export { FormField };
