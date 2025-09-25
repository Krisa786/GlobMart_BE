'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import { AuthForm } from '@/components/auth/AuthForm';
import { FormField } from '@/components/auth/FormField';
import { SubmitButton } from '@/components/auth/SubmitButton';
import { AuthAlert } from '@/components/auth/AuthAlert';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations/auth';
import { authApi } from '@/lib/api/auth';

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const handleSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setAlert(null);

    try {
      const response = await authApi.forgotPassword(data);
      
      if (response.success) {
        setIsSubmitted(true);
        setAlert({
          type: 'success',
          message: 'If an account with this email exists, we&apos;ve sent you a password reset link. Please check your email and follow the instructions.',
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      
      // Handle different error types
      if (errorMessage.includes('rate limit')) {
        setAlert({
          type: 'error',
          message: 'Too many password reset attempts. Please try again later.',
        });
      } else {
        // For security, we show the same success message regardless of whether the email exists
        setIsSubmitted(true);
        setAlert({
          type: 'success',
          message: 'If an account with this email exists, we&apos;ve sent you a password reset link. Please check your email and follow the instructions.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" 
           style={{ backgroundColor: 'var(--color-background-primary)' }}>
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-teal-800">
              Check Your Email
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              We&apos;ve sent you a password reset link
            </p>
          </div>

          {/* Success Alert */}
          {alert && (
            <AuthAlert type={alert.type} message={alert.message} />
          )}

          {/* Instructions */}
          <div className="bg-white rounded-xl shadow-lg p-8" 
               style={{ backgroundColor: 'var(--color-background-surface)' }}>
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-medium text-stone-900 mb-2">
                  Next Steps
                </h2>
                <ol className="text-sm text-stone-600 space-y-2 text-left">
                  <li>1. Check your email inbox (and spam folder)</li>
                  <li>2. Click the password reset link in the email</li>
                  <li>3. Create a new password</li>
                  <li>4. Sign in with your new password</li>
                </ol>
              </div>

              <div className="pt-4 border-t border-stone-200">
                <p className="text-sm text-stone-500 text-center">
                  Didn&apos;t receive the email? Check your spam folder or{' '}
                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setAlert(null);
                    }}
                    className="font-medium text-teal-600 hover:text-teal-700"
                  >
                    try again
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* Back to Login */}
          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-stone-500 hover:text-stone-700"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" 
         style={{ backgroundColor: 'var(--color-background-primary)' }}>
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-serif font-bold text-teal-800">
            Reset Password
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Enter your email address and we&apos;ll send you a link to reset your password
          </p>
        </div>

        {/* Alert */}
        {alert && (
          <AuthAlert type={alert.type} message={alert.message} />
        )}

        {/* Forgot Password Form */}
        <div className="bg-white rounded-xl shadow-lg p-8" 
             style={{ backgroundColor: 'var(--color-background-surface)' }}>
          <AuthForm
            schema={forgotPasswordSchema}
            onSubmit={handleSubmit}
          >
            {(form) => (
              <>
                <div className="space-y-6">
                  <FormField
                    form={form}
                    name="email"
                    label="Email Address"
                    type="email"
                    placeholder="Enter your email address"
                    autoComplete="email"
                  />
                </div>

                <div className="mt-8">
                  <SubmitButton isLoading={isLoading}>
                    Send Reset Link
                  </SubmitButton>
                </div>
              </>
            )}
          </AuthForm>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-stone-600">
              Remember your password?{' '}
              <Link
                href="/login"
                className="font-medium text-teal-600 hover:text-teal-700"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-stone-500 hover:text-stone-700"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
