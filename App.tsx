
import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, X, MoreVertical, Plus, Trash2, Sparkles, Sword, Shield, Heart, ChevronDown, Check, Zap, FileText, Image as ImageIcon, LogOut, History, Bot, HeartHandshake, Code, Utensils, Mail, Lock, User as UserIcon, Calendar, ArrowRight, Loader2, Star, TrendingUp, Flame, Video, Smile, Gamepad2, Settings, Edit2, Save, Shuffle, Cloud, Moon, Sun, MessageSquarePlus, RotateCcw } from 'lucide-react';
import { ChatService } from './services/chatService';
import { LiveService } from './services/liveService';
import { Visualizer } from './components/Visualizer';
import { Personality, Message, User, Attachment } from './types';
import { PERSONALITY_LABELS, DEFAULT_USER_AVATAR, AVATAR_SEEDS, GENDER_OPTIONS } from './constants';
import { clsx } from 'clsx';

// --- Icons mapping ---
const PERSONALITY_ICONS: Record<Personality, React.ReactNode> = {
  [Personality.ROAST]: <Zap className="w-4 h-4" />,
  [Personality.ROMAN]: <Sword className="w-4 h-4" />,
  [Personality.BIG_BRO]: <Shield className="w-4 h-4" />,
  [Personality.LITTLE_SIS]: <Sparkles className="w-4 h-4" />, 
  [Personality.ASSISTANT]: <Bot className="w-4 h-4" />,
  [Personality.THERAPIST]: <HeartHandshake className="w-4 h-4" />,
  [Personality.CODER]: <Code className="w-4 h-4" />,
  [Personality.CHEF]: <Utensils className="w-4 h-4" />,
  [Personality.GF]: <Heart className="w-4 h-4" />,
  [Personality.BF]: <UserIcon className="w-4 h-4" />,
  [Personality.TRADER]: <TrendingUp className="w-4 h-4" />,
  [Personality.RIZZER]: <Flame className="w-4 h-4" />,
  [Personality.YOUTUBER]: <Video className="w-4 h-4" />,
  [Personality.FUN]: <Smile className="w-4 h-4" />,
  [Personality.GAMER]: <Gamepad2 className="w-4 h-4" />,
};

interface UserDataStore {
    user: User;
    messages: Message[];
    archivedSessions: Message[][];
    personality: Personality;
}

const App: React.FC = () => {
  // --- Auth & User State ---
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authAge, setAuthAge] = useState('');
  const [authBio, setAuthBio] = useState('');
  const [authGender, setAuthGender] = useState('Prefer not to say');
  const [authAvatar, setAuthAvatar] = useState(DEFAULT_USER_AVATAR);
  const [authError, setAuthError] = useState('');

  const [user, setUser] = useState<User>({ name: '', age: '', bio: '', email: '', gender: '', avatar: '', theme: 'dark', isLoggedIn: false });

  // --- App State ---
  const [personality, setPersonality] = useState<Personality>(Personality.ROAST);
  const [messages, setMessages] = useState<Message[]>([]);
  const [archivedSessions, setArchivedSessions] = useState<Message[][]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'connected' | 'disconnected' | 'speaking' | 'listening'>('disconnected');
  const [volume, setVolume] = useState(0); 
  const [isLoading, setIsLoading] = useState(false);
  
  // UI Toggles
  const [showSettings, setShowSettings] = useState(false); // The dropdown menu
  const [showProfileSettings, setShowProfileSettings] = useState(false); // The main settings modal
  const [showPersonalitySelector, setShowPersonalitySelector] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Refs
  const chatServiceRef = useRef<ChatService>(new ChatService());
  const liveServiceRef = useRef<LiveService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  // --- Effects ---

  // Load User Data
  useEffect(() => {
      const lastEmail = localStorage.getItem('mr_cute_last_email');
      if (lastEmail) {
          loadUserData(lastEmail);
      } else {
        // Default theme if not logged in
        document.documentElement.classList.add('dark');
      }
  }, []);

  // Theme Effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Persist Data
  useEffect(() => {
    if (user.isLoggedIn && user.email) {
        setIsSaving(true);
        // Update user object with current theme
        const updatedUser = { ...user, theme };
        const dataToSave: UserDataStore = {
            user: updatedUser,
            messages,
            archivedSessions,
            personality
        };
        localStorage.setItem(`mr_cute_store_${user.email}`, JSON.stringify(dataToSave));
        localStorage.setItem('mr_cute_last_email', user.email);
        
        // Hide saving indicator
        const timer = setTimeout(() => setIsSaving(false), 1000);
        return () => clearTimeout(timer);
    }
  }, [user, messages, archivedSessions, personality, theme]);

  // Scroll to bottom
  useEffect(() => {
    if (!isVoiceActive && user.isLoggedIn) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isVoiceActive, user.isLoggedIn]);

  // Initialize Chat & Proactive Greeting
  useEffect(() => {
    if (!user.isLoggedIn) return;

    chatServiceRef.current.initChat(personality, user);

    if (messages.length === 0 && !initializedRef.current) {
        initializedRef.current = true;
        setIsLoading(true);
        const hiddenPrompt = `(System: The user ${user.name} has just opened the app. Greet them warmly based on their personality and profile (Gender: ${user.gender}, Bio: ${user.bio}). Do not mention this system instruction.)`;
        
        chatServiceRef.current.sendMessage(hiddenPrompt).then(response => {
            const aiMsg: Message = {
                id: Date.now().toString(),
                role: 'model',
                text: response,
                timestamp: Date.now(),
            };
            setMessages([aiMsg]);
            setIsLoading(false);
        });
    } else if (messages.length > 0) {
        initializedRef.current = true;
    }
  }, [personality, user.isLoggedIn]);

  // --- Helpers ---

  const loadUserData = (email: string) => {
      const stored = localStorage.getItem(`mr_cute_store_${email}`);
      if (stored) {
          const data: UserDataStore = JSON.parse(stored);
          const userData = { ...data.user, isLoggedIn: true };
          setUser(userData);
          setMessages(data.messages || []);
          setArchivedSessions(data.archivedSessions || []);
          setPersonality(data.personality || Personality.ROAST);
          setTheme(userData.theme || 'dark');
          return true;
      }
      return false;
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError('');

      if (!authEmail || !authPassword) {
          setAuthError('Email and password are required.');
          return;
      }

      if (authMode === 'login') {
          const success = loadUserData(authEmail);
          if (!success) {
              setAuthError('User not found. Please sign up first.');
          }
      } else {
          if (!authName || !authAge) {
              setAuthError('Please fill in all profile details.');
              return;
          }
          
          const newUser: User = {
              name: authName,
              age: authAge,
              bio: authBio,
              email: authEmail,
              gender: authGender,
              avatar: authAvatar,
              theme: 'dark', // Default new user to dark
              isLoggedIn: true
          };

          if (localStorage.getItem(`mr_cute_store_${authEmail}`)) {
              setAuthError('User already exists. Please log in.');
              return;
          }

          setUser(newUser);
          setMessages([]);
          setArchivedSessions([]);
          setPersonality(Personality.ROAST);
          setTheme('dark');
      }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
      e.preventDefault();
      setUser(prev => ({
          ...prev,
          name: authName, 
          bio: authBio,
          age: authAge,
          gender: authGender,
          avatar: authAvatar,
      }));
      setShowProfileSettings(false);
      setShowSettings(false);
  };

  const openSettings = () => {
      setAuthName(user.name);
      setAuthBio(user.bio);
      setAuthAge(user.age);
      setAuthGender(user.gender || 'Prefer not to say');
      setAuthAvatar(user.avatar || DEFAULT_USER_AVATAR);
      setAuthPassword(''); 
      setShowProfileSettings(true);
      setShowSettings(false);
  };

  const handleLogout = () => {
      setUser({ name: '', age: '', bio: '', email: '', gender: '', avatar: '', theme: 'dark', isLoggedIn: false });
      setMessages([]);
      setArchivedSessions([]);
      setAuthEmail('');
      setAuthPassword('');
      localStorage.removeItem('mr_cute_last_email');
      initializedRef.current = false;
      setTheme('dark');
  };

  const handleNewChat = () => {
      if (messages.length > 0) {
          setArchivedSessions(prev => [messages, ...prev]);
      }
      setMessages([]);
      initializedRef.current = false;
      // Re-trigger greeting or just let user type
      // Optional: Manually trigger greeting again
      setTimeout(() => {
         // This timeout allows the effect to pick up the empty messages array
         initializedRef.current = false; // Ensure the effect runs
      }, 0);
  };

  const handleRestoreSession = (sessionToRestore: Message[]) => {
      if (messages.length > 0) {
          setArchivedSessions(prev => [messages, ...prev]);
      }
      setMessages(sessionToRestore);
      setArchivedSessions(prev => prev.filter(s => s !== sessionToRestore));
      setShowHistoryModal(false);
      initializedRef.current = true;
  };

  const toggleTheme = () => {
      setTheme(prev => prev === 'dark' ? 'light' : 'dark');
      setShowSettings(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        const base64Data = base64String.split(',')[1];
        setAttachment({
          mimeType: file.type,
          data: base64Data,
          fileName: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRandomAvatar = () => {
      const randomSeed = Math.random().toString(36).substring(7);
      setAuthAvatar(`https://api.dicebear.com/9.x/adventurer/svg?seed=${randomSeed}&backgroundColor=b6e3f4`);
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && !attachment) || isLoading) return;

    const currentText = inputText;
    const currentAttachment = attachment;
    
    setInputText('');
    setAttachment(null);
    setIsLoading(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: currentText,
      timestamp: Date.now(),
      attachment: currentAttachment || undefined
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const responseText = await chatServiceRef.current.sendMessage(currentText, currentAttachment || undefined);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (messages.length > 0) {
        setArchivedSessions(prev => [messages, ...prev]);
    }
    setMessages([]);
    setShowSettings(false);
    initializedRef.current = false; 
  };

  const startVoiceMode = async () => {
    setIsVoiceActive(true);
    if (liveServiceRef.current) await liveServiceRef.current.disconnect();

    const liveService = new LiveService(
      (status) => setVoiceStatus(status),
      (vol) => setVolume(vol)
    );
    liveServiceRef.current = liveService;
    await liveService.connect(personality);
  };

  const endVoiceMode = async () => {
    if (liveServiceRef.current) {
      await liveServiceRef.current.disconnect();
      liveServiceRef.current = null;
    }
    setIsVoiceActive(false);
    setVoiceStatus('disconnected');
    setVolume(0);
  };

  // --- Render ---

  if (!user.isLoggedIn) {
      // Auth Screen - Always in Dark Mode style or custom aesthetic
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-black text-white">
            <div className="absolute inset-0 z-0">
               <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]"></div>
               <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[100px]"></div>
            </div>
  
            <div className="w-full max-w-md bg-[#18181b]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto no-scrollbar">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Welcome to Mr. Cute AI</h1>
                    <p className="text-zinc-400 text-sm">
                        {authMode === 'login' ? 'Welcome back! Log in to continue.' : 'Create your profile to start chatting.'}
                    </p>
                </div>
  
                {authError && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium text-center">
                        {authError}
                    </div>
                )}
  
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                    {/* Common Fields */}
                    <div className="space-y-3">
                        <div className="relative">
                            <Mail className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                            <input 
                                required
                                type="email" 
                                value={authEmail}
                                onChange={e => setAuthEmail(e.target.value)}
                                className="w-full bg-[#09090b] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder-zinc-600"
                                placeholder="Email Address"
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                            <input 
                                required
                                type="password" 
                                value={authPassword}
                                onChange={e => setAuthPassword(e.target.value)}
                                className="w-full bg-[#09090b] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder-zinc-600"
                                placeholder="Password"
                            />
                        </div>
                    </div>

                    {/* Sign Up Specific Fields */}
                    {authMode === 'signup' && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 fade-in">
                            {/* Avatar Picker */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-medium text-zinc-400 pl-1">Choose Avatar</label>
                                    <button 
                                        type="button" 
                                        onClick={handleRandomAvatar}
                                        className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        <Shuffle className="w-3 h-3" />
                                        Randomize
                                    </button>
                                </div>
                                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                    {AVATAR_SEEDS.map((seed) => {
                                        const url = `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4`;
                                        return (
                                            <button 
                                                key={seed}
                                                type="button"
                                                onClick={() => setAuthAvatar(url)}
                                                className={clsx(
                                                    "flex-none w-14 h-14 rounded-full overflow-hidden border-2 transition-all p-0.5",
                                                    authAvatar === url ? "border-blue-500 scale-110" : "border-transparent opacity-60 hover:opacity-100"
                                                )}
                                            >
                                                <div className="w-full h-full rounded-full bg-zinc-800 overflow-hidden">
                                                    <img src={url} alt={seed} className="w-full h-full object-cover" />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                                    <input 
                                        required
                                        type="text" 
                                        value={authName}
                                        onChange={e => setAuthName(e.target.value)}
                                        className="w-full bg-[#09090b] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder-zinc-600"
                                        placeholder="Name"
                                    />
                                </div>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                                    <input 
                                        required
                                        type="number" 
                                        value={authAge}
                                        onChange={e => setAuthAge(e.target.value)}
                                        className="w-full bg-[#09090b] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder-zinc-600"
                                        placeholder="Age"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {GENDER_OPTIONS.map(g => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => setAuthGender(g)}
                                        className={clsx(
                                            "px-3 py-2.5 rounded-xl text-xs font-medium border transition-all",
                                            authGender === g 
                                                ? "bg-blue-600/20 border-blue-600 text-blue-400" 
                                                : "bg-[#09090b] border-white/10 text-zinc-400 hover:border-white/30"
                                        )}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>

                            <div>
                                <textarea 
                                    rows={2}
                                    value={authBio}
                                    onChange={e => setAuthBio(e.target.value)}
                                    className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none placeholder-zinc-600"
                                    placeholder="Interests / Bio (Optional)"
                                />
                            </div>
                        </div>
                    )}
                    
                    <button 
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 mt-2 flex items-center justify-center gap-2 group"
                    >
                        {authMode === 'login' ? 'Log In' : 'Get Started'}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button 
                        onClick={() => {
                            setAuthMode(authMode === 'login' ? 'signup' : 'login');
                            setAuthError('');
                        }}
                        className="text-xs text-zinc-400 hover:text-white transition-colors"
                    >
                        {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // --- Main App Render ---
  return (
    <div className="relative h-screen w-full flex flex-col overflow-hidden bg-background text-content font-sans transition-colors duration-300">
      
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 h-16 z-30 flex items-center justify-between px-4 bg-surface/80 backdrop-blur-xl border-b border-border transition-colors duration-300">
        <div className="flex items-center gap-1">
             <button 
                onClick={() => setShowHistoryModal(true)}
                className="p-2 text-muted hover:text-content transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                title="History"
            >
                <History className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <button 
                onClick={handleNewChat}
                className="p-2 text-muted hover:text-content transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                title="New Chat"
            >
                <MessageSquarePlus className="w-5 h-5" strokeWidth={1.5} />
            </button>
        </div>

        <button 
            onClick={() => !isVoiceActive && setShowPersonalitySelector(true)}
            className="flex flex-col items-center justify-center group pl-2"
        >
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-all">
                <span className="text-[15px] font-semibold tracking-tight text-content">
                    {PERSONALITY_LABELS[personality]}
                </span>
                {!isVoiceActive && <ChevronDown className="w-3 h-3 text-muted group-hover:text-content" />}
            </div>
            {!isVoiceActive && (
                 <div className="flex items-center gap-1.5 h-3">
                     <span className="text-[10px] text-muted font-medium tracking-wide text-blue-500">ONLINE</span>
                     {isSaving && (
                         <span className="flex items-center gap-0.5 text-[10px] text-muted animate-in fade-in duration-300">
                             <span className="w-0.5 h-0.5 bg-current rounded-full mx-0.5"></span>
                             <Cloud className="w-2.5 h-2.5" />
                             Saved
                         </span>
                     )}
                 </div>
            )}
        </button>

        <div className="relative">
             <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-muted hover:text-content transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/10"
            >
                <MoreVertical className="w-6 h-6" strokeWidth={1.5} />
            </button>
             
             {showSettings && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                    <div className="absolute top-full right-0 mt-2 w-56 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col py-1.5 animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                        <div className="px-4 py-2 border-b border-border mb-1">
                             <p className="text-xs text-muted font-medium uppercase tracking-wider">Account</p>
                             <p className="text-sm text-content truncate">{user.email}</p>
                        </div>
                        <button 
                            onClick={openSettings}
                            className="flex items-center gap-3 px-4 py-3 text-muted hover:bg-black/5 dark:hover:bg-white/5 text-sm font-medium w-full text-left transition-colors"
                        >
                            <Settings className="w-4 h-4" strokeWidth={2} />
                            Settings
                        </button>
                        <button 
                            onClick={toggleTheme}
                            className="flex items-center gap-3 px-4 py-3 text-muted hover:bg-black/5 dark:hover:bg-white/5 text-sm font-medium w-full text-left transition-colors"
                        >
                            {theme === 'dark' ? <Sun className="w-4 h-4" strokeWidth={2} /> : <Moon className="w-4 h-4" strokeWidth={2} />}
                            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                        </button>
                        <button 
                            onClick={handleClearHistory}
                            className="flex items-center gap-3 px-4 py-3 text-muted hover:bg-black/5 dark:hover:bg-white/5 text-sm font-medium w-full text-left transition-colors"
                        >
                            <Trash2 className="w-4 h-4" strokeWidth={2} />
                            Archive & Clear
                        </button>
                         <button 
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-black/5 dark:hover:bg-white/5 text-sm font-medium w-full text-left transition-colors border-t border-border"
                        >
                            <LogOut className="w-4 h-4" strokeWidth={2} />
                            Sign Out
                        </button>
                    </div>
                </>
            )}
        </div>
      </header>
      
      {/* CHAT AREA */}
      <main className="flex-1 relative w-full h-full">
        <div className="flex-1 overflow-y-auto px-4 pt-20 pb-40 space-y-6 no-scrollbar h-full w-full">
            {messages.map((msg) => (
                <div
                    key={msg.id}
                    className={clsx(
                    "flex w-full animate-in slide-in-from-bottom-2 fade-in duration-300",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                    )}
                >
                    <div className={clsx("flex gap-2 max-w-[85%]", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                        
                        {/* User Avatar */}
                        {msg.role === 'user' && (
                            <div className="flex-none w-8 h-8 rounded-full overflow-hidden border border-border mt-auto shadow-sm bg-surface">
                                <img 
                                    src={user.avatar || DEFAULT_USER_AVATAR} 
                                    alt="User" 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        <div className={clsx("flex flex-col gap-1", msg.role === 'user' ? "items-end" : "items-start")}>
                            {/* Attachment Display */}
                            {msg.attachment && (
                                <div className="mb-2 rounded-xl overflow-hidden border border-border max-w-[200px]">
                                    {msg.attachment.mimeType.startsWith('image/') ? (
                                        <img 
                                            src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`} 
                                            alt="attachment" 
                                            className="w-full h-auto object-cover"
                                        />
                                    ) : (
                                        <div className="bg-surface p-4 flex items-center gap-2">
                                            <FileText className="w-6 h-6 text-muted"/>
                                            <span className="text-xs text-muted truncate max-w-[150px]">{msg.attachment.fileName || 'Document'}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* Text Bubble */}
                            {msg.text && (
                                <div
                                className={clsx(
                                    "px-5 py-3 text-[15px] leading-relaxed shadow-sm",
                                    msg.role === 'user'
                                    ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-sm"
                                    : "bg-surface border border-border text-content rounded-2xl rounded-tl-sm"
                                )}
                                >
                                {msg.text}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                ))}
            
            {isLoading && (
                <div className="flex justify-start w-full animate-in fade-in">
                    <div className="px-5 py-4 bg-surface border border-border rounded-2xl rounded-tl-sm">
                        <div className="flex space-x-1.5">
                            <div className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce"></div>
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
      </main>

      {/* INPUT AREA */}
      <div className={clsx(
          "fixed bottom-0 left-0 right-0 p-4 pb-6 z-40 bg-surface/80 backdrop-blur-xl border-t border-border transition-transform duration-300",
          isVoiceActive ? "translate-y-full" : "translate-y-0"
      )}>
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
            
            {/* Attachment Preview */}
            {attachment && (
                <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-lg w-fit border border-border animate-in slide-in-from-bottom-2">
                    {attachment.mimeType.startsWith('image/') ? (
                         <ImageIcon className="w-4 h-4 text-blue-500" />
                    ) : (
                         <FileText className="w-4 h-4 text-orange-500" />
                    )}
                    <span className="text-xs text-content max-w-[200px] truncate">{attachment.fileName}</span>
                    <button onClick={() => setAttachment(null)} className="ml-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full p-1">
                        <X className="w-3 h-3 text-muted" />
                    </button>
                </div>
            )}

            <div className="flex items-end gap-3">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    accept="image/*,application/pdf"
                    className="hidden" 
                />
                
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-none mb-1 w-10 h-10 rounded-full bg-background text-muted flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 hover:text-content transition-all border border-border"
                >
                    <Plus className="w-5 h-5" strokeWidth={1.5} />
                </button>

                <div className="flex-1 relative bg-background border border-border rounded-[24px] focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
                    <textarea
                        rows={1}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder={attachment ? "Add a caption..." : "Type a message..."}
                        className="w-full bg-transparent text-content placeholder-muted rounded-[24px] py-3 pl-5 pr-12 focus:outline-none resize-none max-h-32"
                        style={{ minHeight: '48px' }}
                    />
                    <div className="absolute right-1.5 bottom-1.5 flex items-center gap-2">
                        {/* Typing Indicator */}
                        {inputText.length > 0 && !attachment && (
                             <div className="mr-1 animate-pulse">
                                <Edit2 className="w-3.5 h-3.5 text-muted" />
                             </div>
                        )}

                        {(inputText.length > 0 || attachment) ? (
                            <button 
                                onClick={handleSendMessage}
                                className="p-2 bg-blue-600 rounded-full text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
                            >
                                <Send className="w-4 h-4" strokeWidth={2} />
                            </button>
                        ) : (
                            <button 
                                onClick={startVoiceMode}
                                className="p-2 text-muted hover:text-content transition-colors"
                            >
                                <Mic className="w-5 h-5" strokeWidth={1.5} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>
      
      {/* --- Voice Overlay --- */}
      {isVoiceActive && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-3xl animate-in fade-in duration-500">
             {/* Abstract Glowing Orb */}
            <div className="relative mb-8 w-40 h-40 flex items-center justify-center">
                {/* Core */}
                <div className={clsx(
                    "w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 blur-sm shadow-[0_0_50px_rgba(59,130,246,0.5)] z-10 relative flex items-center justify-center transition-all duration-300",
                    voiceStatus === 'speaking' ? "scale-110 shadow-[0_0_80px_rgba(59,130,246,0.8)]" : "scale-100"
                )}>
                   <div className="w-20 h-20 bg-white rounded-full opacity-20 blur-md absolute top-2 left-2"></div>
                   <Mic className={clsx("w-8 h-8 text-white z-20 transition-opacity", voiceStatus === 'speaking' ? "opacity-100" : "opacity-50")} />
                </div>
                
                {/* Ripples */}
                {(voiceStatus === 'listening' || voiceStatus === 'speaking') && (
                    <>
                        <div className="orb-ripple w-full h-full border-blue-400/30"></div>
                        <div className="orb-ripple w-full h-full border-blue-400/30" style={{ animationDelay: '0.5s' }}></div>
                    </>
                )}
            </div>

            {/* Visualizer - Replaces static text when active */}
            <div className="h-16 w-full max-w-xs flex items-center justify-center mb-6">
                {(voiceStatus === 'speaking' || voiceStatus === 'listening') ? (
                    <Visualizer volume={volume} isActive={true} />
                ) : (
                    <div className="h-12" /> // Spacer
                )}
            </div>
            
            <div className="text-center space-y-2 px-8">
                <h2 className="text-3xl font-semibold tracking-tighter text-content">
                    {voiceStatus === 'speaking' ? 'Speaking...' : voiceStatus === 'listening' ? 'Listening...' : 'Connecting...'}
                </h2>
                <p className="text-muted font-medium tracking-wide text-sm uppercase">
                    {PERSONALITY_LABELS[personality]} Mode
                </p>
            </div>

            <button 
                onClick={endVoiceMode}
                className="absolute bottom-10 w-16 h-16 rounded-full bg-surface border border-border text-content flex items-center justify-center hover:bg-red-500/10 hover:border-red-500 hover:text-red-500 transition-all duration-300 group shadow-lg"
            >
                <X className="w-6 h-6 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
            </button>
        </div>
      )}

      {/* --- History Modal --- */}
      {showHistoryModal && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in" onClick={() => setShowHistoryModal(false)}>
              <div 
                className="w-full max-w-sm bg-surface h-full border-l border-border p-6 overflow-y-auto animate-in slide-in-from-right duration-300"
                onClick={e => e.stopPropagation()}
              >
                  <div className="flex items-center justify-between mb-8">
                      <h2 className="text-xl font-bold text-content">Chat History</h2>
                      <button onClick={() => setShowHistoryModal(false)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                          <X className="w-5 h-5 text-muted" />
                      </button>
                  </div>

                  <div className="space-y-4">
                      {archivedSessions.length === 0 ? (
                          <div className="text-center py-10 text-muted text-sm">No archived sessions found.</div>
                      ) : (
                          archivedSessions.map((session, idx) => (
                              <div key={idx} className="bg-background p-4 rounded-xl border border-border hover:border-blue-500/30 transition-all group">
                                  <div className="flex items-center gap-3 mb-2">
                                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                          <History className="w-4 h-4" />
                                      </div>
                                      <div>
                                          <p className="text-sm font-medium text-content">Session {archivedSessions.length - idx}</p>
                                          <p className="text-xs text-muted">{new Date(session[0]?.timestamp || Date.now()).toLocaleDateString()}</p>
                                      </div>
                                  </div>
                                  <p className="text-xs text-muted line-clamp-2 pl-11 mb-3">
                                      {session.find(m => m.role === 'user')?.text || "No text preview"}
                                  </p>
                                  <button 
                                      onClick={() => handleRestoreSession(session)}
                                      className="w-full py-2 bg-surface hover:bg-blue-500/10 hover:text-blue-500 text-xs font-medium text-muted transition-colors rounded-lg border border-border flex items-center justify-center gap-2"
                                  >
                                      <RotateCcw className="w-3 h-3" />
                                      Restore Session
                                  </button>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}

       {/* --- Profile Settings Modal --- */}
       {showProfileSettings && (
          <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setShowProfileSettings(false)}>
              <div 
                  className="w-full max-w-lg bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
                  onClick={e => e.stopPropagation()}
              >
                  <div className="p-6 border-b border-border flex items-center justify-between bg-background/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <Settings className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-content">Profile Settings</h2>
                            <p className="text-xs text-muted">Manage your account details</p>
                        </div>
                      </div>
                      <button onClick={() => setShowProfileSettings(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
                          <X className="w-5 h-5 text-muted" />
                      </button>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                        
                        {/* Avatar Section */}
                        <div className="flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-border mb-4 bg-background">
                                <img src={authAvatar} alt="Profile" className="w-full h-full object-cover" />
                            </div>
                            <div className="w-full">
                                <div className="flex justify-between items-center mb-2 px-1">
                                    <label className="block text-xs font-medium text-muted uppercase tracking-wide">Select New Avatar</label>
                                    <button 
                                        type="button" 
                                        onClick={handleRandomAvatar}
                                        className="text-xs flex items-center gap-1 text-blue-500 hover:text-blue-400 transition-colors font-medium"
                                    >
                                        <Shuffle className="w-3 h-3" />
                                        Randomize
                                    </button>
                                </div>
                                <div className="flex justify-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                                    {AVATAR_SEEDS.map((seed) => {
                                        const url = `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4`;
                                        return (
                                            <button 
                                                key={seed}
                                                type="button"
                                                onClick={() => setAuthAvatar(url)}
                                                className={clsx(
                                                    "flex-none w-10 h-10 rounded-full overflow-hidden border-2 transition-all",
                                                    authAvatar === url ? "border-blue-500 scale-110" : "border-transparent opacity-50 hover:opacity-100"
                                                )}
                                            >
                                                <img src={url} alt={seed} className="w-full h-full object-cover bg-background" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-muted mb-1.5 ml-1">Name</label>
                                    <input 
                                        type="text" 
                                        value={authName}
                                        onChange={e => setAuthName(e.target.value)}
                                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-content text-sm focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted mb-1.5 ml-1">Age</label>
                                    <input 
                                        type="number" 
                                        value={authAge}
                                        onChange={e => setAuthAge(e.target.value)}
                                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-content text-sm focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-muted mb-1.5 ml-1">Gender</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {GENDER_OPTIONS.map(g => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => setAuthGender(g)}
                                            className={clsx(
                                                "px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                                                authGender === g 
                                                    ? "bg-blue-600/10 border-blue-600 text-blue-500" 
                                                    : "bg-background border-border text-muted hover:border-blue-500/30"
                                            )}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-muted mb-1.5 ml-1">Bio</label>
                                <textarea 
                                    rows={3}
                                    value={authBio}
                                    onChange={e => setAuthBio(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-content text-sm focus:border-blue-500 focus:outline-none resize-none"
                                />
                            </div>

                            <div className="pt-4 border-t border-border">
                                <label className="block text-xs font-medium text-muted mb-1.5 ml-1">Update Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
                                    <input 
                                        type="password" 
                                        value={authPassword}
                                        onChange={e => setAuthPassword(e.target.value)}
                                        placeholder="Leave empty to keep current"
                                        className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-content text-sm focus:border-blue-500 focus:outline-none placeholder-muted"
                                    />
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Save Changes
                        </button>
                  </form>
              </div>
          </div>
      )}

      {/* --- Personality Selector Modal --- */}
      {showPersonalitySelector && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowPersonalitySelector(false)}>
            <div 
                className="bg-surface w-full sm:max-w-sm rounded-3xl p-6 space-y-5 shadow-2xl border border-border animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-content font-semibold text-lg">Choose Persona</h3>
                    <button onClick={() => setShowPersonalitySelector(false)} className="p-1 rounded-full bg-background text-muted hover:text-content transition-colors">
                        <X className="w-4 h-4" strokeWidth={2} />
                    </button>
                </div>
                
                <div className="space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar">
                    {Object.values(Personality).map(p => (
                        <button
                            key={p}
                            onClick={() => { setPersonality(p); setShowPersonalitySelector(false); }}
                            className={clsx(
                                "flex items-center w-full gap-4 px-4 py-3.5 rounded-2xl text-left transition-all border group",
                                personality === p 
                                    ? "bg-blue-500/10 border-blue-500/20 shadow-sm" 
                                    : "bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5"
                            )}
                        >
                           <div className={clsx(
                               "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner shrink-0",
                               personality === p ? "bg-background text-content" : "bg-background text-muted group-hover:text-content"
                           )}>
                                {PERSONALITY_ICONS[p]}
                           </div>
                           <div className="flex-1">
                                <span className={clsx("font-medium block text-[15px]", personality === p ? "text-content" : "text-muted group-hover:text-content")}>
                                    {PERSONALITY_LABELS[p]}
                                </span>
                           </div>
                           {personality === p && <Check className="w-5 h-5 text-blue-500 drop-shadow-sm shrink-0" strokeWidth={2.5}/>}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default App;
