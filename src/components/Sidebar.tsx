import { useState, useEffect } from 'react';
import { Plus, Settings, MessageSquare, ChevronLeft, ChevronRight, Search, Trash2, Edit, Check, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { clsx } from 'clsx';

export function Sidebar() {
  const {
    chats,
    currentChat,
    sidebarOpen,
    setCurrentChat,
    setSidebarOpen,
    setChats,
    clearChatSession,
    setShowSettingsPage,
  } = useStore();
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

  const handleSettingsClick = () => {
    setShowSettingsPage(true);
  };

  return (
    <div className={clsx(
      "flex h-full flex-col border-r bg-gray-50 dark:border-gray-700 dark:bg-gray-800",
      sidebarOpen ? "w-64" : "w-16"
    )}>
      <div className="flex items-center justify-between border-b p-4 dark:border-gray-700">
        <h1 className={clsx(
          "font-semibold text-gray-800 dark:text-white",
          sidebarOpen ? "text-xl" : "sr-only"
        )}>
          Chats
        </h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-full p-1 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {sidebarOpen && (
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="px-2 py-2">
            <button
              onClick={createNewChat}
              className={clsx(
                "flex w-full items-center gap-3 rounded-md p-2 text-left text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700",
                !sidebarOpen && "justify-center"
              )}
            >
              <Plus className="h-5 w-5" />
              {sidebarOpen && <span>New Chat</span>}
            </button>
          </div>

          <div className="px-2">
            <div className={clsx(
              "mb-2 px-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400",
              !sidebarOpen && "sr-only"
            )}>
              Recent Chats
            </div>
            <ul className="space-y-1">
              {filteredChats.map((chat) => (
                <li key={chat.id}>
                  {editingChatId === chat.id ? (
                    <div className="flex items-center gap-2 rounded-md p-2">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        autoFocus
                      />
                      <button
                        onClick={(e) => saveEditedChat(chat.id, e)}
                        className="rounded p-1 text-green-600 hover:bg-gray-200 dark:text-green-400 dark:hover:bg-gray-700"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => cancelEditing(e)}
                        className="rounded p-1 text-red-600 hover:bg-gray-200 dark:text-red-400 dark:hover:bg-gray-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className={clsx(
                        "group flex items-center gap-3 rounded-md p-2",
                        currentChat === chat.id
                          ? "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
                        !sidebarOpen && "justify-center"
                      )}
                    >
                      <button
                        onClick={() => setCurrentChat(chat.id)}
                        className="flex flex-1 items-center gap-3 overflow-hidden"
                      >
                        <MessageSquare className="h-5 w-5 flex-shrink-0" />
                        {sidebarOpen && (
                          <span className="truncate">{chat.title}</span>
                        )}
                      </button>

                      {sidebarOpen && (
                        <div className="flex opacity-0 group-hover:opacity-100">
                          <button
                            onClick={(e) => startEditingChat(chat.id, chat.title, e)}
                            className="rounded p-1 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-600"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => deleteChat(chat.id, e)}
                            className="rounded p-1 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t p-4 dark:border-gray-700">
          <button
            onClick={handleSettingsClick}
            className={clsx(
              "flex w-full items-center gap-3 rounded-md p-2 text-left text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700",
              !sidebarOpen && "justify-center"
            )}
          >
            <Settings className="h-5 w-5" />
            {sidebarOpen && <span>Settings</span>}
          </button>
        </div>
      </div>
    </div>
  );
}