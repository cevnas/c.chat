import { create } from 'zustand';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Google Generative AI instance once
const apiKey = 'AIzaSyAbToGeujyjyQoe4mJks6mkyhQQZlEU4uU';
const genAI = new GoogleGenerativeAI(apiKey);

// Define the available AI models
export type AIModel = 
  | 'gemini-2.0-flash-001'
  | 'gemini-2.0-flash-lite-001'
  | 'gemini-1.5-pro-002'
  | 'gemini-1.5-flash-002'
  | 'gemini-1.5-flash-8b-001';

// Define the message type
export interface Message {
  id: string | number;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
  chat_id: string | number;
  is_ai: boolean;
}

// Define the chat type
export interface Chat {
  id: string | number;
  title: string;
  user_id: string;
  created_at: string;
}

// Define the chat session type to maintain conversation history
export interface ChatSession {
  chatId: string | number;
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;
  chat: ReturnType<ReturnType<GoogleGenerativeAI['getGenerativeModel']>['startChat']>;
}

// Load saved settings from localStorage
const loadSavedSettings = () => {
  try {
    const savedSettings = localStorage.getItem('c1chat_settings');
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
  } catch (error) {
    console.error('Error loading settings from localStorage:', error);
  }
  return null;
};

// Get the saved theme or default to 'light'
const getSavedTheme = (): 'light' | 'dark' | 'system' => {
  const savedSettings = loadSavedSettings();
  if (savedSettings && savedSettings.theme) {
    return savedSettings.theme;
  }
  return 'light';
};

// Get the saved AI model or default to 'gemini-2.0-flash-001'
const getSavedAIModel = (): AIModel => {
  const savedSettings = loadSavedSettings();
  if (savedSettings && savedSettings.aiModel) {
    return savedSettings.aiModel;
  }
  return 'gemini-2.0-flash-001';
};

// Get saved language or default to 'english'
const getSavedLanguage = (): string => {
  const savedSettings = loadSavedSettings();
  if (savedSettings && savedSettings.language) {
    return savedSettings.language;
  }
  return 'english';
};

// Get saved notifications setting or default to true
const getSavedNotifications = (): boolean => {
  const savedSettings = loadSavedSettings();
  if (savedSettings && savedSettings.notifications !== undefined) {
    return savedSettings.notifications;
  }
  return true;
};

// Get saved sound effects setting or default to true
const getSavedSoundEffects = (): boolean => {
  const savedSettings = loadSavedSettings();
  if (savedSettings && savedSettings.soundEffects !== undefined) {
    return savedSettings.soundEffects;
  }
  return true;
};

// Get saved API key or default to empty string
const getSavedApiKey = (): string => {
  const savedSettings = loadSavedSettings();
  if (savedSettings && savedSettings.apiKey) {
    return savedSettings.apiKey;
  }
  return '';
};

// Get saved font size or default to 'medium'
const getSavedFontSize = (): 'small' | 'medium' | 'large' => {
  const savedSettings = loadSavedSettings();
  if (savedSettings && savedSettings.fontSize) {
    return savedSettings.fontSize;
  }
  return 'medium';
};

interface StoreState {
  chats: Chat[];
  currentChat: string | number | null;
  sidebarOpen: boolean;
  settings: {
    aiModel: AIModel;
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: boolean;
    soundEffects: boolean;
    apiKey: string;
    fontSize: 'small' | 'medium' | 'large';
  };
  gemini: GoogleGenerativeAI;
  chatSessions: Record<string | number, ChatSession>;
  setChats: (chats: Chat[]) => void;
  setCurrentChat: (chatId: string | number | null) => void;
  setSidebarOpen: (open: boolean) => void;
  updateSettings: (updates: Partial<StoreState['settings']>) => void;
  getChatSession: (chatId: string | number) => ChatSession;
  clearChatSession: (chatId: string | number) => void;
  showSettingsPage: boolean;
  setShowSettingsPage: (show: boolean) => void;
}

export const useStore = create<StoreState>((set, get) => {
  return {
    chats: [],
    currentChat: null,
    sidebarOpen: true,
    settings: {
      aiModel: getSavedAIModel(),
      theme: getSavedTheme(),
      language: getSavedLanguage(),
      notifications: getSavedNotifications(),
      soundEffects: getSavedSoundEffects(),
      apiKey: getSavedApiKey(),
      fontSize: getSavedFontSize(),
    },
    gemini: genAI,
    chatSessions: {},
    showSettingsPage: false,
    setChats: (chats) => set({ chats }),
    setCurrentChat: (chatId) => set({ currentChat: chatId }),
    setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
    setShowSettingsPage: (show: boolean) => set({ showSettingsPage: show }),
    updateSettings: (updates) => {
      const currentSettings = get().settings;
      const newSettings = { ...currentSettings, ...updates };
      
      // If AI model changed, clear chat sessions to use the new model
      if (updates.aiModel && updates.aiModel !== currentSettings.aiModel) {
        set({ chatSessions: {} });
      }
      
      // If API key changed and is not empty, create a new Gemini instance
      if (updates.apiKey && updates.apiKey !== currentSettings.apiKey && updates.apiKey.trim() !== '') {
        const newGenAI = new GoogleGenerativeAI(updates.apiKey);
        set({ gemini: newGenAI, chatSessions: {} });
      }
      
      // Apply font size to document
      if (updates.fontSize && updates.fontSize !== currentSettings.fontSize) {
        document.documentElement.classList.remove('text-sm', 'text-base', 'text-lg');
        if (updates.fontSize === 'small') {
          document.documentElement.classList.add('text-sm');
        } else if (updates.fontSize === 'large') {
          document.documentElement.classList.add('text-lg');
        } else {
          document.documentElement.classList.add('text-base');
        }
      }
      
      // Save settings to localStorage
      try {
        localStorage.setItem('c1chat_settings', JSON.stringify(newSettings));
      } catch (error) {
        console.error('Error saving settings to localStorage:', error);
      }
      
      set({ settings: newSettings });
    },
    getChatSession: (chatId) => {
      const { chatSessions, gemini, settings } = get();
      
      // Return existing session if available
      if (chatSessions[chatId]) {
        return chatSessions[chatId];
      }
      
      // Create a new session if not available
      const model = gemini.getGenerativeModel({ model: settings.aiModel });
      const chat = model.startChat();
      
      const newSession = { chatId, model, chat };
      set((state) => ({
        chatSessions: {
          ...state.chatSessions,
          [chatId]: newSession
        }
      }));
      
      return newSession;
    },
    clearChatSession: (chatId) => {
      set((state) => {
        const newChatSessions = { ...state.chatSessions };
        delete newChatSessions[chatId];
        return { chatSessions: newChatSessions };
      });
    }
  };
});