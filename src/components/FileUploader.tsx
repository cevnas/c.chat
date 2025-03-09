import React, { useRef } from 'react';
import { Paperclip, X } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (files: FileInfo[]) => void;
  onClearFiles: () => void;
  selectedFiles: FileInfo[];
  isLoading: boolean;
  iconOnly?: boolean;
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

export function FileUploader({ onFileSelect, onClearFiles, selectedFiles, isLoading, iconOnly = false }: FileUploaderProps) {
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
    <div>
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
        className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
        disabled={isLoading}
        title="Attach files"
      >
        <Paperclip className="h-5 w-5" />
      </button>
    </div>
  );
} 