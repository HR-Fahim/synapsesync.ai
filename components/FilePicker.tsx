import React, { useState } from 'react';
import { Search, FileText, FileSpreadsheet, X, Check, FileType } from 'lucide-react';
import { Button } from './Button';

interface DriveFile {
  id: string;
  name: string;
  type: 'doc' | 'sheet' | 'text';
  updatedAt: string;
  owner: string;
}

const MOCK_DRIVE_FILES: DriveFile[] = [
  { id: 'd1', name: 'Marketing Campaign 2025', type: 'doc', updatedAt: 'Today', owner: 'me' },
  { id: 'd2', name: 'Q4 Budget Analysis', type: 'sheet', updatedAt: 'Yesterday', owner: 'me' },
  { id: 'd3', name: 'Client Meeting Notes - April', type: 'doc', updatedAt: 'Apr 12', owner: 'Alice Smith' },
  { id: 'd4', name: 'Inventory List', type: 'sheet', updatedAt: 'Mar 30', owner: 'me' },
  { id: 'd5', name: 'Project Beta Specs', type: 'doc', updatedAt: 'Mar 28', owner: 'Bob Jones' },
  { id: 'd6', name: 'Raw API Logs', type: 'text', updatedAt: 'Jan 15', owner: 'Server' },
];

interface FilePickerProps {
  onSelect: (file: DriveFile) => void;
  onCancel: () => void;
}

export const FilePicker: React.FC<FilePickerProps> = ({ onSelect, onCancel }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter out sheets, only show docs and text
  const filteredFiles = MOCK_DRIVE_FILES.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
    f.type !== 'sheet'
  );

  const handleImport = () => {
    if (!selectedId) return;
    const file = MOCK_DRIVE_FILES.find(f => f.id === selectedId);
    if (file) {
      setIsProcessing(true);
      // Simulate import delay
      setTimeout(() => {
        onSelect(file);
      }, 1500);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'sheet': return <FileSpreadsheet size={20} />;
      case 'text': return <FileType size={20} />;
      default: return <FileText size={20} />;
    }
  };

  const getFileColor = (type: string) => {
    switch (type) {
      case 'sheet': return 'bg-green-900/30 text-green-400';
      case 'text': return 'bg-slate-800 text-slate-400';
      default: return 'bg-blue-900/30 text-blue-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l18.25-32.6L18.6 11.35 2.1 40a8.55 8.55 0 0 0 0 8.35l4.5 18.5z" fill="#0066da"/>
              <path d="M43.65 25 25.4 56.6h36.5l18.25-31.6H43.65z" fill="#00ac47"/>
              <path d="M73.55 66.85 55.3 35.25 36.85 67.2l4.5 7.8c1.45 2.5 4.05 4 6.9 4h30.95c2.85 0 5.45-1.5 6.9-4 .8-1.4 1.25-3 1.25-4.6v-1.75l-13.8-1.8z" fill="#ea4335"/>
              <path d="M43.65 25H80.1c1.65 0 3.25.45 4.6 1.25l-18.3 31.7L43.65 25z" fill="#00832d"/>
              <path d="M25.4 56.6 6.6 24.1C5.2 26.55 4.45 29.4 4.45 32.35v16c0 2.95.75 5.8 2.15 8.25l18.8-22.1z" fill="#2684fc"/>
              <path d="M57.8 7.3 36.65 44.2l-18.3-31.6 4.5-7.8C24.3 2.3 26.9.8 29.75.8h31c2.85 0 5.45 1.5 6.9 4l-9.85 2.5z" fill="#ffba00"/>
            </svg>
            <h3 className="text-lg font-medium text-white">Select a file</h3>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 bg-slate-950/50 border-b border-white/10 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search in Drive..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-2 bg-slate-900 min-h-[300px]">
          <div className="space-y-1">
            {filteredFiles.map(file => (
              <div 
                key={file.id}
                onClick={() => setSelectedId(file.id)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedId === file.id ? 'bg-blue-900/20 border border-blue-500/50' : 'hover:bg-slate-800 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getFileColor(file.type)}`}>
                    {getFileIcon(file.type)}
                  </div>
                  <div>
                    <h4 className={`text-sm font-medium ${selectedId === file.id ? 'text-blue-400' : 'text-slate-200'}`}>
                      {file.name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Modified {file.updatedAt} • {file.owner}
                    </p>
                  </div>
                </div>
                {selectedId === file.id && (
                  <Check size={20} className="text-blue-500" />
                )}
              </div>
            ))}
            {filteredFiles.length === 0 && (
              <div className="text-center py-12 text-slate-600">
                No files found
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950/50 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <input type="checkbox" id="autosync" defaultChecked className="rounded text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-600" />
             <label htmlFor="autosync" className="text-sm text-slate-400">Enable auto-sync & history</label>
           </div>
           <div className="flex gap-3">
             <Button variant="ghost" onClick={onCancel} disabled={isProcessing}>Cancel</Button>
             <Button 
                onClick={handleImport} 
                disabled={!selectedId || isProcessing}
                isLoading={isProcessing}
             >
               {isProcessing ? 'Importing...' : 'Select'}
             </Button>
           </div>
        </div>
      </div>
    </div>
  );
};