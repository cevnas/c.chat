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

interface StoreState {
  chats: Chat[];
  currentChat: string | number | null;
  sidebarOpen: boolean;
  settings: {
    aiModel: AIModel;
    theme: 'light' | 'dark' | 'system';
  };
  gemini: GoogleGenerativeAI;
  chatSessions: Record<string | number, ChatSession>;
  setChats: (chats: Chat[]) => void;
  setCurrentChat: (chatId: string | number | null) => void;
  setSidebarOpen: (open: boolean) => void;
  updateSettings: (updates: Partial<StoreState['settings']>) => void;
  getChatSession: (chatId: string | number) => ChatSession;
  clearChatSession: (chatId: string | number) => void;
}

export const useStore = create<StoreState>((set, get) => {
  return {
    chats: [],
    currentChat: null,
    sidebarOpen: true,
    settings: {
      aiModel: 'gemini-2.0-flash-001',
      theme: 'light',
    },
    gemini: genAI,
    chatSessions: {},
    setChats: (chats) => set({ chats }),
    setCurrentChat: (chatId) => set({ currentChat: chatId }),
    setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
    updateSettings: (updates) => {
      const currentSettings = get().settings;
      const newSettings = { ...currentSettings, ...updates };
      
      // If AI model changed, clear chat sessions to use the new model
      if (updates.aiModel && updates.aiModel !== currentSettings.aiModel) {
        set({ chatSessions: {} });
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