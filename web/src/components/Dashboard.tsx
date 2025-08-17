'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import CreateTestForm from './CreateTestForm';
import TestList from './TestList';
import TestView from './TestView';
import { GetTestResponse } from '@/types/test';

type ActiveTab = 'all-tests' | 'my-tests' | 'create-test' | 'view-test' | 'take-test';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('all-tests');
  const [selectedTest, setSelectedTest] = useState<GetTestResponse | null>(null);
  const [error, setError] = useState('');

  const { user, logout } = useAuth();

  const handleViewTest = (test: GetTestResponse) => {
    setSelectedTest(test);
    setActiveTab('view-test');
  };

  const handleTakeTest = (test: GetTestResponse) => {
    setSelectedTest(test);
    setActiveTab('take-test');
  };

  const handleEditTest = (test: GetTestResponse) => {
    setSelectedTest(test);
    // For now, redirect to create form (can be enhanced with edit mode)
    setActiveTab('create-test');
  };

  const handleTestCreated = () => {
    setActiveTab('my-tests');
  };

  const handleBackToTests = () => {
    setSelectedTest(null);
    setActiveTab('all-tests');
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
          >
            Retry
          </button>
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
                onClick={logout}
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
        {/* Tab Navigation */}
        {(activeTab === 'view-test' || activeTab === 'take-test') ? (
          // Show test view without tabs
          <div>
            {activeTab === 'view-test' && selectedTest && (
              <TestView
                testId={selectedTest.test_id}
                mode="view"
                onBack={handleBackToTests}
              />
            )}
            {activeTab === 'take-test' && selectedTest && (
              <TestView
                testId={selectedTest.test_id}
                mode="take"
                onBack={handleBackToTests}
              />
            )}
          </div>
        ) : (
          <>
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('all-tests')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'all-tests'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  All Tests
                </button>
                <button
                  onClick={() => setActiveTab('my-tests')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'my-tests'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  My Tests
                </button>
                <button
                  onClick={() => setActiveTab('create-test')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'create-test'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Create Test
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === 'all-tests' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">All Tests</h2>
                    <p className="text-gray-600">Browse and take tests from all users</p>
                  </div>
                  <TestList
                    onView={handleViewTest}
                    onEdit={handleEditTest}
                    showActions={true}
                    myTestsOnly={false}
                  />
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setActiveTab('take-test')}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium"
                    >
                      Take a Random Test
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'my-tests' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">My Tests</h2>
                    <button
                      onClick={() => setActiveTab('create-test')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium"
                    >
                      Create New Test
                    </button>
                  </div>
                  <TestList
                    onView={handleViewTest}
                    onEdit={handleEditTest}
                    showActions={true}
                    myTestsOnly={true}
                  />
                </div>
              )}

              {activeTab === 'create-test' && (
                <div>
                  <CreateTestForm
                    onSuccess={handleTestCreated}
                    onCancel={() => setActiveTab('my-tests')}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
