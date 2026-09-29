import React, { useState } from 'react';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Layout } from './components/layout/Layout';

// Pages
import { Dashboard } from './pages/Dashboard';
import { LiveMonitor } from './pages/LiveMonitor';
import { SessionDetail } from './pages/SessionDetail';
import { ThreatIntelligence } from './pages/ThreatIntelligence';
import { DeceptionTraps } from './pages/DeceptionTraps';
import { AlertsActions } from './pages/AlertsActions';
import { IncidentReports } from './pages/IncidentReports';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { LandingPage } from './pages/LandingPage';
import { HardwarePorts } from './pages/HardwarePorts';
import { ThreatAnalyticsPage } from './pages/ThreatAnalyticsPage';
import { USBFootprintsPage } from './pages/USBFootprintsPage';
import { SIEMHuntBoard } from './pages/SIEMHuntBoard';
import { HardwareScanner } from './pages/HardwareScanner';

function AppContent() {
  const [currentTab, setCurrentTab] = useState('landing');
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [loginInitialRegister, setLoginInitialRegister] = useState(false);
  const { isAuthenticated } = useAuthContext();

  // If user navigates to login
  if (currentTab === 'login') {
    return (
      <Login 
        initialRegister={loginInitialRegister}
        onLoginSuccess={() => setCurrentTab('dashboard')} 
        onBackToLanding={() => setCurrentTab('landing')} 
      />
    );
  }

  // If on landing page
  if (currentTab === 'landing') {
    return (
      <LandingPage 
        onOpenLogin={() => {
          setLoginInitialRegister(false);
          setCurrentTab('login');
        }}
        onOpenRegister={() => {
          setLoginInitialRegister(true);
          setCurrentTab('login');
        }}
        onLaunchConsole={() => {
          if (isAuthenticated) {
            setCurrentTab('dashboard');
          } else {
            setLoginInitialRegister(false);
            setCurrentTab('login');
          }
        }} 
      />
    );
  }

  // If not authenticated, require login before entering console
  if (!isAuthenticated) {
    return (
      <Login 
        onLoginSuccess={() => setCurrentTab('dashboard')} 
        onBackToLanding={() => setCurrentTab('landing')} 
      />
    );
  }

  // Render dashboard layout with current tab
  return (
    <Layout currentTab={currentTab} setTab={setCurrentTab}>
      {currentTab === 'dashboard' && (
        <Dashboard setTab={setCurrentTab} setSelectedSessionId={setSelectedSessionId} />
      )}
      {currentTab === 'scanner' && <HardwareScanner />}
      {currentTab === 'siem' && <SIEMHuntBoard />}
      {currentTab === 'ports' && (
        <HardwarePorts setTab={setCurrentTab} setSelectedSessionId={setSelectedSessionId} />
      )}
      {currentTab === 'footprints' && <USBFootprintsPage />}
      {currentTab === 'live' && <LiveMonitor />}
      {currentTab === 'analytics' && <ThreatAnalyticsPage />}
      {currentTab === 'sessions' && (
        <SessionDetail sessionId={selectedSessionId} />
      )}
      {currentTab === 'threat-intel' && <ThreatIntelligence />}
      {currentTab === 'deception' && <DeceptionTraps />}
      {currentTab === 'alerts' && <AlertsActions />}
      {currentTab === 'reports' && (
        <IncidentReports initialSessionId={selectedSessionId} />
      )}
      {currentTab === 'settings' && <Settings />}
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <WebSocketProvider>
            <AppContent />
          </WebSocketProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
