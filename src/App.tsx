/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  RotateCcw,
  BookOpen,
  FolderOpen,
  Save,
  Plus,
  Terminal,
  FileCode2,
  Code2,
  Sparkles,
  Smartphone,
  Info,
  ChevronRight,
  HelpCircle,
  LayoutGrid,
  Check
} from 'lucide-react';

import { HindiInterpreter, ConsoleOutputMessage, AppPreviewState } from './language/interpreter';
import { EXAMPLES, ExampleProgram } from './language/examples';
import { CodeEditor } from './components/CodeEditor';
import { ConsoleOutput } from './components/ConsoleOutput';
import { HindiKeyboard } from './components/HindiKeyboard';
import { AppPreview } from './components/AppPreview';
import { SaveLoadModal } from './components/SaveLoadModal';
import { SyntaxModal } from './components/SyntaxModal';
import { safeStorage } from './language/storage';

const DRAFT_STORAGE_KEY = 'hindi_coding_studio_current_draft';
const DRAFT_NAME_KEY = 'hindi_coding_studio_current_program_name';

export default function App() {
  const [code, setCode] = useState<string>(() => {
    const saved = safeStorage.loadData('current_draft');
    return saved.found ? saved.value : EXAMPLES[0].code;
  });
  const [history, setHistory] = useState<string[]>([code]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const updateCode = (newCode: string) => {
    if (newCode === code) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newCode);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCode(newCode);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setCode(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setCode(history[historyIndex + 1]);
    }
  };
  const [programName, setProgramName] = useState<string>(() => {
    const saved = safeStorage.loadData('current_program_name');
    return saved.found ? saved.value : 'मेरा पहला ऐप';
  });

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [previewMode, setPreviewMode] = useState<'phone' | 'desktop'>('phone');

  const [logs, setLogs] = useState<ConsoleOutputMessage[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({ line: 1, col: 1 });

  const [previewState, setPreviewState] = useState<AppPreviewState>({
    title: 'मेरा ऐप',
    elements: [],
    toastMessage: null,
    lastActionTime: null,
    hasAppUi: false,
    screens: {},
    activeScreen: 'मुख्य',
    screenHistory: []
  });

  const [mobileTab, setMobileTab] = useState<'editor' | 'console' | 'preview'>('editor');
  const [hasNewOutput, setHasNewOutput] = useState<boolean>(false);

  const [isSaveLoadOpen, setIsSaveLoadOpen] = useState(false);
  const [isSyntaxOpen, setIsSyntaxOpen] = useState(false);

  const [selectedExampleId, setSelectedExampleId] = useState<string>('first-interactive-app');

  const [promptState, setPromptState] = useState<{
    active: boolean;
    promptText: string;
    varName: string;
    onSubmit: (val: string) => void;
  } | null>(null);

  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const interpreterRef = useRef<HindiInterpreter | null>(null);

  useEffect(() => {
    interpreterRef.current = new HindiInterpreter();
  }, []);

  useEffect(() => {
    setSaveStatus('saving');
    const result = safeStorage.saveData('current_draft', code);
    if (result.success) {
      setSaveStatus('saved');
    } else {
      setSaveStatus('error');
    }
  }, [code]);

  useEffect(() => {
    safeStorage.saveData('current_program_name', programName);
  }, [programName]);

  const handleInsertSnippet = (snippet: string) => {
    const textarea = editorRef.current;
    if (!textarea) {
      updateCode(code + '\n' + snippet);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;

    const before = currentVal.substring(0, start);
    const after = currentVal.substring(end);

    const newCode = before + snippet + after;
    updateCode(newCode);

    requestAnimationFrame(() => {
      textarea.focus();
      const quotePos = snippet.indexOf('""');
      if (quotePos !== -1) {
        textarea.selectionStart = textarea.selectionEnd = start + quotePos + 1;
      } else {
        textarea.selectionStart = textarea.selectionEnd = start + snippet.length;
      }
    });
  };

  const handleRun = async () => {
    if (!interpreterRef.current) return;
    setErrorLine(null);
    setIsRunning(true);
    setExecutionTime(null);
    setHasNewOutput(true);

    const startTime = performance.now();

    const sessionStartLog: ConsoleOutputMessage = {
      id: crypto.randomUUID(),
      type: 'info',
      text: `[प्रोग्राम चालू] - ${new Date().toLocaleTimeString('hi-IN')}`,
      timestamp: new Date()
    };
    setLogs((prev) => [...prev, sessionStartLog]);

    await interpreterRef.current.execute(code, {
      onOutput: (msg) => {
        setLogs((prev) => [...prev, msg]);
        if (msg.type === 'stderr' && msg.line) {
          setErrorLine(msg.line);
        }
      },
      onAppPreviewUpdate: (updated) => {
        setPreviewState(updated);
      },
      onPromptInput: (promptText, varName) => {
        setMobileTab('console');
        return new Promise<string>((resolve) => {
          setPromptState({
            active: true,
            promptText,
            varName,
            onSubmit: (enteredValue: string) => {
              setPromptState(null);
              resolve(enteredValue);
            }
          });
        });
      },
      onFinish: (success) => {
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        setExecutionTime(duration);
        setIsRunning(false);
        setPromptState(null);

        if (interpreterRef.current) {
          const finalPreview = interpreterRef.current.getAppPreview();
          setPreviewState(finalPreview);
          if (finalPreview.hasAppUi && mobileTab === 'editor') {
            setMobileTab('preview');
          }
        }

        setLogs((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            type: 'info',
            text: `[प्रोग्राम ${success ? 'सफलतापूर्वक पूर्ण' : 'त्रुटि पर रुका'}] (समय: ${duration} ms)`,
            timestamp: new Date()
          }
        ]);
      }
    });
  };

  const handleStop = () => {
    if (interpreterRef.current) {
      interpreterRef.current.stop();
      setIsRunning(false);
      setPromptState(null);
    }
  };

  const handleButtonClickInPreview = async (buttonKey: string) => {
    if (!interpreterRef.current) return;
    await interpreterRef.current.executeButtonAction(buttonKey, {
      onOutput: (msg) => {
        setLogs((prev) => [...prev, msg]);
        setHasNewOutput(true);
      },
      onPromptInput: async () => '',
      onAppPreviewUpdate: (updated) => {
        setPreviewState(updated);
      }
    });
  };

  const handleInputChangeInPreview = (varName: string, value: string) => {
    if (!interpreterRef.current) return;
    interpreterRef.current.updateInputValue(varName, value, {
      onOutput: (msg) => {
        setLogs((prev) => [...prev, msg]);
      },
      onPromptInput: async () => '',
      onAppPreviewUpdate: (updated) => {
        setPreviewState(updated);
      }
    });
  };

  const handleNavigateBackInPreview = () => {
    if (!interpreterRef.current) return;
    interpreterRef.current.navigateBack({
      onOutput: (msg) => {
        setLogs((prev) => [...prev, msg]);
      },
      onPromptInput: async () => '',
      onAppPreviewUpdate: (updated) => {
        setPreviewState(updated);
      }
    });
  };

  const handleScreenSelectInPreview = (screenName: string) => {
    if (!interpreterRef.current) return;
    interpreterRef.current.navigateToScreen(screenName, {
      onOutput: (msg) => {
        setLogs((prev) => [...prev, msg]);
      },
      onPromptInput: async () => '',
      onAppPreviewUpdate: (updated) => {
        setPreviewState(updated);
      }
    });
  };

  const handleClearConsole = () => {
    setLogs([]);
    setExecutionTime(null);
  };

  const handleNewProgram = () => {
    if (window.confirm('क्या आप नया खाली प्रोग्राम शुरू करना चाहते हैं? वर्तमान कोड सहेज लें।')) {
      updateCode('// नया हिंदी प्रोग्राम\nस्क्रीन "होम"\nशीर्षक "मेरा ऐप"\nपाठ "नमस्ते दुनिया!"\nबटन "दबाएँ"\n\nजब बटन दबे\n    दिखाओ "आपने बटन दबाया!"\nसमाप्त\n');
      setProgramName('नया प्रोग्राम');
      setErrorLine(null);
      handleClearConsole();
      setPreviewState({
        title: 'मेरा ऐप',
        elements: [],
        toastMessage: null,
        lastActionTime: null,
        hasAppUi: false,
        screens: {},
        activeScreen: 'मुख्य',
        screenHistory: []
      });
    }
  };

  const handleSelectExample = (id: string) => {
    const found = EXAMPLES.find((e) => e.id === id);
    if (found) {
      setSelectedExampleId(id);
      updateCode(found.code);
      setProgramName(found.title.split('(')[0].trim());
      setErrorLine(null);
    }
  };

  const handleResetExample = () => {
    const found = EXAMPLES.find((e) => e.id === selectedExampleId);
    if (found) {
      updateCode(found.code);
      setProgramName(found.title.split('(')[0].trim());
      setErrorLine(null);
      handleClearConsole();
    }
  };

  const handleLoadInteractiveAppExample = () => {
    const ex = EXAMPLES.find((e) => e.id === 'first-interactive-app') || EXAMPLES[0];
    setSelectedExampleId(ex.id);
    updateCode(ex.code);
    setProgramName(ex.title.split('(')[0].trim());
    setErrorLine(null);
    handleClearConsole();
    setMobileTab('preview');
  };

  const handleErrorClick = (line: number) => {
    setErrorLine(line);
    setMobileTab('editor');
    const textarea = editorRef.current;
    if (!textarea) return;

    const lines = code.split('\n');
    let charIndex = 0;
    for (let i = 0; i < Math.min(line - 1, lines.length); i++) {
      charIndex += lines[i].length + 1;
    }
    textarea.focus();
    textarea.selectionStart = charIndex;
    textarea.selectionEnd = charIndex + (lines[line - 1]?.length || 0);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      <header className="shrink-0 px-3 sm:px-5 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 p-0.5 shadow-md shadow-amber-900/30 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Code2 className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
                <span>हिंदी कोडिंग स्टूडियो प्रो</span>
              </h1>
              <span className="px-1.5 py-0.2 text-[10px] uppercase font-bold tracking-wider rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                v1.5
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block truncate max-w-xs sm:max-w-md">
              कोडिंग और इंटरैक्टिव ऐप्स प्रो के साथ बनाएं
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1 ${
                saveStatus === 'saved' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900' :
                saveStatus === 'saving' ? 'bg-amber-950/40 text-amber-400 border border-amber-900' :
                'bg-red-950/40 text-red-400 border border-red-900'
            }`}>
                {saveStatus === 'saved' ? <Check className="w-3 h-3"/> : null}
                {saveStatus === 'saved' ? 'सहेजा गया' : saveStatus === 'saving' ? 'सहेजा जा रहा है...' : 'त्रुटि'}
            </div>
          <button type="button" onClick={() => setIsSaveLoadOpen(true)} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg text-xs font-medium transition cursor-pointer">
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">प्रोजेक्ट्स</span>
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 p-2 sm:p-3 overflow-hidden">
        <div className="w-full h-full grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3">
          <div className={`h-full lg:col-span-5 xl:col-span-5 flex flex-col min-h-0 overflow-hidden ${mobileTab === 'editor' ? 'flex' : 'hidden lg:flex'}`}>
            <div className="flex-1 min-h-0 flex flex-col">
              <CodeEditor 
                code={code} 
                onChange={updateCode} 
                errorLine={errorLine} 
                cursorPos={cursorPos} 
                onCursorChange={(line, col) => setCursorPos({ line, col })} 
                editorRef={editorRef}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
              />
            </div>
            <div className="shrink-0 mt-1.5"><HindiKeyboard onInsert={handleInsertSnippet} /></div>
          </div>
          <div className={`h-full lg:col-span-4 xl:col-span-4 flex flex-col min-h-0 overflow-hidden ${mobileTab === 'console' ? 'flex' : 'hidden lg:flex'}`}>
            <ConsoleOutput logs={logs} isRunning={isRunning} executionTime={executionTime} onClear={handleClearConsole} promptState={promptState} onErrorClick={handleErrorClick} />
          </div>
          <div className={`h-full lg:col-span-3 xl:col-span-3 flex flex-col min-h-0 overflow-hidden ${mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
            <AppPreview 
                previewState={previewState}
                onButtonClick={handleButtonClickInPreview}
                onInputChange={handleInputChangeInPreview}
                onLoadExampleApp={handleLoadInteractiveAppExample}
                onNavigateBack={handleNavigateBackInPreview}
                onScreenSelect={handleScreenSelectInPreview}
                onRefresh={handleRun}
                onToggleMode={() => setPreviewMode(prev => prev === 'phone' ? 'desktop' : 'phone')}
                previewMode={previewMode}
                isRunning={isRunning}
              />
          </div>
        </div>
      </main>

      <SaveLoadModal isOpen={isSaveLoadOpen} onClose={() => setIsSaveLoadOpen(false)} currentCode={code} onLoadCode={(loadedCode, loadedName) => { updateCode(loadedCode); setProgramName(loadedName); setErrorLine(null); }} currentProgramName={programName} onProgramNameChange={setProgramName} />
      <SyntaxModal isOpen={isSyntaxOpen} onClose={() => setIsSyntaxOpen(false)} onInsertCode={handleInsertSnippet} />
    </div>
  );
}
