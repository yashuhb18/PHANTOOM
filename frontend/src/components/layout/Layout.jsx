import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SecOpsCopilotDrawer } from '../ai/SecOpsCopilotDrawer';
import { PhantomCornerBuddy } from '../common/PhantomCornerBuddy';

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

      {/* Very Small Bottom-Right Corner Buddy (Black BG, White Logo, Animated White Text) */}
      <PhantomCornerBuddy
        currentTab={currentTab}
        onOpenCopilot={() => setCopilotOpen(!copilotOpen)}
      />

      {/* SecOps Copilot Drawer */}
      <SecOpsCopilotDrawer
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />
    </div>
  );
}
