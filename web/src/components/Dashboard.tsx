'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TestService } from '@/services/test';
import { GetTestResponse } from '@/types/test';

export default function Dashboard() {
  const [tests, setTests] = useState<GetTestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { user, logout } = useAuth();

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const data = await TestService.getAllTests();
      setTests(data);
      setError('');
    } catch (error: any) {
      console.error('Failed to fetch tests:', error);
      setError('Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Education System
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user?.first_name} {user?.last_name}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {user?.role}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600">Manage your tests and view available tests</p>
        </div>

        {/* Test connection status */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">API Connection Status</h3>
          {error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p className="font-medium">Connection Error</p>
              <p>{error}</p>
              <button
                onClick={fetchTests}
                className="mt-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <p className="font-medium">✓ Connected to API</p>
              <p>Successfully loaded {tests.length} tests</p>
            </div>
          )}
        </div>

        {/* Tests Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Available Tests</h3>
            <button
              onClick={fetchTests}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {tests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No tests available</p>
              <button
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm"
                onClick={() => alert('Create test functionality will be added soon')}
              >
                Create First Test
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tests.map((test) => (
                <div key={test.test_id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-medium text-gray-900">{test.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{test.description}</p>
                  <div className="mt-2 text-xs text-gray-500">
                    <p>Author: {test.author}</p>
                    <p>Questions: {test.questions?.length || 0}</p>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">
                      View
                    </button>
                    <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
                      Take Test
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Debug Info */}
        <div className="mt-6 bg-gray-100 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Debug Information</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>API URL: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}</p>
            <p>User ID: {user?.id}</p>
            <p>User Role: {user?.role}</p>
            <p>Token Present: {localStorage.getItem('auth-token') ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
