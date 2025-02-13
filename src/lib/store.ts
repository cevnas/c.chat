import { create } from 'zustand';
import { GoogleGenerativeAI } from "@google/generative-ai";

interface StoreState {
chats: any[];
currentChat: string | null;
sidebarOpen: boolean;
settings: {
aiModel: 'gemini-2.0-flash-001'; // Updated aiModel type
};
gemini: GoogleGenerativeAI | null;
setChats: (chats: any[]) => void;
setCurrentChat: (chatId: string | null) => void;
setSidebarOpen: (open: boolean) => void;
updateSettings: (updates: Partial<StoreState['settings']>) => void;
}

export const useStore = create<StoreState>((set) => {
const apiKey = 'AIzaSyAbToGeujyjyQoe4mJks6mkyhQQZlEU4uU';
const genAI = new GoogleGenerativeAI(apiKey);

return {
chats: [],
currentChat: null,
sidebarOpen: true,
settings: {
aiModel: 'gemini-2.0-flash-001', // Updated to latest Gemini 2.0 Flash
},
gemini: genAI,
setChats: (chats) => set({ chats }),
setCurrentChat: (chatId) => set({ currentChat: chatId }),
setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
updateSettings: (updates) => set(state => ({ settings: { ...state.settings, ...updates } })),
};
});