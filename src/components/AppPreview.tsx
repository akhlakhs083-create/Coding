import React, { useState } from 'react';
import { Smartphone, Sparkles, Hand, ArrowLeft, ChevronRight, Compass, CheckCircle2 } from 'lucide-react';
import { RotateCcw } from 'lucide-react';
import { AppPreviewState } from '../language/interpreter';

interface AppPreviewProps {
  previewState: AppPreviewState;
  onButtonClick: (buttonKey: string) => void;
  onInputChange: (varName: string, value: string) => void;
  onLoadExampleApp: () => void;
  onNavigateBack?: () => void;
  onScreenSelect?: (screenName: string) => void;
  onRefresh: () => void;
  onToggleMode: () => void;
  previewMode: 'phone' | 'desktop';
  isRunning: boolean;
}

export const AppPreview: React.FC<AppPreviewProps> = ({
  previewState,
  onButtonClick,
  onInputChange,
  onLoadExampleApp,
  onNavigateBack,
  onScreenSelect,
  onRefresh,
  onToggleMode,
  previewMode,
  isRunning
}) => {
  const [clickedButton, setClickedButton] = useState<string | null>(null);

  const handleBtnClick = (key: string) => {
    setClickedButton(key);
    setTimeout(() => setClickedButton(null), 300);
    onButtonClick(key);
  };

  const hasUi = previewState.hasAppUi && (previewState.title !== '' || previewState.elements.length > 0 || Object.keys(previewState.screens || {}).length > 0);
  const screenKeys = Object.keys(previewState.screens || {});

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-inner">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950/70 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-slate-200">ऐप प्रीव्यू (App Preview)</span>
          {hasUi ? (
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              लाइव
            </span>
          ) : (
            <span className="text-[11px] text-slate-500">तैयार</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onRefresh} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-400 transition" title="प्रीव्यू रिफ्रेश करें"><RotateCcw className="w-3.5 h-3.5"/></button>
          <button type="button" onClick={onToggleMode} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-400 transition" title="डिवाइस मोड बदलें">{previewMode === 'phone' ? <Smartphone className="w-3.5 h-3.5"/> : <LayoutGrid className="w-3.5 h-3.5"/>}</button>
          {screenKeys.length > 1 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-md font-devanagari">
              {screenKeys.length} स्क्रीन्स
            </span>
          )}
        </div>
      </div>

      {/* Screen Selector Pills for easy testing */}
      {hasUi && screenKeys.length > 1 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/90 border-b border-slate-800 text-[11px] overflow-x-auto shrink-0 justify-center">
          <span className="text-slate-400 font-devanagari text-[10px] shrink-0">स्क्रीन्स:</span>
          {screenKeys.map((sName) => (
            <button
              key={sName}
              type="button"
              onClick={() => onScreenSelect?.(sName)}
              disabled={isRunning}
              className={`px-2 py-0.5 rounded-full text-[10px] font-devanagari transition cursor-pointer shrink-0 ${
                previewState.activeScreen === sName
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700/60'
              }`}
            >
              {sName}
            </button>
          ))}
        </div>
      )}

      {/* Main Preview Area */}
      <div className="flex-1 p-3 overflow-y-auto flex flex-col items-center justify-center bg-slate-950/50">
        {!hasUi ? (
          <div className="max-w-xs text-center p-5 border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-200 mb-1">मल्टी-स्क्रीन व प्रोफाइल ऐप</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              कोड में <span className="text-amber-300 font-mono">स्क्रीन</span>, <span className="text-amber-300 font-mono">सहेजो</span>, <span className="text-amber-300 font-mono">लोड करो</span>, और <span className="text-amber-300 font-mono">हटाओ</span> जोड़कर यहाँ सीधे मोबाइल ऐप चलाएं।
            </p>
            <button
              type="button"
              onClick={onLoadExampleApp}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-950/40 transition active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
              <span>प्रोफाइल ऐप लोड करें</span>
            </button>
          </div>
        ) : (
          /* Phone Simulator Device Container */
          <div
            style={{ backgroundColor: previewState.bgColor || undefined }}
            className={`w-full ${previewMode === 'phone' ? 'max-w-[320px]' : 'max-w-[640px]'} bg-slate-950 border-2 border-slate-700/80 rounded-[28px] p-3 shadow-2xl flex flex-col min-h-[380px] max-h-[480px] overflow-hidden relative transition-all duration-200`}
          >
            {/* Phone Notch & Status bar */}
            <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-slate-800/80 text-[10px] text-slate-400 select-none">
              <span className="font-semibold text-slate-300">09:41</span>
              <div className="w-14 h-3 bg-slate-800 rounded-full mx-auto"></div>
              <span className="text-[9px] text-emerald-400">● 100%</span>
            </div>

            {/* App Header (शीर्षक) with Back Button */}
            <div className="py-2 px-2.5 mt-1 bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border border-amber-600/30 rounded-xl flex items-center justify-between shadow-xs gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {onNavigateBack && previewState.screenHistory && previewState.screenHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={onNavigateBack}
                    disabled={isRunning}
                    className="flex items-center gap-1 px-2 py-0.5 bg-slate-800/90 hover:bg-slate-700 text-amber-300 rounded-lg text-[10px] font-devanagari cursor-pointer transition active:scale-95 shrink-0 border border-amber-500/20"
                    title="पिछली स्क्रीन पर वापस जाएं"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>वापस</span>
                  </button>
                )}
                <h2
                  style={{ fontSize: previewState.titleFontSize ? `${previewState.titleFontSize}px` : undefined }}
                  className="text-xs sm:text-sm font-bold text-amber-200 tracking-wide font-devanagari transition-all truncate flex-1 text-center"
                >
                  {previewState.title || 'मेरा ऐप'}
                </h2>
              </div>
              {previewState.activeScreen && (
                <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-300/80 rounded border border-amber-500/20 font-devanagari shrink-0">
                  {previewState.activeScreen}
                </span>
              )}
            </div>

            {/* App Body Content */}
            <div className="flex-1 py-3 px-1 overflow-y-auto space-y-3">
              {previewState.elements.map((el) => {
                if (el.type === 'text') {
                  return (
                    <div
                      key={el.id}
                      style={{
                        color: el.textColor || undefined,
                        fontSize: el.fontSize ? `${el.fontSize}px` : undefined
                      }}
                      className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl text-slate-200 text-xs sm:text-sm font-devanagari leading-relaxed shadow-xs break-words transition-all"
                    >
                      {el.content}
                    </div>
                  );
                }

                if (el.type === 'input') {
                  return (
                    <div key={el.id} className="space-y-1">
                      <label className="block text-[11px] font-semibold text-amber-300/90 font-devanagari px-1">
                        {el.content}
                      </label>
                      <input
                        type="text"
                        value={el.inputValue !== undefined ? el.inputValue : ''}
                        onChange={(e) => onInputChange(el.varName || 'इनपुट_मान', e.target.value)}
                        placeholder={el.content || 'यहाँ लिखें...'}
                        disabled={isRunning}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 hover:border-slate-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 font-devanagari transition focus:outline-hidden"
                      />
                    </div>
                  );
                }

                if (el.type === 'button') {
                  const key = el.buttonKey || el.content;
                  const isPressed = clickedButton === key;
                  return (
                    <button
                      key={el.id}
                      type="button"
                      onClick={() => handleBtnClick(key)}
                      disabled={isRunning}
                      style={{
                        backgroundColor: el.buttonColor || undefined,
                        color: el.buttonColor ? '#FFFFFF' : undefined
                      }}
                      className={`w-full py-2.5 px-4 font-bold text-xs sm:text-sm rounded-xl font-devanagari transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-md select-none ${
                        isPressed
                          ? 'opacity-80 scale-95 shadow-inner'
                          : el.buttonColor
                          ? 'hover:opacity-90 active:scale-95'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 hover:shadow-amber-500/20 active:scale-95'
                      }`}
                    >
                      <Hand className="w-4 h-4 fill-current shrink-0" />
                      <span>{el.content}</span>
                    </button>
                  );
                }

                if (el.type === 'nav_button') {
                  const key = el.buttonKey || el.content;
                  const isPressed = clickedButton === key;
                  return (
                    <button
                      key={el.id}
                      type="button"
                      onClick={() => handleBtnClick(key)}
                      disabled={isRunning}
                      style={{
                        backgroundColor: el.buttonColor || undefined,
                        color: el.buttonColor ? '#FFFFFF' : undefined
                      }}
                      className={`w-full py-2.5 px-4 font-bold text-xs sm:text-sm rounded-xl font-devanagari transition-all duration-150 flex items-center justify-between gap-2 cursor-pointer shadow-md select-none ${
                        isPressed
                          ? 'opacity-80 scale-95 shadow-inner'
                          : el.buttonColor
                          ? 'hover:opacity-90 active:scale-95'
                          : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-indigo-950/40 active:scale-95'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Compass className="w-4 h-4 text-amber-300 shrink-0" />
                        <span>{el.content}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] opacity-80 shrink-0">
                        {el.targetScreen && <span>{el.targetScreen}</span>}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  );
                }

                return null;
              })}

              {previewState.elements.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-500 font-devanagari">
                  स्क्रीन सेट हो गई है। 'पाठ', 'इनपुट', 'बटन' और 'नेविगेशन बटन' जोड़ें।
                </div>
              )}
            </div>

            {/* Live Action Toast Banner */}
            {previewState.toastMessage && (
              <div className="mt-auto pt-2">
                <div className="p-2 bg-emerald-950/80 border border-emerald-600/50 rounded-xl flex items-center gap-2 text-emerald-200 text-[11px] animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-medium truncate font-devanagari">{previewState.toastMessage}</span>
                </div>
              </div>
            )}

            {/* Bottom Home Indicator */}
            <div className="pt-2 flex justify-center">
              <div className="w-20 h-1 bg-slate-700/80 rounded-full"></div>
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between px-3 py-1 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          <span>सक्रिय स्क्रीन: {previewState.activeScreen || 'मुख्य'}</span>
          <span className="text-slate-600">|</span>
          <span>तत्व: {previewState.elements.length}</span>
        </div>
        <div>
          <span>सुरक्षित मल्टी-स्क्रीन निष्पादन</span>
        </div>
      </div>
    </div>
  );
};
