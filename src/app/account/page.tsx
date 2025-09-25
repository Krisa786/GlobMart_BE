'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Calendar, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AuthAlert } from '@/components/auth/AuthAlert';
import { authApi, tokenManager, type User as UserType } from '@/lib/api/auth';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      const accessToken = tokenManager.getAccessToken();
      
      if (!accessToken) {
        router.push('/login');
        return;
      }

      try {
        const response = await authApi.getCurrentUser(accessToken);
        if (response.success && response.data) {
          setUser(response.data.user);
        }
      } catch (error) {
        // Token might be expired, redirect to login
        tokenManager.removeAccessToken();
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, [router]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      tokenManager.removeAccessToken();
      router.push('/');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" 
           style={{ backgroundColor: 'var(--color-background-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-800 mx-auto"></div>
          <p className="mt-4 text-stone-600">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" 
           style={{ backgroundColor: 'var(--color-background-primary)' }}>
        <div className="text-center">
          <p className="text-stone-600">Unable to load account information.</p>
          <Button 
            variant="primary" 
            className="mt-4"
            onClick={() => router.push('/login')}
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8" 
         style={{ backgroundColor: 'var(--color-background-primary)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-teal-800">
            My Account
          </h1>
          <p className="mt-2 text-stone-600">
            Welcome back, {user.full_name}
          </p>
        </div>

        {/* Alert */}
        {alert && (
          <div className="mb-6">
            <AuthAlert type={alert.type} message={alert.message} />
          </div>
        )}

        {/* Account Information */}
        <div className="bg-white rounded-xl shadow-lg p-8" 
             style={{ backgroundColor: 'var(--color-background-surface)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Profile Information */}
            <div>
              <h2 className="text-xl font-semibold text-stone-900 mb-6 flex items-center">
                <User className="h-5 w-5 mr-2 text-teal-600" />
                Profile Information
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-stone-400" />
                  <div>
                    <p className="text-sm font-medium text-stone-900">Email</p>
                    <p className="text-sm text-stone-600">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-stone-400" />
                  <div>
                    <p className="text-sm font-medium text-stone-900">Full Name</p>
                    <p className="text-sm text-stone-600">{user.full_name}</p>
                  </div>
                </div>

                {user.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-stone-400" />
                    <div>
                      <p className="text-sm font-medium text-stone-900">Phone</p>
                      <p className="text-sm text-stone-600">
                        {user.phone_country_code} {user.phone}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-stone-400" />
                  <div>
                    <p className="text-sm font-medium text-stone-900">Member Since</p>
                    <p className="text-sm text-stone-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div>
              <h2 className="text-xl font-semibold text-stone-900 mb-6">
                Account Status
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
                  <span className="text-sm font-medium text-stone-900">Account Status</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    user.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
                  <span className="text-sm font-medium text-stone-900">Email Verified</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    user.email_verified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {user.email_verified ? 'Verified' : 'Pending'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
                  <span className="text-sm font-medium text-stone-900">User Role</span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {user.roles.join(', ')}
                  </span>
                </div>

                {user.last_login_at && (
                  <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
                    <span className="text-sm font-medium text-stone-900">Last Login</span>
                    <span className="text-sm text-stone-600">
                      {new Date(user.last_login_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 pt-6 border-t border-stone-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="outline"
                onClick={() => router.push('/')}
              >
                Browse Products
              </Button>
              
              <Button
                variant="secondary"
                onClick={handleLogout}
                className="flex items-center"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6 text-center" 
               style={{ backgroundColor: 'var(--color-background-surface)' }}>
            <h3 className="text-lg font-medium text-stone-900 mb-2">Order History</h3>
            <p className="text-sm text-stone-600 mb-4">View your past orders and track shipments</p>
            <Button variant="outline" size="sm" disabled>
              Coming Soon
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow p-6 text-center" 
               style={{ backgroundColor: 'var(--color-background-surface)' }}>
            <h3 className="text-lg font-medium text-stone-900 mb-2">Wishlist</h3>
            <p className="text-sm text-stone-600 mb-4">Save products for later purchase</p>
            <Button variant="outline" size="sm" disabled>
              Coming Soon
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow p-6 text-center" 
               style={{ backgroundColor: 'var(--color-background-surface)' }}>
            <h3 className="text-lg font-medium text-stone-900 mb-2">Support</h3>
            <p className="text-sm text-stone-600 mb-4">Get help with your account or orders</p>
            <Button variant="outline" size="sm" disabled>
              Coming Soon
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
