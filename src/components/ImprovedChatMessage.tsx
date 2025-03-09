import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AIModel } from '../lib/store';
import { useState, useEffect } from 'react';
import { FileAttachment } from './FileAttachment';

// Official Gemini logo SVG component
const GeminiLogo = () => (
  <svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
    <path d="M16 8.016A8.522 8.522 0 008.016 16h-.032A8.521 8.521 0 000 8.016v-.032A8.521 8.521 0 007.984 0h.032A8.522 8.522 0 0016 7.984v.032z" fill="url(#prefix__paint0_radial_980_20147)"/>
    <defs>
      <radialGradient id="prefix__paint0_radial_980_20147" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(16.1326 5.4553 -43.70045 129.2322 1.588 6.503)">
        <stop offset=".067" stop-color="#9168C0"/>
        <stop offset=".343" stop-color="#5684D1"/>
        <stop offset=".672" stop-color="#1BA1E3"/>
      </radialGradient>
    </defs>
  </svg>
);

// Typing indicator component
const TypingIndicator = () => {
  return (
    <div className="flex space-x-1 mt-1">
      <div className="w-2 h-2 rounded-full bg-purple-400 dark:bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="w-2 h-2 rounded-full bg-purple-400 dark:bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="w-2 h-2 rounded-full bg-purple-400 dark:bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>
  );
};

export interface ChatMessageProps {
  message: string;
  timestamp: string;
  isCurrentUser: boolean;
  username: string;
  isAi: boolean;
  aiModel?: AIModel;
  isStreaming?: boolean;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    size?: number;
    type?: string;
    path: string;
  }>;
}

export function ImprovedChatMessage({ 
  message, 
  timestamp, 
  isCurrentUser, 
  username, 
  isAi, 
  aiModel, 
  isStreaming,
  attachments 
}: ChatMessageProps) {
  // Use the username directly as it now contains the full name
  const displayName = username || 'Anonymous';
  
  // Blinking cursor effect for streaming messages
  const [showCursor, setShowCursor] = useState(true);
  
  useEffect(() => {
    if (!isStreaming) return;
    
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    
    return () => clearInterval(cursorInterval);
  }, [isStreaming]);
  
  return (
    <div
      className={`flex ${
        isCurrentUser ? 'justify-end' : 'justify-start'
      } mb-3`}
    >
      <div
        className={`rounded-lg px-2.5 py-1.5 ${
          isCurrentUser
            ? 'bg-blue-600 text-white'
            : isAi
            ? 'bg-purple-50 text-gray-800 border border-purple-100 dark:bg-purple-900/20 dark:text-gray-100 dark:border-purple-800/30'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
        }`}
        style={{ 
          maxWidth: '85%',
          width: 'fit-content',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div className="mb-0.5 flex flex-wrap items-center gap-1.5 text-sm">
          {isAi && <GeminiLogo />}
          <span className="font-medium">{isAi ? 'Gemini' : displayName}</span>
          {isAi && aiModel && (
            <span className="inline-block max-w-[150px] truncate rounded-full bg-purple-100 px-1.5 py-0.5 text-xs text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" title={aiModel}>
              {(() => {
                // Extract parts of the model name
                const parts = aiModel.split('-');
                
                // For models like gemini-2.0-flash-lite-001 or gemini-1.5-flash-8b-001
                if (parts.length >= 3) {
                  // Keep gemini, version number, and model type
                  let modelName = `${parts[0]}-${parts[1]}`;
                  
                  // Add model type (flash, flash-lite, pro, etc.)
                  if (parts.length >= 4) {
                    if (parts[2] === 'flash' && parts[3] === 'lite') {
                      modelName += `-flash-lite`;
                    } else if (parts[2] === 'flash' && parts[3] === '8b') {
                      modelName += `-flash-8b`;
                    } else {
                      modelName += `-${parts[2]}`;
                    }
                  } else {
                    modelName += `-${parts[2]}`;
                  }
                  
                  return modelName;
                }
                
                // Fallback to the original model name
                return aiModel;
              })()}
            </span>
          )}
          <span className="text-xs opacity-70">
            {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
          </span>
        </div>
        <div className={`markdown-content ${
          isCurrentUser 
            ? 'text-white' 
            : 'text-gray-800 dark:text-gray-100'
        }`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: (props) => {
                const { href, children } = props;
                return (
                  <a 
                    href={href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`underline ${isCurrentUser ? 'text-blue-200' : 'text-blue-600 dark:text-blue-400'}`}
                  >
                    {children}
                  </a>
                )
              },
              code: (props) => {
                const { children, className } = props;
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !className;
                
                return isInline ? (
                  <code 
                    className={`${
                      isCurrentUser 
                        ? 'bg-blue-700' 
                        : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'
                    } px-1 py-0.5 rounded text-sm`}
                  >
                    {children}
                  </code>
                ) : (
                  <pre className={`${
                    isCurrentUser 
                      ? 'bg-blue-700' 
                      : 'bg-gray-200 dark:bg-gray-800 dark:text-gray-200'
                  } p-1.5 rounded my-1.5 overflow-auto text-sm`}>
                    <code className={`${match ? `language-${match[1]}` : ''} text-sm`}>
                      {children}
                    </code>
                  </pre>
                );
              },
              p: ({ children }) => <p className="mb-2">{children}</p>,
              h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-3">{children}</h1>,
              h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>,
              h3: ({ children }) => <h3 className="text-md font-bold mb-1 mt-2">{children}</h3>,
              ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              pre: (props) => {
                // This is handled by the code component
                return <>{props.children}</>;
              },
              blockquote: ({ children }) => (
                <blockquote className={`border-l-4 ${isCurrentUser ? 'border-blue-400' : 'border-gray-400'} pl-3 italic my-2`}>
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="overflow-auto my-2">
                  <table className="border-collapse border border-gray-300">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className={`border ${isCurrentUser ? 'border-blue-400' : 'border-gray-300'} p-2 font-bold`}>
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className={`border ${isCurrentUser ? 'border-blue-400' : 'border-gray-300'} p-2`}>
                  {children}
                </td>
              ),
            }}
          >
            {message}
          </ReactMarkdown>
          
          {/* Show blinking cursor or typing indicator for streaming messages */}
          {isStreaming && (
            message.length > 0 
              ? <span className={`inline-block h-4 w-1.5 ml-0.5 bg-current ${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}></span>
              : <TypingIndicator />
          )}
          
          {/* Display file attachments */}
          {attachments && attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {attachments.map((file) => {
                // Skip invalid attachments
                if (!file || !file.id || !file.url) return null;
                
                return (
                  <FileAttachment 
                    key={file.id} 
                    file={file} 
                    isCurrentUser={isCurrentUser} 
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 