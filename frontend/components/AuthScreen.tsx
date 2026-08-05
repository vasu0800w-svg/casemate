import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ScaleIcon, XIcon } from './Icons';
import { translations } from '../utils/translations';
import { sendWelcomeEmail } from '../services/emailService';

export const AuthScreen = () => {
  const { setUser, language, setLanguage } = useAppContext();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);

  const t = translations[language] || translations['English'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Dynamic Admin Bypass
    const adminCreds = JSON.parse(localStorage.getItem('legalai_admin_creds') || '{"email":"admin@legalai.com","password":"admin123"}');
    
    if (isLogin && email === adminCreds.email && password === adminCreds.password) {
      setUser({
        id: 'admin-001',
        name: 'System Admin',
        email: adminCreds.email,
        plan: 'pro',
        role: 'admin'
      });
      return;
    }

    const usersDb = JSON.parse(localStorage.getItem('legalai_users_db') || '[]');

    if (isLogin) {
      const foundUser = usersDb.find((u: any) => u.email === email && u.password === password);
      if (foundUser) {
        // Omit password from context user object
        const { password: _, ...userWithoutPassword } = foundUser;
        setUser(userWithoutPassword);
      } else {
        setError(t.invalidCreds);
      }
    } else {
      const exists = usersDb.find((u: any) => u.email === email);
      if (exists) {
        setError(t.emailInUse);
      } else {
        const newUser = {
          id: Date.now().toString(),
          name: name || 'New Advocate',
          email: email,
          password: password,
          plan: 'free',
          role: 'user'
        };
        usersDb.push(newUser);
        localStorage.setItem('legalai_users_db', JSON.stringify(usersDb));
        
        // Trigger Welcome Email
        sendWelcomeEmail(newUser.email, newUser.name);
        
        const { password: _, ...userWithoutPassword } = newUser;
        setUser(userWithoutPassword);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-4 right-4">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
        >
          <option value="English">English</option>
          <option value="Hindi">हिंदी</option>
        </select>
      </div>

      <div className="max-w-md w-full space-y-8 bg-slate-900 p-10 rounded-2xl shadow-2xl border border-slate-800">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg mb-4 border border-slate-700">
            <ScaleIcon className="h-10 w-10 text-blue-400" />
          </div>
          <h2 className="mt-2 text-3xl font-extrabold text-white">
            {t.appTitle}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {t.appSubtitle}
          </p>
        </div>
        
        {error && (
          <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            {!isLogin && (
              <div>
                <label className="sr-only">{t.fullName}</label>
                <input
                  type="text"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-slate-700 bg-slate-800 placeholder-slate-500 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder={t.fullName}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="sr-only">{t.email}</label>
              <input
                type="email"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-slate-700 bg-slate-800 placeholder-slate-500 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder={t.email}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="sr-only">{t.password}</label>
              <input
                type="password"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-slate-700 bg-slate-800 placeholder-slate-500 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder={t.password}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-md"
            >
              {isLogin ? t.signIn : t.createAccount}
            </button>
          </div>
        </form>
        
        <div className="text-center mt-4">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-sm text-slate-400 hover:text-white font-medium transition-colors"
          >
            {isLogin ? t.noAccount : t.hasAccount}
          </button>
        </div>
        
        <div className="text-center mt-6 pt-4 border-t border-slate-800">
          <button 
            onClick={() => setShowPrivacy(true)} 
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline"
          >
            {t.privacyPolicy}
          </button>
        </div>
      </div>

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
          <div className="bg-slate-900 p-8 rounded-3xl max-w-md w-full shadow-2xl relative border border-slate-800">
            <button 
              onClick={() => setShowPrivacy(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <XIcon className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-white mb-4">{t.privacyPolicyTitle}</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              {t.privacyPolicyContent}
            </p>
            <button 
              onClick={() => setShowPrivacy(false)} 
              className="mt-6 w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors"
            >
              {t.cancel || "Close"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
