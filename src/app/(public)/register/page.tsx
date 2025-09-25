'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { AuthForm } from '@/components/auth/AuthForm';
import { FormField } from '@/components/auth/FormField';
import { SubmitButton } from '@/components/auth/SubmitButton';
import { AuthAlert } from '@/components/auth/AuthAlert';
import { registerSchema, type RegisterFormData } from '@/lib/validations/auth';
import { authApi, tokenManager } from '@/lib/api/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const handleSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setAlert(null);

    try {
      // Prepare registration data
      const registrationData = {
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        phone_country_code: data.phone_country_code || undefined,
        phone: data.phone || undefined,
      };

      const response = await authApi.register(registrationData);

      if (response.success && response.data) {
        // Store access token
        tokenManager.setAccessToken(response.data.access_token);

        // Show success message
        setAlert({
          type: 'success',
          message: 'Account created successfully! Redirecting to your account...',
        });

        // Redirect to account page
        setTimeout(() => {
          router.push('/account');
        }, 2000);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';

      // Handle different error types
      if (errorMessage.includes('email already exists') || errorMessage.includes('duplicate')) {
        setAlert({
          type: 'error',
          message: 'An account with this email already exists. Please try logging in instead.',
        });
      } else if (errorMessage.includes('rate limit')) {
        setAlert({
          type: 'error',
          message: 'Too many registration attempts. Please try again later.',
        });
      } else {
        setAlert({
          type: 'error',
          message: errorMessage || 'Registration failed. Please try again.',
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
            Create Account
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Join Global International for premium hospitality products
          </p>
        </div>

        {/* Alert */}
        {alert && (
          <AuthAlert type={alert.type} message={alert.message} />
        )}

        {/* Registration Form */}
        <div className="bg-white rounded-xl shadow-lg p-8"
          style={{ backgroundColor: 'var(--color-background-surface)' }}>
          <AuthForm
            schema={registerSchema}
            onSubmit={handleSubmit}
          >
            {(form) => (
              <>
                <div className="space-y-6">
                  <FormField
                    form={form}
                    name="full_name"
                    label="Full Name"
                    type="text"
                    placeholder="Enter your full name"
                    autoComplete="name"
                  />

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
                      placeholder="Create a strong password"
                      autoComplete="new-password"
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

                  <div className="relative">
                    <FormField
                      form={form}
                      name="confirmPassword"
                      label="Confirm Password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-9 text-stone-400 hover:text-stone-600"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      form={form}
                      name="phone_country_code"
                      label="Country Code"
                      type="text"
                      placeholder="+1"
                      autoComplete="tel-country-code"
                    />

                    <FormField
                      form={form}
                      name="phone"
                      label="Phone Number (Optional)"
                      type="tel"
                      placeholder="1234567890"
                      autoComplete="tel"
                    />
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="mt-4 p-4 bg-stone-50 rounded-lg">
                  <p className="text-sm font-medium text-stone-700 mb-2">Password Requirements:</p>
                  <ul className="text-xs text-stone-600 space-y-1">
                    <li>• At least 8 characters long</li>
                    <li>• Contains uppercase and lowercase letters</li>
                    <li>• Contains at least one number</li>
                    <li>• Contains at least one special character</li>
                  </ul>
                </div>

                <div className="mt-8">
                  <SubmitButton isLoading={isLoading}>
                    Create Account
                  </SubmitButton>
                </div>
              </>
            )}
          </AuthForm>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-stone-600">
              Already have an account?{' '}
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
