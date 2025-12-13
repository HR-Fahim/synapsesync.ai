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
import { FileText, FileSpreadsheet, Plus, Lock, Mail, Upload, FileType, RefreshCw, BrainCircuit, Trash2, ArrowLeft, Sparkles, Clock, ShieldCheck, Check } from 'lucide-react';
import { auth } from './services/firebase';

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
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Forgot Password State
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetSuccess, setIsResetSuccess] = useState(false);

  // App Data State
  const [files, setFiles] = useState<DocFile[]>(MOCK_FILES);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [showSubscription, setShowSubscription] = useState(false);

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        // Enforce email verification standard practice
        if (!firebaseUser.emailVerified) {
          // If the user exists but isn't verified, we don't log them into the app state.
          // We assume handleAuth manages the flow for new signups.
          // For reloading pages, we effectively treat them as logged out.
          setUser(null);
          // Only switch to AUTH if we aren't currently in the verification flow
          if (view !== ViewState.EMAIL_VERIFICATION) {
             setView(ViewState.AUTH);
          }
          return;
        }

        // Map Firebase user to App User
        setUser(prevUser => ({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          tier: prevUser?.tier || 'FREE', 
          editsUsed: prevUser?.editsUsed || 0,
          lastEditReset: prevUser?.lastEditReset || new Date().toISOString(),
          autoUpdateInterval: prevUser?.autoUpdateInterval || 14
        }));
        if (view === ViewState.AUTH || view === ViewState.EMAIL_VERIFICATION) {
          setView(ViewState.DASHBOARD);
        }
      } else {
        setUser(null);
        if (view !== ViewState.EMAIL_VERIFICATION) {
          setView(ViewState.AUTH);
        }
      }
    });
    return () => unsubscribe();
  }, [view]);

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

        // Firebase Sign Up
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const name = email.split('@')[0];
        
        if (userCredential.user) {
          await userCredential.user.updateProfile({
            displayName: name
          });

          // Send Verification Email
          await userCredential.user.sendEmailVerification();
          
          // Important: Sign out immediately to prevent auto-login
          await auth.signOut();
          
          setPendingVerificationEmail(email);
          setView(ViewState.EMAIL_VERIFICATION);
          // Do not set notification here as the new view explains it
        }
        
      } else {
        // Firebase Login
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        // Check Email Verification
        if (userCredential.user && !userCredential.user.emailVerified) {
          await auth.signOut();
          showNotification('Please verify your email address to log in.');
          setIsAuthLoading(false);
          return;
        }

        showNotification('Signed in successfully.');
      }
      // View transition handled by onAuthStateChanged for successful login
    } catch (error: any) {
      console.error(error);
      let msg = "Authentication failed.";
      if (error.code === 'auth/email-already-in-use') msg = "That email is already in use.";
      if (error.code === 'auth/invalid-credential') msg = "Invalid email or password.";
      if (error.code === 'auth/user-not-found') msg = "No user found with this email.";
      if (error.code === 'auth/wrong-password') msg = "Incorrect password.";
      if (error.code === 'auth/too-many-requests') msg = "Too many failed attempts. Please try again later.";
      showNotification(msg);
    } finally {
      // Only clear loading if we aren't switching to verification view (which is static)
      // and if we aren't successful (which relies on onAuthStateChanged)
      if (view === ViewState.AUTH && !isRegistering) {
         setIsAuthLoading(false);
      } else if (isRegistering && view !== ViewState.EMAIL_VERIFICATION) {
         setIsAuthLoading(false);
      } else if (!isRegistering) {
         setIsAuthLoading(false);
      }
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
      // Directly call sendPasswordResetEmail to avoid rate limits from double-checking user existence
      await auth.sendPasswordResetEmail(cleanEmail);
      
      setIsResetSuccess(true);
      // We don't show a notification here because the UI changes to the success view immediately
    } catch (error: any) {
      console.error("Reset Password Error:", error);
      let msg = "Failed to send reset email. Please try again.";
      
      switch (error.code) {
        case 'auth/invalid-email':
          msg = "Please enter a valid email address.";
          break;
        case 'auth/user-not-found':
          msg = "No account found with this email.";
          break;
        case 'auth/too-many-requests':
          msg = "Too many requests. Please wait a few minutes before trying again.";
          break;
        default:
          if (error.message) msg = error.message;
      }

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
    setIsRegistering(false); // Ensure we are on login tab
    setView(ViewState.AUTH);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      // State reset handled by onAuthStateChanged
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
    
    // Immediate deletion without confirmation as requested
    setFiles(prevFiles => {
      const updatedFiles = prevFiles.filter(f => f.id !== fileId);
      return updatedFiles;
    });
    
    if (selectedFileId === fileId) {
      setSelectedFileId(null);
      setView(ViewState.DASHBOARD);
    }
    showNotification('File deleted successfully.');
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

        // Added email notification simulation message
        const msg = isAutoSave 
          ? `File "${file.title}" auto-updated. Email notification sent.` 
          : `File "${file.title}" saved successfully. Email notification sent.`;
        
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

          {files.length === 0 ? (
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
                        {file.versions.length > 0 && (
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

export default App;