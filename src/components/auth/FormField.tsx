'use client';

import React from 'react';
import { UseFormReturn, FieldPath, FieldValues } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  form: UseFormReturn<TFieldValues>;
  name: TName;
  label: string;
  type?: 'text' | 'email' | 'password' | 'tel';
  placeholder?: string;
  className?: string;
  autoComplete?: string;
  disabled?: boolean;
}

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  form,
  name,
  label,
  type = 'text',
  placeholder,
  className,
  autoComplete,
  disabled = false,
}: FormFieldProps<TFieldValues, TName>) {
  const {
    register,
    formState: { errors },
  } = form;

  const error = errors[name];
  const errorMessage = error?.message as string;

  return (
    <div className={cn('space-y-1', className)}>
      <Input
        {...register(name)}
        type={type}
        label={label}
        placeholder={placeholder}
        error={errorMessage}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && (
        <p id={`${name}-error`} className="text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
