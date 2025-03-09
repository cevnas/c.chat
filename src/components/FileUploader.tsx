import React, { useRef } from 'react';
import { Paperclip, X } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (files: FileInfo[]) => void;
  onClearFiles: () => void;
  selectedFiles: FileInfo[];
  isLoading: boolean;
}

export interface FileInfo {
  file: File;
  id?: string;
  url?: string;
  path?: string;
  name: string;
  size: number;
  type: string;
  uploadProgress?: number;
}

export function FileUploader({ onFileSelect, onClearFiles, selectedFiles, isLoading }: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: FileInfo[] = Array.from(e.target.files).map(file => ({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadProgress: 0
      }));
      
      onFileSelect(newFiles);
      
      // Reset the input value so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleRemoveFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    onFileSelect(newFiles);
    
    if (newFiles.length === 0) {
      onClearFiles();
    }
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  return (
    <div className="w-full">
      {selectedFiles.length > 0 && (
        <div className="mb-2 space-y-2">
          {selectedFiles.map((file, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between rounded-md bg-gray-100 p-2 dark:bg-gray-700"
            >
              <div className="flex items-center overflow-hidden">
                <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                  <Paperclip className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="overflow-hidden">
                  <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">{file.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
                </div>
              </div>
              
              {file.uploadProgress !== undefined && file.uploadProgress > 0 && file.uploadProgress < 100 ? (
                <div className="h-1 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
                  <div 
                    className="h-full bg-blue-600 dark:bg-blue-500" 
                    style={{ width: `${file.uploadProgress}%` }}
                  ></div>
                </div>
              ) : (
                <button 
                  onClick={() => handleRemoveFile(index)} 
                  className="rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-300"
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-center">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          multiple
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          disabled={isLoading}
        >
          <Paperclip className="mr-1 h-4 w-4" />
          Attach
        </button>
      </div>
    </div>
  );
} 