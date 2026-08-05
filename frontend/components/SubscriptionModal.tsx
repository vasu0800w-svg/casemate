import React from 'react';
import { useAppContext } from '../context/AppContext';
import { CheckIcon, XIcon } from './Icons';
import { translations } from '../utils/translations';

export const SubscriptionModal = () => {
  const { isSubscriptionModalOpen, setIsSubscriptionModalOpen, user, upgradeToPro, language } = useAppContext();

  if (!isSubscriptionModalOpen) return null;

  const t = translations[language] || translations['English'];

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
        setIsSubscriptionModalOpen(false);
      },
      prefill: {
        name: user?.name || "",
        email: user?.email || "",
      },
      theme: {
        color: "#2563eb"
      }
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
          setIsSubscriptionModalOpen(false);
        });
        rzp.open();
      } catch (e) {
        console.warn("Razorpay error", e);
        // Fallback simulation
        upgradeToPro();
        setIsSubscriptionModalOpen(false);
      }
    } else {
      alert("Razorpay SDK not loaded. Simulating successful payment for demo.");
      upgradeToPro();
      setIsSubscriptionModalOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-[60] backdrop-blur-sm p-4">
      <div className="bg-slate-900 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center relative overflow-hidden border border-slate-800">
        <button 
          onClick={() => setIsSubscriptionModalOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <XIcon className="w-6 h-6" />
        </button>
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 to-yellow-600"></div>
        
        <h2 className="text-2xl font-bold text-white mb-3 mt-2">{t.subscriptionDetails}</h2>
        <p className="text-slate-400 mb-8 leading-relaxed">
          {user?.plan === 'pro' 
            ? t.alreadyPro 
            : t.unlockUnlimited}
        </p>
        
        <div className="bg-slate-800/50 p-6 rounded-2xl mb-8 border border-slate-700 text-left">
          <div className="flex items-baseline gap-1 mb-4 justify-center">
            <span className="text-4xl font-extrabold text-white">₹999</span>
            <span className="text-slate-400 font-medium">{t.month}</span>
          </div>
          <ul className="space-y-3 text-sm text-slate-300 font-medium">
            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0"/> {t.feature1}</li>
            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0"/> {t.feature2}</li>
            <li className="flex items-center gap-3"><CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0"/> {t.feature3}</li>
          </ul>
        </div>
        
        {user?.plan !== 'pro' && (
          <button 
            onClick={handlePayment}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {t.payWithRazorpay}
          </button>
        )}
      </div>
    </div>
  );
};
