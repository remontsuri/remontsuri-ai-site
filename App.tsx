import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { AnalysisResult, AnalysisStatus, HistoryItem } from './types';
import { analyzeTranscript } from './services/ollamaService';
import { BrainCircuit, AlertCircle, PlusCircle, Moon, Sun, Loader2 } from 'lucide-react';

// Lazy load components for code splitting
const InputSection = lazy(() => import('./components/InputSection'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const ComparisonView = lazy(() => import('./components/ComparisonView'));

// Constants
const MAX_SUMMARY_LENGTH = 100;
const MAX_HISTORY_ITEMS = 100;
const MAX_HISTORY_BYTES = 4 * 1024 * 1024; // 4MB
const MAX_COMPARE_ITEMS = 2;
const APP_NAME = 'PsychoAnalyze AI';
const POWERED_BY = 'Google Gemini';

const App: React.FC = () => {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [compareList, setCompareList] = useState<HistoryItem[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  // Dark mode
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track current analysis ID for rating
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);

  // Abort controller for API calls
  const abortControllerRef = useRef<AbortController | null>(null);

  // Apply theme to document
  const applyTheme = useCallback((newTheme: 'light' | 'dark') => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);
  }, []);

  useEffect(() => {
    // Check system pref or saved pref
    const savedTheme = localStorage.getItem('theme');
    const initialTheme = (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches))
      ? 'dark'
      : 'light';
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
  }, [theme, applyTheme]);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('psychoanalyze_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as HistoryItem[];
        setHistory(Array.isArray(parsed) ? parsed.map(item => ({
          ...item,
          tags: item.tags ?? [],
        })) : []);
      } catch {
        setHistory([]);
      }
    }
  }, []);

  const showToast = useCallback((message: string, type: 'info' | 'error') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Simulated progress bar logic
  useEffect(() => {
    let interval: number;
    if (status === 'loading') {
      setProgress(0);
      interval = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          // Logarithmic slowdown
          const increment = Math.max(0.5, (90 - prev) / 20);
          return prev + increment;
        });
      }, 300);
    } else if (status === 'success') {
      setProgress(100);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [status]);

  const saveToHistory = (result: AnalysisResult) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      summary: result.summary.substring(0, MAX_SUMMARY_LENGTH) + '...',
      data: result,
      userRating: 0,
      tags: [],
    };
    let updated = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS);
    let serialized = JSON.stringify(updated);
    if (serialized.length > MAX_HISTORY_BYTES) {
      updated = updated.slice(0, 80);
      serialized = JSON.stringify(updated);
    }
    setHistory(updated);
    setCurrentAnalysisId(newItem.id);
    try {
      localStorage.setItem('psychoanalyze_history', serialized);
    } catch {
      showToast('Не удалось сохранить историю', 'error');
    }
  };

  const handleDeleteHistory = useCallback((id: string) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    if (currentAnalysisId === id) {
      setCurrentAnalysisId(null);
      setData(null);
      setStatus('idle');
    } else {
      setCurrentAnalysisId(prev => prev === id ? null : prev);
    }
    try {
      localStorage.setItem('psychoanalyze_history', JSON.stringify(updated));
    } catch {
      showToast('Не удалось сохранить историю', 'error');
    }
  }, [history, currentAnalysisId, showToast]);

  const handleUpdateHistoryTags = useCallback((id: string, tags: string[]) => {
    const updated = history.map(item =>
      item.id === id ? { ...item, tags } : item
    );
    setHistory(updated);
    try {
      localStorage.setItem('psychoanalyze_history', JSON.stringify(updated));
    } catch {
      showToast('Не удалось сохранить историю', 'error');
    }
  }, [history, showToast]);

  const handleUpdateRating = (rating: number) => {
    if (!currentAnalysisId) return;
    // Update history item by ID
    const updatedHistory = history.map(item => {
      if (item.id === currentAnalysisId) {
        return { ...item, userRating: rating };
      }
      return item;
    });
    setHistory(updatedHistory);
    localStorage.setItem('psychoanalyze_history', JSON.stringify(updatedHistory));
  };

  const handleAnalyze = async (text: string) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setStatus('loading');
    setError(null);
    setIsComparing(false);
    try {
      const result = await analyzeTranscript(text, abortControllerRef.current.signal);
      setData(result);
      setStatus('success');
      saveToHistory(result);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled
      }

      // Generate more specific error messages
      let errorMessage = 'Не удалось проанализировать стенограмму. Пожалуйста, проверьте длину текста и попробуйте снова.';

      if (err instanceof Error) {
        const errorText = err.message.toLowerCase();

        if (errorText.includes('network') || errorText.includes('fetch') || errorText.includes('connection')) {
          errorMessage = 'Ошибка сети. Проверьте подключение к интернету и попробуйте снова.';
        } else if (errorText.includes('ollama') || errorText.includes('модель')) {
          errorMessage = 'AI сервис временно недоступен. Попробуйте позже.';
        } else if (errorText.includes('timeout') || errorText.includes('время')) {
          errorMessage = 'Превышено время ожидания. Попробуйте сократить текст.';
        } else if (err.message) {
          // Show the specific error message from the service
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      setStatus('error');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Clear toast timeout if it exists
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const handleLoadHistory = (item: HistoryItem) => {
    setData(item.data);
    setCurrentAnalysisId(item.id);
    setStatus('success');
    setIsComparing(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleCompare = (item: HistoryItem) => {
    if (compareList.find(i => i.id === item.id)) {
      setCompareList(prev => prev.filter(i => i.id !== item.id));
    } else {
      if (compareList.length >= MAX_COMPARE_ITEMS) {
        // Clear any existing timeout
        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
        }
        setToast({ message: "Можно сравнивать только 2 анализа одновременно.", type: 'info' });
        // Auto-hide toast after 3 seconds
        toastTimeoutRef.current = setTimeout(() => {
          setToast(null);
        }, 3000);
        return;
      }
      setCompareList(prev => [...prev, item]);
    }
  };

  const startComparison = () => {
    if (compareList.length === MAX_COMPARE_ITEMS) {
      setIsComparing(true);
      setStatus('success');
      setData(null);
    } else {
      // Clear any existing timeout
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      setToast({ message: "Выберите ровно 2 анализа для сравнения.", type: 'error' });
      // Auto-hide toast after 3 seconds
      toastTimeoutRef.current = setTimeout(() => {
        setToast(null);
      }, 3000);
    }
  };

  const resetAnalysis = () => {
    setStatus('idle');
    setData(null);
    setProgress(0);
    setIsComparing(false);
    setCompareList([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 pb-20 selection:bg-indigo-100 dark:selection:bg-indigo-900 selection:text-indigo-900 dark:selection:text-indigo-100 transition-colors duration-300">
      
      {/* Top Progress Bar */}
      {status === 'loading' && (
        <div className="fixed top-0 left-0 w-full h-1 z-[60] bg-slate-200 dark:bg-slate-800">
          <div 
            className="h-full bg-indigo-600 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(79,70,229,0.5)]" 
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={resetAnalysis}
          >
            <div className="bg-linear-to-tr from-indigo-600 to-violet-600 p-2 rounded-lg shadow-lg shadow-indigo-200 dark:shadow-none group-hover:scale-105 transition-transform">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                PsychoAnalyze <span className="text-indigo-600 dark:text-indigo-400">AI</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
             {compareList.length > 0 && !isComparing && (
               <button 
                onClick={startComparison}
                className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-full shadow-lg transition-all animate-in zoom-in"
               >
                 Сравнить ({compareList.length})
               </button>
             )}

             <button onClick={toggleTheme} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
               {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
             </button>

             {status === 'success' && (
                <button 
                  onClick={resetAnalysis}
                  className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  Новый анализ
                </button>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        
        {status === 'idle' && !isComparing && (
           <div className="text-center mb-16 animate-in fade-in duration-700 slide-in-from-bottom-4">
             <span className="px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-bold tracking-wide uppercase mb-6 inline-block border border-indigo-100 dark:border-indigo-800">
               Инструмент клинического исследования
             </span>
             <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight leading-tight">
               Раскройте глубокие <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">психологические инсайты</span>
             </h2>
             <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
               Анализируйте стенограммы интервью для выявления защитных механизмов, типов привязанности и эмоциональных траекторий с помощью продвинутого ИИ.
             </p>
           </div>
        )}

        {(status === 'idle' || status === 'loading' || status === 'error') && !isComparing && (
           <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>}>
             <InputSection
               onAnalyze={handleAnalyze}
               isLoading={status === 'loading'}
               history={history}
               onLoadHistory={handleLoadHistory}
               onSelectForCompare={toggleCompare}
               compareList={compareList}
               onDeleteHistory={handleDeleteHistory}
               onUpdateHistoryTags={handleUpdateHistoryTags}
             />
           </Suspense>
        )}

        {status === 'error' && (
          <div className="max-w-4xl mx-auto mt-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-300 animate-in fade-in slide-in-from-top-2 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {status === 'success' && data && !isComparing && (
          <div className="mt-8">
            <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>}>
              <Dashboard
                data={data}
                onRate={handleUpdateRating}
              />
            </Suspense>
          </div>
        )}

        {isComparing && (
          <div className="mt-8">
            <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>}>
              <ComparisonView items={compareList} onBack={() => setIsComparing(false)} />
            </Suspense>
          </div>
        )}

      </main>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-bottom-4 z-50 ${
          toast.type === 'error'
            ? 'bg-red-500 text-white'
            : 'bg-indigo-500 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">✕</button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-24 border-t border-slate-200 dark:border-slate-800 py-12 text-center text-slate-400 dark:text-slate-500 text-sm transition-colors">
        <p>&copy; {new Date().getFullYear()} PsychoAnalyze AI. Powered by {import.meta.env.VITE_AI_PROVIDER || 'Google Gemini'}.</p>
      </footer>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg z-50 animate-in slide-in-from-bottom-2 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-indigo-500 text-white'
        }`}>
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

    </div>
  );
};

export default App;
