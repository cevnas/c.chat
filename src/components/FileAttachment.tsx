import React, { useState } from 'react';
import { FileIcon, Download, AlertCircle, Image } from 'lucide-react';

export interface FileAttachmentProps {
  file: {
    name: string;
    url: string;
    size?: number;
    type?: string;
  };
  isCurrentUser: boolean;
}

export function FileAttachment({ file, isCurrentUser }: FileAttachmentProps) {
  const [imageError, setImageError] = useState(false);
  
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Handle invalid file
  if (!file || !file.url) {
    return (
      <div className={`flex items-center rounded-lg border p-2 ${
        isCurrentUser 
          ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20' 
          : 'border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
      }`}>
        <div className="flex items-center">
          <div className={`mr-2 flex h-8 w-8 items-center justify-center rounded-full ${
            isCurrentUser 
              ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' 
              : 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'
          }`}>
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">File attachment unavailable</p>
            <p className="text-xs text-red-500 dark:text-red-400">The file could not be loaded</p>
          </div>
        </div>
      </div>
    );
  }

  // Determine if it's an image based on file type or name extension
  const isImage = file.type?.startsWith('image/') || 
                 /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i.test(file.name);
  
  // If it's an image but there was an error loading it, show as a regular file
  if (isImage && imageError) {
    return renderFileAttachment();
  }
  
  return (
    <div className="mt-2">
      {isImage ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <a href={file.url} target="_blank" rel="noopener noreferrer">
            <div className="relative bg-gray-100 dark:bg-gray-800 flex justify-center">
              <img 
                src={file.url} 
                alt={file.name || 'Image'} 
                className="max-h-60 w-auto object-contain"
                onError={(e) => {
                  console.error(`Error loading image: ${file.url}`);
                  setImageError(true);
                }}
                loading="lazy"
              />
              {/* Loading indicator/placeholder */}
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 opacity-0 transition-opacity duration-300">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-500"></div>
              </div>
            </div>
          </a>
          <div className="flex items-center justify-between bg-gray-50 p-2 dark:bg-gray-800">
            <div className="flex items-center overflow-hidden">
              <div className="overflow-hidden">
                <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">{file.name || 'Unnamed file'}</p>
                {file.size && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
                )}
              </div>
            </div>
            <a 
              href={file.url} 
              download={file.name}
              className={`rounded-full p-1.5 ${
                isCurrentUser 
                  ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-800/50' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </div>
      ) : renderFileAttachment()}
    </div>
  );
  
  function renderFileAttachment() {
    return (
      <div className={`flex items-center justify-between rounded-lg border p-2 ${
        isCurrentUser 
          ? 'border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/20' 
          : isImage ? 'border-purple-200 bg-purple-50 dark:border-purple-900/30 dark:bg-purple-900/10'
          : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
      }`}>
        <div className="flex items-center overflow-hidden">
          <div className={`mr-2 flex h-8 w-8 items-center justify-center rounded-full ${
            isCurrentUser 
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' 
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            {isImage ? <Image className="h-4 w-4" /> : <FileIcon className="h-4 w-4" />}
          </div>
          <div className="overflow-hidden">
            <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">{file.name || 'Unnamed file'}</p>
            {file.size && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
            )}
          </div>
        </div>
        <a 
          href={file.url} 
          download={file.name}
          className={`rounded-full p-1.5 ${
            isCurrentUser 
              ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-800/50' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
          }`}
        >
          <Download className="h-4 w-4" />
        </a>
      </div>
    );
  }
} 