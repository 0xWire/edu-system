'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useCallback } from 'react';
import { TestService } from '@/services/test';
import { GetTestResponse } from '@/types/test';
import MathText from './MathText';

interface TestViewProps {
  testId: string;
  onBack?: () => void;
  mode?: 'view' | 'take'; // view - just display, take - interactive test taking
}

export default function TestView({ testId, onBack, mode = 'view' }: TestViewProps) {
  const [test, setTest] = useState<GetTestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // For test taking mode
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const loadTest = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await TestService.getTest(testId);
      setTest(data);
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    void loadTest();
  }, [loadTest]);

  const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
    if (mode === 'take' && !showResults) {
      setAnswers(prev => ({
        ...prev,
        [questionIndex]: optionIndex
      }));
    }
  };

  const handleNext = () => {
    if (test && currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitTest = () => {
    if (!test) return;

    let correctCount = 0;
    test.questions.forEach((question, index) => {
      if (answers[index] === question.correct_option) {
        correctCount++;
      }
    });

    setScore(correctCount);
    setShowResults(true);
  };

  const resetTest = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setShowResults(false);
    setScore(0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
          <p className="text-red-700">{error}</p>
          <div className="mt-4 flex space-x-3">
            <button
              onClick={loadTest}
              className="bg-red-100 text-red-800 px-4 py-2 rounded-md hover:bg-red-200"
            >
              Try Again
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="bg-gray-100 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-200"
              >
                Go Back
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <h3 className="text-lg font-medium text-gray-900">Test not found</h3>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Go Back
          </button>
        )}
      </div>
    );
  }

  if (mode === 'take' && showResults) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Test Results</h2>
          <div className="mb-6">
            <div className="text-4xl font-bold text-indigo-600 mb-2">
              {score}/{test.questions.length}
            </div>
            <div className="text-lg text-gray-600">
              {Math.round((score / test.questions.length) * 100)}% Correct
            </div>
          </div>
          
          <div className="space-y-4 mb-6">
            {test.questions.map((question, index) => {
              const userAnswer = answers[index];
              const isCorrect = userAnswer === question.correct_option;
              
              return (
                <div key={index} className="text-left border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Question {index + 1}: <MathText text={question.question_text} />
                  </h4>
                  <div className="space-y-2">
                    {question.options.map((option, optIndex) => {
                      let className = "px-3 py-2 rounded-md text-sm ";
                      
                      if (optIndex === question.correct_option) {
                        className += "bg-green-100 text-green-800 border border-green-300";
                      } else if (optIndex === userAnswer && !isCorrect) {
                        className += "bg-red-100 text-red-800 border border-red-300";
                      } else {
                        className += "bg-gray-50 text-gray-700";
                      }
                      
                      return (
                        <div key={optIndex} className={className}>
                          <MathText text={option.option_text} />
                          {optIndex === question.correct_option && " ✓"}
                          {optIndex === userAnswer && optIndex !== question.correct_option && " ✗"}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={resetTest}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Retake Test
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Back to Tests
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'take') {
    const currentQuestion = test.questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === test.questions.length - 1;
    const allAnswered = test.questions.every((_, index) => answers.hasOwnProperty(index));

    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">{test.title}</h2>
              <span className="text-sm text-gray-500">
                Question {currentQuestionIndex + 1} of {test.questions.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / test.questions.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <MathText text={currentQuestion.question_text} />
            </h3>
            
            {currentQuestion.image_url && (
              <div className="mb-4">
                <img
                  src={currentQuestion.image_url}
                  alt="Question"
                  className="max-w-full h-auto rounded-md"
                />
              </div>
            )}

            <div className="space-y-3">
              {currentQuestion.options.map((option, optionIndex) => (
                <label
                  key={optionIndex}
                  className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestionIndex}`}
                    value={optionIndex}
                    checked={answers[currentQuestionIndex] === optionIndex}
                    onChange={() => handleAnswerSelect(currentQuestionIndex, optionIndex)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-gray-900">
                    <MathText text={option.option_text} />
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex space-x-3">
              {!isLastQuestion ? (
                <button
                  onClick={handleNext}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmitTest}
                  disabled={!allAnswered}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>

          {!allAnswered && isLastQuestion && (
            <p className="text-sm text-amber-600 mt-2 text-center">
              Please answer all questions before submitting
            </p>
          )}
        </div>
      </div>
    );
  }

  // View mode - display all questions
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{test.title}</h1>
              <p className="text-gray-600 mt-2">
                <MathText text={test.description} />
              </p>
            </div>
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Back
              </button>
            )}
          </div>
          <div className="text-sm text-gray-500">
            Created by: {test.author} • {test.questions.length} questions
          </div>
        </div>

        <div className="space-y-8">
          {test.questions.map((question, index) => (
            <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Question {index + 1}: <MathText text={question.question_text} />
              </h3>
              
              {question.image_url && (
                <div className="mb-4">
                  <img
                    src={question.image_url}
                    alt="Question"
                    className="max-w-md h-auto rounded-md"
                  />
                </div>
              )}

              <div className="space-y-2">
                {question.options.map((option, optionIndex) => (
                  <div
                    key={optionIndex}
                    className={`p-3 rounded-md ${
                      optionIndex === question.correct_option
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <span className="text-gray-900">
                      <MathText text={option.option_text} />
                    </span>
                    {optionIndex === question.correct_option && (
                      <span className="ml-2 text-green-600 font-medium">✓ Correct</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
