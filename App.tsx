import React, { useState, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { FileViewer } from './components/FileViewer';
import { GoogleAuth } from './components/GoogleAuth';
import { FilePicker } from './components/FilePicker';
import { User, DocFile, ViewState, FileVersion } from './types';
import { FileText, FileSpreadsheet, Plus, Lock, Mail, Search, Upload, FileType } from 'lucide-react';

// Mock Initial Data
const MOCK_FILES: DocFile[] = [
  {
    id: '1',
    title: 'Q3 Financial Projections',
    type: 'sheet',
    ownerId: 'u1',
    currentVersionId: 'v1-curr',
    lastUpdated: new Date().toISOString(),
    currentContent: `Revenue,Cost,Profit,Margin\n10000,5000,5000,50%\n12000,5500,6500,54%\n15000,6000,9000,60%`,
    versions: [
      { id: 'v1-old-1', timestamp: new Date(Date.now() - 86400000).toISOString(), content: `Revenue,Cost,Profit\n8000,5000,3000`, versionLabel: 'Initial Draft' }
    ]
  },
  {
    id: '2',
    title: 'Product Launch Strategy',
    type: 'doc',
    ownerId: 'u1',
    currentVersionId: 'v2-curr',
    lastUpdated: new Date().toISOString(),
    currentContent: `Product Launch Strategy 2024\n\n1. Executive Summary\nThis document outlines the strategic go-to-market plan for our new AI-powered widget. The primary goal is to achieve 10k users in the first month.\n\n2. Target Audience\n- Tech enthusiasts\n- Early adopters\n- Enterprise CTOs\n\n3. Marketing Channels\n- Social Media (LinkedIn, Twitter)\n- Tech Blogs\n- Email Newsletters`,
    versions: [
      { id: 'v2-old-1', timestamp: new Date(Date.now() - 172800000).toISOString(), content: `Product Launch Strategy\n\nRough notes on marketing...`, versionLabel: 'Rough Notes' },
      { id: 'v2-old-2', timestamp: new Date(Date.now() - 86400000).toISOString(), content: `Product Launch Strategy 2024\n\n1. Executive Summary\nPending review...`, versionLabel: 'Draft V1' }
    ]
  }
];

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>(ViewState.AUTH);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // App Data State
  const [files, setFiles] = useState<DocFile[]>(MOCK_FILES);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Authentication Handlers
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) {
      if (!name || !email || !password) return;
      // Register logic
      const newUser = { id: 'u1', name, email };
      setUser(newUser);
      setView(ViewState.DASHBOARD);
      showNotification(`Welcome, ${name}! Registration successful.`);
    } else {
      if (!email || !password) return;
      // Login logic (mock)
      setUser({ id: 'u1', name: 'Demo User', email });
      setView(ViewState.DASHBOARD);
      showNotification('Signed in successfully.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView(ViewState.AUTH);
    setSelectedFileId(null);
  };

  // Notification Handler
  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Google Drive Flow Handlers
  const handleStartConnectDrive = () => {
    setView(ViewState.GOOGLE_SIGNIN);
  };

  const handleGoogleAuthSuccess = () => {
    showNotification("Connected to Google Drive successfully.");
    setView(ViewState.FILE_PICKER);
  };

  const handleImportFile = (driveFile: { id: string, name: string, type: 'doc' | 'sheet' | 'text' }) => {
    // Simulate importing content
    let loremContent = '';
    
    if (driveFile.type === 'doc') {
      loremContent = `Imported content for ${driveFile.name}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`;
    } else if (driveFile.type === 'sheet') {
      loremContent = `Item,Quantity,Price\nWidget A,10,100\nWidget B,20,150\nWidget C,5,50`;
    } else {
      loremContent = `Log file content for ${driveFile.name}\n[INFO] Initializing system...\n[INFO] Connection established.\n[WARN] Low latency detected.`;
    }

    const newFile: DocFile = {
      id: `imported-${Date.now()}`,
      title: driveFile.name,
      type: driveFile.type,
      ownerId: user?.id || 'u1',
      currentVersionId: 'v1-curr',
      lastUpdated: new Date().toISOString(),
      currentContent: loremContent,
      versions: []
    };

    setFiles(prev => [...prev, newFile]);
    setView(ViewState.DASHBOARD);
    showNotification(`Imported "${driveFile.name}" and enabled auto-sync.`);
  };

  // Manual File Upload Handlers
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Allowed extensions: .doc, .docx, .txt, .xls, .xlsx
    // Note: We will accept text-based files for reading, and mock binary files for this demo.
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    // Determine type
    let type: 'doc' | 'sheet' | 'text' = 'doc';
    if (fileExtension === 'xls' || fileExtension === 'xlsx' || fileExtension === 'csv') {
      type = 'sheet';
    } else if (fileExtension === 'txt' || fileExtension === 'md' || fileExtension === 'json') {
      type = 'text';
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      let content = e.target?.result as string;

      // If it's a binary file we can't properly read as text in this simple demo, we mock it.
      // FileReader readAsText might return garbage for binary.
      if (['doc', 'docx', 'xls', 'xlsx'].includes(fileExtension || '')) {
         content = `[Binary content extracted from ${fileName}]\n\nSimulated text content for demonstration purposes.\nThis represents the parsed content of the uploaded ${fileExtension?.toUpperCase()} file.`;
      }

      const newFile: DocFile = {
        id: `uploaded-${Date.now()}`,
        title: fileName,
        type: type,
        ownerId: user?.id || 'u1',
        currentVersionId: 'v1-curr',
        lastUpdated: new Date().toISOString(),
        currentContent: content,
        versions: []
      };

      setFiles(prev => [...prev, newFile]);
      showNotification(`File "${fileName}" uploaded successfully.`);
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    if (['doc', 'docx', 'xls', 'xlsx'].includes(fileExtension || '')) {
       // Just trigger onload with null to use mock content logic above, 
       // effectively skipping actual read for binary to avoid garbage text.
       // Or we can read it to base64 but our viewer expects text. 
       // We'll simulate the "read" by just calling the logic directly or reading as text and overwriting it.
       // Let's read as text, and if extension is binary, we overwrite in onload.
       reader.readAsText(file);
    } else {
       reader.readAsText(file);
    }
  };


  // File Handlers
  const handleSelectFile = (id: string) => {
    setSelectedFileId(id);
    setView(ViewState.FILE_DETAIL);
  };

  const handleBackToDashboard = () => {
    setSelectedFileId(null);
    setView(ViewState.DASHBOARD);
  };

  const handleUpdateFile = (fileId: string, newContent: string) => {
    setFiles(prevFiles => prevFiles.map(file => {
      if (file.id === fileId) {
        // Create a new version from the PREVIOUS current content
        const newVersion: FileVersion = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          content: file.currentContent,
          versionLabel: `Auto-Save ${new Date().toLocaleTimeString()}`
        };

        // Update current content
        showNotification(`File "${file.title}" updated. Email sent to ${user?.email}`);
        return {
          ...file,
          currentContent: newContent,
          lastUpdated: new Date().toISOString(),
          versions: [...file.versions, newVersion]
        };
      }
      return file;
    }));
  };

  const handleRestoreVersion = (fileId: string, versionId: string) => {
    setFiles(prevFiles => prevFiles.map(file => {
      if (file.id === fileId) {
        const versionToRestore = file.versions.find(v => v.id === versionId);
        if (!versionToRestore) return file;

        const backupVersion: FileVersion = {
          id: `backup-${Date.now()}`,
          timestamp: new Date().toISOString(),
          content: file.currentContent,
          versionLabel: `Pre-Restore Backup`
        };

        showNotification(`Restored version from ${new Date(versionToRestore.timestamp).toLocaleDateString()}`);

        return {
          ...file,
          currentContent: versionToRestore.content,
          lastUpdated: new Date().toISOString(),
          versions: [...file.versions, backupVersion]
        };
      }
      return file;
    }));
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'sheet': return <FileSpreadsheet size={24} />;
      case 'text': return <FileType size={24} />;
      default: return <FileText size={24} />;
    }
  };

  const getFileColor = (type: string) => {
    switch (type) {
      case 'sheet': return 'bg-green-100 text-green-600';
      case 'text': return 'bg-slate-100 text-slate-600';
      default: return 'bg-blue-100 text-blue-600';
    }
  };

  // Views Render Logic

  if (view === ViewState.GOOGLE_SIGNIN) {
    return (
      <GoogleAuth 
        onSuccess={handleGoogleAuthSuccess}
        onCancel={() => setView(ViewState.DASHBOARD)}
      />
    );
  }

  if (view === ViewState.FILE_PICKER) {
    return (
      <FilePicker 
        onSelect={handleImportFile}
        onCancel={() => setView(ViewState.DASHBOARD)}
      />
    );
  }

  if (view === ViewState.AUTH) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        {notification && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-4">
            {notification}
          </div>
        )}
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
          <div className="bg-blue-600 p-8 text-center">
            <div className="mx-auto w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
              <FileText className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">SynapseSync.AI</h1>
            <p className="text-blue-100">AI-Powered Document Intelligence</p>
          </div>
          
          <div className="p-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-6">
              {isRegistering ? 'Create an Account' : 'Welcome Back'}
            </h2>
            
            <form onSubmit={handleAuth} className="space-y-4">
              {isRegistering && (
                <Input 
                  label="Full Name" 
                  placeholder="John Doe" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required 
                />
              )}
              <Input 
                label="Email Address" 
                type="email" 
                placeholder="you@company.com" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <Input 
                label="Password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              
              <Button type="submit" className="w-full mt-2" size="lg">
                {isRegistering ? 'Sign Up' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-600">
              {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button 
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-blue-600 font-medium hover:underline"
              >
                {isRegistering ? 'Sign In' : 'Register'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedFile = files.find(f => f.id === selectedFileId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {notification && (
        <div className="fixed top-20 right-4 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-right-4 flex items-center gap-3">
          <Mail size={18} className="text-blue-300" />
          {notification}
        </div>
      )}

      <Navbar user={user} onLogout={handleLogout} setView={setView} />

      {view === ViewState.DASHBOARD && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">My Files</h1>
              <p className="text-slate-500 mt-1">Manage and chat with your documents</p>
            </div>
            <div className="flex gap-3">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".doc,.docx,.txt,.xls,.xlsx,.csv,.md,.json"
              />
              <Button variant="outline" onClick={handleUploadClick}>
                <Upload size={20} className="mr-2" />
                Upload File
              </Button>
              <Button onClick={handleStartConnectDrive}>
                <Plus size={20} className="mr-2" />
                Connect Google Drive
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {files.map(file => (
              <div 
                key={file.id}
                onClick={() => handleSelectFile(file.id)}
                className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${getFileColor(file.type)}`}>
                      {getFileIcon(file.type)}
                    </div>
                    {file.versions.length > 0 && (
                       <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-1 rounded-full">
                         {file.versions.length} versions
                       </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900 mb-1 group-hover:text-blue-600 transition-colors truncate">
                    {file.title}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Updated {new Date(file.lastUpdated).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                     <Lock size={12} /> Private
                  </span>
                  <span>Owner: {user?.name}</span>
                </div>
              </div>
            ))}
            
            {/* Add New Placeholder */}
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer min-h-[200px]"
                 onClick={handleStartConnectDrive}
            >
              <Search size={32} className="mb-2 opacity-50" />
              <span className="font-medium">Browse Google Drive</span>
            </div>
          </div>
        </main>
      )}

      {view === ViewState.FILE_DETAIL && selectedFile && (
        <FileViewer 
          file={selectedFile} 
          onBack={handleBackToDashboard}
          onRestore={handleRestoreVersion}
          onUpdateFile={handleUpdateFile}
        />
      )}
    </div>
  );
}

export default App;