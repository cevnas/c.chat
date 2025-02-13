import { useState, useEffect } from 'react';
import { Plus, Settings, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
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
  } = useStore();
  const [showSettings, setShowSettings] = useState(false);

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
  }, [setChats]); // Removed setChats from dependency array as it's a stable function

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
        setCurrentChat(chat.id);
        console.log('New chat created and set as current:', chat);
      }
    } catch (error) {
      console.error('Unexpected error during createNewChat:', error);
    }
  };

  return (
    <>
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-gray-900 transition-all duration-300', // Transition added back
          sidebarOpen ? 'w-80 shadow-lg' : 'w-0',
          'overflow-hidden'
        )}
      >
        <div className="flex h-16 items-center justify-between px-6">
          <h1 className="text-xl font-bold text-white">c.chat</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        <button
          onClick={createNewChat}
          className="mx-4 mt-6 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>

        <div className="mt-8 flex-1 overflow-y-auto px-4">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setCurrentChat(chat.id)}
              className={clsx(
                'mb-2 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition-colors',
                currentChat === chat.id
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 truncate">{chat.title}</span>
              <span className="text-xs text-gray-500">
                {format(new Date(chat.created_at), 'MMM d')}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowSettings(true)}
          className="mx-4 mb-6 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>

      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-4 top-16 z-50 rounded-lg bg-gray-900 p-2 text-white shadow-lg transition-colors hover:bg-gray-800" // top-16 here
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