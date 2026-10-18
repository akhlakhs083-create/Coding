import React, { useState, useEffect } from 'react';
import { FolderOpen, Save, Trash2, Download, Upload, Plus, X, Calendar, FileText, Check, Edit2, Copy } from 'lucide-react';
import { projectManager, Project } from '../language/projectManager';

export interface SavedProgram {
  id: string;
  name: string;
  code: string;
  updatedAt: string;
}

interface SaveLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCode: string;
  onLoadCode: (code: string, programName: string) => void;
  currentProgramName: string;
  onProgramNameChange: (name: string) => void;
}

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
  isOpen,
  onClose,
  currentCode,
  onLoadCode,
  currentProgramName,
  onProgramNameChange
}) => {
  const [savedList, setSavedList] = useState<SavedProgram[]>([]);
  const [programNameInput, setProgramNameInput] = useState(currentProgramName || 'मेरा प्रोग्राम');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProgramNameInput(currentProgramName || 'मेरा प्रोग्राम');
      loadList();
    }
  }, [isOpen, currentProgramName]);

  const loadList = () => {
    const projects = projectManager.getAllProjects();
    const mapped = projects.map(p => ({
      id: p.id,
      name: p.name,
      code: p.code,
      updatedAt: new Date(p.lastModified).toLocaleString('hi-IN')
    }));
    setSavedList(mapped);
  };

  const handleSaveCurrent = () => {
    const trimmedName = programNameInput.trim() || 'अनाम प्रोग्राम';
    const project: Project = {
      id: savedList.find(p => p.name === trimmedName)?.id || 'proj_' + Date.now(),
      name: trimmedName,
      code: currentCode,
      lastModified: Date.now()
    };
    projectManager.saveProject(project);
    onProgramNameChange(trimmedName);
    setSaveSuccess(true);
    loadList();
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`क्या आप सहेजे गए प्रोग्राम "${name}" को हटाना चाहते हैं?`)) {
      projectManager.deleteProject(id);
      loadList();
    }
  };

  const handleDuplicate = (program: SavedProgram) => {
    const newName = `${program.name} (कॉपी)`;
    projectManager.createProject(newName, program.code);
    loadList();
  };

  const handleRename = (program: SavedProgram) => {
    const newName = prompt('नया नाम दर्ज करें:', program.name);
    if (newName && newName !== program.name) {
      projectManager.saveProject({ ...program, name: newName } as Project);
      loadList();
    }
  };

  const handleDownload = (codeToDownload: string, nameToDownload: string) => {
    const blob = new Blob([codeToDownload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${nameToDownload || 'hindi_code'}.hindi`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (typeof content === 'string') {
        const fileName = file.name.replace(/\.(hindi|txt)$/i, '');
        onLoadCode(content, fileName);
        onClose();
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">प्रोजेक्ट मैनेजर (Project Manager)</h2>
              <p className="text-xs text-slate-400">सहेजें, लोड करें, रीनेम या डुप्लिकेट करें</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-300 mb-1">वर्तमान प्रोजेक्ट का नाम:</label>
            <input type="text" value={programNameInput} onChange={(e) => setProgramNameInput(e.target.value)} placeholder="प्रोजेक्ट का नाम" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-400" />
          </div>
          <div className="flex items-end gap-2">
            <button type="button" onClick={handleSaveCurrent} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-sm rounded-lg shadow-sm transition cursor-pointer">
              {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{saveSuccess ? 'सहेजा गया!' : 'सहेजें'}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
          {savedList.map((item) => (
            <div key={item.id} className="p-3 bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-200 text-sm truncate">{item.name}</h3>
                <span className="text-xs text-slate-500">{item.updatedAt}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => onLoadCode(item.code, item.name) || onClose()} className="p-1.5 text-amber-300 hover:bg-amber-950/30 rounded-lg">लोड</button>
                <button type="button" onClick={() => handleRename(item)} className="p-1.5 text-slate-400 hover:text-slate-200"><Edit2 className="w-4 h-4" /></button>
                <button type="button" onClick={() => handleDuplicate(item)} className="p-1.5 text-slate-400 hover:text-slate-200"><Copy className="w-4 h-4" /></button>
                <button type="button" onClick={() => handleDelete(item.id, item.name)} className="p-1.5 text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
