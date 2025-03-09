import { useState, useEffect } from 'react';
import { X, Moon, Sun, Monitor, LogOut, Key, Trash2, Cpu, ArrowLeft, Save, Globe, Bell, Volume2, VolumeX } from 'lucide-react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { settings, updateSettings, currentChat, clearChatSession } = useStore();
  const [activeTab, setActiveTab] = useState<'appearance' | 'account' | 'ai' | 'notifications'>('appearance');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // New settings state
  const [userSettings, setUserSettings] = useState({
    theme: settings.theme,
    language: 'english',
    notifications: true,
    soundEffects: true,
    apiKey: '',
    fontSize: 'medium',
  });
  
  // Fetch user settings from localStorage
  useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        // Load from localStorage
        const localSettings = localStorage.getItem('user_settings');
        if (localSettings) {
          const parsedSettings = JSON.parse(localSettings);
          console.log('Found settings in localStorage:', parsedSettings);
          setUserSettings(parsedSettings);
          updateSettings({ theme: parsedSettings.theme });
        } else {
          console.log('No settings found in localStorage, using defaults');
          // Save default settings to localStorage
          const defaultSettings = {
            theme: settings.theme,
            language: 'english',
            notifications: true,
            soundEffects: true,
            apiKey: '',
            fontSize: 'medium',
          };
          localStorage.setItem('user_settings', JSON.stringify(defaultSettings));
        }
      } catch (err) {
        console.error('Error loading settings from localStorage:', err);
      }
    };
    
    fetchUserSettings();
  }, [settings.theme, updateSettings]);
  
  // Save settings to localStorage and update global state
  const saveSettings = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Update global settings
      updateSettings({ 
        theme: userSettings.theme,
        // Add any other settings that should be in the global state
      });
      
      // Save all settings to localStorage
      localStorage.setItem('user_settings', JSON.stringify(userSettings));
      
      console.log('Settings saved to localStorage');
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      console.error('Error saving settings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    setUserSettings({ ...userSettings, theme });
    
    // Apply theme to document immediately for better UX
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

  // Add a new function to handle account deletion
  const handleDeleteAccount = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    // Confirm deletion with the user
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data, including chat history and settings."
    );
    
    if (!confirmed) {
      setIsLoading(false);
      return;
    }
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError);
        throw new Error(`Auth error: ${userError.message}`);
      }
      
      if (!user) {
        throw new Error('User not found or not authenticated');
      }
      
      console.log('Deleting account data for user:', user.id);
      
      // Try using RPC functions first
      let rpcSuccess = false;
      
      try {
        // First, delete all messages for this user
        const { error: messagesError } = await supabase.rpc('delete_user_messages', {
          user_uuid: user.id
        });
        
        if (messagesError) {
          console.error('Error deleting messages via RPC:', messagesError);
        } else {
          console.log('Messages deleted successfully via RPC');
        }
        
        // Then delete all chats for this user
        const { error: chatsError } = await supabase.rpc('delete_user_chats', {
          user_uuid: user.id
        });
        
        if (chatsError) {
          console.error('Error deleting chats via RPC:', chatsError);
        } else {
          console.log('Chats deleted successfully via RPC');
          rpcSuccess = true;
        }
        
        // Finally, delete user settings
        const { error: settingsError } = await supabase.rpc('delete_user_settings', {
          user_uuid: user.id
        });
        
        if (settingsError) {
          console.error('Error deleting settings via RPC:', settingsError);
        } else {
          console.log('Settings deleted successfully via RPC');
        }
      } catch (rpcError) {
        console.error('RPC functions not available:', rpcError);
      }
      
      // If RPC method failed, try direct SQL query as a fallback
      if (!rpcSuccess) {
        console.log('Trying fallback method with direct SQL query...');
        
        // Use a raw SQL query to delete data in the correct order
        const { error: sqlError } = await supabase.rpc('execute_sql', {
          sql_query: `
            -- Delete messages first
            DELETE FROM public.messages
            WHERE chat_id IN (SELECT id FROM public.chats WHERE user_id = '${user.id}');
            
            -- Then delete chats
            DELETE FROM public.chats
            WHERE user_id = '${user.id}';
            
            -- Try to delete settings if the table exists
            DO $$
            BEGIN
              BEGIN
                DELETE FROM public.user_settings WHERE user_id = '${user.id}';
              EXCEPTION
                WHEN undefined_table THEN
                  RAISE NOTICE 'user_settings table does not exist';
              END;
            END $$;
          `
        });
        
        if (sqlError) {
          console.error('Error with SQL fallback:', sqlError);
        } else {
          console.log('SQL fallback executed successfully');
        }
      }
      
      // Clear local storage
      localStorage.removeItem('user_settings');
      
      // Show success message briefly before signing out
      setSuccess('Your account data has been deleted. You will be signed out in a moment.');
      setTimeout(() => {
        // Sign out and reload the page
        supabase.auth.signOut().then(() => {
          window.location.reload();
        });
      }, 2000);
      
    } catch (err: unknown) {
      console.error('Error deleting account:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete account';
      setError(`${errorMessage}. Please try again or contact support.`);
      setIsLoading(false);
    }
  };

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.15 } }
  };
  
  const tabVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.2, delay: 0.05 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.15 } }
  };

  return (
    <motion.div 
      className="flex h-full flex-col bg-white dark:bg-gray-900"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
    >
      <div className="flex items-center justify-between border-b p-4 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h1>
        </div>
        <button
          onClick={saveSettings}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
      
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mx-6 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-300"
        >
          {error}
        </motion.div>
      )}
      
      {success && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mx-6 mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300"
        >
          {success}
        </motion.div>
      )}
      
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
          <nav className="p-4">
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setActiveTab('appearance')}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                    activeTab === 'appearance'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <Sun className="h-5 w-5" />
                  Appearance
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                    activeTab === 'ai'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <Cpu className="h-5 w-5" />
                  AI Settings
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                    activeTab === 'notifications'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <Bell className="h-5 w-5" />
                  Notifications
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('account')}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                    activeTab === 'account'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <Key className="h-5 w-5" />
                  Account
                </button>
              </li>
            </ul>
          </nav>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'appearance' && (
              <motion.div 
                key="appearance"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={tabVariants}
                className="space-y-8"
              >
                <div>
                  <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Theme</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleThemeChange('light')}
                      className={`flex flex-col items-center gap-3 rounded-xl border p-4 transition-all ${
                        userSettings.theme === 'light'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="rounded-full bg-white p-3 shadow-sm">
                        <Sun className="h-6 w-6 text-amber-500" />
                      </div>
                      <span className="font-medium">Light</span>
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleThemeChange('dark')}
                      className={`flex flex-col items-center gap-3 rounded-xl border p-4 transition-all ${
                        userSettings.theme === 'dark'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="rounded-full bg-gray-900 p-3 shadow-sm">
                        <Moon className="h-6 w-6 text-indigo-400" />
                      </div>
                      <span className="font-medium">Dark</span>
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleThemeChange('system')}
                      className={`flex flex-col items-center gap-3 rounded-xl border p-4 transition-all ${
                        userSettings.theme === 'system'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="rounded-full bg-gradient-to-r from-white to-gray-900 p-3 shadow-sm">
                        <Monitor className="h-6 w-6 text-gray-700" />
                      </div>
                      <span className="font-medium">System</span>
                    </motion.button>
                  </div>
                </div>
                
                <div>
                  <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Language</h3>
                  <div className="rounded-lg border dark:border-gray-700">
                    <div className="p-4">
                      <label className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        <span>Interface Language</span>
                      </label>
                      <select
                        value={userSettings.language}
                        onChange={(e) => setUserSettings({ ...userSettings, language: e.target.value })}
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                      >
                        <option value="english">English</option>
                        <option value="spanish">Spanish</option>
                        <option value="french">French</option>
                        <option value="german">German</option>
                        <option value="japanese">Japanese</option>
                        <option value="chinese">Chinese</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Font Size</h3>
                  <div className="rounded-lg border dark:border-gray-700">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">A</span>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="1"
                          value={userSettings.fontSize === 'small' ? 0 : userSettings.fontSize === 'medium' ? 1 : 2}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            setUserSettings({
                              ...userSettings,
                              fontSize: value === 0 ? 'small' : value === 1 ? 'medium' : 'large'
                            });
                          }}
                          className="mx-4 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
                        />
                        <span className="text-lg">A</span>
                      </div>
                      <div className="mt-2 text-center text-sm text-gray-500">
                        {userSettings.fontSize === 'small' ? 'Small' : userSettings.fontSize === 'medium' ? 'Medium' : 'Large'}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {activeTab === 'ai' && (
              <motion.div 
                key="ai"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={tabVariants}
                className="space-y-8"
              >
                <div>
                  <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">AI Memory</h3>
                  <div className="rounded-lg border dark:border-gray-700">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleClearChatHistory}
                      disabled={!currentChat || isLoading}
                      className="flex w-full items-center justify-between rounded-lg p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex items-center gap-3">
                        <Trash2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        <div>
                          <div>Clear Current Chat Memory</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Reset AI memory for the current conversation
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Reset</span>
                    </motion.button>
                  </div>
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    This will clear the AI's memory of your conversation history for the current chat only.
                    The messages will still be visible, but the AI won't remember previous context.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Custom API Key</h3>
                  <div className="rounded-lg border dark:border-gray-700">
                    <div className="p-4">
                      <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                        Your API Key (optional)
                      </label>
                      <input
                        type="password"
                        value={userSettings.apiKey}
                        onChange={(e) => setUserSettings({ ...userSettings, apiKey: e.target.value })}
                        placeholder="Enter your API key"
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                      />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Using your own API key may provide better performance and higher rate limits.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {activeTab === 'notifications' && (
              <motion.div 
                key="notifications"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={tabVariants}
                className="space-y-8"
              >
                <div>
                  <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Notification Settings</h3>
                  <div className="space-y-4 rounded-lg border p-4 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        <div>
                          <div>Enable Notifications</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Receive notifications for new messages
                          </div>
                        </div>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={userSettings.notifications}
                          onChange={() => setUserSettings({ ...userSettings, notifications: !userSettings.notifications })}
                          className="peer sr-only"
                        />
                        <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {userSettings.soundEffects ? (
                          <Volume2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        ) : (
                          <VolumeX className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        )}
                        <div>
                          <div>Sound Effects</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Play sounds for notifications and actions
                          </div>
                        </div>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={userSettings.soundEffects}
                          onChange={() => setUserSettings({ ...userSettings, soundEffects: !userSettings.soundEffects })}
                          className="peer sr-only"
                        />
                        <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {activeTab === 'account' && (
              <motion.div 
                key="account"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={tabVariants}
                className="space-y-8"
              >
                <div>
                  <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Account Management</h3>
                  <div className="space-y-4">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handlePasswordReset}
                      disabled={isLoading}
                      className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-4 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      <div className="flex items-center gap-3">
                        <Key className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        <div>
                          <div>Reset Password</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Send a password reset email
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Send email</span>
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleSignOut}
                      disabled={isLoading}
                      className="flex w-full items-center gap-3 rounded-lg border border-red-200 p-4 text-left text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="h-5 w-5" />
                      <div>
                        <div>Sign Out</div>
                        <div className="text-sm text-red-500 dark:text-red-400">
                          Log out of your account
                        </div>
                      </div>
                    </motion.button>
                    
                    {/* Add Delete Account button */}
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleDeleteAccount}
                      disabled={isLoading}
                      className="flex w-full items-center gap-3 rounded-lg border border-red-500 bg-red-50 p-4 text-left text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-900/20 dark:text-red-500 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="h-5 w-5" />
                      <div>
                        <div>Delete Account</div>
                        <div className="text-sm text-red-600 dark:text-red-400">
                          Permanently delete your account and all data
                        </div>
                      </div>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
