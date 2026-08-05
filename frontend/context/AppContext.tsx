import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, ChatSession, Message } from '../types';
import { sendUpgradeEmail, sendExpiryEmail } from '../services/emailService';

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  chatSessions: ChatSession[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  createNewSession: () => void;
  addMessageToActiveSession: (message: Message) => void;
  updateMessageText: (messageId: string, newText: string) => void;
  usageSeconds: number;
  isTimeUp: boolean;
  language: string;
  setLanguage: (lang: string) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (isOpen: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  isSubscriptionModalOpen: boolean;
  setIsSubscriptionModalOpen: (isOpen: boolean) => void;
  isMockRazorpayOpen: boolean;
  setIsMockRazorpayOpen: (isOpen: boolean) => void;
  upgradeToPro: () => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to load from localStorage safely
const loadState = <T,>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    console.error(`Error loading ${key} from localStorage`, e);
    return defaultValue;
  }
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const initialUser = loadState<User | null>('legalai_current_user', null);
  
  const [user, setUserState] = useState<User | null>(initialUser);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => initialUser ? loadState(`legalai_chats_${initialUser.id}`, []) : []);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => initialUser ? loadState(`legalai_active_session_${initialUser.id}`, null) : null);
  const [usageSeconds, setUsageSeconds] = useState(() => initialUser ? loadState(`legalai_usage_${initialUser.id}`, 3600) : 3600);
  const [isTimeUp, setIsTimeUp] = useState(() => initialUser ? loadState(`legalai_timeup_${initialUser.id}`, false) : false);
  const [language, setLanguage] = useState(() => loadState('legalai_lang', 'English'));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isMockRazorpayOpen, setIsMockRazorpayOpen] = useState(false);

  // Automatic Downgrade Logic
  useEffect(() => {
    if (user && user.plan === 'pro' && user.subscriptionExpiryDate && Date.now() > user.subscriptionExpiryDate) {
      const downgradedUser = { ...user, plan: 'free' as const };
      delete downgradedUser.subscriptionExpiryDate;
      
      setUserState(downgradedUser);
      
      // Update DB
      const usersDb = JSON.parse(localStorage.getItem('legalai_users_db') || '[]');
      const updatedDb = usersDb.map((u: any) => u.id === user.id ? { ...u, plan: 'free', subscriptionExpiryDate: undefined } : u);
      localStorage.setItem('legalai_users_db', JSON.stringify(updatedDb));

      // Trigger Expiry Email
      sendExpiryEmail(user.email, user.name);
    }
  }, [user]);

  const handleSetUser = (newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      setChatSessions(loadState(`legalai_chats_${newUser.id}`, []));
      setActiveSessionId(loadState(`legalai_active_session_${newUser.id}`, null));
      setUsageSeconds(loadState(`legalai_usage_${newUser.id}`, 3600));
      setIsTimeUp(loadState(`legalai_timeup_${newUser.id}`, false));
    } else {
      setChatSessions([]);
      setActiveSessionId(null);
      setUsageSeconds(3600);
      setIsTimeUp(false);
    }
  };

  const logout = () => {
    handleSetUser(null);
  };

  // Sync state to localStorage
  useEffect(() => { localStorage.setItem('legalai_current_user', JSON.stringify(user)); }, [user]);
  useEffect(() => { if (user) localStorage.setItem(`legalai_chats_${user.id}`, JSON.stringify(chatSessions)); }, [chatSessions, user]);
  useEffect(() => { if (user) localStorage.setItem(`legalai_active_session_${user.id}`, JSON.stringify(activeSessionId)); }, [activeSessionId, user]);
  useEffect(() => { if (user) localStorage.setItem(`legalai_usage_${user.id}`, JSON.stringify(usageSeconds)); }, [usageSeconds, user]);
  useEffect(() => { if (user) localStorage.setItem(`legalai_timeup_${user.id}`, JSON.stringify(isTimeUp)); }, [isTimeUp, user]);
  useEffect(() => { localStorage.setItem('legalai_lang', JSON.stringify(language)); }, [language]);

  // Timer for Free Tier
  useEffect(() => {
    let timer: number;
    if (user?.plan === 'free' && !isTimeUp) {
      timer = window.setInterval(() => {
        setUsageSeconds((prev: number) => {
          if (prev <= 1) {
            setIsTimeUp(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [user, isTimeUp]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Case Analysis',
      messages: [],
      updatedAt: Date.now(),
    };
    setChatSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const addMessageToActiveSession = (message: Message) => {
    setChatSessions((prev) =>
      prev.map((session) => {
        if (session.id === activeSessionId) {
          // Auto-generate title from first user message if it's default
          let title = session.title;
          if (session.messages.length === 0 && message.role === 'user') {
            title = message.text.slice(0, 30) + (message.text.length > 30 ? '...' : '');
          }
          return {
            ...session,
            title,
            messages: [...session.messages, message],
            updatedAt: Date.now(),
          };
        }
        return session;
      })
    );
  };

  const updateMessageText = (messageId: string, newText: string) => {
    setChatSessions((prev) =>
      prev.map((session) => {
        if (session.id === activeSessionId) {
          return {
            ...session,
            messages: session.messages.map((msg) =>
              msg.id === messageId ? { ...msg, text: newText } : msg
            ),
            updatedAt: Date.now(),
          };
        }
        return session;
      })
    );
  };

  const upgradeToPro = () => {
    if (user) {
      // Set expiry to 30 days from now
      const expiryDate = Date.now() + 30 * 24 * 60 * 60 * 1000;
      const updatedUser = { ...user, plan: 'pro' as const, subscriptionExpiryDate: expiryDate };
      setUserState(updatedUser);
      setIsTimeUp(false);
      
      // Update user in the simulated DB as well
      const usersDb = JSON.parse(localStorage.getItem('legalai_users_db') || '[]');
      const updatedDb = usersDb.map((u: any) => u.id === user.id ? { ...u, plan: 'pro', subscriptionExpiryDate: expiryDate } : u);
      localStorage.setItem('legalai_users_db', JSON.stringify(updatedDb));

      // Trigger Upgrade Email
      sendUpgradeEmail(user.email, user.name);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser: handleSetUser,
        chatSessions,
        activeSessionId,
        setActiveSessionId,
        createNewSession,
        addMessageToActiveSession,
        updateMessageText,
        usageSeconds,
        isTimeUp,
        language,
        setLanguage,
        isSettingsOpen,
        setIsSettingsOpen,
        isSidebarOpen,
        setIsSidebarOpen,
        isSubscriptionModalOpen,
        setIsSubscriptionModalOpen,
        isMockRazorpayOpen,
        setIsMockRazorpayOpen,
        upgradeToPro,
        logout
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
