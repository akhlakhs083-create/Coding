import React, { useRef, useEffect } from 'react';
import { Copy, Trash2, Check, FileCode2, Undo2, Redo2 } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  errorLine?: number | null;
  cursorPos?: { line: number; col: number };
  onCursorChange?: (line: number, col: number) => void;
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  errorLine,
  cursorPos,
  onCursorChange,
  editorRef,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}) => {
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  const lines = code.split('\n');
  const totalLines = Math.max(lines.length, 1);

  // Sync scrolling between textarea and line numbers gutter
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab key inserts 4 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      onChange(newCode);

      // Set cursor position after inserted spaces
      requestAnimationFrame(() => {
        if (target) {
          target.selectionStart = target.selectionEnd = start + 4;
          updateCursor(target);
        }
      });
      return;
    }

    // Auto-indent on Enter
    if (e.key === 'Enter') {
      const target = e.currentTarget;
      const start = target.selectionStart;
      const beforeCursor = code.substring(0, start);
      const currentLine = beforeCursor.split('\n').pop() || '';
      
      // Calculate current indentation
      const matchIndent = currentLine.match(/^(\s*)/);
      let indent = matchIndent ? matchIndent[1] : '';

      // Check if line opened a block (अगर, वरना, दोहराओ, जबतक)
      const trimmed = currentLine.trim();
      if (
        trimmed.startsWith('अगर ') ||
        trimmed.startsWith('वरना') ||
        trimmed.startsWith('दोहराओ ') ||
        trimmed.startsWith('जबतक ')
      ) {
        indent += '    ';
      }

      if (indent.length > 0) {
        e.preventDefault();
        const end = target.selectionEnd;
        const newCode = code.substring(0, start) + '\n' + indent + code.substring(end);
        onChange(newCode);

        requestAnimationFrame(() => {
          if (target) {
            target.selectionStart = target.selectionEnd = start + 1 + indent.length;
            updateCursor(target);
          }
        });
      }
    }
  };

  const updateCursor = (target: HTMLTextAreaElement) => {
    if (!onCursorChange) return;
    const pos = target.selectionStart;
    const textBefore = target.value.substring(0, pos);
    const lineArr = textBefore.split('\n');
    const line = lineArr.length;
    const col = (lineArr[lineArr.length - 1] || '').length + 1;
    onCursorChange(line, col);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    updateCursor(e.currentTarget);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleClear = () => {
    if (window.confirm('क्या आप संपादक का सारा कोड साफ़ करना चाहते हैं?')) {
      onChange('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-inner">
      {/* Editor top mini-toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950/70 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <FileCode2 className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-slate-200">हिंदी कोड संपादक (Editor)</span>
          <span className="text-[11px] text-slate-500">
            {totalLines} पंक्ति{totalLines > 1 ? 'यां' : ''}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onUndo} disabled={!canUndo} className="p-1 text-slate-300 hover:text-white bg-slate-800 disabled:opacity-50 rounded" title="पूर्ववत करें (Undo)"><Undo2 className="w-3.5 h-3.5"/></button>
          <button type="button" onClick={onRedo} disabled={!canRedo} className="p-1 text-slate-300 hover:text-white bg-slate-800 disabled:opacity-50 rounded" title="पुनः करें (Redo)"><Redo2 className="w-3.5 h-3.5"/></button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded transition cursor-pointer"
            title="कोड कॉपी करें"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{copied ? 'कॉपी हुआ' : 'कॉपी'}</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-red-300 bg-slate-800/50 hover:bg-red-950/30 border border-slate-800 hover:border-red-800/50 rounded transition cursor-pointer"
            title="कोड साफ़ करें"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">खाली करें</span>
          </button>
        </div>
      </div>

      {/* Editor Canvas: Line Numbers + Textarea */}
      <div className="relative flex-1 flex overflow-hidden bg-slate-950/40">
        {/* Line Numbers Gutter */}
        <div
          ref={lineNumbersRef}
          aria-hidden="true"
          className="w-12 pt-3 pb-8 select-none overflow-hidden text-right pr-2 text-xs font-mono font-medium text-slate-600 bg-slate-950/60 border-r border-slate-800/80"
          style={{ lineHeight: '1.65rem' }}
        >
          {Array.from({ length: totalLines }).map((_, idx) => {
            const lineNum = idx + 1;
            const isError = errorLine === lineNum;
            const isCurrent = cursorPos?.line === lineNum;
            return (
              <div
                key={lineNum}
                className={`transition-colors ${
                  isError
                    ? 'text-red-400 font-bold bg-red-950/60 -mr-2 pr-2 border-r-2 border-red-500'
                    : isCurrent
                    ? 'text-amber-400 font-semibold'
                    : ''
                }`}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        {/* Text Area */}
        <div className="relative flex-1 h-full">
          <textarea
            ref={editorRef}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            onSelect={handleSelect}
            onClick={handleSelect}
            onKeyUp={handleSelect}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="w-full h-full p-3 pl-3 pt-3 pb-8 resize-none bg-transparent text-slate-100 placeholder-slate-600 font-mono text-sm leading-[1.65rem] focus:outline-hidden whitespace-pre overflow-auto"
            placeholder={`// यहां अपना हिंदी कोड लिखें...
// उदाहरण:
दिखाओ "नमस्ते दुनिया!"
जोड़ो 10 और 20
अगर 10 बड़ा 5
    दिखाओ "10 बड़ा है"
समाप्त`}
          />
        </div>
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          <span>
            पंक्ति: <strong className="text-slate-200">{cursorPos?.line || 1}</strong>, स्तंभ:{' '}
            <strong className="text-slate-200">{cursorPos?.col || 1}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span>भाषा: <strong className="text-amber-400">हिंदी (HindiScript)</strong></span>
        </div>
        <div>
          <span>सुरक्षित निष्पादन (No Eval)</span>
        </div>
      </div>
    </div>
  );
};
