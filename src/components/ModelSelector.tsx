import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useStore, AIModel } from '../lib/store';

const GEMINI_MODELS = [
  { 
    id: 'gemini-2.0-flash-001', 
    name: 'Gemini 2.0 Flash', 
    description: 'Fast and versatile multimodal model'
  },
  { 
    id: 'gemini-2.0-flash-lite-001', 
    name: 'Gemini 2.0 Flash-Lite', 
    description: 'Lighter version of Gemini 2.0 Flash, also the cheapest model'
  },
  { 
    id: 'gemini-1.5-pro-002', 
    name: 'Gemini 1.5 Pro', 
    description: 'Mid-size model with 2M token context'
  },
  { 
    id: 'gemini-1.5-flash-002', 
    name: 'Gemini 1.5 Flash', 
    description: 'Fast model with 1M token context'
  },
  { 
    id: 'gemini-1.5-flash-8b-001', 
    name: 'Gemini 1.5 Flash-8B', 
    description: 'Smallest model'
  }
];

export function ModelSelector() {
  const { settings, updateSettings } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentModel = GEMINI_MODELS.find(model => model.id === settings.aiModel) || GEMINI_MODELS[0];
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleSelectModel = (modelId: string) => {
    updateSettings({ aiModel: modelId as AIModel });
    setIsOpen(false);
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button" // Explicitly set button type to prevent form submission
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
      >
        <span>{currentModel.name}</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800 z-10 animate-fade-in animate-slide-in-from-top">
          <div className="mb-2 px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">Select AI Model</div>
          {GEMINI_MODELS.map(model => (
            <button
              key={model.id}
              type="button" // Explicitly set button type to prevent form submission
              onClick={() => handleSelectModel(model.id)}
              className={`w-full rounded-md px-2 py-2 text-left text-sm transition-colors ${
                model.id === settings.aiModel
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <div className="font-medium">{model.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{model.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 