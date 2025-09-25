/* eslint-disable */
'use client';

import React from 'react';
import { useForm, UseFormReturn, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

interface AuthFormProps<T extends z.ZodSchema> {
  schema: T;
  onSubmit: (data: z.infer<T>) => Promise<void>;
  // @ts-ignore
  children: (form: UseFormReturn<z.infer<T> & Record<string, unknown>>) => React.ReactNode;
  className?: string;
}

export function AuthForm<T extends z.ZodSchema>({
  schema,
  onSubmit,
  children,
  className,
}: AuthFormProps<T>) {
  const form = useForm<z.infer<T> & Record<string, unknown>>({
    // @ts-ignore
    resolver: zodResolver(schema as unknown) as unknown as Resolver<z.infer<T> & Record<string, unknown>>,
    mode: 'onBlur',
  });

  const handleSubmit = async (data: z.infer<T>) => {
    try {
      await onSubmit(data);
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Form submission error:', error);
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className={cn('space-y-6', className)}
      noValidate
    >
      {children(form)}
    </form>
  );
}
