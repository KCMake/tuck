import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// No StrictMode: its double-invoked effects would start recordings and audio twice.
createRoot(document.getElementById('root')!).render(<App />);
