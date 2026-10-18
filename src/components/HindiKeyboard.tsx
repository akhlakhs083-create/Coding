import React, { useState } from 'react';
import { Keyboard, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface HindiKeyboardProps {
  onInsert: (snippet: string) => void;
}

interface ChipItem {
  label: string;
  insert: string;
  tooltip?: string;
}

export const HindiKeyboard: React.FC<HindiKeyboardProps> = ({ onInsert }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'app_ui' | 'commands' | 'conditions' | 'loops' | 'symbols'>('app_ui');

  const categories: Record<string, { title: string; items: ChipItem[] }> = {
    app_ui: {
      title: 'ऐप यूआई (App UI)',
      items: [
        { label: 'स्क्रीन ""', insert: 'स्क्रीन "होम"\n', tooltip: 'नई स्क्रीन परिभाषित करें' },
        { label: 'नेविगेशन बटन', insert: 'नेविगेशन बटन "प्रोफाइल" "प्रोफाइल"\n', tooltip: 'स्क्रीन बदलने का बटन' },
        { label: 'खोलो ""', insert: 'खोलो "प्रोफाइल"\n', tooltip: 'स्क्रीन पर जाएं' },
        { label: 'वापस', insert: 'वापस\n', tooltip: 'पिछली स्क्रीन पर वापस आएं' },
        { label: 'शीर्षक ""', insert: 'शीर्षक "मेरा ऐप"\n', tooltip: 'ऐप का शीर्षक सेट करें' },
        { label: 'पाठ ""', insert: 'पाठ "नमस्ते दुनिया!"\n', tooltip: 'टेक्स्ट/संदेश दिखाएं' },
        { label: 'इनपुट ""', insert: 'इनपुट "अपना नाम लिखें" नाम\n', tooltip: 'टेक्स्ट/संख्या इनपुट फ़ील्ड' },
        { label: 'बटन ""', insert: 'बटन "दबाएँ"\n', tooltip: 'क्लिक करने योग्य बटन बनाएं' },
        { label: 'जब बटन दबे', insert: 'जब बटन दबे\n    दिखाओ "आपने बटन दबाया"\nसमाप्त\n', tooltip: 'बटन क्लिक क्रिया ब्लॉक' },
        { label: 'पृष्ठभूमि ""', insert: 'पृष्ठभूमि "#101827"\n', tooltip: 'ऐप बैकग्राउंड रंग' },
        { label: 'रंग ""', insert: 'रंग "#FFFFFF"\n', tooltip: 'टेक्स्ट का रंग' },
        { label: 'बटन_रंग ""', insert: 'बटन_रंग "#FF8800"\n', tooltip: 'बटन का रंग' },
        { label: 'आकार 24', insert: 'आकार 24\n', tooltip: 'फ़ॉन्ट आकार (10-48px)' },
        { label: 'शीर्षक_आकार 28', insert: 'शीर्षक_आकार 28\n', tooltip: 'शीर्षक आकार (10-48px)' },
        { label: 'सहेजो ""', insert: 'सहेजो "यूज़र_नाम" नाम\n', tooltip: 'डेटा सुरक्षित करें (Local Storage)' },
        { label: 'लोड करो ""', insert: 'लोड करो "यूज़र_नाम" नाम\n', tooltip: 'सहेजा डेटा लोड करें' },
        { label: 'हटाओ ""', insert: 'हटाओ "यूज़र_नाम"\n', tooltip: 'सहेजा गया डेटा हटाएं' },
      ]
    },
    commands: {
      title: 'मुख्य आदेश (Commands)',
      items: [
        { label: 'दिखाओ ""', insert: 'दिखाओ ""', tooltip: 'प्रिंट करें' },
        { label: 'मान =', insert: 'मान  = ', tooltip: 'चर घोषित करें' },
        { label: 'पूछो ""', insert: 'पूछो "संदेश दर्ज करें:" नाम', tooltip: 'इनपुट प्राप्त करें' },
        { label: 'समाप्त', insert: 'समाप्त', tooltip: 'ब्लॉक समाप्त करें' },
        { label: 'जोड़ो और', insert: 'जोड़ो 10 और 20', tooltip: 'संख्याएं जोड़ें' },
        { label: 'घटाओ में से', insert: 'घटाओ 20 में से 5', tooltip: 'घटाएं' },
        { label: 'गुणा और', insert: 'गुणा 5 और 6', tooltip: 'गुणा करें' },
        { label: 'भाग में का', insert: 'भाग 20 में 4 का', tooltip: 'भाग दें' },
      ]
    },
    conditions: {
      title: 'शर्तें (Conditions)',
      items: [
        { label: 'अगर', insert: 'अगर ', tooltip: 'If शर्त' },
        { label: 'वरना अगर', insert: 'वरना अगर ', tooltip: 'Else If शर्त' },
        { label: 'वरना', insert: 'वरना\n    ', tooltip: 'Else शाखा' },
        { label: 'बड़ा (> )', insert: ' बड़ा ', tooltip: 'Greater than' },
        { label: 'छोटा (< )', insert: ' छोटा ', tooltip: 'Less than' },
        { label: 'बराबर (==)', insert: ' बराबर ', tooltip: 'Equals' },
        { label: 'बड़ा या बराबर', insert: ' बड़ा या बराबर ', tooltip: 'Greater or equal' },
        { label: 'छोटा या बराबर', insert: ' छोटा या बराबर ', tooltip: 'Less or equal' },
        { label: 'बराबर नहीं', insert: ' बराबर नहीं ', tooltip: 'Not equal' },
        { label: 'और (AND)', insert: ' और ', tooltip: 'तथा' },
        { label: 'या (OR)', insert: ' या ', tooltip: 'अथवा' },
        { label: 'नहीं (NOT)', insert: 'नहीं ', tooltip: 'उलट' },
      ]
    },
    loops: {
      title: 'लूप (Loops)',
      items: [
        { label: 'दोहराओ ... बार', insert: 'दोहराओ 5 बार\n    दिखाओ "चक्र: " + चक्र\nसमाप्त', tooltip: 'Repeat loop' },
        { label: 'जबतक ... समाप्त', insert: 'जबतक i छोटा या बराबर 10\n    i = i + 1\nसमाप्त', tooltip: 'While loop' },
        { label: 'रुको', insert: 'रुको', tooltip: 'Break' },
        { label: 'आगे', insert: 'आगे', tooltip: 'Continue' },
        { label: 'चक्र', insert: 'चक्र', tooltip: 'Loop count variable' },
        { label: 'सत्य', insert: 'सत्य', tooltip: 'True' },
        { label: 'असत्य', insert: 'असत्य', tooltip: 'False' },
      ]
    },
    symbols: {
      title: 'चिह्न एवं अंक (Symbols & Digits)',
      items: [
        { label: 'उद्धरण ""', insert: '""', tooltip: 'Strings' },
        { label: '=', insert: ' = ', tooltip: 'असाइनमेंट' },
        { label: '+', insert: ' + ', tooltip: 'जोड़' },
        { label: '-', insert: ' - ', tooltip: 'घटाव' },
        { label: '*', insert: ' * ', tooltip: 'गुणा' },
        { label: '/', insert: ' / ', tooltip: 'भाग' },
        { label: '%', insert: ' % ', tooltip: 'शेषफल' },
        { label: '( )', insert: '()', tooltip: 'कोष्ठक' },
        { label: '०', insert: '०' },
        { label: '१', insert: '१' },
        { label: '२', insert: '२' },
        { label: '३', insert: '३' },
        { label: '४', insert: '४' },
        { label: '५', insert: '५' },
        { label: '६', insert: '६' },
        { label: '७', insert: '७' },
        { label: '८', insert: '८' },
        { label: '९', insert: '९' },
      ]
    }
  };

  return (
    <div className="border-t border-slate-800 bg-slate-900/95 backdrop-blur-sm transition-all select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/80 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Keyboard className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-slate-200">हिंदी कीवर्ड टूलबार (Quick Insert)</span>
          <span className="hidden sm:inline text-slate-500 text-[11px]">— टाइप करने के लिए क्लिक करें</span>
        </div>

        <div className="flex items-center gap-1.5">
          {isOpen && (
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('app_ui')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  activeTab === 'app_ui'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ऐप UI
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('commands')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  activeTab === 'commands'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                आदेश
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('conditions')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  activeTab === 'conditions'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                शर्तें
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('loops')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  activeTab === 'loops'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                लूप
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('symbols')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  activeTab === 'symbols'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                प्रतीक/अंक
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
            title={isOpen ? 'टूलबार छिपाएं' : 'टूलबार दिखाएं'}
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Chip list */}
      {isOpen && (
        <div className="p-2.5 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
          {categories[activeTab].items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onInsert(item.insert)}
              title={item.tooltip || item.insert}
              className="px-2.5 py-1 text-xs font-mono font-medium bg-slate-800/90 hover:bg-amber-600/30 text-amber-100 hover:text-amber-200 border border-slate-700/80 hover:border-amber-500/50 rounded shadow-xs active:scale-95 transition cursor-pointer flex items-center gap-1"
            >
              <span>{item.label}</span>
              {item.tooltip && <span className="text-[10px] text-slate-400 opacity-60">·</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
