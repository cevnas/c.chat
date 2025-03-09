import React, { useState, useEffect } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle } from 'lucide-react';

type AuthView = 'sign_in' | 'sign_up' | 'forgotten_password';

interface CustomAuthProps {
  supabaseClient: SupabaseClient;
  theme: 'light' | 'dark';
}

export const CustomAuth: React.FC<CustomAuthProps> = ({ supabaseClient, theme }) => {
  const [view, setView] = useState<AuthView>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Clear error when view changes
  useEffect(() => {
    setError(null);
    setSuccessMessage(null);
  }, [view]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error: any) {
      setError(error.message || 'An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!fullName.trim()) {
      setError('Full name is required');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;
      
      setSuccessMessage('Check your email for the confirmation link');
    } catch (error: any) {
      setError(error.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (error) throw error;
      
      setSuccessMessage('Check your email for the password reset link');
    } catch (error: any) {
      setError(error.message || 'An error occurred during password reset');
    } finally {
      setLoading(false);
    }
  };

  const toggleView = (newView: AuthView) => {
    setView(newView);
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className={`w-full max-w-md rounded-xl ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} p-8 shadow-2xl transition-all duration-300`}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-center mb-6">
          <motion.img 
            src="/c1-chat-icon.svg" 
            alt="c1.chat Logo" 
            className="h-16 w-16"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.2
            }}
          />
        </div>
        <h1 className="mb-6 text-center text-3xl font-bold">
          {view === 'sign_in' ? 'Welcome Back' : view === 'sign_up' ? 'Create Account' : 'Reset Password'}
        </h1>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className={`mb-4 flex items-center rounded-lg ${theme === 'dark' ? 'bg-red-900/50 border border-red-800' : 'bg-red-50 border border-red-200'} p-3 text-sm ${theme === 'dark' ? 'text-red-300' : 'text-red-600'}`}
            >
              <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className={`mb-4 flex items-center rounded-lg ${theme === 'dark' ? 'bg-green-900/50 border border-green-800' : 'bg-green-50 border border-green-200'} p-3 text-sm ${theme === 'dark' ? 'text-green-300' : 'text-green-600'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, x: view === 'sign_in' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: view === 'sign_in' ? 20 : -20 }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 30,
              duration: 0.3 
            }}
          >
            {view === 'sign_in' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium">
                    Email
                  </label>
                  <div className={`flex items-center rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-300'} px-3 transition-all duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/50`}>
                    <Mail className={`h-5 w-5 text-gray-400 transition-colors duration-200 ${email ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-500') : ''}`} />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={`ml-2 w-full bg-transparent py-2 outline-none transition-colors duration-200 ${theme === 'dark' ? 'text-white placeholder:text-gray-400' : 'text-gray-900 placeholder:text-gray-500'}`}
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium">
                    Password
                  </label>
                  <div className={`flex items-center rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-300'} px-3 transition-all duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/50`}>
                    <Lock className={`h-5 w-5 text-gray-400 transition-colors duration-200 ${password ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-500') : ''}`} />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className={`ml-2 w-full bg-transparent py-2 outline-none transition-colors duration-200 ${theme === 'dark' ? 'text-white placeholder:text-gray-400' : 'text-gray-900 placeholder:text-gray-500'}`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => toggleView('forgotten_password')}
                    className={`text-sm ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                  >
                    Forgot password?
                  </button>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  className={`relative w-full overflow-hidden rounded-lg ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-700 hover:bg-blue-800'} py-2.5 text-center font-medium text-white transition-colors duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-70`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading && (
                    <motion.span 
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </motion.span>
                  )}
                  <span className={loading ? 'opacity-0' : ''}>{loading ? 'Signing in...' : 'Sign in'}</span>
                </motion.button>

                <div className="mt-4 text-center text-sm">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => toggleView('sign_up')}
                    className={`font-medium ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                  >
                    Sign up
                  </button>
                </div>
              </form>
            )}

            {view === 'sign_up' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="fullName" className="block text-sm font-medium">
                    Full Name
                  </label>
                  <div className={`flex items-center rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-300'} px-3 transition-all duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/50`}>
                    <User className={`h-5 w-5 text-gray-400 transition-colors duration-200 ${fullName ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-500') : ''}`} />
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className={`ml-2 w-full bg-transparent py-2 outline-none transition-colors duration-200 ${theme === 'dark' ? 'text-white placeholder:text-gray-400' : 'text-gray-900 placeholder:text-gray-500'}`}
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="signup-email" className="block text-sm font-medium">
                    Email
                  </label>
                  <div className={`flex items-center rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-300'} px-3 transition-all duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/50`}>
                    <Mail className={`h-5 w-5 text-gray-400 transition-colors duration-200 ${email ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-500') : ''}`} />
                    <input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={`ml-2 w-full bg-transparent py-2 outline-none transition-colors duration-200 ${theme === 'dark' ? 'text-white placeholder:text-gray-400' : 'text-gray-900 placeholder:text-gray-500'}`}
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="signup-password" className="block text-sm font-medium">
                    Password
                  </label>
                  <div className={`flex items-center rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-300'} px-3 transition-all duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/50`}>
                    <Lock className={`h-5 w-5 text-gray-400 transition-colors duration-200 ${password ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-500') : ''}`} />
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className={`ml-2 w-full bg-transparent py-2 outline-none transition-colors duration-200 ${theme === 'dark' ? 'text-white placeholder:text-gray-400' : 'text-gray-900 placeholder:text-gray-500'}`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Password must be at least 6 characters
                  </p>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  className={`relative w-full overflow-hidden rounded-lg ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-700 hover:bg-blue-800'} py-2.5 text-center font-medium text-white transition-colors duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-70`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading && (
                    <motion.span 
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </motion.span>
                  )}
                  <span className={loading ? 'opacity-0' : ''}>{loading ? 'Creating account...' : 'Sign up'}</span>
                </motion.button>

                <div className="mt-4 text-center text-sm">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => toggleView('sign_in')}
                    className={`font-medium ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                  >
                    Sign in
                  </button>
                </div>
              </form>
            )}

            {view === 'forgotten_password' && (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="reset-email" className="block text-sm font-medium">
                    Email
                  </label>
                  <div className={`flex items-center rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-300'} px-3 transition-all duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/50`}>
                    <Mail className={`h-5 w-5 text-gray-400 transition-colors duration-200 ${email ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-500') : ''}`} />
                    <input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={`ml-2 w-full bg-transparent py-2 outline-none transition-colors duration-200 ${theme === 'dark' ? 'text-white placeholder:text-gray-400' : 'text-gray-900 placeholder:text-gray-500'}`}
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  className={`relative w-full overflow-hidden rounded-lg ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-700 hover:bg-blue-800'} py-2.5 text-center font-medium text-white transition-colors duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-70`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading && (
                    <motion.span 
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </motion.span>
                  )}
                  <span className={loading ? 'opacity-0' : ''}>{loading ? 'Sending reset link...' : 'Send reset link'}</span>
                </motion.button>

                <div className="mt-4 text-center text-sm">
                  Remember your password?{' '}
                  <button
                    type="button"
                    onClick={() => toggleView('sign_in')}
                    className={`font-medium ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                  >
                    Sign in
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}; 