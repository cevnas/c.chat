import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Removed StrictMode temporarily to improve performance in development
createRoot(document.getElementById('root')!).render(<App />);
