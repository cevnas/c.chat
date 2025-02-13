import React, { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { supabase } from './lib/supabase';
import { ChatMessage } from './components/ChatMessage';
import { Sidebar } from './components/Sidebar';
import { useStore } from './lib/store';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
  chat_id: string;
  is_ai: boolean;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const { currentChat, gemini, settings } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentChat) return;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', currentChat)
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (data) setMessages(data);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages');
      }
    };

    fetchMessages();

    // Set up real-time subscription
    const channel = supabase
      .channel(`messages:${currentChat}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${currentChat}`,
        },
        (payload) => {
          console.log('Received message:', payload);
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      channel.unsubscribe();
    };
  }, [currentChat]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !currentChat || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const userMessage = {
        content: newMessage.trim(),
        user_id: user.id,
        username: user.email?.split('@')[0] || 'Anonymous',
        chat_id: currentChat,
        is_ai: false,
      };

      setMessages((prev) => [...prev, { ...userMessage, id: 'temp-' + Date.now(), created_at: new Date().toISOString() }]);
      
      const { error: userMessageError } = await supabase
        .from('messages')
        .insert([userMessage]);

      if (userMessageError) throw userMessageError;

      setNewMessage('');

      if (gemini) {
        try {
          const model = gemini.getGenerativeModel({ model: 'gemini-2.0-flash-001' });
          const result = await model.generateContent(newMessage);
          const response = result.response;
          
          if (response) {
            const aiMessage = {
              content: response.text(),
              user_id: 'ai',
              username: 'Gemini',
              chat_id: currentChat,
              is_ai: true,
            };
            
            setMessages((prev) => [...prev, { ...aiMessage, id: 'temp-ai-' + Date.now(), created_at: new Date().toISOString() }]);
            
            const { error: aiMessageError } = await supabase
              .from('messages')
              .insert([aiMessage]);

            if (aiMessageError) throw aiMessageError;
          }
        } catch (aiError: any) {
          console.error('AI Error:', aiError);
          setError(aiError.message || 'Failed to generate AI response');
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      setError(error.message || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
          <h1 className="mb-8 text-center text-3xl font-bold text-gray-900">Welcome to c.chat</h1>
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              style: {
                button: {
                  background: '#1d4ed8',
                  color: 'white',
                  borderRadius: '0.5rem',
                },
                anchor: {
                  color: '#1d4ed8',
                },
              },
            }}
            providers={[]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">c.chat</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {!currentChat ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900">Welcome to c.chat</h2>
                <p className="mt-2 text-gray-600">Select a chat or create a new one to get started</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message.content}
                  timestamp={message.created_at}
                  isCurrentUser={message.user_id === user.id}
                  username={message.username}
                  isAi={message.is_ai}
                />
              ))}
              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                </div>
              )}
              {error && (
                <div className="rounded-lg bg-red-50 p-4 text-red-800">
                  <p>{error}</p>
                </div>
              )}
            </div>
          )}
        </main>

        {currentChat && (
          <form onSubmit={sendMessage} className="border-t bg-white p-4">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={isLoading}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}