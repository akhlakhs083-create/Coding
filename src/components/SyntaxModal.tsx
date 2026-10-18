import React, { useState } from 'react';
import { BookOpen, X, Copy, Check, Play, Sparkles } from 'lucide-react';

interface SyntaxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertCode: (snippet: string) => void;
}

interface DocSection {
  title: string;
  hindiName: string;
  desc: string;
  example: string;
}

export const SyntaxModal: React.FC<SyntaxModalProps> = ({ isOpen, onClose, onInsertCode }) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  const docs: DocSection[] = [
    {
      title: 'डेटा स्टोरेज व प्रोफाइल (Persistent Data - V1.5)',
      hindiName: 'सहेजो, लोड करो, हटाओ',
      desc: 'ब्राउज़र के लोकल स्टोरेज में डेटा सुरक्षित रखें, पुनः लोड करें, या हटाएं ताकि पेज रिफ्रेश होने के बाद भी डेटा उपलब्ध रहे।',
      example: `मान नाम = "अमित"\nसहेजो "यूज़र_नाम" नाम\nलोड करो "यूज़र_नाम" नाम\nहटाओ "यूज़र_नाम"`
    },
    {
      title: 'मल्टी-स्क्रीन ऐप (Multi-Screen Apps - V1.4)',
      hindiName: 'स्क्रीन, खोलो, वापस, नेविगेशन बटन',
      desc: 'कई नामित स्क्रीन्स बनाएं, नेविगेशन बटन से स्क्रीन बदलें, और पिछली स्क्रीन पर वापस जाएं।',
      example: `स्क्रीन "होम"\nशीर्षक "होम स्क्रीन"\nपाठ "होम स्क्रीन में आपका स्वागत है!"\nनेविगेशन बटन "प्रोफाइल" "प्रोफाइल"\n\nस्क्रीन "प्रोफाइल"\nशीर्षक "मेरी प्रोफाइल"\nपाठ "प्रोफाइल विवरण"\nनेविगेशन बटन "होम पर लौटें" "होम"`
    },
    {
      title: 'इंटरैक्टिव ऐप (Interactive App UI)',
      hindiName: 'शीर्षक, पाठ, इनपुट, बटन, जब बटन दबे',
      desc: 'ऐप का शीर्षक, टेक्स्ट, इनपुट बॉक्स, बटन और बटन क्लिक होने पर चलने वाली क्रिया (Action) परिभाषित करें।',
      example: `शीर्षक "मेरा ऐप"\nमान नाम = "अमित"\nपाठ "नमस्ते " + नाम\nइनपुट "अपना नाम लिखें" नाम\nबटन "अभिवादन करें"\n\nजब बटन दबे\n    दिखाओ "नमस्ते " + नाम\n    पाठ "नमस्ते " + नाम + " जी!"\nसमाप्त`
    },
    {
      title: 'ऐप स्टाइलिंग (UI Styling)',
      hindiName: 'पृष्ठभूमि, रंग, बटन_रंग, आकार, शीर्षक_आकार',
      desc: 'ऐप प्रीव्यू का बैकग्राउंड, टेक्स्ट रंग, बटन रंग और फ़ॉन्ट आकार (10-48px) सेट करें।',
      example: `शीर्षक "रंगीन ऐप"\nशीर्षक_आकार 28\nपृष्ठभूमि "#101827"\nरंग "#38BDF8"\nआकार 20\nपाठ "सुंदर नीला टेक्स्ट"\nबटन_रंग "#FF8800"\nबटन "दबाएँ"`
    },
    {
      title: 'आउटपुट / प्रिंट (Print Output)',
      hindiName: 'दिखाओ',
      desc: 'स्क्रीन या कंसोल पर किसी भी संदेश या चर के मान को प्रिंट करने के लिए प्रयोग करें।',
      example: `दिखाओ "नमस्ते दुनिया!"\nमान नाम = "अमित"\nदिखाओ "स्वागत है: " + नाम`
    },
    {
      title: 'प्रत्यक्ष गणितीय कमांड (Direct Math)',
      hindiName: 'जोड़ो, घटाओ, गुणा, भाग',
      desc: 'बिना किसी प्रतीक के सीधे शब्दों में गणितीय गणना करें।',
      example: `जोड़ो 10 और 20\nघटाओ 50 में से 15\nगुणा 8 और 9\nभाग 100 में 5 का`
    },
    {
      title: 'चर (Variables) और असाइनमेंट',
      hindiName: 'मान <नाम> = <मान>',
      desc: 'डेटा, संख्या या टेक्स्ट को स्टोर करने के लिए चर (variable) बनाएं।',
      example: `मान आयु = 21\nमान शहर = "नई दिल्ली"\nमान कुल_अंक = 85 + 92\nदिखाओ शहर + " में आयु: " + आयु`
    },
    {
      title: 'शर्तें (Conditionals: अगर ... वरना)',
      hindiName: 'अगर ... वरना ... समाप्त',
      desc: 'तुलना करने के लिए "बड़ा", "छोटा", "बराबर", "बड़ा या बराबर", "छोटा या बराबर", "बराबर नहीं" का उपयोग करें। ब्लॉक को "समाप्त" से बंद करें।',
      example: `मान अंक = 75\nअगर अंक बड़ा या बराबर 60\n    दिखाओ "प्रथम श्रेणी (First Division)!"\nवरना\n    दिखाओ "प्रयास जारी रखें!"\nसमाप्त`
    },
    {
      title: 'दोहराओ लूप (Repeat Loop)',
      hindiName: 'दोहराओ N बार ... समाप्त',
      desc: 'किसी कोड को निश्चित बार दोहराने के लिए। लूप के अंदर "चक्र" चर वर्तमान क्रम बताता है।',
      example: `दोहराओ 4 बार\n    दिखाओ "चक्र क्रमांक: " + चक्र\nसमाप्त`
    },
    {
      title: 'जबतक लूप (While Loop)',
      hindiName: 'जबतक <शर्त> ... समाप्त',
      desc: 'जब तक कोई शर्त सही (सत्य) रहती है, तब तक लूप चलता है।',
      example: `मान i = 1\nजबतक i छोटा या बराबर 5\n    दिखाओ "गिनती: " + i\n    i = i + 1\nसमाप्त`
    },
    {
      title: 'इंटरैक्टिव इनपुट (Interactive Input)',
      hindiName: 'पूछो "संदेश" चर_नाम',
      desc: 'उपयोगकर्ता से सीधे कंसोल में कोई मान पूछकर चर में सहेजें।',
      example: `पूछो "कृपया अपना नाम लिखें:" नाम\nदिखाओ "नमस्ते " + नाम + " जी!"`
    },
    {
      title: 'गणितीय इन-बिल्ट फ़ंक्शन (Built-in Math)',
      hindiName: 'वर्गमूल, घात, यादृच्छिक',
      desc: 'विशेष गणनाओं के लिए उपलब्ध हिंदी गणितीय फ़ंक्शन।',
      example: `दिखाओ "16 का वर्गमूल: " + वर्गमूल(16)\nदिखाओ "2 की घात 4: " + घात(2, 4)\nदिखाओ "यादृच्छिक संख्या (1 से 100): " + यादृच्छिक(1, 100)`
    }
  ];

  const handleCopy = async (code: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleUseSnippet = (code: string) => {
    onInsertCode(code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">हिंदी सिंटैक्स संदर्शिका (Syntax Reference)</h2>
              <p className="text-xs text-slate-400">हिंदी कोडिंग भाषा के सभी नियम और उदाहरण</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {docs.map((doc, idx) => (
            <div
              key={idx}
              className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {doc.hindiName}
                    </span>
                    <h3 className="font-semibold text-slate-200 text-sm">{doc.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">{doc.desc}</p>
                </div>
              </div>

              {/* Code Box */}
              <div className="mt-3 relative bg-slate-950 rounded-lg border border-slate-800/80 p-3 font-mono text-xs text-amber-200/90 whitespace-pre leading-relaxed overflow-x-auto">
                {doc.example}
                
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(doc.example, idx)}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition cursor-pointer"
                  >
                    {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedIdx === idx ? 'कॉपी हुआ' : 'कॉपी'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUseSnippet(doc.example)}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded border border-amber-500/40 transition cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-amber-300" />
                    <span>संपादक में चलाएं</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
          <span>हिंदी अंक (०, १, २, ३...) और अंग्रेजी अंक (0, 1, 2, 3...) दोनों समर्थित हैं।</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition cursor-pointer"
          >
            समझ गया
          </button>
        </div>
      </div>
    </div>
  );
};
