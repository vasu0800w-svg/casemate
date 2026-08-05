import React from 'react';
import { useAppContext } from '../context/AppContext';
import { PlusIcon, SettingsIcon, ScaleIcon, LogoutIcon, SparklesIcon } from './Icons';
import { translations } from '../utils/translations';

export const Sidebar = () => {
  const { 
    user, 
    chatSessions, 
    activeSessionId, 
    setActiveSessionId, 
    createNewSession,
    usageSeconds,
    setIsSettingsOpen,
    setIsSubscriptionModalOpen,
    isSidebarOpen,
    language,
    logout
  } = useAppContext();

  const t = translations[language] || translations['English'];

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 flex-shrink-0 transition-all duration-300 overflow-hidden`}>
      <div className="w-64 flex flex-col h-full">
        <div className="p-4 flex items-center gap-3 text-white font-bold text-lg border-b border-slate-800">
          <ScaleIcon className="w-6 h-6 text-blue-400" />
          LegalAI
        </div>

        <div className="p-4">
          <button 
            onClick={createNewSession} 
            className="w-full flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-2.5 px-4 rounded-lg transition-colors font-medium text-sm border border-slate-700"
          >
            <PlusIcon className="w-4 h-4" />
            {t.newChat}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
          <div className="text-xs font-semibold text-slate-500 mb-3 px-2 uppercase tracking-wider mt-2">{t.recentCases}</div>
          {chatSessions.length === 0 ? (
            <div className="text-sm text-slate-500 px-2 italic">{t.noRecentCases}</div>
          ) : (
            chatSessions.map(session => (
              <button 
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg truncate text-sm transition-colors ${
                  activeSessionId === session.id 
                    ? 'bg-slate-800 text-white font-medium' 
                    : 'hover:bg-slate-800/50 text-slate-400'
                }`}
              >
                {session.title}
              </button>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-900/50">
          <div className="flex items-center justify-between px-2 py-1 text-sm bg-slate-800/50 rounded-lg border border-slate-700/50">
            <span className="text-slate-400">{t.plan}: <span className={`font-medium capitalize ${user?.plan === 'pro' ? 'text-yellow-400' : 'text-white'}`}>{user?.plan}</span></span>
            {user?.plan === 'free' && (
              <span className={`text-xs px-2 py-1 rounded font-medium ${usageSeconds < 300 ? 'bg-red-900/50 text-red-400' : 'bg-slate-700 text-slate-300'}`}>
                {formatTime(usageSeconds)} {t.left}
              </span>
            )}
          </div>
          
          <button 
            onClick={() => setIsSettingsOpen(true)} 
            className="w-full flex items-center gap-2 px-2 py-2 hover:bg-slate-800 rounded-lg transition-colors text-sm text-slate-300"
          >
            <SettingsIcon className="w-4 h-4" />
            {t.settings}
          </button>

          <button 
            onClick={() => setIsSubscriptionModalOpen(true)} 
            className="w-full flex items-center gap-2 px-2 py-2 hover:bg-slate-800 rounded-lg transition-colors text-sm text-yellow-400 hover:text-yellow-300 mt-1"
          >
            <SparklesIcon className="w-4 h-4" />
            {t.upgradeToProSidebar}
          </button>

          <button 
            onClick={logout} 
            className="w-full flex items-center gap-2 px-2 py-2 hover:bg-slate-800 rounded-lg transition-colors text-sm text-red-400 hover:text-red-300 mt-1"
          >
            <LogoutIcon className="w-4 h-4" />
            {t.logout}
          </button>
          
          <div className="flex items-center gap-3 px-2 pt-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-inner">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 truncate text-sm">
              <div className="text-white font-medium truncate">{user?.name}</div>
              <div className="text-xs text-slate-500 truncate">{user?.email}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
