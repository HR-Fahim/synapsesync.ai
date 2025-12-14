import React, { useState, useRef, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { FileViewer } from './components/FileViewer';
import { GoogleAuth } from './components/GoogleAuth';
import { FilePicker } from './components/FilePicker';
import { SubscriptionModal } from './components/SubscriptionModal';
import { EmailVerification } from './components/EmailVerification';
import { User, DocFile, ViewState, FileVersion, SubscriptionTier } from './types';
import { FileText, FileSpreadsheet, Plus, Lock, Mail, Upload, FileType, RefreshCw, BrainCircuit, Trash2, ArrowLeft, Sparkles, Clock, ShieldCheck, Check, Loader2, Cloud, CloudOff } from 'lucide-react';
import { auth } from './services/firebase';
import { StorageService } from './services/storage';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>(ViewState.AUTH);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false); 
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Forgot Password State
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetSuccess, setIsResetSuccess] = useState(false);

  // App Data State
  const [files, setFiles] = useState<DocFile[]>([]); 
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false); // New state for background sync
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
        
        // Force refresh token to get latest emailVerified status
        try {
          await firebaseUser.reload();
        } catch (e) {
          console.warn("Could not reload user profile", e);
        }
        
        // Re-check verification after reload
        if (!auth.currentUser?.emailVerified) {
          setUser(null);
          setIsDataLoading(false);
          setIsAuthLoading(false); // Ensure loading is off
          setView(curr => (curr === ViewState.EMAIL_VERIFICATION ? curr : ViewState.AUTH));
          return;
        }

        // --- AUTHENTICATED & VERIFIED ---
        setView(curr => {
            if (curr === ViewState.AUTH || curr === ViewState.EMAIL_VERIFICATION) {
              return ViewState.DASHBOARD;
            }
            return curr;
        });
        
        setIsDataLoading(true);

        try {
          const userId = firebaseUser.uid;
          
          // 1. Fetch User Profile (Cloud First)
          let currentUser = await StorageService.getUserProfile(userId);
          
          if (!currentUser) {
            // New User Initialization
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

          // 2. Fetch Files List (Cloud First)
          // This retrieves metadata only (id, title, version count) for speed
          const userFiles = await StorageService.getUserFiles(userId);
          setFiles(userFiles);

        } catch (error) {
          console.error("Data Initialization Error:", error);
          showNotification("Offline Mode: Showing cached data.");
          
           // Fallback to minimal user object if offline
           if (!user) {
              setUser({
                  id: firebaseUser.uid,
                  name: firebaseUser.displayName || 'User',
                  email: firebaseUser.email || '',
                  tier: 'FREE', editsUsed: 0, lastEditReset: new Date().toISOString(), autoUpdateInterval: 14
              });
           }
        } finally {
          setIsDataLoading(false);
          setIsAuthLoading(false); 
        }

      } else {
        // Not authenticated
        setUser(null);
        setFiles([]);
        setView(curr => (curr === ViewState.AUTH ? curr : ViewState.AUTH));
        setIsAuthLoading(false); 
        setIsDataLoading(false);
      }
    });
    return () => unsubscribe();
  }, []); 

  // Check and Reset Weekly Edits
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

  // Authentication Handlers
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
    
    setIsSyncing(true);
    StorageService.uploadFile(user.id, newFile)
      .then(() => showNotification(`Imported "${driveFile.name}" successfully`))
      .catch(() => showNotification("Saved locally (Sync pending)"))
      .finally(() => setIsSyncing(false));
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

      // 1. Optimistic UI Update
      setFiles(prev => [...prev, newFile]);
      showNotification(`Uploading "${fileName}"...`);
      setIsSyncing(true);
      
      // 2. Cloud Sync
      StorageService.uploadFile(user.id, newFile)
        .then(() => showNotification("Upload complete."))
        .catch((error) => {
           console.warn("Upload fallback", error);
           showNotification(`File "${fileName}" saved offline.`);
        })
        .finally(() => setIsSyncing(false));

      // 3. Reset Input
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

    // Check if the file is a 'lite' version (metadata only) from Firestore listing
    // OR if the content is empty string (which indicates lite version loaded from cache)
    if (file._isLite || !file.currentContent) {
      setIsDataLoading(true);
      try {
        const fullFile = await StorageService.loadFullFile(user.id, id);
        if (fullFile) {
           // Update the file list with the full content AND history
           setFiles(prev => prev.map(f => f.id === id ? fullFile : f));
        } else {
           showNotification("Could not download file content.");
        }
      } catch (error) {
        console.error("Failed to load file content", error);
        showNotification("Failed to load content.");
      }
      setIsDataLoading(false);
    }

    setSelectedFileId(id);
    setView(ViewState.FILE_DETAIL);
  };

  const handleDeleteFile = async (e: React.MouseEvent, fileId: string) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    if (!user) return;
    
    // Optimistic Delete
    setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId));
    if (selectedFileId === fileId) {
      setSelectedFileId(null);
      setView(ViewState.DASHBOARD);
    }

    // Sync
    try {
      await StorageService.deleteFile(user.id, fileId);
      showNotification('File deleted.');
    } catch (error) {
      showNotification('File deleted (offline).');
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

    // 1. Update User State (Edit Counts)
    let updatedUser = user;
    if (!isAutoSave) {
       updatedUser = { ...user, editsUsed: user.editsUsed + 1 };
       setUser(updatedUser);
       // Save user profile in background
       StorageService.saveUserProfile(updatedUser).catch(console.error);
    }

    const currentTime = new Date();
    const versionLabel = isAutoSave 
      ? `Auto-Save ${currentTime.toLocaleTimeString()}`
      : `Saved ${currentTime.toLocaleTimeString()}`;

    // Ensure versions array exists
    const currentVersions = fileToUpdate.versions || [];

    const newVersion: FileVersion = {
      id: Date.now().toString(),
      timestamp: currentTime.toISOString(),
      content: fileToUpdate.currentContent,
      versionLabel: versionLabel
    };

    const updatedFile: DocFile = {
      ...fileToUpdate,
      currentContent: newContent,
      lastUpdated: currentTime.toISOString(),
      versions: [...currentVersions, newVersion],
      _isLite: false 
    };

    // 2. Optimistic File Update
    setFiles(prevFiles => prevFiles.map(file => file.id === fileId ? updatedFile : file));
    
    if (!isAutoSave) showNotification("Saving...");

    // 3. Background Sync
    setIsSyncing(true);
    StorageService.uploadFile(user.id, updatedFile)
      .then(() => {
         if (!isAutoSave) showNotification("Saved successfully");
      })
      .catch((error) => {
         console.warn("Save failed", error);
         showNotification("Saved locally (Sync pending)");
      })
      .finally(() => setIsSyncing(false));
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

    const updatedFile: DocFile = {
      ...file,
      currentContent: versionToRestore.content,
      lastUpdated: new Date().toISOString(),
      versions: [...file.versions, backupVersion],
      _isLite: false
    };

    // Optimistic Restore
    setFiles(prevFiles => prevFiles.map(f => f.id === fileId ? updatedFile : f));
    showNotification(`Restoring version...`);

    setIsSyncing(true);
    StorageService.uploadFile(user.id, updatedFile)
      .then(() => showNotification("Version restored"))
      .catch(() => showNotification("Restored locally"))
      .finally(() => setIsSyncing(false));
  };

  const handleToggleAutoUpdate = async (fileId: string) => {
    if (!user) return;

    const file = files.find(f => f.id === fileId);
    if (!file) return;
    
    const newState = !file.autoUpdateEnabled;
    const updatedFile = { ...file, autoUpdateEnabled: newState };

    // Optimistic Toggle
    setFiles(prevFiles => prevFiles.map(f => f.id === fileId ? updatedFile : f));
    showNotification(`AI Auto-Update ${newState ? 'Enabled' : 'Disabled'}`);

    setIsSyncing(true);
    StorageService.uploadFile(user.id, updatedFile)
      .catch(() => {})
      .finally(() => setIsSyncing(false));
  };

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (user) {
      const updatedUser = { ...user, tier: tier, autoUpdateInterval: 14 };
      setUser(updatedUser);
      // Persist upgrade
      try {
        await StorageService.saveUserProfile(updatedUser);
        showNotification(`Successfully upgraded to ${tier} plan!`);
      } catch (error) {
        showNotification(`Upgraded to ${tier} (Offline mode).`);
      }
    }
  };

  const handleLoopChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (user) {
      const updatedUser = { ...user, autoUpdateInterval: parseInt(e.target.value) };
      setUser(updatedUser);
      // Ensure this setting is persisted to DB
      setIsSyncing(true);
      StorageService.saveUserProfile(updatedUser)
        .then(() => showNotification("Settings saved"))
        .catch(() => showNotification("Settings saved locally"))
        .finally(() => setIsSyncing(false));
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
      <div className="min-h-screen bg-slate-950 flex font-sans">
        {notification && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-4 border border-white/10 flex items-center gap-2">
            <Mail size={16} className="text-blue-400" />
            {notification}
          </div>
        )}

        {/* Left Side - Hero (Hidden on Mobile) */}
        <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center p-12 border-r border-white/5">
           {/* Animated Gradient Background */}
           <div className="absolute inset-0 bg-slate-900">
               <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] animate-pulse"></div>
               <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
           </div>
           
           <div className="relative z-10 max-w-lg">
               <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-blue-900/30">
                   <BrainCircuit className="text-white w-8 h-8" />
               </div>
               <h1 className="text-5xl font-bold text-white mb-6 leading-tight tracking-tight">
                   SynapseSync<span className="text-blue-500">.AI</span>
               </h1>
               <p className="text-xl text-slate-400 mb-10 leading-relaxed">
                   Elevate your documentation with intelligent AI analysis, seamless version control, and real-time collaboration tools.
               </p>
               
               <div className="space-y-8">
                   <div className="flex items-start gap-4 group">
                       <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-white/10 group-hover:border-blue-500/50 group-hover:bg-blue-900/20 transition-all">
                           <Sparkles className="text-blue-400 w-6 h-6 group-hover:scale-110 transition-transform" />
                       </div>
                       <div>
                           <h3 className="font-semibold text-white text-lg mb-1">AI-Powered Insights</h3>
                           <p className="text-slate-400">Instantly chat with your documents to extract summaries, insights, and answers.</p>
                       </div>
                   </div>
                   
                   <div className="flex items-start gap-4 group">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-white/10 group-hover:border-purple-500/50 group-hover:bg-purple-900/20 transition-all">
                           <Clock className="text-purple-400 w-6 h-6 group-hover:scale-110 transition-transform" />
                       </div>
                       <div>
                           <h3 className="font-semibold text-white text-lg mb-1">Time Travel</h3>
                           <p className="text-slate-400">Automated version snapshots allow you to restore any point in history effortlessly.</p>
                       </div>
                   </div>

                   <div className="flex items-start gap-4 group">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-white/10 group-hover:border-green-500/50 group-hover:bg-green-900/20 transition-all">
                           <ShieldCheck className="text-green-400 w-6 h-6 group-hover:scale-110 transition-transform" />
                       </div>
                       <div>
                           <h3 className="font-semibold text-white text-lg mb-1">Secure & Private</h3>
                           <p className="text-slate-400">Enterprise-grade security ensures your intellectual property remains protected.</p>
                       </div>
                   </div>
               </div>
           </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="flex-1 flex items-center justify-center p-4 lg:p-12 relative overflow-hidden">
            {/* Mobile Background decoration */}
            <div className="absolute top-[-20%] right-[-20%] w-[300px] h-[300px] bg-blue-600/20 rounded-full blur-3xl lg:hidden"></div>
            
            <div className="w-full max-w-md z-10">
               {/* Mobile Header */}
               <div className="lg:hidden text-center mb-10">
                   <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl mb-6 shadow-lg">
                      <BrainCircuit className="text-white w-7 h-7" />
                   </div>
                   <h2 className="text-3xl font-bold text-white">SynapseSync.AI</h2>
                   <p className="text-slate-400 mt-2">Intelligent Document Management</p>
               </div>

               <div className="bg-slate-900/80 p-8 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md">
                   {/* Auth View */}
                   {isForgotPassword ? (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        {isResetSuccess ? (
                          <div className="text-center">
                            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-green-500/50">
                              <Check size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Check your inbox</h2>
                            <p className="text-slate-400 mb-8">
                              We sent you a password change link to <br/>
                              <span className="text-white font-medium">{email}</span>
                            </p>
                            <Button 
                              onClick={handleBackToLogin}
                              className="w-full"
                              size="lg"
                            >
                              Sign In
                            </Button>
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={handleBackToLogin}
                              className="flex items-center text-sm text-slate-500 hover:text-white mb-6 transition-colors"
                            >
                              <ArrowLeft size={16} className="mr-1" /> Back
                            </button>
                            
                            <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
                            <p className="text-slate-400 mb-8">
                              Enter your email address and we'll send you a link to reset your password.
                            </p>
                            
                            <form onSubmit={handleSendResetLink} className="space-y-5">
                              <div className="space-y-1">
                                <Input 
                                  label="Email Address" 
                                  type="email" 
                                  placeholder="you@company.com" 
                                  value={email}
                                  onChange={e => setEmail(e.target.value)}
                                  required
                                  className="bg-slate-950 border-slate-800 focus:bg-slate-900"
                                  disabled={isAuthLoading}
                                  autoFocus
                                />
                              </div>
                              
                              <Button 
                                type="submit" 
                                isLoading={isAuthLoading}
                                className="w-full py-3 mt-4 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-none shadow-lg shadow-blue-900/20" 
                                size="lg"
                              >
                                Get Reset Link
                              </Button>
                            </form>
                          </>
                        )}
                      </div>
                   ) : (
                     <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                       <h2 className="text-2xl font-bold text-white mb-2">
                         {isRegistering ? 'Create an Account' : 'Welcome Back'}
                       </h2>
                       <p className="text-slate-400 mb-8">
                           {isRegistering ? 'Start your journey with AI-powered docs.' : 'Sign in to access your workspace.'}
                       </p>
                       
                       <form onSubmit={handleAuth} className="space-y-5">
                         <div className="space-y-1">
                           <Input 
                             label="Email Address" 
                             type="email" 
                             placeholder="you@company.com" 
                             value={email}
                             onChange={e => setEmail(e.target.value)}
                             required
                             className="bg-slate-950 border-slate-800 focus:bg-slate-900"
                             disabled={isAuthLoading}
                           />
                         </div>
                         <div className="space-y-1">
                           <Input 
                             label="Password" 
                             type="password" 
                             placeholder="••••••••" 
                             value={password}
                             onChange={e => setPassword(e.target.value)}
                             required
                             className="bg-slate-950 border-slate-800 focus:bg-slate-900"
                             disabled={isAuthLoading}
                           />
                           {!isRegistering && (
                             <div className="flex justify-end pt-1">
                               <button 
                                 type="button"
                                 onClick={handleShowForgotPassword}
                                 className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                               >
                                 Forgot Password?
                               </button>
                             </div>
                           )}
                         </div>
  
                         {isRegistering && (
                            <div className="space-y-1">
                              <Input 
                                label="Confirm Password" 
                                type="password" 
                                placeholder="••••••••" 
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                                className="bg-slate-950 border-slate-800 focus:bg-slate-900"
                                disabled={isAuthLoading}
                              />
                            </div>
                         )}
                         
                         <Button 
                          type="submit" 
                          isLoading={isAuthLoading}
                          className="w-full py-3 mt-4 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-none shadow-lg shadow-blue-900/20" 
                          size="lg"
                         >
                           {isRegistering ? 'Sign Up' : 'Sign In'}
                         </Button>
                       </form>
  
                       <div className="mt-8 pt-6 border-t border-white/5 text-center">
                         <p className="text-slate-500 text-sm mb-3">
                            {isRegistering ? 'Already have an account?' : "Don't have an account?"}
                         </p>
                         <button 
                           onClick={() => {
                             setIsRegistering(!isRegistering);
                             setNotification(null);
                           }}
                           className="text-white font-medium hover:text-blue-400 transition-colors border border-white/10 bg-white/5 px-6 py-2 rounded-lg hover:bg-white/10 w-full"
                           title={isRegistering ? 'Switch to Sign In' : 'Switch to Sign Up'}
                           disabled={isAuthLoading}
                         >
                           {isRegistering ? 'Sign In to Existing Account' : 'Create New Account'}
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

  // --- LOADING STATE (Prevent Black Screen) ---
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
         <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-slate-400 text-lg animate-pulse">Initializing SynapseSync...</p>
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
      
      {/* Background Sync Indicator */}
      {isSyncing && (
         <div className="fixed bottom-4 right-4 bg-slate-800/80 backdrop-blur text-slate-400 px-4 py-2 rounded-full border border-white/5 text-xs flex items-center gap-2 z-50 animate-pulse">
           <Cloud size={14} className="text-blue-400" />
           Syncing changes...
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

          {isDataLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
              <Loader2 size={48} className="animate-spin mb-4" />
              <p>Syncing with Cloud Storage...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/30">
              <div className="bg-slate-800/50 p-6 rounded-full mb-6 ring-1 ring-white/10">
                <Upload size={48} className="text-slate-500" strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">No files found</h3>
              <p className="text-slate-400 max-w-md mb-8 text-lg">
                Upload your documents or connect Google Drive to start analyzing them with AI.
              </p>
              <div className="flex gap-4">
                 <Button onClick={handleUploadClick} size="lg">
                    <Upload size={20} className="mr-2" />
                    Upload File
                 </Button>
                 <Button onClick={handleStartConnectDrive} variant="outline" size="lg">
                    <Plus size={20} className="mr-2" />
                    Connect Drive
                 </Button>
              </div>
            </div>
          ) : (
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
                        {(file.versions && file.versions.length > 0) && (
                           <span className="bg-slate-800 text-slate-400 text-xs font-medium px-2 py-1 rounded-full border border-slate-700">
                             {file.versions.length} versions
                           </span>
                        )}
                        <button 
                          type="button"
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