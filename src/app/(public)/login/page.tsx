'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { AuthForm } from '@/components/auth/AuthForm';
import { FormField } from '@/components/auth/FormField';
import { SubmitButton } from '@/components/auth/SubmitButton';
import { AuthAlert } from '@/components/auth/AuthAlert';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { authApi, tokenManager } from '@/lib/api/auth';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const handleSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setAlert(null);

    try {
      const response = await authApi.login(data);

      if (response.success && response.data) {
        // Store access token
        tokenManager.setAccessToken(response.data.access_token);

        // Show success message
        setAlert({
          type: 'success',
          message: 'Login successful! Redirecting...',
        });

        // Redirect to account page or dashboard
        setTimeout(() => {
          router.push('/account');
        }, 1500);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';

      // Handle different error types
      if (errorMessage.includes('2FA')) {
        setAlert({
          type: 'info',
          message: 'Two-factor authentication is required. Please contact support.',
        });
      } else if (errorMessage.includes('rate limit')) {
        setAlert({
          type: 'error',
          message: 'Too many login attempts. Please try again later.',
        });
      } else {
        setAlert({
          type: 'error',
          message: errorMessage || 'Invalid email or password. Please try again.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: 'var(--color-background-primary)' }}>
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-serif font-bold text-teal-800">
            Welcome Back
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Sign in to your Global International account
          </p>
        </div>

        {/* Alert */}
        {alert && (
          <AuthAlert type={alert.type} message={alert.message} />
        )}

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg p-8"
          style={{ backgroundColor: 'var(--color-background-surface)' }}>
          <AuthForm
            schema={loginSchema}
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
                    placeholder="Enter your email"
                    autoComplete="email"
                  />

                  <div className="relative">
                    <FormField
                      form={form}
                      name="password"
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-9 text-stone-400 hover:text-stone-600"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Forgot your password?
                  </Link>
                </div>

                <div className="mt-8">
                  <SubmitButton isLoading={isLoading}>
                    Sign In
                  </SubmitButton>
                </div>
              </>
            )}
          </AuthForm>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-stone-600">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="font-medium text-teal-600 hover:text-teal-700"
              >
                Sign up here
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
