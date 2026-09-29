import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SecOpsCopilotDrawer } from '../ai/SecOpsCopilotDrawer';
import { PhantomFloatingLogo } from '../ai/PhantomFloatingLogo';

export function Layout({ children, currentTab, setTab }) {
  const [copilotOpen, setCopilotOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A0A0A] text-white relative">
      <Sidebar 
        currentTab={currentTab} 
        setTab={setTab} 
        onOpenCopilot={() => setCopilotOpen(true)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0A0A0A]">
        <Header 
          currentTab={currentTab} 
          setTab={setTab} 
          onOpenCopilot={() => setCopilotOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0A0A0A]">
          {children}
        </main>
      </div>

      {/* Circular Floating PHANTOM Logo Button */}
      <PhantomFloatingLogo
        isOpen={copilotOpen}
        onClick={() => setCopilotOpen(!copilotOpen)}
      />

      {/* SecOps Copilot Drawer */}
      <SecOpsCopilotDrawer
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />
    </div>
  );
}
