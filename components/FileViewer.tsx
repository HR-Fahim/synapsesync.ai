import React, { useState, useEffect, useRef } from 'react';
import { DocFile, ChatMessage, User } from '../types';
import { ArrowLeft, Clock, Save, Send, Sparkles, FileSpreadsheet, FileText, Bot, Edit2, X, Undo, FileType, Lock, ToggleLeft, ToggleRight, BrainCircuit, Type, Minus, Plus, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { generateChatResponse } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  const [showHistory, setShowHistory] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(true); 
  
  // Font Options State
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono' | 'roboto' | 'lato' | 'playfair'>('roboto');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeVersion = file.versions.find(v => v.id === activeVersionId);
  const displayContent = activeVersion ? activeVersion.content : file.currentContent;
  const isHistoricalView = activeVersionId !== file.currentVersionId;

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
    if (showAiPanel) scrollToBottom();
  }, [messages, showAiPanel]);

  useEffect(() => {
    setActiveVersionId(file.currentVersionId);
    setIsEditing(false);
    setMessages([{
      id: 'welcome',
      role: 'model',
      text: `Hello! I've read "**${file.title}**". I am ready to assist you.`,
      timestamp: new Date()
    }]);
  }, [file]);

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
    onUpdateFile(file.id, editedContent, false);
    setIsEditing(false);
  };

  const getFileIcon = () => {
    switch (file.type) {
      case 'sheet': return <FileSpreadsheet size={18} />;
      case 'text': return <FileType size={18} />;
      default: return <FileText size={18} />;
    }
  };

  // Professional Font Mapping
  const getFontClass = () => {
     switch(fontFamily) {
         case 'mono': return 'font-mono';
         case 'sans': return 'font-sans';
         case 'serif': return 'font-serif';
         case 'roboto': return 'font-roboto';
         case 'lato': return 'font-lato';
         case 'playfair': return 'font-playfair';
         default: return 'font-roboto';
     }
  };

  const getSizeClass = () => {
     if (fontSize === 'sm') return 'text-sm leading-relaxed';
     if (fontSize === 'lg') return 'text-lg leading-relaxed';
     if (fontSize === 'xl') return 'text-xl leading-relaxed';
     return 'text-base leading-relaxed';
  };

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col md:flex-row overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 font-sans transition-colors duration-200">
      <div className="flex-1 flex flex-col h-full min-w-0 transition-all duration-300">
        
        {/* Editor Header */}
        <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 px-4 flex items-center justify-between bg-white dark:bg-zinc-950 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <button onClick={onBack} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div className="text-zinc-600 dark:text-zinc-500">
              {getFileIcon()}
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-none mb-1">{file.title}</h2>
              <div className="text-[10px] text-zinc-600 dark:text-zinc-500 flex items-center gap-2 uppercase tracking-wide font-medium">
                {isHistoricalView ? (
                  <span className="text-amber-600 dark:text-amber-500 flex items-center gap-1">
                    <Clock size={10} /> Historical Version
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Live
                  </span>
                )}
                {isEditing && <span className="text-indigo-500 dark:text-indigo-400">• Editing</span>}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             {/* Toolbar Actions */}
             {!isHistoricalView && !isEditing && (
               <>
                 <div className="hidden sm:flex items-center gap-3 pr-3 border-r border-zinc-200 dark:border-zinc-800 mr-1">
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] text-zinc-500 dark:text-zinc-500 uppercase tracking-widest font-bold">AI Auto-Save</span>
                      <button 
                        onClick={() => onToggleAutoUpdate(file.id)}
                        className={`text-xs font-semibold flex items-center gap-1.5 transition-colors ${file.autoUpdateEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'}`}
                      >
                         {file.autoUpdateEnabled ? 'On' : 'Off'}
                         {file.autoUpdateEnabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                    </div>
                 </div>

                 {canEdit ? (
                    <Button variant="secondary" size="sm" onClick={handleStartEdit} className="h-8">
                      <Edit2 size={14} className="mr-2" />
                      Edit
                    </Button>
                 ) : (
                    <Button variant="ghost" size="sm" disabled className="opacity-50 h-8">
                       <Lock size={14} className="mr-2" />
                       Locked
                    </Button>
                 )}
               </>
             )}
             
             {isEditing && (
               <>
                 <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-8">Cancel</Button>
                 <Button variant="primary" size="sm" onClick={handleSaveEdit} className="h-8">
                   <Save size={14} className="mr-2" />
                   Save
                 </Button>
               </>
             )}
             
             <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1"></div>

             <button 
               onClick={() => setShowHistory(!showHistory)}
               className={`p-2 rounded-md transition-colors ${showHistory ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
               title="Version History"
             >
               <Clock size={18} />
             </button>

             <button 
               onClick={() => setShowAiPanel(!showAiPanel)}
               className={`p-2 rounded-md transition-colors ${showAiPanel ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
               title="Toggle AI Assistant"
             >
               <Sparkles size={18} />
             </button>
          </div>
        </div>

        {/* Professional Formatting Toolbar */}
        <div className="h-10 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-4 flex items-center gap-4 text-zinc-600 dark:text-zinc-400 select-none">
           <div className="flex items-center gap-2 border-r border-zinc-200 dark:border-zinc-800 pr-4">
              <Type size={14} />
              <select 
                value={fontFamily} 
                onChange={(e) => setFontFamily(e.target.value as any)}
                className="bg-transparent text-xs font-medium focus:outline-none text-zinc-700 dark:text-zinc-300 cursor-pointer hover:text-zinc-900 dark:hover:text-white border-none focus:ring-0 py-0"
              >
                <option value="roboto">Roboto (Sans)</option>
                <option value="lato">Lato (Sans)</option>
                <option value="sans">Inter (Sans)</option>
                <option value="playfair">Playfair (Serif)</option>
                <option value="serif">Merriweather (Serif)</option>
                <option value="mono">JetBrains (Mono)</option>
              </select>
           </div>
           
           <div className="flex items-center gap-2">
              <button onClick={() => setFontSize('sm')} className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${fontSize === 'sm' ? 'text-indigo-600 dark:text-indigo-400' : ''}`}><Minus size={14} /></button>
              <select 
                value={fontSize} 
                onChange={(e) => setFontSize(e.target.value as any)}
                className="bg-transparent text-xs font-medium focus:outline-none text-zinc-700 dark:text-zinc-300 cursor-pointer hover:text-zinc-900 dark:hover:text-white w-16 text-center border-none focus:ring-0 py-0"
              >
                <option value="sm">Small</option>
                <option value="base">Normal</option>
                <option value="lg">Large</option>
                <option value="xl">Huge</option>
              </select>
              <button onClick={() => setFontSize('lg')} className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${fontSize === 'lg' ? 'text-indigo-600 dark:text-indigo-400' : ''}`}><Plus size={14} /></button>
           </div>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
          {/* Document Area */}
          <div className="flex-1 bg-zinc-100 dark:bg-zinc-900/50 overflow-y-auto p-8 custom-scrollbar">
            <div className={`max-w-[850px] mx-auto bg-white shadow-lg min-h-[900px] text-zinc-900 ${isEditing ? 'outline outline-2 outline-indigo-500' : ''} transition-all duration-200`}>
              {isEditing ? (
                <textarea 
                  className={`w-full h-full min-h-[900px] p-10 md:p-12 resize-none focus:outline-none bg-white text-zinc-900 ${getFontClass()} ${getSizeClass()}`}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  placeholder="Start typing..."
                  spellCheck={false}
                />
              ) : (
                <>
                  {file.type === 'sheet' ? (
                    <div className="grid grid-cols-4 gap-0 border-t border-l border-zinc-300">
                      {[...Array(30)].map((_, i) => (
                        <div key={i} className="border-b border-r border-zinc-300 p-2 text-sm h-10 truncate bg-white text-zinc-900 font-sans">
                            {i < 4 ? <span className="font-bold bg-zinc-100 block -m-2 p-2 text-zinc-600 text-center">{['A','B','C','D'][i]}</span> : 
                            (displayContent.split('\n')[i] || '')}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`prose prose-zinc max-w-none whitespace-pre-wrap text-zinc-900 p-10 md:p-14 ${getFontClass()} ${getSizeClass()}`}>
                      {displayContent}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* AI Panel */}
          {showAiPanel && (
            <div className="w-80 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col shadow-2xl z-20 animate-in slide-in-from-right duration-200">
                <div className="h-10 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-3 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
                        <Sparkles size={14} /> AI Assistant
                    </div>
                    <button onClick={() => setShowAiPanel(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                        <X size={14} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed overflow-hidden ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                      }`}>
                        {msg.role === 'model' && <Bot size={14} className="mb-1 text-indigo-500 dark:text-indigo-400 inline-block mr-2 align-middle" />}
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          className={`inline-block align-top prose prose-sm max-w-none ${
                            msg.role === 'user' 
                              ? 'prose-invert text-white' // User bubble is dark (indigo), so force invert to make text light
                              : 'dark:prose-invert' // Model bubble adapts to theme
                          }`}
                          components={{
                            p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />,
                            a: ({node, ...props}) => <a className="text-blue-500 hover:underline" {...props} />,
                            code: ({node, className, ...props}) => {
                                // @ts-ignore
                                const inline = props.inline || !String(props.children).includes('\n');
                                return inline ? (
                                    <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-xs" {...props} />
                                ) : (
                                    <code className="block bg-black/10 dark:bg-white/10 p-2 rounded font-mono text-xs my-1 overflow-x-auto" {...props} />
                                );
                            }
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                       <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-700 flex gap-1">
                          <span className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce"></span>
                          <span className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce delay-100"></span>
                          <span className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce delay-200"></span>
                       </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <div className="relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about this document..."
                      className="w-full pl-3 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-600 transition-all"
                      disabled={isChatLoading}
                    />
                    <button 
                      type="submit"
                      disabled={!input.trim() || isChatLoading}
                      className="absolute right-1.5 top-1.5 p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </form>
            </div>
          )}
        </div>
      </div>

      {/* History Sidebar */}
      {showHistory && (
        <div className="w-72 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col shrink-0 h-full absolute md:relative z-30 shadow-2xl animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
            <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">Version History</h3>
            <button onClick={() => setShowHistory(false)} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white">
                <X size={16} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-1">
               <div 
                  onClick={() => setActiveVersionId(file.currentVersionId)}
                  className={`p-3 rounded border cursor-pointer transition-all ${
                    activeVersionId === file.currentVersionId 
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-500/30' 
                      : 'bg-zinc-50 dark:bg-zinc-800/20 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">Current</span>
                    <span className="text-[10px] text-zinc-500">Live</span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">Latest synced version</p>
               </div>

              {file.versions.slice().reverse().map((version) => (
                <div 
                  key={version.id}
                  onClick={() => setActiveVersionId(version.id)}
                  className={`p-3 rounded border cursor-pointer transition-all group ${
                    activeVersionId === version.id 
                      ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-500/30' 
                      : 'bg-zinc-50 dark:bg-zinc-800/20 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{version.versionLabel}</span>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(version.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 font-mono mb-2">
                    {new Date(version.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                  
                  {activeVersionId === version.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestore(file.id, version.id);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 py-1.5 rounded transition-colors"
                    >
                      <Undo size={12} />
                      Restore
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};