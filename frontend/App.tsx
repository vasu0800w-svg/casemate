import React from 'react';
import { useAppContext } from './context/AppContext';
import { AuthScreen } from './components/AuthScreen';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { SettingsModal } from './components/SettingsModal';
import { UpgradeModal } from './components/UpgradeModal';
import { AdminDashboard } from './components/AdminDashboard';
import { SubscriptionModal } from './components/SubscriptionModal';
import { MockRazorpay } from './components/MockRazorpay';

const App = () => {
  const { user } = useAppContext();

  if (!user) {
    return <AuthScreen />;
  }

  if (user.role === 'admin') {
    return <AdminDashboard />;
  }

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden font-sans selection:bg-blue-500/30 selection:text-blue-200">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 relative">
        <ChatArea />
      </main>
      <SettingsModal />
      <UpgradeModal />
      <SubscriptionModal />
      <MockRazorpay />
    </div>
  );
};

export default App;
