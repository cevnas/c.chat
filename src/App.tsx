import React, { useEffect, useState, useRef } from 'react';
import { Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from './lib/supabase-client';
import { ImprovedChatMessage } from './components/ImprovedChatMessage';
import { Sidebar } from './components/Sidebar';
import { useStore, Chat } from './lib/store';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { ModelSelector } from './components/ModelSelector';
import { User, Session } from '@supabase/supabase-js';
import { FileUploader, FileInfo } from './components/FileUploader';
import { createChatAttachmentsBucket } from './lib/createBucket';
import { createClient } from '@supabase/supabase-js';

interface FileAttachment {
  id: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
  path: string;
}

interface Message {
  id: string | number;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
  chat_id: string | number;
  is_ai: boolean;
  isStreaming?: boolean;
  attachments?: FileAttachment[];
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const { currentChat, gemini, settings, getChatSession, chats, sidebarOpen } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const getInitialUser = async () => {
      try {
        // Get the initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user || null);
        
        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, newSession) => {
            setSession(newSession);
            setUser(newSession?.user || null);
          }
        );
        
        // If we have a session, check if it needs to be refreshed
        if (initialSession) {
          const expiresAt = initialSession.expires_at || 0;
          const expiresAtDate = new Date(expiresAt * 1000);
          const now = new Date();
          
          // If session expires in less than 10 minutes, refresh it
          const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
          if (expiresAtDate < tenMinutesFromNow) {
            console.log('Session expiring soon, refreshing...');
            try {
              const { data, error } = await supabase.auth.refreshSession();
              if (error) {
                console.error('Error refreshing session:', error);
              } else {
                console.log('Session refreshed successfully');
                setSession(data.session);
                setUser(data.session?.user || null);
              }
            } catch (refreshError) {
              console.error('Exception during session refresh:', refreshError);
            }
          }
        }
        
        // Set up a periodic session refresh every 5 minutes
        const refreshInterval = setInterval(async () => {
          const currentSession = await supabase.auth.getSession();
          if (currentSession.data.session) {
            const expiresAt = currentSession.data.session.expires_at || 0;
            const expiresAtDate = new Date(expiresAt * 1000);
            const now = new Date();
            
            // If session expires in less than 10 minutes, refresh it
            const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
            if (expiresAtDate < tenMinutesFromNow) {
              console.log('Session expiring soon, refreshing...');
              try {
                const { data, error } = await supabase.auth.refreshSession();
                if (error) {
                  console.error('Error refreshing session:', error);
                } else {
                  console.log('Session refreshed successfully');
                }
              } catch (refreshError) {
                console.error('Exception during session refresh:', refreshError);
              }
            }
          }
        }, 5 * 60 * 1000); // Check every 5 minutes
        
        // Create bucket for file uploads if it doesn't exist
        if (initialSession?.user) {
          try {
            await createChatAttachmentsBucket();
            // Remove the storageWarning setting
          } catch (bucketError) {
            console.error('Error creating bucket:', bucketError);
          }
        }
        
        setLoading(false);
        
        return () => {
          subscription.unsubscribe();
          clearInterval(refreshInterval);
        };
      } catch (error) {
        console.error('Error in auth setup:', error);
        setLoading(false);
      }
    };
    
    getInitialUser();
  }, []);

  // Apply theme when app loads
  useEffect(() => {
    const applyTheme = () => {
      if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (settings.theme === 'light') {
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

    applyTheme();

    // Listen for system theme changes if using system theme
    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.theme]);

  useEffect(() => {
    if (!currentChat) return;

    const fetchMessages = async () => {
      try {
        console.log('Fetching messages for chat:', currentChat);
        setIsLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', currentChat)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching messages:', error);
          setError('Failed to load messages');
          return;
        }
        
        if (data) {
          console.log('Messages fetched successfully:', data.length);
          setMessages(data);
          
          // Initialize chat session with previous messages
          if (data.length > 0 && gemini) {
            try {
              // Clear any existing history by recreating the session
              useStore.getState().clearChatSession(currentChat);
              const freshChatSession = getChatSession(currentChat);
              
              // Add previous messages to the chat history
              // We'll do this silently in the background
              const initializeHistory = async () => {
                console.log('Initializing chat history with previous messages...');
                
                // Only use the most recent messages to save tokens (last 10 message pairs)
                const recentMessages = data.slice(-20);
                console.log(`Using ${recentMessages.length} most recent messages out of ${data.length} total`);
                
                // Process messages in sequence
                for (let i = 0; i < recentMessages.length; i++) {
                  const msg = recentMessages[i];
                  
                  try {
                    if (msg.is_ai) {
                      // For AI messages, we need to add them as if they were part of the conversation
                      // This is a bit of a hack, but it ensures the history is maintained
                      await freshChatSession.chat.sendMessage("AI response: " + msg.content.substring(0, 500));
                    } else {
                      // For user messages, we can add them directly
                      // Truncate long messages to save tokens
                      await freshChatSession.chat.sendMessage(msg.content.substring(0, 500));
                    }
                  } catch (err) {
                    console.error('Error adding message to chat history:', err);
                    // Continue with the next message even if this one fails
                  }
                }
                
                console.log('Chat history initialized successfully with', recentMessages.length, 'recent messages');
              };
              
              // Run initialization in the background
              initializeHistory();
            } catch (err) {
              console.error('Error initializing chat session:', err);
              // Don't show this error to the user as it's a background operation
            }
          }
        } else {
          setMessages([]);
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages');
      } finally {
        setIsLoading(false);
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
  }, [currentChat, gemini, getChatSession]);

  // Function to upload files to Supabase Storage
  const uploadFiles = async (files: FileInfo[], chatId: string | number): Promise<FileAttachment[]> => {
    if (!files.length || !user) return [];
    
    const uploadedFiles: FileAttachment[] = [];
    setIsUploading(true);
    
    try {
      // Ensure the bucket exists
      const bucketResult = await createChatAttachmentsBucket();
      console.log(`Starting upload of ${files.length} files to chat ${chatId}`);
      
      // Flag to determine if we should use Supabase storage or local storage
      const useSupabaseStorage = bucketResult.success;
      
      if (useSupabaseStorage) {
        console.log('Using Supabase storage for file uploads');
      } else {
        console.log('Using local storage for file uploads');
      }
      
      for (let i = 0; i < files.length; i++) {
        try {
          const file = files[i];
          const fileExt = file.name.split('.').pop() || 'file';
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `${user.id}/chats/${chatId}/${fileName}`;
          
          // Update progress
          const updatedFiles = [...selectedFiles];
          updatedFiles[i] = { ...updatedFiles[i], uploadProgress: 10 };
          setSelectedFiles(updatedFiles);
          
          console.log(`Uploading file ${i+1}/${files.length}: ${file.name} (${file.type}), size: ${file.size} bytes`);
          
          // For images, we'll try Supabase storage first if available
          if (useSupabaseStorage) {
            try {
              // Upload file to Supabase Storage
              const { data, error } = await supabase.storage
                .from('chat-attachments')
                .upload(filePath, file.file, {
                  cacheControl: '3600',
                  upsert: true, // Changed to true to overwrite if exists
                  contentType: file.type, // Explicitly set content type
                });
                
              if (error) {
                console.error(`Error uploading file ${file.name}:`, error);
                throw error; // Throw to fall back to local storage
              }
              
              // Update progress
              updatedFiles[i] = { ...updatedFiles[i], uploadProgress: 50 };
              setSelectedFiles(updatedFiles);
              
              // Get public URL for the file
              const { data: { publicUrl } } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(filePath);
                
              // Ensure the URL is absolute
              const absoluteUrl = publicUrl.startsWith('http') 
                ? publicUrl 
                : `${window.location.origin}${publicUrl}`;
                
              console.log(`File ${i+1} uploaded successfully to Supabase. Public URL:`, absoluteUrl);
              
              // Test if the URL is accessible
              try {
                const testFetch = await fetch(absoluteUrl, { method: 'HEAD' });
                console.log(`URL accessibility test for ${file.name}: ${testFetch.status} ${testFetch.statusText}`);
                if (!testFetch.ok) {
                  console.warn(`URL might not be accessible: ${testFetch.status} ${testFetch.statusText}`);
                  throw new Error('URL not accessible');
                }
              } catch (fetchError) {
                console.warn(`Could not verify URL accessibility: ${fetchError}`);
                throw fetchError; // Throw to fall back to local storage
              }
              
              // Update progress
              updatedFiles[i] = { ...updatedFiles[i], uploadProgress: 100 };
              setSelectedFiles(updatedFiles);
              
              uploadedFiles.push({
                id: data.path,
                name: file.name,
                url: absoluteUrl,
                size: file.size,
                type: file.type,
                path: data.path,
              });
              
              continue; // Skip to next file if Supabase upload succeeded
            } catch (supabaseError) {
              console.error('Falling back to local storage due to Supabase error:', supabaseError);
              // Fall through to local storage
            }
          }
          
          // If we get here, either Supabase storage failed or is not available
          // Use local storage instead
          console.log('Using local file handling for this file');
          
          // Create a local object URL for the file
          const localUrl = URL.createObjectURL(file.file);
          
          // Update progress
          updatedFiles[i] = { ...updatedFiles[i], uploadProgress: 100 };
          setSelectedFiles(updatedFiles);
          
          uploadedFiles.push({
            id: `local-${Date.now()}-${i}`,
            name: file.name,
            url: localUrl,
            size: file.size,
            type: file.type,
            path: `local/${fileName}`,
          });
          
          console.log(`Created local URL for file: ${localUrl}`);
        } catch (fileError) {
          console.error(`Error processing file ${i+1}:`, fileError);
          // Continue with next file
        }
      }
      
      console.log(`Successfully uploaded ${uploadedFiles.length} of ${files.length} files`);
      return uploadedFiles;
    } catch (err) {
      console.error('Error in file upload process:', err);
      return [];
    } finally {
      setIsUploading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && selectedFiles.length === 0) || !user || !currentChat || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('Sending message to chat:', currentChat);
      
      // Upload files first if any
      let uploadedFiles: FileAttachment[] = [];
      try {
        if (selectedFiles.length > 0) {
          uploadedFiles = await uploadFiles(selectedFiles, currentChat);
          console.log('Files uploaded successfully:', uploadedFiles);
        }
      } catch (uploadError) {
        console.error('Error uploading files:', uploadError);
        // Continue with the message without attachments
      }
      
      // Create user message object
      const userMessage: Record<string, unknown> = {
        content: newMessage.trim(),
        user_id: user.id,
        username: user.email?.split('@')[0] || 'Anonymous',
        chat_id: currentChat,
        is_ai: false,
      };
      
      // Only add attachments if there are any successfully uploaded files
      if (uploadedFiles.length > 0) {
        userMessage.attachments = uploadedFiles;
      }

      // Add message to UI immediately for better UX
      const tempId = 'temp-' + Date.now();
      setMessages((prev) => [...prev, { 
        ...userMessage, 
        id: tempId, 
        created_at: new Date().toISOString(),
        content: userMessage.content as string,
        user_id: userMessage.user_id as string,
        username: userMessage.username as string,
        chat_id: userMessage.chat_id as string | number,
        is_ai: userMessage.is_ai as boolean
      } as Message]);
      
      setNewMessage(''); // Clear input field immediately
      setSelectedFiles([]); // Clear selected files
      
      // Insert message into database
      const { error: userMessageError } = await supabase
        .from('messages')
        .insert([userMessage]);

      if (userMessageError) {
        console.error('Error sending user message:', userMessageError);
        
        // Check if the error is related to the attachments field
        if (userMessageError.message?.includes('attachments')) {
          // Try again without attachments
          console.log('Retrying without attachments...');
          const { error: retryError } = await supabase
            .from('messages')
            .insert([{
              content: userMessage.content,
              user_id: userMessage.user_id,
              username: userMessage.username,
              chat_id: userMessage.chat_id,
              is_ai: userMessage.is_ai
            }]);
            
          if (retryError) {
            console.error('Error on retry:', retryError);
            throw retryError;
          }
        } else {
          throw userMessageError;
        }
      }

      console.log('User message sent successfully');

      // Check if this is the first message in the chat
      const shouldGenerateTitle = messages.length === 0;

      if (gemini) {
        console.log('Generating AI response...');
        
        // Create a temporary AI message with empty content
        const tempAiId = 'temp-ai-' + Date.now();
        const tempAiMessage: Message = {
          id: tempAiId,
          content: '',
          created_at: new Date().toISOString(),
          user_id: 'ai',
          username: 'Gemini',
          chat_id: currentChat,
          is_ai: true,
          isStreaming: true,
        };
        
        // Add the temporary message to the UI
        setMessages((prev) => [...prev, tempAiMessage]);
        
        // Scroll to bottom to show the loading indicator
        scrollToBottom();
        
        // Prepare file information for the prompt if there are attachments
        let fileInfoPrompt = '';
        let imageParts: any[] = [];

        if (uploadedFiles.length > 0) {
          fileInfoPrompt = '\n\nThe user has attached the following files:\n';
          
          // Process each file
          for (let i = 0; i < uploadedFiles.length; i++) {
            const file = uploadedFiles[i];
            fileInfoPrompt += `${i + 1}. ${file.name} (${file.type || 'unknown type'})\n`;
            
            // For images, we'll add them to the prompt as image parts
            if (file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i.test(file.name)) {
              console.log(`Adding image to prompt: ${file.name}`);
              console.log(`Image URL: ${file.url}`);
              console.log(`Image type: ${file.type}`);
              
              try {
                // Check if it's a local URL (blob:) or a remote URL
                if (file.url.startsWith('blob:')) {
                  console.log('Local blob URL detected, converting to base64');
                  
                  // Fetch the image data
                  const response = await fetch(file.url);
                  const blob = await response.blob();
                  
                  // Convert to base64
                  const base64data = await blobToBase64(blob);
                  
                  // Add as inline data
                  imageParts.push({
                    inlineData: {
                      mimeType: file.type || 'image/jpeg',
                      data: base64data
                    }
                  });
                  
                  console.log('Added image as inline base64 data');
                } else {
                  // For remote URLs, use fileData
                  imageParts.push({
                    fileData: {
                      mimeType: file.type || 'image/jpeg',
                      fileUri: file.url
                    }
                  });
                  
                  console.log('Added image as fileUri');
                }
                
                // Test if the URL is accessible
                fetch(file.url, { method: 'HEAD' })
                  .then(response => {
                    console.log(`URL accessibility test: ${response.status} ${response.statusText}`);
                    console.log(`Content-Type: ${response.headers.get('Content-Type')}`);
                  })
                  .catch(error => {
                    console.error(`URL accessibility test failed: ${error}`);
                  });
              } catch (imageError) {
                console.error(`Error adding image to prompt: ${file.name}`, imageError);
              }
            }
          }
          
          fileInfoPrompt += '\nPlease analyze and describe these files in your response.';
        }

        // Get chat history for context
        const chatSession = getChatSession(currentChat);

        // First, ensure we're using a model that supports images
        let modelToUse = settings.aiModel;
        // For image analysis, use gemini-1.5-pro-002 which has better image support
        if (imageParts.length > 0) {
          console.log('Switching to pro model for image analysis');
          modelToUse = 'gemini-1.5-pro-002';
        }

        console.log(`Using model: ${modelToUse} for ${imageParts.length > 0 ? 'image' : 'text'} content`);

        // Prepare the content parts
        const contentParts = [
          { text: newMessage + fileInfoPrompt }
        ];

        // Add image parts if any
        if (imageParts.length > 0) {
          contentParts.push(...imageParts);
        }

        console.log('Sending to Gemini with parts:', contentParts.length, 'parts');

        // Generate content with streaming
        let streamResult;
        try {
          if (imageParts.length > 0) {
            // For multimodal content with images
            console.log('Using generateContent for multimodal input');
            
            // First, add the text message to the chat history to maintain context
            await chatSession.chat.sendMessage(newMessage + fileInfoPrompt);
            console.log('Added text message to chat history');
            
            // Now use the model directly for image analysis
            const imageModel = gemini.getGenerativeModel({ model: modelToUse });
            
            const response = await imageModel.generateContent({
              contents: [
                {
                  role: 'user',
                  parts: contentParts
                }
              ],
              generationConfig: {
                temperature: 0.7,
                topP: 0.95,
                topK: 40, // Changed from 64 to 40 (must be < 41)
                maxOutputTokens: 8192,
              }
            });
            
            // Get the full response text
            const fullResponse = response.response.text();
            console.log('Received response from Gemini:', fullResponse.substring(0, 100) + '...');
            
            // Update the AI message with the full response
            setMessages((prev) => 
              prev.map(msg => 
                msg.id === tempAiId 
                  ? { ...msg, content: fullResponse, isStreaming: false } 
                  : msg
              )
            );
            
            // Scroll to bottom to show the full response
            scrollToBottom();
            
            // Save the complete message to the database
            const aiMessage = {
              content: fullResponse,
              user_id: 'ai',
              username: 'Gemini',
              chat_id: currentChat,
              is_ai: true,
            };
            
            // Also add the AI response to the chat history
            try {
              // We need to add the AI response to the history as well
              // But we'll be token-efficient by only adding a summary
              
              // For the user message, just add the text without the file info
              await chatSession.chat.sendMessage(newMessage.substring(0, 200));
              
              // For the AI response, add a truncated version
              const responseSummary = fullResponse.length > 500 
                ? fullResponse.substring(0, 500) + "... [truncated for token efficiency]" 
                : fullResponse;
              await chatSession.chat.sendMessage("AI: " + responseSummary);
              
              console.log('Added summarized conversation to chat history');
            } catch (historyError) {
              console.error('Error adding AI response to chat history:', historyError);
            }
            
            const { error: aiMessageError } = await supabase
              .from('messages')
              .insert([aiMessage]);
            
            if (aiMessageError) {
              console.error('Error saving AI message:', aiMessageError);
            }
          } else {
            // Use streaming for text-only messages
            console.log('Using streaming for text-only message');
            streamResult = await chatSession.chat.sendMessageStream(newMessage + fileInfoPrompt);
            
            let fullResponse = '';
            
            // Process each chunk as it arrives
            for await (const chunk of streamResult.stream) {
              const chunkText = chunk.text();
              fullResponse += chunkText;
              
              // Update the AI message with the accumulated text so far
              setMessages((prev) => 
                prev.map(msg => 
                  msg.id === tempAiId 
                    ? { ...msg, content: fullResponse } 
                    : msg
                )
              );
              
              // Scroll to bottom smoothly for each chunk
              scrollToBottom();
            }
            
            // When streaming is complete, update the message to remove streaming flag
            setMessages((prev) => 
              prev.map(msg => 
                msg.id === tempAiId 
                  ? { ...msg, isStreaming: false } 
                  : msg
              )
            );
            
            // Final scroll to ensure everything is in view
            scrollToBottom();
            
            // Save the complete message to the database
            const aiMessage = {
              content: fullResponse,
              user_id: 'ai',
              username: 'Gemini',
              chat_id: currentChat,
              is_ai: true,
            };
            
            const { error: aiMessageError } = await supabase
              .from('messages')
              .insert([aiMessage]);
            
            if (aiMessageError) {
              console.error('Error saving AI message:', aiMessageError);
            }
          }
          
          // If this is the first message in the chat, generate a title
          if (shouldGenerateTitle) {
            generateChatTitle(currentChat, newMessage);
          }
        } catch (err: unknown) {
          console.error('Error generating AI response:', err);
          const errorMessage = err instanceof Error ? err.message : 'Failed to generate AI response';
          setError(errorMessage);
          
          // Remove the streaming message if there was an error
          setMessages((prev) => prev.filter(msg => msg.id !== tempAiId));
        }
      }
    } catch (err: unknown) {
      console.error('Error sending message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to generate a chat title based on the first message
  const generateChatTitle = async (chatId: string | number, firstMessage: string) => {
    try {
      // Get the current chat
      const currentChatObj = chats.find(chat => chat.id === chatId);
      
      // Skip if the chat already has a custom title (not "New Chat")
      if (currentChatObj && currentChatObj.title !== 'New Chat') {
        return;
      }

      // Use the cheapest AI model specifically for generating titles
      // gemini-2.0-flash-lite-001 is the cheapest model in the Gemini lineup
      const model = gemini.getGenerativeModel({ model: 'gemini-2.0-flash-lite-001' });
      const prompt = `Generate a very short, concise title (3-5 words max) for a conversation that starts with this message: "${firstMessage}". 
      Respond with ONLY the title, no quotes, no explanation.`;
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      
      if (response) {
        const generatedTitle = response.text().trim();
        
        // Update the chat title in the database
        const { error } = await supabase
          .from('chats')
          .update({ title: generatedTitle })
          .eq('id', chatId);
        
        if (error) {
          console.error('Error updating chat title:', error);
          return;
        }
        
        // Update local state
        useStore.getState().setChats(
          chats.map(chat => 
            chat.id === chatId ? { ...chat, title: generatedTitle } : chat
          )
        );
        
        console.log('Chat title generated successfully:', generatedTitle);
      }
    } catch (error) {
      console.error('Error generating chat title:', error);
      // Don't show this error to the user as it's a background operation
    }
  };

  // Helper function to convert blob to base64
  async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = base64String.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-950 dark:to-gray-900">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl dark:bg-gray-800">
          <h1 className="mb-8 text-center text-3xl font-bold text-gray-900 dark:text-white">Welcome to c1.chat</h1>
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
                ...(settings.theme === 'dark' && {
                  container: {
                    backgroundColor: '#1f2937',
                    color: 'white',
                  },
                  button: {
                    background: '#3b82f6',
                    color: 'white',
                    borderRadius: '0.5rem',
                  },
                  anchor: {
                    color: '#60a5fa',
                  },
                  input: {
                    backgroundColor: '#374151',
                    borderColor: '#4b5563',
                    color: 'white',
                  },
                  label: {
                    color: '#e5e7eb',
                  },
                }),
              },
            }}
            providers={[]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center w-full h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : user ? (
        <div className="h-full relative">
          {/* Main content area with sidebar */}
          <div className="flex h-full">
            {/* Sidebar */}
            <div 
              className={`
                fixed top-0 left-0 h-full z-10
                ${sidebarOpen ? 'w-64' : 'w-16'} 
                bg-gray-200 dark:bg-gray-800 transition-all duration-300 ease-in-out
                ${!showSidebar && isMobile ? 'transform -translate-x-full' : ''}
              `}
            >
              <Sidebar />
            </div>
            
            {/* Main content */}
            <div 
              className="h-full w-full flex flex-col"
              style={{
                marginLeft: !isMobile ? (sidebarOpen ? '16rem' : '4rem') : 0
              }}
            >
              <header className="flex items-center justify-between border-b bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                {isMobile && (
                  <button 
                    onClick={() => setShowSidebar(!showSidebar)}
                    className="p-2 mr-2 text-gray-500 dark:text-gray-400"
                  >
                    {showSidebar ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </button>
                )}
                <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {currentChat ? chats.find((c: Chat) => c.id === currentChat)?.title || 'Chat' : 'Select a chat'}
                </h1>
              </header>
              
              <main className="flex-1 overflow-hidden bg-white dark:bg-gray-800">
                {currentChat ? (
                  <>
                    <div className="flex h-full flex-col">
                      <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-gray-800">
                        {isLoading && messages.length === 0 ? (
                          <div className="flex h-full items-center justify-center">
                            <div className="text-center">
                              <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto dark:border-gray-600 dark:border-t-blue-500"></div>
                              <p className="text-gray-500 dark:text-gray-400">Loading messages...</p>
                            </div>
                          </div>
                        ) : error ? (
                          <div className="flex h-full items-center justify-center">
                            <div className="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                              <p>{error}</p>
                              <button 
                                onClick={() => window.location.reload()}
                                className="mt-2 rounded-md bg-red-100 px-3 py-1 text-sm font-medium text-red-800 hover:bg-red-200 dark:bg-red-800/30 dark:text-red-300 dark:hover:bg-red-700/30"
                              >
                                Reload
                              </button>
                            </div>
                          </div>
                        ) : messages.length === 0 ? (
                          <div className="flex h-full items-center justify-center">
                            <p className="text-gray-500 dark:text-gray-400">No messages yet. Start a conversation!</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {messages.map((message) => (
                              <ImprovedChatMessage 
                                key={message.id} 
                                message={message.content}
                                timestamp={message.created_at}
                                isCurrentUser={message.user_id === user?.id}
                                username={message.username}
                                isAi={message.is_ai}
                                aiModel={message.is_ai ? settings.aiModel : undefined}
                                isStreaming={message.isStreaming}
                                attachments={message.attachments}
                              />
                            ))}
                            <div ref={messagesEndRef} />
                          </div>
                        )}
                      </div>
                      
                      <div className="border-t p-4 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div className="flex items-center gap-2 mb-2">
                          <ModelSelector />
                          <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-500"></div>
                          </div>
                        </div>
                        
                        <div className="mb-2">
                          <FileUploader
                            onFileSelect={setSelectedFiles}
                            onClearFiles={() => setSelectedFiles([])}
                            selectedFiles={selectedFiles}
                            isLoading={isLoading || isUploading}
                          />
                        </div>
                        
                        <form onSubmit={sendMessage} className="flex gap-2">
                          <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={selectedFiles.length > 0 ? "Add a message or send files..." : "Type your message..."}
                            className="flex-1 rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                            disabled={isLoading || isUploading}
                          />
                          <button
                            type="submit"
                            disabled={(newMessage.trim() === '' && selectedFiles.length === 0) || isLoading || isUploading}
                            className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600 dark:focus:ring-offset-gray-800"
                          >
                            <Send className="h-5 w-5" />
                          </button>
                        </form>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <h2 className="text-xl font-semibold mb-2 dark:text-white">Select a chat or create a new one</h2>
                      <p className="text-gray-500 dark:text-gray-400">Choose a chat from the sidebar to start messaging</p>
                    </div>
                  </div>
                )}
              </main>
            </div>
          </div>
          
          {/* Settings modal */}
          {showSettings && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              {/* ... existing settings modal code ... */}
            </div>
          )}
        </div>
      ) : (
        <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} />
      )}
    </div>
  );
}