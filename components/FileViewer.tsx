import React, { useState, useEffect, useRef } from 'react';
import { DocFile, FileVersion, ChatMessage } from '../types';
import { ArrowLeft, Clock, Save, RefreshCcw, Send, Sparkles, FileSpreadsheet, FileText, Bot, Edit2, X, Undo, FileType } from 'lucide-react';
import { Button } from './Button';
import { generateChatResponse } from '../services/geminiService';

interface FileViewerProps {
  file: DocFile;
  onBack: () => void;
  onRestore: (fileId: string, versionId: string) => void;
  onUpdateFile: (fileId: string, newContent: string) => void;
}

export const FileViewer: React.FC<FileViewerProps> = ({ file, onBack, onRestore, onUpdateFile }) => {
  const [activeVersionId, setActiveVersionId] = useState<string>(file.currentVersionId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  
  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine which content to show
  // If activeVersionId is null or matches current, show current.
  // Otherwise show the historical version.
  const activeVersion = file.versions.find(v => v.id === activeVersionId);
  const displayContent = activeVersion ? activeVersion.content : file.currentContent;
  const isHistoricalView = activeVersionId !== file.currentVersionId;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reset active version and editing state when file changes or version changes
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

  // If user switches version, exit edit mode
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

    // Prepare history for API
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

  const handleSimulateUpdate = () => {
    // Simulates an external update to the Google Doc
    const newContent = displayContent + `\n\n[Updated at ${new Date().toLocaleTimeString()}] New paragraph added by collaborator.`;
    onUpdateFile(file.id, newContent);
  };

  const handleStartEdit = () => {
    setEditedContent(displayContent);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    onUpdateFile(file.id, editedContent);
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
      case 'sheet': return 'bg-green-100 text-green-700';
      case 'text': return 'bg-slate-100 text-slate-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row overflow-hidden bg-white">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Header */}
        <div className="h-16 border-b border-slate-200 px-4 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
              <ArrowLeft size={20} />
            </button>
            <div className={`p-2 rounded-lg ${getFileColor()}`}>
              {getFileIcon()}
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-900 truncate">{file.title}</h2>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                {isHistoricalView ? (
                  <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <Clock size={12} /> History Mode
                  </span>
                ) : (
                  <span className="text-green-600 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Live Sync
                  </span>
                )}
                {isEditing && (
                   <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                     <Edit2 size={12} /> Editing
                   </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             {!isHistoricalView && !isEditing && (
               <>
                 <Button variant="outline" size="sm" onClick={handleSimulateUpdate} title="Simulate an update from Google Docs" className="hidden sm:inline-flex">
                   <RefreshCcw size={16} className="mr-2" />
                   Simulate Update
                 </Button>
                 <Button variant="primary" size="sm" onClick={handleStartEdit}>
                   <Edit2 size={16} className="mr-2" />
                   Edit File
                 </Button>
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

             <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="md:hidden">
               <Clock size={20} />
             </Button>
          </div>
        </div>

        {/* Content & Chat Split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Document Preview / Editor */}
          <div className="flex-1 bg-slate-50 overflow-y-auto p-8 border-r border-slate-200 custom-scrollbar">
            <div className={`max-w-3xl mx-auto bg-white shadow-sm border border-slate-200 min-h-[800px] rounded-sm ${isEditing ? 'p-0 overflow-hidden' : 'p-8 md:p-12'}`}>
              
              {isEditing ? (
                <textarea 
                  className="w-full h-full min-h-[800px] p-8 md:p-12 resize-none focus:outline-none font-serif text-slate-800 leading-relaxed text-base"
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  placeholder="Start typing..."
                  spellCheck={false}
                />
              ) : (
                <>
                  {file.type === 'sheet' ? (
                    <div className="grid grid-cols-4 gap-0 border-t border-l border-slate-300">
                      {/* Mock Sheet UI */}
                      {[...Array(20)].map((_, i) => (
                        <div key={i} className="border-b border-r border-slate-300 p-2 text-sm h-10 truncate bg-white">
                            {i < 4 ? <span className="font-bold bg-slate-50 block -m-2 p-2">{['A','B','C','D'][i]}</span> : 
                            (displayContent.split('\n')[i] || '')}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="prose prose-slate max-w-none whitespace-pre-wrap font-serif text-slate-800 leading-relaxed">
                      {displayContent}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Chat Interface */}
          <div className="w-96 bg-white flex flex-col border-l border-slate-200 shadow-[rgba(0,0,0,0.05)_0px_0px_20px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Sparkles className="text-purple-600 w-5 h-5" />
              <h3 className="font-medium text-slate-900">AI Assistant</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-slate-100 text-slate-800 rounded-tl-none'
                  }`}>
                    {msg.role === 'model' && <Bot size={16} className="mb-1 text-purple-600 inline-block mr-2" />}
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                     <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                     <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                     <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about this file..."
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-sm"
                  disabled={isChatLoading}
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isChatLoading}
                  className="absolute right-2 top-2 p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* History Sidebar */}
      {showHistory && (
        <div className="w-80 bg-slate-50 border-l border-slate-200 flex flex-col shrink-0 h-full absolute md:relative z-20 right-0 shadow-xl md:shadow-none transition-transform duration-300">
          <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="text-slate-500" size={18} />
              <h3 className="font-semibold text-slate-900">Version History</h3>
            </div>
            <div className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
              {file.versions.length} Updates
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-2">
               {/* Current Version Item */}
               <div 
                  onClick={() => setActiveVersionId(file.currentVersionId)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    activeVersionId === file.currentVersionId 
                      ? 'bg-blue-50 border-blue-400 shadow-sm ring-1 ring-blue-100' 
                      : 'bg-white border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium text-slate-900">Current Version</span>
                    <span className="text-xs text-slate-400">Now</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">Latest synchronized content</p>
               </div>

              {/* History Items */}
              {file.versions.slice().reverse().map((version) => (
                <div 
                  key={version.id}
                  onClick={() => setActiveVersionId(version.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all group ${
                    activeVersionId === version.id 
                      ? 'bg-amber-50 border-amber-400 shadow-sm ring-1 ring-amber-100' 
                      : 'bg-white border-slate-200 hover:border-amber-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium text-slate-900">{version.versionLabel}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(version.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    {new Date(version.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                  
                  {/* Restore Button - Distinctly visible when selected, otherwise on hover */}
                  <div className={`flex justify-end transition-opacity duration-200 ${activeVersionId === version.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestore(file.id, version.id);
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md shadow-sm transition-colors"
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