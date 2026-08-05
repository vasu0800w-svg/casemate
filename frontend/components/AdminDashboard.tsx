import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { UsersIcon, ActivityIcon, LogoutIcon, ScaleIcon, SettingsIcon, XIcon } from './Icons';
import { translations } from '../utils/translations';

interface UserStats {
  id: string;
  name: string;
  email: string;
  plan: string;
  totalChats: number;
  totalDocs: number;
  timeLeft: number;
}

export const AdminDashboard = () => {
  const { logout, language } = useAppContext();
  const t = translations[language] || translations['English'];
  const [stats, setStats] = useState<UserStats[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  useEffect(() => {
    const usersDb = JSON.parse(localStorage.getItem('legalai_users_db') || '[]');
    const userStats = usersDb.map((u: any) => {
      const chats = JSON.parse(localStorage.getItem(`legalai_chats_${u.id}`) || '[]');
      const usage = JSON.parse(localStorage.getItem(`legalai_usage_${u.id}`) || '3600');
      
      let docCount = 0;
      chats.forEach((c: any) => {
        c.messages.forEach((m: any) => {
          if (m.isDocument) docCount++;
        });
      });

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        plan: u.plan,
        totalChats: chats.length,
        totalDocs: docCount,
        timeLeft: usage
      };
    });
    setStats(userStats);

    // Load current admin creds
    const creds = JSON.parse(localStorage.getItem('legalai_admin_creds') || '{"email":"admin@legalai.com","password":"admin123"}');
    setAdminEmail(creds.email);
    setAdminPassword(creds.password);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const handleSaveCreds = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('legalai_admin_creds', JSON.stringify({ email: adminEmail, password: adminPassword }));
    setShowSettings(false);
    alert("Admin credentials updated successfully.");
  };

  const totalUsers = stats.length;
  const proUsers = stats.filter(s => s.plan === 'pro').length;
  const freeUsers = stats.filter(s => s.plan === 'free').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 flex flex-col font-sans relative">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
            <ScaleIcon className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{t.adminDashboard}</h1>
            <p className="text-xs text-slate-400">System Overview & User Tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700"
          >
            <SettingsIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.adminSettings}</span>
          </button>
          <button 
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-red-400 hover:text-red-300 rounded-lg transition-colors border border-slate-700"
          >
            <LogoutIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.logout}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-blue-900/30 rounded-full flex items-center justify-center border border-blue-800/50">
              <UsersIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-medium">{t.totalUsers}</p>
              <p className="text-3xl font-bold text-white">{totalUsers}</p>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-yellow-900/30 rounded-full flex items-center justify-center border border-yellow-800/50">
              <ActivityIcon className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-medium">{t.proUsers}</p>
              <p className="text-3xl font-bold text-white">{proUsers}</p>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
              <UsersIcon className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-medium">{t.freeUsers}</p>
              <p className="text-3xl font-bold text-white">{freeUsers}</p>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/30">
            <h2 className="text-lg font-semibold text-white">Registered Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-medium">{t.userName}</th>
                  <th className="px-6 py-4 font-medium">{t.email}</th>
                  <th className="px-6 py-4 font-medium">{t.plan}</th>
                  <th className="px-6 py-4 font-medium">{t.timeLeft}</th>
                  <th className="px-6 py-4 font-medium">{t.totalChats}</th>
                  <th className="px-6 py-4 font-medium">{t.totalDocs}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {stats.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">
                      No users registered yet.
                    </td>
                  </tr>
                ) : (
                  stats.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">{user.name}</td>
                      <td className="px-6 py-4 text-slate-400">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                          user.plan === 'pro' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50' : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {user.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {user.plan === 'free' ? formatTime(user.timeLeft) : 'Unlimited'}
                      </td>
                      <td className="px-6 py-4 text-slate-300">{user.totalChats}</td>
                      <td className="px-6 py-4 text-slate-300">{user.totalDocs}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Admin Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
          <div className="bg-slate-900 p-8 rounded-3xl max-w-md w-full shadow-2xl relative border border-slate-800">
            <button 
              onClick={() => setShowSettings(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <XIcon className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-white mb-6">{t.changeAdminCreds}</h2>
            
            <form onSubmit={handleSaveCreds} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">{t.newAdminEmail}</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">{t.newAdminPassword}</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>
              <button 
                type="submit"
                className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors"
              >
                {t.updateCreds}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
