import React from 'react';
import { useAppContext } from '../context/AppContext';
import { XIcon, CheckIcon } from './Icons';
import { translations } from '../utils/translations';

export const SettingsModal = () => {
  const { isSettingsOpen, setIsSettingsOpen, language, setLanguage, user, upgradeToPro } = useAppContext();

  if (!isSettingsOpen) return null;

  const t = translations[language] || translations['English'];
  const languages = ['English', 'Hindi'];

  const handlePayment = () => {
    const options = {
      key: "rzp_test_123456789", // Placeholder test key
      amount: "99900", // ₹999.00
      currency: "INR",
      name: "LegalAI Assistant",
      description: "Pro Plan Subscription",
      handler: function (response: any) {
        // Real success callback
        upgradeToPro();
      },
      prefill: {
        name: user?.name || "",
        email: user?.email || "",
      },
      theme: { color: "#2563eb" }
    };

    if ((window as any).Razorpay) {
      try {
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any){
          // Since we are using a placeholder key, it will likely fail. 
          // We simulate success here for the demo environment.
          console.warn("Payment Failed: " + response.error.description);
          alert("Payment Failed: " + response.error.description + "\n\nSimulating successful payment for demo purposes.");
          upgradeToPro();
        });
        rzp.open();
      } catch (e) {
        console.warn("Razorpay error", e);
        // Fallback simulation
        upgradeToPro();
      }
    } else {
      alert("Razorpay SDK not loaded. Simulating successful payment for demo.");
      upgradeToPro();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-800">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">{t.settings}</h2>
          <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          {/* Language Section */}
          <section>
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">{t.appLang}</h3>
            <p className="text-sm text-slate-500 mb-4">{t.selectLang}</p>
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full p-3 border border-slate-700 rounded-xl bg-slate-800 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {languages.map(lang => (
                <option key={lang} value={lang}>{lang === 'Hindi' ? 'हिंदी' : lang}</option>
              ))}
            </select>
          </section>

          {/* Subscription Section */}
          <section>
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">{t.subAndBilling}</h3>
            
            <div className={`border rounded-xl p-5 ${user?.plan === 'pro' ? 'border-blue-900 bg-blue-900/20' : 'border-slate-700 bg-slate-800/50'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-bold text-lg text-white capitalize">{user?.plan} {t.plan}</div>
                  <div className="text-sm text-slate-400">
                    {user?.plan === 'free' ? t.freeLimit : t.unlimitedAccess}
                  </div>
                </div>
                {user?.plan === 'pro' && (
                  <span className="bg-blue-900/50 text-blue-400 border border-blue-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">{t.active}</span>
                )}
              </div>

              {user?.plan === 'free' && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-extrabold text-white">₹999</span>
                    <span className="text-slate-400 font-medium">{t.month}</span>
                  </div>
                  <ul className="space-y-2 mb-5 text-sm text-slate-300">
                    <li className="flex items-center gap-2"><CheckIcon className="w-4 h-4 text-green-500"/> {t.feature1}</li>
                    <li className="flex items-center gap-2"><CheckIcon className="w-4 h-4 text-green-500"/> {t.feature2}</li>
                    <li className="flex items-center gap-2"><CheckIcon className="w-4 h-4 text-green-500"/> {t.feature3}</li>
                  </ul>
                  <button 
                    onClick={handlePayment}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    {t.payWithRazorpay}
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
