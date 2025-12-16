import React, { useState, useRef, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { FileViewer } from './components/FileViewer';
import { GoogleAuth } from './components/GoogleAuth';
import { FilePicker } from './components/FilePicker';
import { SubscriptionModal } from './components/SubscriptionModal';
import { EmailVerification } from './components/EmailVerification';
import { Logo } from './components/Logo';
import { User, DocFile, ViewState, FileVersion, SubscriptionTier } from './types';
import { FileText, FileSpreadsheet, Plus, Lock, Mail, Upload, FileType, RefreshCw, Trash2, ArrowLeft, Sparkles, Clock, ShieldCheck, Check, Loader2, Cloud, ChevronRight } from 'lucide-react';
import { auth } from './services/firebase';
import { StorageService } from './services/storage';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>(ViewState.AUTH);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');

  // Forgot Password State
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetSuccess, setIsResetSuccess] = useState(false);

  // App Data State
  const [files, setFiles] = useState<DocFile[]>([]); 
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  
  // Sync States
  const [isSyncing, setIsSyncing] = useState(false); 
  const [isBlockingSync, setIsBlockingSync] = useState(false);

  const [showSubscription, setShowSubscription] = useState(false);

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        
        try {
          await firebaseUser.reload();
        } catch (e) {
          console.warn("Could not reload user profile", e);
        }
        
        if (!auth.currentUser?.emailVerified) {
          setUser(null);
          setIsBlockingSync(false);
          setIsAuthLoading(false);
          setView(curr => (curr === ViewState.EMAIL_VERIFICATION ? curr : ViewState.AUTH));
          return;
        }

        setView(curr => {
            if (curr === ViewState.AUTH || curr === ViewState.EMAIL_VERIFICATION) {
              return ViewState.DASHBOARD;
            }
            return curr;
        });
        
        setIsBlockingSync(true);

        try {
          const userId = firebaseUser.uid;
          let currentUser = await StorageService.getUserProfile(userId);
          
          if (!currentUser) {
            currentUser = {
              id: userId,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || '',
              tier: 'FREE', 
              editsUsed: 0,
              lastEditReset: new Date().toISOString(),
              autoUpdateInterval: 14
            };
            await StorageService.saveUserProfile(currentUser);
          }
          setUser(currentUser);
          const userFiles = await StorageService.getUserFiles(userId);
          setFiles(userFiles);

        } catch (error) {
          console.error("Data Initialization Error:", error);
          showNotification("Offline Mode: Showing cached data.");
          
           if (!user) {
              setUser({
                  id: firebaseUser.uid,
                  name: firebaseUser.displayName || 'User',
                  email: firebaseUser.email || '',
                  tier: 'FREE', editsUsed: 0, lastEditReset: new Date().toISOString(), autoUpdateInterval: 14
              });
           }
        } finally {
          setIsBlockingSync(false);
          setIsAuthLoading(false); 
        }

      } else {
        setUser(null);
        setFiles([]);
        setView(curr => (curr === ViewState.AUTH ? curr : ViewState.AUTH));
        setIsAuthLoading(false); 
        setIsBlockingSync(false);
      }
    });
    return () => unsubscribe();
  }, []); 

  useEffect(() => {
    if (user) {
      const now = new Date();
      const lastReset = new Date(user.lastEditReset);
      const diffTime = Math.abs(now.getTime() - lastReset.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      if (diffDays >= 7) {
        const updatedUser = {
          ...user,
          editsUsed: 0,
          lastEditReset: now.toISOString()
        };
        setUser(updatedUser);
        StorageService.saveUserProfile(updatedUser).catch(e => console.error(e)); 
      }
    }
  }, [user?.lastEditReset]); 

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      showNotification("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      showNotification("Password must be at least 6 characters.");
      return;
    }

    setIsAuthLoading(true);

    try {
      if (isRegistering) {
        if (password !== confirmPassword) {
          showNotification("Passwords do not match.");
          setIsAuthLoading(false);
          return;
        }

        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const name = email.split('@')[0];
        
        if (userCredential.user) {
          await userCredential.user.updateProfile({
            displayName: name
          });

          await userCredential.user.sendEmailVerification();
          await auth.signOut();
          
          setPendingVerificationEmail(email);
          setView(ViewState.EMAIL_VERIFICATION);
        }
        
      } else {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        if (userCredential.user && !userCredential.user.emailVerified) {
          await auth.signOut();
          showNotification('Please verify your email address to log in.');
          setIsAuthLoading(false);
          return;
        }

        showNotification('Signed in successfully.');
      }
    } catch (error: any) {
      console.error(error);
      setIsAuthLoading(false);
      let msg = "Authentication failed.";
      if (error.code === 'auth/email-already-in-use') msg = "That email is already in use.";
      if (error.code === 'auth/invalid-credential') msg = "Invalid email or password.";
      if (error.code === 'auth/user-not-found') msg = "No user found with this email.";
      if (error.code === 'auth/wrong-password') msg = "Incorrect password.";
      showNotification(msg);
    }
  };

  const handleShowForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsForgotPassword(true);
    setIsResetSuccess(false);
    setNotification(null);
  };

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showNotification("Please enter your email address.");
      return;
    }
    const cleanEmail = email.trim();
    if (!isValidEmail(cleanEmail)) {
      showNotification("Please enter a valid email address.");
      return;
    }

    setIsAuthLoading(true);
    try {
      await auth.sendPasswordResetEmail(cleanEmail);
      setIsResetSuccess(true);
    } catch (error: any) {
      console.error("Reset Password Error:", error);
      let msg = "Failed to send reset email. Please try again.";
      if (error.message) msg = error.message;
      showNotification(msg);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setIsForgotPassword(false);
    setIsResetSuccess(false);
    setNotification(null);
    setPassword('');
    setConfirmPassword('');
    setIsRegistering(false);
    setView(ViewState.AUTH);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setSelectedFileId(null);
      setIsRegistering(false);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setIsForgotPassword(false);
      setIsResetSuccess(false);
      showNotification('Logged out successfully.');
    } catch (error) {
      showNotification('Error logging out.');
    }
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
      showNotification(`File limit (${limit}) reached for ${user.tier} plan. Upgrade to add more.`);
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

  const handleImportFile = async (driveFile: { id: string, name: string, type: 'doc' | 'sheet' | 'text' }) => {
    if (!user) return;
    
    let loremContent = '';
    
    if (driveFile.type === 'doc') {
      loremContent = `Imported content for ${driveFile.name}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit.`;
    } else if (driveFile.type === 'sheet') {
      loremContent = `Item,Quantity,Price\nWidget A,10,100`;
    } else {
      loremContent = `Log file content for ${driveFile.name}\n[INFO] Initializing system...`;
    }

    const newFile: DocFile = {
      id: `imported-${Date.now()}`,
      title: driveFile.name,
      type: driveFile.type,
      ownerId: user.id,
      currentVersionId: 'v1-curr',
      lastUpdated: new Date().toISOString(),
      currentContent: loremContent,
      versions: [],
      autoUpdateEnabled: true
    };

    setFiles(prev => [...prev, newFile]);
    setView(ViewState.DASHBOARD);
    showNotification(`Importing "${driveFile.name}"...`);
    
    setIsBlockingSync(true); 
    StorageService.uploadFile(user.id, newFile)
      .then(() => showNotification(`Imported "${driveFile.name}" successfully`))
      .catch(() => showNotification("Saved locally (Sync pending)"))
      .finally(() => setIsBlockingSync(false));
  };

  const handleUploadClick = () => {
    if (checkFileLimit()) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!checkFileLimit()) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
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

    reader.onload = async (e) => {
      let content = e.target?.result as string;

      if (['doc', 'docx'].includes(fileExtension || '')) {
         content = `[Binary content extracted from ${fileName}]\n\nSimulated text content for demonstration purposes.\nThis represents the parsed content of the uploaded ${fileExtension?.toUpperCase()} file.`;
      }

      const newFile: DocFile = {
        id: `uploaded-${Date.now()}`,
        title: fileName,
        type: type,
        ownerId: user.id,
        currentVersionId: 'v1-curr',
        lastUpdated: new Date().toISOString(),
        currentContent: content,
        versions: [],
        autoUpdateEnabled: true
      };

      setFiles(prev => [...prev, newFile]);
      
      setIsBlockingSync(true); 
      StorageService.uploadFile(user.id, newFile)
        .then(() => showNotification("Upload complete."))
        .catch((error) => {
           console.warn("Upload fallback", error);
           showNotification(`File "${fileName}" saved offline.`);
        })
        .finally(() => setIsBlockingSync(false));

      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.onerror = () => {
        showNotification("Error reading file.");
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  };

  const handleSelectFile = async (id: string) => {
    const file = files.find(f => f.id === id);
    if (!file || !user) return;

    if (file._isLite || !file.currentContent) {
      setIsBlockingSync(true); 
      try {
        const fullFile = await StorageService.loadFullFile(user.id, id);
        if (fullFile) {
           setFiles(prev => prev.map(f => f.id === id ? fullFile : f));
        } else {
           showNotification("Could not download file content.");
        }
      } catch (error) {
        console.error("Failed to load file content", error);
        showNotification("Failed to load content.");
      }
      setIsBlockingSync(false);
    }

    setSelectedFileId(id);
    setView(ViewState.FILE_DETAIL);
  };

  const handleDeleteFile = async (e: React.MouseEvent, fileId: string) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    if (!user) return;
    
    setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId));
    if (selectedFileId === fileId) {
      setSelectedFileId(null);
      setView(ViewState.DASHBOARD);
    }

    setIsBlockingSync(true);
    try {
      await StorageService.deleteFile(user.id, fileId);
      showNotification('File deleted.');
    } catch (error) {
      showNotification('File deleted (offline).');
    } finally {
        setIsBlockingSync(false);
    }
  };

  const handleBackToDashboard = () => {
    setSelectedFileId(null);
    setView(ViewState.DASHBOARD);
  };

  const handleUpdateFile = async (fileId: string, newContent: string, isAutoSave: boolean) => {
    if (!user) return;
    
    const fileToUpdate = files.find(f => f.id === fileId);
    if (!fileToUpdate) return;

    let updatedUser = user;
    if (!isAutoSave) {
       updatedUser = { ...user, editsUsed: user.editsUsed + 1 };
       setUser(updatedUser);
       StorageService.saveUserProfile(updatedUser).catch(console.error);
    }

    const currentTime = new Date();
    const versionLabel = isAutoSave 
      ? `Auto-Save ${currentTime.toLocaleTimeString()}`
      : `Saved ${currentTime.toLocaleTimeString()}`;

    const currentVersions = fileToUpdate.versions || [];

    const newVersion: FileVersion = {
      id: Date.now().toString(),
      timestamp: currentTime.toISOString(),
      content: fileToUpdate.currentContent,
      versionLabel: versionLabel
    };

    let updatedVersions = [...currentVersions, newVersion];
    if (updatedVersions.length > 10) {
        updatedVersions = updatedVersions.slice(updatedVersions.length - 10);
    }

    const updatedFile: DocFile = {
      ...fileToUpdate,
      currentContent: newContent,
      lastUpdated: currentTime.toISOString(),
      versions: updatedVersions,
      _isLite: false 
    };

    setFiles(prevFiles => prevFiles.map(file => file.id === fileId ? updatedFile : file));
    
    if (!isAutoSave) {
        setIsBlockingSync(true);
    } else {
        setIsSyncing(true);
    }

    StorageService.uploadFile(user.id, updatedFile)
      .then(() => {
         if (!isAutoSave) showNotification("Saved successfully");
      })
      .catch((error) => {
         console.warn("Save failed", error);
         showNotification("Saved locally (Sync pending)");
      })
      .finally(() => {
          if (!isAutoSave) setIsBlockingSync(false);
          else setIsSyncing(false);
      });
  };

  const handleRestoreVersion = async (fileId: string, versionId: string) => {
    if (!user) return;
    
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    const versionToRestore = file.versions.find(v => v.id === versionId);
    if (!versionToRestore) return;

    const backupVersion: FileVersion = {
      id: `backup-${Date.now()}`,
      timestamp: new Date().toISOString(),
      content: file.currentContent,
      versionLabel: `Pre-Restore Backup`
    };

    let updatedVersions = [...file.versions, backupVersion];
    if (updatedVersions.length > 10) {
        updatedVersions = updatedVersions.slice(updatedVersions.length - 10);
    }

    const updatedFile: DocFile = {
      ...file,
      currentContent: versionToRestore.content,
      lastUpdated: new Date().toISOString(),
      versions: updatedVersions,
      _isLite: false
    };

    setFiles(prevFiles => prevFiles.map(f => f.id === fileId ? updatedFile : f));
    showNotification(`Restoring version...`);

    setIsBlockingSync(true); 
    StorageService.uploadFile(user.id, updatedFile)
      .then(() => showNotification("Version restored"))
      .catch(() => showNotification("Restored locally"))
      .finally(() => setIsBlockingSync(false));
  };

  const handleToggleAutoUpdate = async (fileId: string) => {
    if (!user) return;

    const file = files.find(f => f.id === fileId);
    if (!file) return;
    
    const newState = !file.autoUpdateEnabled;
    const updatedFile = { ...file, autoUpdateEnabled: newState };

    setFiles(prevFiles => prevFiles.map(f => f.id === fileId ? updatedFile : f));
    showNotification(`Keep Up-to-Date ${newState ? 'Enabled' : 'Disabled'}`);

    setIsSyncing(true);
    
    // Use lightweight metadata update instead of full upload
    try {
        await StorageService.updateFileMetadata(user.id, file.id, { autoUpdateEnabled: newState });
    } catch (error) {
        console.error("Failed to sync auto-update toggle", error);
    } finally {
        setIsSyncing(false);
    }
  };

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (user) {
      const updatedUser = { ...user, tier: tier, autoUpdateInterval: 14 };
      setUser(updatedUser);
      setIsBlockingSync(true); 
      try {
        await StorageService.saveUserProfile(updatedUser);
        showNotification(`Successfully upgraded to ${tier} plan!`);
      } catch (error) {
        showNotification(`Upgraded to ${tier} (Offline mode).`);
      } finally {
        setIsBlockingSync(false);
      }
    }
  };

  const handleLoopChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (user) {
      const updatedUser = { ...user, autoUpdateInterval: parseInt(e.target.value) };
      setUser(updatedUser);
      setIsSyncing(true);
      StorageService.saveUserProfile(updatedUser)
        .then(() => showNotification("Settings saved"))
        .catch(() => showNotification("Settings saved locally"))
        .finally(() => setIsSyncing(false));
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'sheet': return <FileSpreadsheet size={20} />;
      case 'text': return <FileType size={20} />;
      default: return <FileText size={20} />;
    }
  };

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

  if (view === ViewState.EMAIL_VERIFICATION) {
    return (
      <EmailVerification 
        email={pendingVerificationEmail}
        onBackToLogin={handleBackToLogin}
      />
    );
  }

  if (view === ViewState.AUTH) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex font-sans text-zinc-900 dark:text-zinc-200 transition-colors duration-200">
        {notification && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-zinc-800 text-white px-6 py-3 rounded-md shadow-lg z-50 animate-in fade-in slide-in-from-top-4 border border-white/10 flex items-center gap-2">
            <Mail size={16} className="text-indigo-400" />
            {notification}
          </div>
        )}

        {/* Left Side - Hero */}
        <div className="hidden lg:flex lg:w-1/2 bg-zinc-50 dark:bg-zinc-900 relative overflow-hidden items-center justify-center p-12 border-r border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
           {/* Professional Subtle Gradient */}
           <div className="absolute inset-0 bg-white dark:bg-zinc-900">
               <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px]"></div>
               <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]"></div>
           </div>
           
           <div className="relative z-10 max-w-lg">
               <div className="w-12 h-12 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center justify-center mb-8 shadow-xl">
                   <Logo className="w-6 h-6" />
               </div>
               <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-6 leading-tight tracking-tight font-lato">
                   Synapse<span className="text-zinc-400 dark:text-zinc-500">Sync</span> Enterprise
               </h1>
               <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-10 leading-relaxed font-light">
                   Ensure your personal notes and company documents stay up-to-date effortlessly with AI-powered monitoring.
               </p>
               
               <div className="space-y-6">
                   <div className="flex items-start gap-4">
                       <div className="w-10 h-10 rounded bg-white dark:bg-zinc-800/50 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                           <Sparkles className="text-indigo-500 dark:text-indigo-400 w-5 h-5" />
                       </div>
                       <div>
                           <h3 className="font-medium text-zinc-900 dark:text-white text-base mb-1">Deep Learning Analysis</h3>
                           <p className="text-sm text-zinc-600 dark:text-zinc-500">Context-aware insights across your entire knowledge base.</p>
                       </div>
                   </div>
                   
                   <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded bg-white dark:bg-zinc-800/50 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                           <Clock className="text-emerald-500 dark:text-emerald-400 w-5 h-5" />
                       </div>
                       <div>
                           <h3 className="font-medium text-zinc-900 dark:text-white text-base mb-1">Granular Versioning</h3>
                           <p className="text-sm text-zinc-600 dark:text-zinc-500">Restore points with millisecond precision and full audit logs.</p>
                       </div>
                   </div>
               </div>
           </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="flex-1 flex items-center justify-center p-4 lg:p-12">
            <div className="w-full max-w-[380px] z-10">
               <div className="bg-white dark:bg-zinc-900 p-8 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-xl transition-all duration-200">
                   {isForgotPassword ? (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        {isResetSuccess ? (
                          <div className="text-center">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                              <Check size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Check your inbox</h2>
                            <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6">
                              We sent a recovery link to <span className="text-zinc-900 dark:text-white font-medium">{email}</span>
                            </p>
                            <Button 
                              onClick={handleBackToLogin}
                              className="w-full"
                              size="md"
                            >
                              Return to Login
                            </Button>
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={handleBackToLogin}
                              className="flex items-center text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-6 transition-colors"
                            >
                              <ArrowLeft size={14} className="mr-1" /> BACK
                            </button>
                            
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Reset Password</h2>
                            <p className="text-zinc-600 dark:text-zinc-500 text-sm mb-6">
                              Enter your email to receive recovery instructions.
                            </p>
                            
                            <form onSubmit={handleSendResetLink} className="space-y-4">
                              <Input 
                                label="Work Email" 
                                type="email" 
                                placeholder="name@company.com" 
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                className="placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                                disabled={isAuthLoading}
                                autoFocus
                              />
                              <Button 
                                type="submit" 
                                isLoading={isAuthLoading}
                                className="w-full mt-2" 
                                size="md"
                              >
                                Send Link
                              </Button>
                            </form>
                          </>
                        )}
                      </div>
                   ) : (
                     <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                       <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">
                         {isRegistering ? 'Create Account' : 'Welcome Back'}
                       </h2>
                       <p className="text-zinc-600 dark:text-zinc-500 text-sm mb-8">
                           {isRegistering ? 'Initialize your workspace.' : 'Enter your credentials to access.'}
                       </p>
                       
                       <form onSubmit={handleAuth} className="space-y-4">
                         <Input 
                             label="Email" 
                             type="email" 
                             placeholder="name@company.com" 
                             value={email}
                             onChange={e => setEmail(e.target.value)}
                             required
                             className="placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                             disabled={isAuthLoading}
                         />
                         <div>
                           <Input 
                             label="Password" 
                             type="password" 
                             placeholder="••••••••" 
                             value={password}
                             onChange={e => setPassword(e.target.value)}
                             required
                             className="placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                             disabled={isAuthLoading}
                           />
                           {!isRegistering && (
                             <div className="flex justify-end pt-1.5">
                               <button 
                                 type="button"
                                 onClick={handleShowForgotPassword}
                                 className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
                               >
                                 Forgot password?
                               </button>
                             </div>
                           )}
                         </div>
  
                         {isRegistering && (
                              <Input 
                                label="Confirm Password" 
                                type="password" 
                                placeholder="••••••••" 
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                                className="placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                                disabled={isAuthLoading}
                              />
                         )}
                         
                         <Button 
                          type="submit" 
                          isLoading={isAuthLoading}
                          className="w-full mt-2" 
                          size="md"
                         >
                           {isRegistering ? 'Sign Up' : 'Sign In'}
                         </Button>
                       </form>
  
                       <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-center">
                         <p className="text-zinc-600 dark:text-zinc-500 text-xs mb-3">
                            {isRegistering ? 'Existing user?' : "New to SynapseSync?"}
                         </p>
                         <button 
                           onClick={() => {
                             setIsRegistering(!isRegistering);
                             setNotification(null);
                           }}
                           className="text-zinc-800 dark:text-zinc-300 text-sm hover:text-indigo-600 dark:hover:text-white transition-colors font-medium"
                           disabled={isAuthLoading}
                         >
                           {isRegistering ? 'Log in here' : 'Create an account'}
                         </button>
                       </div>
                     </div>
                   )}
               </div>
            </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center">
         <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-500 animate-spin" />
            <p className="text-zinc-600 dark:text-zinc-500 text-sm font-medium animate-pulse tracking-wide">INITIALIZING SYSTEM...</p>
         </div>
      </div>
    );
  }

  const selectedFile = files.find(f => f.id === selectedFileId);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex flex-col text-zinc-900 dark:text-zinc-200 relative font-sans transition-colors duration-200">
      {/* GLOBAL BLOCKING OVERLAY */}
      {isBlockingSync && (
        <div className="fixed inset-0 z-[100] bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm flex flex-col items-center justify-center cursor-wait">
            <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-500 animate-spin mb-4" />
            <p className="text-zinc-600 dark:text-zinc-400 text-sm tracking-widest font-medium uppercase">Synchronizing</p>
        </div>
      )}

      {notification && (
        <div className="fixed top-20 right-4 bg-zinc-800 text-white px-5 py-3 rounded shadow-lg z-50 animate-in fade-in slide-in-from-right-4 flex items-center gap-3 border border-zinc-700">
          <Mail size={16} className="text-indigo-400" />
          <span className="text-sm">{notification}</span>
        </div>
      )}
      
      {isSyncing && !isBlockingSync && (
         <div className="fixed bottom-4 right-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur text-zinc-600 dark:text-zinc-400 px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 text-xs flex items-center gap-2 z-50 shadow-sm">
           <Cloud size={12} className="text-indigo-500 animate-pulse" />
           Syncing...
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
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Documents</h1>
              <p className="text-zinc-600 dark:text-zinc-500 text-sm mt-1">Manage your secure file repository.</p>
              
              {/* Loop Interval Display/Selector */}
              <div className="mt-4 inline-flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">AI Update Cycle</span>
                <div className="h-px w-8 bg-zinc-300 dark:bg-zinc-800"></div>
                
                {user.tier === 'FREE' ? (
                  <span className="text-xs font-mono text-zinc-600 dark:text-zinc-300">14 Days (Locked)</span>
                ) : (
                  <select 
                    value={user.autoUpdateInterval} 
                    onChange={handleLoopChange}
                    className="bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-800 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                  >
                    {user.tier === 'PREMIUM' && <option value={7}>7 Days</option>}
                    <option value={14}>14 Days</option>
                    <option value={30}>30 Days</option>
                  </select>
                )}
              </div>
            </div>
            
            {files.length > 0 && (
              <div className="flex gap-3">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept=".doc,.docx,.txt,.md"
                />
                <Button variant="outline" onClick={handleUploadClick} size="sm">
                  <Upload size={14} className="mr-2" />
                  Upload
                </Button>
                <Button onClick={handleStartConnectDrive} size="sm" variant="secondary">
                  <Plus size={14} className="mr-2" />
                  Connect Drive
                </Button>
              </div>
            )}
          </div>

          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 px-4 text-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/20">
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-full mb-6 ring-1 ring-zinc-200 dark:ring-zinc-800 shadow-xl">
                <Upload size={32} className="text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">Repository Empty</h3>
              <p className="text-zinc-600 dark:text-zinc-500 max-w-md mb-8 text-sm">
                Initialize your workspace by uploading documents or connecting an external drive.
              </p>
              <div className="flex gap-3">
                 <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept=".doc,.docx,.txt,.md"
                 />
                 <Button onClick={handleUploadClick} size="md">
                    <Upload size={16} className="mr-2" />
                    Upload File
                 </Button>
                 <Button onClick={handleStartConnectDrive} variant="outline" size="md">
                    <Plus size={16} className="mr-2" />
                    Connect Drive
                 </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {files.map(file => (
                <div 
                  key={file.id}
                  onClick={() => handleSelectFile(file.id)}
                  className="bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col"
                >
                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded ${
                        file.type === 'sheet' 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-500' 
                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                      }`}>
                        {getFileIcon(file.type)}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          type="button"
                          onClick={(e) => handleDeleteFile(e, file.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-200 mb-1 group-hover:text-indigo-600 dark:group-hover:text-white transition-colors truncate">
                      {file.title}
                    </h3>
                    
                    <div className="flex items-center gap-3 mt-2">
                      <p className="text-xs text-zinc-500 dark:text-zinc-500 font-mono">
                        {new Date(file.lastUpdated).toLocaleDateString()}
                      </p>
                      {file.versions && file.versions.length > 0 && (
                         <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                           v{file.versions.length + 1}
                         </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="px-4 py-2 border-t border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between gap-2 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-b-md">
                     <span className="flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-500 shrink-0">
                       <Lock size={10} /> <span className="hidden sm:inline">ENCRYPTED</span>
                     </span>
                     {file.autoUpdateEnabled && (
                        <span className="text-emerald-600 dark:text-emerald-500 font-bold flex items-center justify-end gap-1.5 text-[9px] uppercase tracking-wide whitespace-nowrap">
                          AI ACTIVE <RefreshCw size={10} className="shrink-0" />
                        </span>
                     )}
                  </div>
                </div>
              ))}
            </div>
          )}
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