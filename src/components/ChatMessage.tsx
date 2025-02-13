import { format } from 'date-fns';
import { clsx } from 'clsx';
import { User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: string;
  timestamp: string;
  isCurrentUser: boolean;
  username: string;
  isAi?: boolean;
}

export function ChatMessage({
  message,
  timestamp,
  isCurrentUser,
  username,
  isAi = false,
}: ChatMessageProps) {
  return (
    <div
      className={clsx(
        'flex w-full gap-4',
        isCurrentUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <div className={clsx(
        'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
        isAi ? 'bg-gradient-to-br from-blue-500 to-purple-600 p-0.5' : 'bg-blue-100 ring-2 ring-blue-500 ring-opacity-25'
      )}>
        {isAi ? (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
            <img
              src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg"
              alt="Gemini"
              className="h-6 w-6"
            />
          </div>
        ) : (
          <User className="h-5 w-5 text-blue-600" />
        )}
      </div>
      <div
        className={clsx(
          'flex max-w-[70%] flex-col gap-1',
          isCurrentUser ? 'items-end' : 'items-start'
        )}
      >
        <div className="flex items-center gap-2">
          <span className={clsx(
            'text-sm font-medium',
            isAi ? 'text-purple-700' : 'text-gray-900'
          )}>
            {isAi ? 'Gemini' : username}
          </span>
          <span className="text-xs text-gray-500">
            {format(new Date(timestamp), 'h:mm a')}
          </span>
        </div>
        <div
          className={clsx(
            'rounded-2xl px-4 py-2 text-sm shadow-sm',
            isCurrentUser
              ? 'bg-blue-600 text-white'
              : isAi
              ? 'bg-gradient-to-br from-purple-50 to-blue-50 text-gray-900 ring-1 ring-purple-100'
              : 'bg-white text-gray-900 ring-1 ring-gray-200'
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
          >
            {message}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}