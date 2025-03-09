import React, { useEffect, useState, useRef } from 'react';
import { Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from './lib/supabase-client';
import { ImprovedChatMessage } from './components/ImprovedChatMessage';
import { Sidebar } from './components/Sidebar';
import { useStore, Chat } from './lib/store';
import { CustomAuth } from './components/CustomAuth';
import { ModelSelector } from './components/ModelSelector';
import { User, Session } from '@supabase/supabase-js';
import { FileUploader, FileInfo } from './components/FileUploader';
import { createChatAttachmentsBucket } from './lib/createBucket';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { SettingsPage } from './components/SettingsPage';

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
  const { 
    sidebarOpen, 
    setSidebarOpen, 
    currentChat, 
    setCurrentChat, 
    chats, 
    setChats,
    showSettingsPage,
    setShowSettingsPage,
    settings,
    getChatSession,
    gemini
  } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
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
      console.log('Applying theme:', settings.theme, '(loaded from localStorage)');
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
          if (data.length > 0 && settings.aiModel) {
            try {
              // Clear any existing history by recreating the session
              useStore.getState().clearChatSession(currentChat);
              const freshChatSession = getChatSession(currentChat);
              
              // Add previous messages to the chat history
              // We'll do this silently in the background
              const initializeHistory = async () => {
                console.log('Initializing chat history with previous messages...');
                
                try {
                  // Get the most recent 20 messages
                  const recentMessages = data.slice(-20);
                  console.log(`Using ${recentMessages.length} most recent messages for history initialization (out of ${data.length} total)`);
                  
                  // Create a concise, token-efficient summary of the conversation
                  let conversationSummary = "Conversation history summary:\n\n";
                  
                  // Process messages in chronological order
                  for (let i = 0; i < recentMessages.length; i++) {
                    const msg = recentMessages[i];
                    
                    // Format with clear speaker identification using proper references
                    if (msg.is_ai) {
                      // AI messages are referred to as "AI" or "Assistant"
                      let aiMessage = `AI said: "${msg.content.substring(0, 150)}`;
                      
                      // Only add ellipsis if the message was truncated
                      if (msg.content.length > 150) {
                        aiMessage += '..."';
                      } else {
                        aiMessage += '"';
                      }
                      
                      conversationSummary += aiMessage + "\n\n";
                    } else {
                      // User messages are referred to as "User"
                      let userMessage = `User said: "${msg.content.substring(0, 150)}`;
                      
                      // Only add ellipsis if the message was truncated
                      if (msg.content.length > 150) {
                        userMessage += '..."';
                      } else {
                        userMessage += '"';
                      }
                      
                      // Add attachment information if present
                      if (msg.attachments && msg.attachments.length > 0) {
                        userMessage += ` [User shared ${msg.attachments.length} file(s)]`;
                      }
                      
                      conversationSummary += userMessage + "\n\n";
                    }
                  }
                  
                  // For the very last message, include the full content if it's important
                  if (recentMessages.length > 0) {
                    const lastMsg = recentMessages[recentMessages.length - 1];
                    
                    // Only add the full last message if it's not already complete in the summary
                    if (lastMsg.content.length > 150) {
                      if (lastMsg.is_ai) {
                        conversationSummary += `AI's last complete message was: "${lastMsg.content}"\n\n`;
                      } else {
                        conversationSummary += `User's last complete message was: "${lastMsg.content}"\n\n`;
                      }
                    }
                  }
                  
                  // Add the conversation summary as a single message to save tokens
                  await freshChatSession.chat.sendMessage(conversationSummary);
                  
                  console.log('Chat history initialized with token-efficient summary');
                  console.log('Summary length:', conversationSummary.length, 'characters');
                  
                } catch (err) {
                  console.error('Error initializing chat history:', err);
                }
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
  }, [currentChat, settings.aiModel, getChatSession]);

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
    
    if ((newMessage.trim() === '' && selectedFiles.length === 0) || isLoading) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Determine if this message needs context from previous messages
      const needsContext = 
        // Check if the message references previous conversation
        newMessage.toLowerCase().includes("previous") ||
        newMessage.toLowerCase().includes("before") ||
        newMessage.toLowerCase().includes("earlier") ||
        newMessage.toLowerCase().includes("last time") ||
        newMessage.toLowerCase().includes("you said") ||
        newMessage.toLowerCase().includes("i said") ||
        newMessage.toLowerCase().includes("you mentioned") ||
        newMessage.toLowerCase().includes("as i mentioned") ||
        newMessage.toLowerCase().includes("remember") ||
        // Check for follow-up questions
        newMessage.trim().startsWith("why") ||
        newMessage.trim().startsWith("how") ||
        newMessage.trim().startsWith("what") ||
        newMessage.trim().startsWith("when") ||
        newMessage.trim().startsWith("where") ||
        newMessage.trim().startsWith("who") ||
        newMessage.trim().startsWith("which") ||
        // Check for short messages that likely need context
        (newMessage.trim().split(" ").length < 5 && messages.length > 0);
      
      // If this is a new conversation or doesn't need context, we can skip loading the history
      if (messages.length === 0 || !needsContext) {
        console.log('Skipping context loading - new conversation or context not needed');
        // Clear any existing chat session to start fresh
        if (currentChat) {
          useStore.getState().clearChatSession(currentChat);
          getChatSession(currentChat);
        }
      } else {
        console.log('Using conversation context for this message');
      }
      
      // Check if user and currentChat are available
      if (!user || !currentChat) {
        setIsLoading(false);
        setError('User or chat session not found');
        return;
      }
      
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
        username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
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

      if (settings.aiModel) {
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
            
            // Add user message to chat history first with complete content
            let userMessageWithImageDesc = newMessage;
            if (imageParts.length > 0) {
              userMessageWithImageDesc += ` [Included ${imageParts.length} image${imageParts.length > 1 ? 's' : ''}]`;
            }
            
            // Add the full user message without truncation
            await chatSession.chat.sendMessage(`User: ${userMessageWithImageDesc}`);
            console.log('Added complete user message to chat history');
            
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
            
            // Add AI response to chat history for future context
            try {
              // Add the full AI response without truncation
              await chatSession.chat.sendMessage(`AI: ${fullResponse}`);
              console.log('Added complete AI response to chat history');
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
            
            // Add the full user message without truncation
            await chatSession.chat.sendMessage(`User: ${newMessage}`);
            console.log('Added complete user message to chat history');
            
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
            
            // Add AI response to chat history for future context
            try {
              // Add the full AI response without truncation
              await chatSession.chat.sendMessage(`AI: ${fullResponse}`);
              console.log('Added complete AI response to chat history');
            } catch (historyError) {
              console.error('Error adding AI response to chat history:', historyError);
            }

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

  // Add a function to handle going back from settings
  const handleBackFromSettings = () => {
    setShowSettingsPage(false);
  };

  // Add handleKeyDown function to handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim() !== '' || selectedFiles.length > 0) {
        sendMessage(e as unknown as React.FormEvent);
      }
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-950 dark:to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <motion.div 
            className="absolute inset-0 bg-grid-white/[0.2] [mask-image:linear-gradient(to_bottom,white,transparent)] dark:bg-grid-white/[0.1]" 
            style={{ backgroundSize: '32px 32px' }}
            animate={{ 
              backgroundPosition: ['0px 0px', '32px 32px'],
            }}
            transition={{ 
              duration: 20, 
              ease: 'linear', 
              repeat: Infinity 
            }}
          ></motion.div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-purple-500/10"></div>
        <div className="w-full max-w-md relative z-10">
          <CustomAuth supabaseClient={supabase} theme={settings.theme === 'dark' ? 'dark' : 'light'} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
      {!user ? (
        <CustomAuth supabaseClient={supabase} theme={settings.theme === 'dark' ? 'dark' : 'light'} />
      ) : (
        <div className="flex h-full flex-1 overflow-hidden">
          <Sidebar />
          
          <AnimatePresence mode="wait">
            {showSettingsPage ? (
              <motion.div 
                key="settings"
                className="flex-1 overflow-hidden"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <SettingsPage onBack={handleBackFromSettings} />
              </motion.div>
            ) : (
              <motion.div 
                key="chat"
                className="flex flex-1 flex-col overflow-hidden"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between border-b p-4 dark:border-gray-700">
                  <div className="flex items-center">
                    <button
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                      className="mr-4 rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 md:hidden"
                    >
                      {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
                    </button>
                    <h1 className="text-xl font-semibold">
                      {currentChat
                        ? chats.find((c) => c.id === currentChat)?.title || 'Chat'
                        : 'New Chat'}
                    </h1>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4" ref={messagesEndRef}>
                  {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <div className="max-w-md space-y-4">
                        <h2 className="text-2xl font-bold">Welcome to c1.chat</h2>
                        <p className="text-gray-500 dark:text-gray-400">
                          Start a conversation with the AI assistant. Your messages will appear here.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
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
                      {isLoading && (
                        <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                          <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-600 [animation-delay:-0.3s]"></div>
                          <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-600 [animation-delay:-0.15s]"></div>
                          <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-600"></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t p-4 dark:border-gray-700">
                  <div className="mx-auto max-w-4xl">
                    <form onSubmit={sendMessage} className="space-y-4">
                      <div className="flex gap-2 items-stretch">
                        <ModelSelector compact={true} />
                        <div className="relative flex-1">
                          <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            rows={1}
                            className="min-h-[60px] w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 pr-12 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <FileUploader 
                              onFileSelect={setSelectedFiles} 
                              selectedFiles={selectedFiles} 
                              onClearFiles={() => setSelectedFiles([])} 
                              isLoading={isLoading} 
                              iconOnly={true} 
                            />
                            <button
                              type="submit"
                              disabled={isLoading || newMessage.trim() === ''}
                              className="rounded-full p-1 text-blue-600 transition-colors hover:bg-blue-100 disabled:text-gray-400 disabled:hover:bg-transparent dark:text-blue-500 dark:hover:bg-gray-700 dark:disabled:text-gray-600"
                            >
                              <Send className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {selectedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedFiles.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800"
                            >
                              <span className="truncate max-w-[150px]">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== index))}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}