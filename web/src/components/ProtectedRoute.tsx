'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: string[];
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  allowedRoles
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !isAuthenticated) {
        router.push('/login');
        return;
      }

      if (!requireAuth && isAuthenticated) {
        router.push('/dashboard');
        return;
      }

      if (requireAuth && isAuthenticated && allowedRoles && user) {
        if (!allowedRoles.includes(user.role)) {
          router.push('/dashboard');
          return;
        }
      }
    }
  }, [isAuthenticated, isLoading, requireAuth, allowedRoles, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  // If authentication is not required but user is authenticated
  if (!requireAuth && isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  // If specific roles are required but user doesn't have them
  if (requireAuth && isAuthenticated && allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
