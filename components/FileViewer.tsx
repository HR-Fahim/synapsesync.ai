import React, { useState, useEffect, useRef } from 'react';
import { DocFile, FileVersion, ChatMessage, User } from '../types';
import { ArrowLeft, Clock, Save, Send, Sparkles, FileSpreadsheet, FileText, Bot, Edit2, X, Undo, FileType, Lock, ToggleLeft, ToggleRight, BrainCircuit, ChevronRight, ChevronLeft, Sidebar, Type, Minus, Plus } from 'lucide-react';
import { Button } from './Button';
import { generateChatResponse } from '../services/geminiService';

interface FileViewerProps {
  file: DocFile;
  user: User;
  onBack: () => void;
  onRestore: (fileId: string, versionId: string) => void;
  onUpdateFile: (fileId: string, newContent: string, isAutoSave: boolean) => void;
  onToggleAutoUpdate: (fileId: string) => void;
}

export const FileViewer: React.FC<FileViewerProps> = ({ file, user, onBack, onRestore, onUpdateFile, onToggleAutoUpdate }) => {
  const [activeVersionId, setActiveVersionId] = useState<string>(file.currentVersionId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false); // Default hidden now to allow toggle
  const [isAiMinimized, setIsAiMinimized] = useState(false);
  
  // Font Options State
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>('serif');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine which content to show
  const activeVersion = file.versions.find(v => v.id === activeVersionId);
  const displayContent = activeVersion ? activeVersion.content : file.currentContent;
  const isHistoricalView = activeVersionId !== file.currentVersionId;

  // Permission Logic
  const getMaxEdits = (tier: string) => {
    if (tier === 'FREE') return 5;
    if (tier === 'PRO') return 15;
    return Infinity;
  };
  const maxEdits = getMaxEdits(user.tier);
  const canEdit = user.editsUsed < maxEdits;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiMinimized]);

  useEffect(() => {
    setActiveVersionId(file.currentVersionId);
    setIsEditing(false);
    setMessages([{
      id: 'welcome',
      role: 'model',
      text: `Hello! I've read "${file.title}". Ask me anything about this document.`,
      timestamp: new Date()
    }]);
  }, [file]);

  useEffect(() => {
    setIsEditing(false);
  }, [activeVersionId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsChatLoading(true);

    const history = messages.map(m => ({ role: m.role, text: m.text }));
    const responseText = await generateChatResponse(history, displayContent, userMsg.text);

    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, botMsg]);
    setIsChatLoading(false);
  };

  const handleStartEdit = () => {
    if (!canEdit) return;
    setEditedContent(displayContent);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    // Manual Save
    onUpdateFile(file.id, editedContent, false);
    setIsEditing(false);
  };

  const getFileIcon = () => {
    switch (file.type) {
      case 'sheet': return <FileSpreadsheet size={20} />;
      case 'text': return <FileType size={20} />;
      default: return <FileText size={20} />;
    }
  };

  const getFileColor = () => {
    switch (file.type) {
      case 'sheet': return 'bg-green-900/30 text-green-400 border border-green-800/50';
      case 'text': return 'bg-slate-800/50 text-slate-400 border border-slate-700/50';
      default: return 'bg-blue-900/30 text-blue-400 border border-blue-800/50';
    }
  };

  // Font Classes
  const getFontClass = () => {
     if (fontFamily === 'mono') return 'font-mono';
     if (fontFamily === 'sans') return 'font-sans';
     return 'font-serif';
  };

  const getSizeClass = () => {
     if (fontSize === 'sm') return 'text-sm leading-relaxed';
     if (fontSize === 'lg') return 'text-lg leading-relaxed';
     if (fontSize === 'xl') return 'text-xl leading-relaxed';
     return 'text-base leading-relaxed';
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row overflow-hidden bg-slate-950">
      <div className="flex-1 flex flex-col h-full min-w-0">
        
        {/* Main Header */}
        <div className="h-16 border-b border-white/10 px-4 flex items-center justify-between bg-slate-900/50 shrink-0 backdrop-blur-sm z-20">
          <div className="flex items-center gap-3 overflow-hidden">
            <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className={`p-2 rounded-lg ${getFileColor()}`}>
              {getFileIcon()}
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-100 truncate">{file.title}</h2>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                {isHistoricalView ? (
                  <span className="bg-amber-900/20 text-amber-500 px-2 py-0.5 rounded-full font-medium flex items-center gap-1 border border-amber-900/30">
                    <Clock size={12} /> History Mode
                  </span>
                ) : (
                  <span className="text-green-500 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                    Live Sync
                  </span>
                )}
                {isEditing && (
                   <span className="bg-blue-900/20 text-blue-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1 border border-blue-900/30">
                     <Edit2 size={12} /> Editing
                   </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             {!isHistoricalView && !isEditing && (
               <>
                 <div className="hidden sm:flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-white/5 mr-2">
                    <BrainCircuit size={16} className={file.autoUpdateEnabled ? "text-purple-400" : "text-slate-500"} />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold leading-none mb-0.5">AI Updates</span>
                      <button 
                        onClick={() => onToggleAutoUpdate(file.id)}
                        className={`text-xs font-semibold flex items-center gap-1 ${file.autoUpdateEnabled ? 'text-green-400' : 'text-slate-500'}`}
                      >
                         {file.autoUpdateEnabled ? 'Enabled' : 'Disabled'}
                         {file.autoUpdateEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>
                    </div>
                 </div>

                 {canEdit ? (
                    <Button variant="primary" size="sm" onClick={handleStartEdit}>
                      <Edit2 size={16} className="mr-2" />
                      Edit File {user.tier !== 'PREMIUM' && <span className="ml-1 opacity-75 text-xs">({maxEdits - user.editsUsed} left)</span>}
                    </Button>
                 ) : (
                    <div className="group relative">
                      <Button variant="ghost" size="sm" disabled className="opacity-50 cursor-not-allowed">
                         <Lock size={16} className="mr-2" />
                         Edit Locked
                      </Button>
                      <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-slate-800 text-slate-200 border border-slate-700 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                        Edit available after 7 days
                      </div>
                    </div>
                 )}
               </>
             )}
             
             {isEditing && (
               <>
                 <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                   <X size={16} className="mr-2" />
                   Cancel
                 </Button>
                 <Button variant="primary" size="sm" onClick={handleSaveEdit}>
                   <Save size={16} className="mr-2" />
                   Save Changes
                 </Button>
               </>
             )}
             
             {/* Desktop History Toggle */}
             <button 
               onClick={() => setShowHistory(!showHistory)}
               className={`hidden md:flex p-2 rounded-lg transition-colors items-center gap-2 text-sm font-medium ${showHistory ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
               title="Toggle Version History"
             >
               <Clock size={20} />
             </button>

             {/* Mobile History Toggle */}
             <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="md:hidden">
               <Clock size={20} />
             </Button>
          </div>
        </div>

        {/* Formatting Toolbar (Google Docs Style) */}
        <div className="h-10 border-b border-white/5 bg-slate-900 px-4 flex items-center gap-4 text-slate-400">
           <div className="flex items-center gap-2 border-r border-white/10 pr-4">
              <Type size={16} />
              <select 
                value={fontFamily} 
                onChange={(e) => setFontFamily(e.target.value as any)}
                className="bg-transparent text-sm focus:outline-none text-slate-300 cursor-pointer hover:text-white"
              >
                <option value="serif">Merriweather (Serif)</option>
                <option value="sans">Inter (Sans)</option>
                <option value="mono">JetBrains (Mono)</option>
              </select>
           </div>
           
           <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider">Size</span>
              <button onClick={() => setFontSize('sm')} className={`p-1 rounded hover:bg-white/10 ${fontSize === 'sm' ? 'text-blue-400' : ''}`}><Minus size={14} /></button>
              <select 
                value={fontSize} 
                onChange={(e) => setFontSize(e.target.value as any)}
                className="bg-transparent text-sm focus:outline-none text-slate-300 cursor-pointer hover:text-white w-16 text-center"
              >
                <option value="sm">Small</option>
                <option value="base">Normal</option>
                <option value="lg">Large</option>
                <option value="xl">Huge</option>
              </select>
              <button onClick={() => setFontSize('lg')} className={`p-1 rounded hover:bg-white/10 ${fontSize === 'lg' ? 'text-blue-400' : ''}`}><Plus size={14} /></button>
           </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 bg-slate-950 overflow-y-auto p-8 border-r border-white/5 custom-scrollbar">
            {/* Document Container with dynamic font classes */}
            <div className={`max-w-3xl mx-auto bg-white shadow-2xl border border-white/5 min-h-[800px] rounded-sm text-slate-900 ${isEditing ? 'p-0 overflow-hidden ring-2 ring-blue-500/50' : 'p-8 md:p-12'} transition-all duration-300`}>
              
              {isEditing ? (
                <textarea 
                  className={`w-full h-full min-h-[800px] p-8 md:p-12 resize-none focus:outline-none bg-white text-slate-900 ${getFontClass()} ${getSizeClass()}`}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  placeholder="Start typing..."
                  spellCheck={false}
                />
              ) : (
                <>
                  {file.type === 'sheet' ? (
                    <div className="grid grid-cols-4 gap-0 border-t border-l border-slate-300">
                      {[...Array(20)].map((_, i) => (
                        <div key={i} className="border-b border-r border-slate-300 p-2 text-sm h-10 truncate bg-white text-slate-900 font-sans">
                            {i < 4 ? <span className="font-bold bg-slate-50 block -m-2 p-2 text-slate-600">{['A','B','C','D'][i]}</span> : 
                            (displayContent.split('\n')[i] || '')}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`prose prose-slate max-w-none whitespace-pre-wrap text-slate-900 ${getFontClass()} ${getSizeClass()}`}>
                      {displayContent}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Minimizable AI Chat */}
          <div className={`${isAiMinimized ? 'w-14' : 'w-96'} bg-slate-900 flex flex-col border-l border-white/5 shadow-xl transition-all duration-300 z-10`}>
            <div className={`p-4 border-b border-white/5 bg-slate-900/50 flex items-center ${isAiMinimized ? 'justify-center' : 'justify-between'}`}>
              {!isAiMinimized && (
                <div className="flex items-center gap-2">
                  <Sparkles className="text-purple-500 w-5 h-5" />
                  <h3 className="font-medium text-slate-200">AI Assistant</h3>
                </div>
              )}
              {isAiMinimized && <Sparkles className="text-purple-500 w-5 h-5 cursor-pointer" onClick={() => setIsAiMinimized(false)} />}
              
              <button onClick={() => setIsAiMinimized(!isAiMinimized)} className="text-slate-500 hover:text-white transition-colors">
                {isAiMinimized ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
            </div>
            
            {!isAiMinimized && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                        msg.role === 'user' 
                          ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-900/20' 
                          : 'bg-slate-800 text-slate-300 rounded-tl-none border border-white/5'
                      }`}>
                        {msg.role === 'model' && <Bot size={16} className="mb-1 text-purple-400 inline-block mr-2" />}
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2 border border-white/5">
                         <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
                         <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100"></span>
                         <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200"></span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-slate-900">
                  <div className="relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about this file..."
                      className="w-full pl-4 pr-12 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-slate-950 transition-all text-sm text-white placeholder:text-slate-600"
                      disabled={isChatLoading}
                    />
                    <button 
                      type="submit"
                      disabled={!input.trim() || isChatLoading}
                      className="absolute right-2 top-2 p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 transition-colors"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </form>
              </>
            )}
            
            {isAiMinimized && (
               <div className="flex-1 flex flex-col items-center py-4 gap-4">
                 <button onClick={() => setIsAiMinimized(false)} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                   <Bot size={16} />
                 </button>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible History Tab */}
      {showHistory && (
        <div className="w-80 bg-slate-900 border-l border-white/5 flex flex-col shrink-0 h-full absolute md:relative z-20 right-0 shadow-2xl md:shadow-none animate-in slide-in-from-right duration-300">
          <div className="p-4 border-b border-white/5 bg-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="text-slate-500" size={18} />
              <h3 className="font-semibold text-slate-200">Version History</h3>
            </div>
            <div className="flex items-center gap-2">
                <div className="bg-blue-900/30 text-blue-400 text-xs font-bold px-2 py-1 rounded-full border border-blue-800/30">
                {file.versions.length} Updates
                </div>
                <button onClick={() => setShowHistory(false)} className="md:hidden text-slate-500 hover:text-white">
                    <X size={18} />
                </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-2">
               <div 
                  onClick={() => setActiveVersionId(file.currentVersionId)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    activeVersionId === file.currentVersionId 
                      ? 'bg-blue-900/20 border-blue-500/50 shadow-sm shadow-blue-900/20' 
                      : 'bg-slate-800/40 border-white/5 hover:border-blue-500/30 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium text-slate-200">Current Version</span>
                    <span className="text-xs text-slate-500">Now</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">Latest synchronized content</p>
               </div>

              {file.versions.slice().reverse().map((version) => (
                <div 
                  key={version.id}
                  onClick={() => setActiveVersionId(version.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all group ${
                    activeVersionId === version.id 
                      ? 'bg-amber-900/20 border-amber-500/50 shadow-sm shadow-amber-900/20' 
                      : 'bg-slate-800/40 border-white/5 hover:border-amber-500/30 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium text-slate-200">{version.versionLabel}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(version.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    {new Date(version.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                  
                  <div className={`flex justify-end transition-opacity duration-200 ${activeVersionId === version.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestore(file.id, version.id);
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-md shadow-sm transition-colors"
                      title="Restore this version"
                    >
                      <Undo size={12} />
                      Restore this version
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};