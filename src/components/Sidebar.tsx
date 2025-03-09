import { useState, useEffect } from 'react';
import { Plus, Settings, MessageSquare, ChevronLeft, ChevronRight, Search, Trash2, Edit, Check, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { SettingsModal } from './SettingsModal';

export function Sidebar() {
  const {
    chats,
    currentChat,
    sidebarOpen,
    setCurrentChat,
    setSidebarOpen,
    setChats,
    clearChatSession,
  } = useStore();
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingChatId, setEditingChatId] = useState<string | number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('Error fetching user:', userError);
          return;
        }
        if (!user) {
          console.log('No user logged in.');
          return;
        }

        const { data: fetchedChats, error: chatsError } = await supabase
          .from('chats')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (chatsError) {
          console.error('Error fetching chats:', chatsError);
          return;
        }

        if (fetchedChats) {
          setChats(fetchedChats);
          console.log('Chats fetched successfully:', fetchedChats);
        }
      } catch (error) {
        console.error('Unexpected error during fetchChats:', error);
      }
    };

    fetchChats();

    const channel = supabase
      .channel('chats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
        },
        fetchChats // Re-fetch chats on any change
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      console.log('Realtime channel removed.');
    };
  }, [setChats]);

  const createNewChat = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error fetching user for new chat:', userError);
        return;
      }
      if (!user) {
        console.log('No user logged in, cannot create new chat.');
        return;
      }

      console.log('Creating new chat for user:', user.id);

      const { data: chat, error: createChatError } = await supabase
        .from('chats')
        .insert([
          {
            title: 'New Chat',
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (createChatError) {
        console.error('Error creating new chat:', createChatError);
        return;
      }

      if (chat) {
        console.log('New chat created successfully:', chat);
        // Update local state immediately for better UX
        setChats([chat, ...chats]);
        setCurrentChat(chat.id);
        setSidebarOpen(true); // Ensure sidebar is open when creating a new chat
      }
    } catch (error) {
      console.error('Unexpected error during createNewChat:', error);
    }
  };

  const deleteChat = async (chatId: string | number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the chat selection
    
    try {
      console.log('Deleting chat and associated messages for chat ID:', chatId);
      
      // Clear the chat session first
      clearChatSession(chatId);
      console.log('Cleared chat session for chat ID:', chatId);
      
      // First, delete all messages associated with this chat
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('chat_id', chatId);
      
      if (messagesError) {
        console.error('Error deleting chat messages:', messagesError);
        // Continue with chat deletion even if message deletion fails
      } else {
        console.log('Successfully deleted all messages for chat ID:', chatId);
      }
      
      // Then delete the chat itself
      const { error: chatError } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);
      
      if (chatError) {
        console.error('Error deleting chat:', chatError);
        return;
      }
      
      console.log('Successfully deleted chat ID:', chatId);
      
      // Update local state
      setChats(chats.filter(chat => chat.id !== chatId));
      
      // If the deleted chat was selected, select another chat or set to null
      if (currentChat === chatId) {
        const nextChat = chats.find(chat => chat.id !== chatId);
        setCurrentChat(nextChat ? nextChat.id : null);
      }
    } catch (error) {
      console.error('Unexpected error during deleteChat:', error);
    }
  };

  const startEditingChat = (chatId: string | number, title: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the chat selection
    setEditingChatId(chatId);
    setEditingTitle(title);
  };

  const saveEditedChat = async (chatId: string | number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the chat selection
    
    if (!editingTitle.trim()) {
      setEditingChatId(null);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('chats')
        .update({ title: editingTitle.trim() })
        .eq('id', chatId);
      
      if (error) {
        console.error('Error updating chat title:', error);
        return;
      }
      
      // Update local state
      setChats(chats.map(chat => 
        chat.id === chatId ? { ...chat, title: editingTitle.trim() } : chat
      ));
      
      setEditingChatId(null);
    } catch (error) {
      console.error('Unexpected error during saveEditedChat:', error);
    }
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the chat selection
    setEditingChatId(null);
  };

  // Filter chats based on search query
  const filteredChats = searchQuery
    ? chats.filter(chat => 
        chat.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chats;

  return (
    <>
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-20 flex flex-col bg-gray-900 dark:bg-gray-950 transition-all duration-300',
          sidebarOpen ? 'w-80' : 'w-0',
          'overflow-hidden'
        )}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-white">c.chat</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white dark:hover:bg-gray-800"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <button
            onClick={createNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>

        <div className="px-4 mb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          {filteredChats.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No chats match your search.' : 'No chats yet. Create a new chat to get started.'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setCurrentChat(chat.id)}
                  className={clsx(
                    'group relative rounded-lg transition-colors',
                    currentChat === chat.id
                      ? 'bg-gray-800 dark:bg-gray-700'
                      : 'hover:bg-gray-800 dark:hover:bg-gray-700'
                  )}
                >
                  <div className={clsx(
                    'flex items-center gap-3 px-4 py-3 text-left text-sm',
                    currentChat === chat.id
                      ? 'text-white'
                      : 'text-gray-300'
                  )}>
                    <MessageSquare className="h-4 w-4 flex-shrink-0" />
                    
                    {editingChatId === chat.id ? (
                      <div className="flex flex-1 items-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="flex-1 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-white focus:border-blue-500 focus:outline-none"
                          autoFocus
                        />
                        <button 
                          onClick={(e) => saveEditedChat(chat.id, e)}
                          className="ml-1 rounded p-1 text-green-500 hover:bg-gray-700"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={cancelEditing}
                          className="rounded p-1 text-red-500 hover:bg-gray-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 truncate">{chat.title || 'New Chat'}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(chat.created_at), 'MMM d')}
                        </span>
                      </>
                    )}
                  </div>
                  
                  {/* Action buttons that appear on hover */}
                  {editingChatId !== chat.id && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1">
                      <button
                        onClick={(e) => startEditingChat(chat.id, chat.title, e)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => deleteChat(chat.id, e)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-auto border-t border-gray-800 p-4">
          <button
            onClick={() => setShowSettings(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white dark:hover:bg-gray-700"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      </div>

      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-4 top-4 z-30 rounded-lg bg-gray-900 p-2 text-white shadow-lg transition-colors hover:bg-gray-800 dark:bg-gray-950 dark:hover:bg-gray-800"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}