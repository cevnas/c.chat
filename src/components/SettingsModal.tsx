import { useState } from 'react';
import { X, Moon, Sun, Monitor, LogOut, Key, Trash2, Cpu } from 'lucide-react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { settings, updateSettings, currentChat, clearChatSession } = useStore();
  const [activeTab, setActiveTab] = useState<'appearance' | 'account' | 'ai'>('appearance');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    updateSettings({ theme });
    
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System theme
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.reload();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign out';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) throw new Error('User email not found');
      
      const { error } = await supabase.auth.resetPasswordForEmail(user.email);
      if (error) throw error;
      
      setSuccess('Password reset email sent. Please check your inbox.');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send password reset email';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChatHistory = () => {
    if (currentChat) {
      clearChatSession(currentChat);
      setSuccess('Chat history cleared successfully. The AI will no longer remember previous messages in this conversation.');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-gray-800 dark:text-white">
        <div className="flex items-center justify-between border-b p-4 dark:border-gray-700">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex border-b dark:border-gray-700">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex-1 border-b-2 py-3 text-sm font-medium ${
              activeTab === 'appearance'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Appearance
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 border-b-2 py-3 text-sm font-medium ${
              activeTab === 'ai'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            AI
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`flex-1 border-b-2 py-3 text-sm font-medium ${
              activeTab === 'account'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Account
          </button>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300">
              {success}
            </div>
          )}
        
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">Theme</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`flex flex-1 flex-col items-center gap-2 rounded-lg border p-3 ${
                      settings.theme === 'light'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Sun className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                    <span className="text-sm">Light</span>
                  </button>
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`flex flex-1 flex-col items-center gap-2 rounded-lg border p-3 ${
                      settings.theme === 'dark'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Moon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                    <span className="text-sm">Dark</span>
                  </button>
                  <button
                    onClick={() => handleThemeChange('system')}
                    className={`flex flex-1 flex-col items-center gap-2 rounded-lg border p-3 ${
                      settings.theme === 'system'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Monitor className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                    <span className="text-sm">System</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">AI Memory</h3>
                <div className="space-y-3">
                  <button
                    onClick={handleClearChatHistory}
                    disabled={!currentChat || isLoading}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <Trash2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <span>Clear Current Chat Memory</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Reset AI memory</span>
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  This will clear the AI's memory of your conversation history for the current chat only.
                  The messages will still be visible, but the AI won't remember previous context.
                </p>
              </div>
            </div>
          )}
          
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">Account Management</h3>
                <div className="space-y-3">
                  <button
                    onClick={handlePasswordReset}
                    disabled={isLoading}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <Key className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <span>Reset Password</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Send email</span>
                  </button>
                  
                  <button
                    onClick={handleSignOut}
                    disabled={isLoading}
                    className="flex w-full items-center gap-3 rounded-lg border border-red-200 p-3 text-left text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}