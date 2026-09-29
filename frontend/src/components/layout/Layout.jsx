import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SecOpsCopilotDrawer } from '../ai/SecOpsCopilotDrawer';
import { PhantomFloatingLogo } from '../ai/PhantomFloatingLogo';
import { PhantomWalkthrough } from '../common/PhantomWalkthrough';

export function Layout({ children, currentTab, setTab }) {
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  // Automatically trigger for new users on their very first console visit
  useEffect(() => {
    try {
      const hasSeen = localStorage.getItem('phantom_walkthrough_seen');
      if (!hasSeen) {
        // Small delay so user sees dashboard arrive, then smooth blur entrance
        const timer = setTimeout(() => {
          setTourOpen(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    } catch (e) {}
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A0A0A] text-white relative">
      <Sidebar 
        currentTab={currentTab} 
        setTab={setTab} 
        onOpenCopilot={() => setCopilotOpen(true)}
        onOpenTour={() => setTourOpen(true)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0A0A0A]">
        <Header 
          currentTab={currentTab} 
          setTab={setTab} 
          onOpenCopilot={() => setCopilotOpen(true)}
          onOpenTour={() => setTourOpen(true)}
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

      {/* Full-Screen Blur Animated PHANTOM Companion Walkthrough */}
      <PhantomWalkthrough
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
      />
    </div>
  );
}
