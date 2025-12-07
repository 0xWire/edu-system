'use client';

import React, { useState, useEffect } from 'react';
import { TestService } from '@/services/test';
import { AssignmentService } from '@/services/assignment';
import { withOrigin } from '@/lib/url';
import type { GetTestResponse } from '@/types/test';
import { useAuth } from '@/contexts/AuthContext';

interface TestListProps {
  onEdit?: (test: GetTestResponse) => void;
  onView?: (test: GetTestResponse) => void;
  showActions?: boolean;
  myTestsOnly?: boolean;
}

export default function TestList({ onEdit, onView, showActions = true, myTestsOnly = false }: TestListProps) {
  const { user } = useAuth();
  const [tests, setTests] = useState<GetTestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatedLinks, setGeneratedLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTests();
  }, [myTestsOnly]);

  const loadTests = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await TestService.getMyTests();
      setTests(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this test?')) {
      return;
    }

    setDeletingId(testId);
    try {
      const success = await TestService.deleteTest(testId);
      if (success) {
        setTests(prev => prev.filter(test => test.test_id !== testId));
      } else {
        setError('Failed to delete test');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred');
    } finally {
      setDeletingId(null);
    }
  };

  const handleGenerateLink = async (test: GetTestResponse) => {
    setGeneratingId(test.test_id);
    try {
      const assignment = await AssignmentService.createAssignment({ test_id: test.test_id, title: test.title });
      const absoluteLink = withOrigin(assignment.share_url);
      setGeneratedLinks((prev) => ({ ...prev, [test.test_id]: absoluteLink }));
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(absoluteLink);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to generate link');
    } finally {
      setGeneratingId(null);
    }
  };

  const isOwner = (test: GetTestResponse) => {
    if (!user) return false;
    const currentUserName = `${user.first_name} ${user.last_name}`;
    return test.author === currentUserName;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <div className="mt-4">
              <button
                onClick={loadTests}
                className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded-md hover:bg-red-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {myTestsOnly ? 'No tests created yet' : 'No tests available'}
        </h3>
        <p className="text-gray-600">
          {myTestsOnly 
            ? 'Create your first test to get started.' 
            : 'Check back later for new tests.'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tests.map((test) => (
        <div
          key={test.test_id}
          className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {test.title}
              </h3>
              <p className="text-gray-600 mb-3">{test.description}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>By: {test.author}</span>
                <span>{test.questions.length} question{test.questions.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {showActions && (
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => onView?.(test)}
                  className="px-3 py-1 text-sm text-indigo-600 border border-indigo-300 rounded-md hover:bg-indigo-50"
                >
                  View
                </button>
                
                {isOwner(test) && (
                  <>
                    <button
                      onClick={() => handleGenerateLink(test)}
                      disabled={generatingId === test.test_id}
                      className="px-3 py-1 text-sm text-emerald-600 border border-emerald-300 rounded-md hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {generatingId === test.test_id ? 'Generating...' : 'Generate Link'}
                    </button>
                    <button
                      onClick={() => onEdit?.(test)}
                      className="px-3 py-1 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(test.test_id)}
                      disabled={deletingId === test.test_id}
                      className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === test.test_id ? 'Deleting...' : 'Delete'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {generatedLinks[test.test_id] && (
            <div className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
              Share link copied! {generatedLinks[test.test_id]}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
