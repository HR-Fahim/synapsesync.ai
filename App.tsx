import React, { useState, useRef, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { FileViewer } from './components/FileViewer';
import { GoogleAuth } from './components/GoogleAuth';
import { FilePicker } from './components/FilePicker';
import { SubscriptionModal } from './components/SubscriptionModal';
import { User, DocFile, ViewState, FileVersion, SubscriptionTier } from './types';
import { FileText, FileSpreadsheet, Plus, Lock, Mail, Search, Upload, FileType, RefreshCw, BrainCircuit, Trash2, ArrowLeft } from 'lucide-react';

// Mock Initial Data
const MOCK_FILES: DocFile[] = [
  {
    id: '1',
    title: 'Q3 Financial Overview',
    type: 'doc',
    ownerId: 'u1',
    currentVersionId: 'v1-curr',
    autoUpdateEnabled: true,
    lastUpdated: new Date().toISOString(),
    currentContent: `Financial Overview Q3\n\nRevenue has increased by 20% compared to last quarter. Key drivers include new product launches and expanded market reach.`,
    versions: [
      { id: 'v1-old-1', timestamp: new Date(Date.now() - 86400000).toISOString(), content: `Financial Overview Q3\n\nRevenue projections are steady.`, versionLabel: 'Auto-Save 10:00 AM' }
    ]
  },
  {
    id: '2',
    title: 'Product Launch Strategy',
    type: 'doc',
    ownerId: 'u1',
    currentVersionId: 'v2-curr',
    autoUpdateEnabled: false,
    lastUpdated: new Date().toISOString(),
    currentContent: `Product Launch Strategy 2024\n\n1. Executive Summary\nThis document outlines the strategic go-to-market plan for our new AI-powered widget. The primary goal is to achieve 10k users in the first month.\n\n2. Target Audience\n- Tech enthusiasts\n- Early adopters\n- Enterprise CTOs\n\n3. Marketing Channels\n- Social Media (LinkedIn, Twitter)\n- Tech Blogs\n- Email Newsletters`,
    versions: [
      { id: 'v2-old-1', timestamp: new Date(Date.now() - 172800000).toISOString(), content: `Product Launch Strategy\n\nRough notes on marketing...`, versionLabel: 'Auto-Save 09:30 AM' },
      { id: 'v2-old-2', timestamp: new Date(Date.now() - 86400000).toISOString(), content: `Product Launch Strategy 2024\n\n1. Executive Summary\nPending review...`, versionLabel: 'Auto-Save 02:15 PM' }
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

  // Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [inputCode, setInputCode] = useState('');

  // App Data State
  const [files, setFiles] = useState<DocFile[]>(MOCK_FILES);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [showSubscription, setShowSubscription] = useState(false);

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check and Reset Weekly Edits
  useEffect(() => {
    if (user) {
      const now = new Date();
      const lastReset = new Date(user.lastEditReset);
      const diffTime = Math.abs(now.getTime() - lastReset.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      if (diffDays >= 7) {
        setUser(prev => prev ? {
          ...prev,
          editsUsed: 0,
          lastEditReset: now.toISOString()
        } : null);
        showNotification("Weekly edit limit has been reset.");
      }
    }
  }, [user?.lastEditReset]); 

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Authentication Handlers
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      showNotification("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      showNotification("Password must be at least 6 characters.");
      return;
    }

    if (isRegistering) {
      if (!name) return;
      
      // Start Verification Process
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setVerificationCode(code);
      setIsVerifying(true);
      // Simulate sending email
      console.log(`Email sent to ${email} with code: ${code}`);
      showNotification(`Confirmation code sent to ${email}`);
      
    } else {
      // Login logic (mock)
      const mockUser: User = { 
        id: 'u1', 
        name: 'Demo User', 
        email, 
        tier: 'FREE', 
        editsUsed: 0,
        lastEditReset: new Date().toISOString(),
        autoUpdateInterval: 14 
      };
      setUser(mockUser);
      setView(ViewState.DASHBOARD);
      showNotification('Signed in successfully.');
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode === verificationCode) {
      // Complete Registration
      const newUser: User = { 
        id: 'u1', 
        name, 
        email, 
        tier: 'FREE', 
        editsUsed: 0,
        lastEditReset: new Date().toISOString(),
        autoUpdateInterval: 14 
      };
      setUser(newUser);
      setView(ViewState.DASHBOARD);
      setIsVerifying(false);
      setInputCode('');
      setVerificationCode('');
      showNotification(`Welcome, ${name}! Verification successful.`);
    } else {
      showNotification("Invalid code. Please try again.");
    }
  };

  const handleResendCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setVerificationCode(code);
    console.log(`Resent code to ${email}: ${code}`);
    showNotification(`New confirmation code sent to ${email}`);
  };

  const handleLogout = () => {
    setUser(null);
    setView(ViewState.AUTH);
    setSelectedFileId(null);
    // Reset Auth State
    setIsRegistering(false);
    setIsVerifying(false);
    setEmail('');
    setPassword('');
    setName('');
    setInputCode('');
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const getMaxFiles = (tier: SubscriptionTier) => {
    switch(tier) {
      case 'FREE': return 5;
      case 'PRO': return 25;
      case 'PREMIUM': return 50;
      default: return 5;
    }
  };

  const checkFileLimit = () => {
    if (!user) return false;
    const limit = getMaxFiles(user.tier);
    if (files.length >= limit) {
      showNotification(`File limit reached for ${user.tier} plan. Upgrade to add more.`);
      return false;
    }
    return true;
  };

  const handleStartConnectDrive = () => {
    if (checkFileLimit()) {
      setView(ViewState.GOOGLE_SIGNIN);
    }
  };

  const handleGoogleAuthSuccess = () => {
    showNotification("Connected to Google Drive successfully.");
    setView(ViewState.FILE_PICKER);
  };

  const handleImportFile = (driveFile: { id: string, name: string, type: 'doc' | 'sheet' | 'text' }) => {
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
      versions: [],
      autoUpdateEnabled: true
    };

    setFiles(prev => [...prev, newFile]);
    setView(ViewState.DASHBOARD);
    showNotification(`Imported "${driveFile.name}" and enabled auto-sync.`);
  };

  const handleUploadClick = () => {
    if (checkFileLimit()) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    // Validate type - Only allow docs and text
    if (!['doc', 'docx', 'txt', 'md'].includes(fileExtension || '')) {
      showNotification("Only document (.doc, .docx) and text (.txt, .md) files are allowed.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    
    let type: 'doc' | 'sheet' | 'text' = 'doc';
    if (fileExtension === 'txt' || fileExtension === 'md') {
      type = 'text';
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      let content = e.target?.result as string;

      if (['doc', 'docx'].includes(fileExtension || '')) {
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
        versions: [],
        autoUpdateEnabled: true
      };

      setFiles(prev => [...prev, newFile]);
      showNotification(`File "${fileName}" uploaded successfully.`);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  const handleSelectFile = (id: string) => {
    setSelectedFileId(id);
    setView(ViewState.FILE_DETAIL);
  };

  const handleDeleteFile = (e: React.MouseEvent, fileId: string) => {
    e.preventDefault(); // Prevent standard button behavior
    e.stopPropagation(); // Stop bubbling to the card container
    
    if (window.confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      setFiles(prevFiles => {
        const updatedFiles = prevFiles.filter(f => f.id !== fileId);
        return updatedFiles;
      });
      
      if (selectedFileId === fileId) {
        setSelectedFileId(null);
        setView(ViewState.DASHBOARD);
      }
      showNotification('File deleted successfully.');
    }
  };

  const handleBackToDashboard = () => {
    setSelectedFileId(null);
    setView(ViewState.DASHBOARD);
  };

  const handleUpdateFile = (fileId: string, newContent: string, isAutoSave: boolean) => {
    setFiles(prevFiles => prevFiles.map(file => {
      if (file.id === fileId) {
        // Only increment user edit count if it's a manual save
        if (!isAutoSave && user) {
           setUser(prev => prev ? { ...prev, editsUsed: prev.editsUsed + 1 } : null);
        }

        const currentTime = new Date();
        const versionLabel = isAutoSave 
          ? `Auto-Save ${currentTime.toLocaleTimeString()}`
          : `Saved ${currentTime.toLocaleTimeString()}`;

        const newVersion: FileVersion = {
          id: Date.now().toString(),
          timestamp: currentTime.toISOString(),
          content: file.currentContent,
          versionLabel: versionLabel
        };

        const msg = isAutoSave 
          ? `File "${file.title}" auto-updated.` 
          : `File "${file.title}" saved successfully.`;
        
        showNotification(msg);
        
        return {
          ...file,
          currentContent: newContent,
          lastUpdated: currentTime.toISOString(),
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

  const handleToggleAutoUpdate = (fileId: string) => {
    setFiles(prevFiles => prevFiles.map(file => {
      if (file.id === fileId) {
        const newState = !file.autoUpdateEnabled;
        showNotification(`AI Auto-Update ${newState ? 'Enabled' : 'Disabled'} for "${file.title}"`);
        return { ...file, autoUpdateEnabled: newState };
      }
      return file;
    }));
  };

  const handleUpgrade = (tier: SubscriptionTier) => {
    if (user) {
      setUser({ ...user, tier: tier, autoUpdateInterval: 14 }); // Reset interval on tier change
      showNotification(`Successfully upgraded to ${tier} plan!`);
    }
  };

  const handleLoopChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (user) {
      setUser({ ...user, autoUpdateInterval: parseInt(e.target.value) });
    }
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
      case 'sheet': return 'bg-green-900/30 text-green-400';
      case 'text': return 'bg-slate-800 text-slate-400';
      default: return 'bg-blue-900/30 text-blue-400';
    }
  };

  // View Logic

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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        {notification && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-4 border border-white/10">
            {notification}
          </div>
        )}
        <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10">
          <div className="bg-slate-950 p-8 text-center relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20"></div>
            <div className="mx-auto w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-4 relative z-10 border border-white/10">
              <BrainCircuit className="text-blue-400" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 relative z-10">SynapseSync.AI</h1>
            <p className="text-slate-400 relative z-10">AI-Powered Document Intelligence</p>
          </div>
          
          <div className="p-8">
            {isVerifying ? (
              // Verification View
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <button 
                    onClick={() => setIsVerifying(false)} 
                    className="p-1 hover:bg-slate-800 rounded-full transition-colors text-slate-400"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <h2 className="text-xl font-semibold text-white">Check your email</h2>
                </div>
                
                <p className="text-slate-400 text-sm mb-6">
                  We've sent a 6-digit confirmation code to <span className="text-white font-medium">{email}</span>.
                </p>

                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <Input 
                    label="Confirmation Code" 
                    placeholder="123456" 
                    value={inputCode}
                    onChange={e => setInputCode(e.target.value)}
                    required 
                    className="text-center text-lg tracking-widest"
                    maxLength={6}
                  />
                  
                  <Button type="submit" className="w-full" size="lg">
                    Verify & Register
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-slate-500 mb-2">Didn't receive the code?</p>
                  <button 
                    onClick={handleResendCode}
                    className="text-blue-400 font-medium hover:underline hover:text-blue-300 transition-colors text-sm"
                  >
                    Resend Code
                  </button>
                </div>
              </div>
            ) : (
              // Standard Auth View
              <>
                <h2 className="text-xl font-semibold text-white mb-6">
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

                <div className="mt-6 text-center text-sm text-slate-500">
                  {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <button 
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="text-blue-400 font-medium hover:underline hover:text-blue-300 transition-colors"
                  >
                    {isRegistering ? 'Sign In' : 'Register'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const selectedFile = files.find(f => f.id === selectedFileId);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-200">
      {notification && (
        <div className="fixed top-20 right-4 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-right-4 flex items-center gap-3 border border-white/10">
          <Mail size={18} className="text-blue-400" />
          {notification}
        </div>
      )}

      {showSubscription && user && (
        <SubscriptionModal 
          currentTier={user.tier} 
          onSelectTier={handleUpgrade} 
          onClose={() => setShowSubscription(false)} 
        />
      )}

      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        setView={setView} 
        onOpenSubscription={() => setShowSubscription(true)}
      />

      {view === ViewState.DASHBOARD && user && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">My Files</h1>
              <p className="text-slate-400 mt-1">Manage and chat with your documents</p>
              
              {/* Loop Interval Display/Selector */}
              <div className="mt-3 inline-flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <RefreshCw size={14} className="text-slate-500" />
                <span className="text-xs font-medium text-slate-400">Auto-Update Loop:</span>
                
                {user.tier === 'FREE' ? (
                  <span className="text-xs font-bold text-slate-200">14 Days (Fixed)</span>
                ) : (
                  <select 
                    value={user.autoUpdateInterval} 
                    onChange={handleLoopChange}
                    className="bg-slate-800 text-xs font-bold text-slate-200 border border-slate-700 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {user.tier === 'PREMIUM' && <option value={7}>7 Days</option>}
                    <option value={14}>14 Days</option>
                    <option value={30}>30 Days</option>
                  </select>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".doc,.docx,.txt,.md"
              />
              <Button variant="outline" onClick={handleUploadClick}>
                <Upload size={20} className="mr-2" />
                Upload File ({files.length}/{getMaxFiles(user.tier) === Infinity ? '∞' : getMaxFiles(user.tier)})
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
                className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 hover:shadow-xl hover:border-blue-500/50 transition-all cursor-pointer group overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${getFileColor(file.type)}`}>
                      {getFileIcon(file.type)}
                    </div>
                    <div className="flex items-center gap-2">
                      {file.versions.length > 0 && (
                         <span className="bg-slate-800 text-slate-400 text-xs font-medium px-2 py-1 rounded-full border border-slate-700">
                           {file.versions.length} versions
                         </span>
                      )}
                      <button 
                        onClick={(e) => handleDeleteFile(e, file.id)}
                        className="relative z-10 p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Delete file"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg text-slate-200 mb-1 group-hover:text-blue-400 transition-colors truncate">
                    {file.title}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-slate-500">
                      Updated {new Date(file.lastUpdated).toLocaleDateString()}
                    </p>
                    {file.autoUpdateEnabled && (
                       <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded border border-green-900/30">
                         <RefreshCw size={10} className="animate-spin-slow" /> AUTO
                       </span>
                    )}
                  </div>
                </div>
                <div className="bg-slate-950/50 px-5 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                     <Lock size={12} /> Private
                  </span>
                  <span>Owner: {user.name}</span>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {view === ViewState.FILE_DETAIL && selectedFile && user && (
        <FileViewer 
          file={selectedFile} 
          user={user}
          onBack={handleBackToDashboard}
          onRestore={handleRestoreVersion}
          onUpdateFile={handleUpdateFile}
          onToggleAutoUpdate={handleToggleAutoUpdate}
        />
      )}
    </div>
  );
}

export default App;