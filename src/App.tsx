/**
 * Slate v3 — App
 * Root component: DataStore provider + Shell + Module router.
 */

import React, { useState, useEffect, useRef } from 'react';
import SplashScreen from './shell/SplashScreen';
import { DataStoreProvider, useDataStore } from './data/DataStore';
import { PresentationModeProvider, usePresentationMode } from './core/PresentationMode';
import { PRESENTATION_SNAPSHOT } from './data/defaults/presentationSnapshot';
import SlateShell from './shell/SlateShell';
import Dashboard from './modules/dashboard/Dashboard';
import DataHub from './data/DataHub';
import WatchAppV3 from './modules/watch/v3/WatchAppV3';
import LedgerApp from './modules/ledger/LedgerApp';
import ScholarApp from './modules/scholar/ScholarApp';
import BriefingApp from './modules/briefing/BriefingApp';
import SignalApp from './modules/signal/SignalApp';
import ShieldApp from './modules/shield/ShieldApp';
import FundApp from './modules/fund/FundApp';
import GroundsApp from './modules/grounds/GroundsApp';
import CivicApp from './modules/civic/CivicApp';
import DraftApp from './modules/draft/DraftApp';
import ReportsApp from './modules/reports/ReportsApp';
import { bg, text, brand, font, fontSize } from './core/theme';

// Placeholder for modules not yet built
function ModulePlaceholder({ moduleId }: { moduleId: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '60vh',
      color: text.light,
      textAlign: 'center',
    }}>
      <div style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: `${brand.brass}10`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
        marginBottom: 16,
      }}>
        ◇
      </div>
      <div style={{
        fontSize: fontSize.xl,
        fontWeight: 600,
        color: text.secondary,
        fontFamily: font.serif,
        marginBottom: 8,
      }}>
        {moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}
      </div>
      <div style={{
        fontSize: fontSize.sm,
        color: text.muted,
        maxWidth: 400,
      }}>
        This module is being rebuilt for Slate v3. It will be available in the next phase.
      </div>
    </div>
  );
}

// ─── Presentation Mode Sync ───────────────────────────────────────────────
// When Presentation Mode is toggled on, inject the curated snapshot.
// When toggled off, reset to the live demo defaults.
function PresentationModeSync() {
  const { isPresentationMode } = usePresentationMode();
  const { dispatch } = useDataStore();
  const isMounted = useRef(false);

  useEffect(() => {
    // Skip the initial render — only fire when the user actually toggles
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (isPresentationMode) {
      dispatch({ type: 'SET_STORE', payload: PRESENTATION_SNAPSHOT });
    } else {
      dispatch({ type: 'RESET_TO_DEMO' });
    }
  }, [isPresentationMode, dispatch]);

  return null;
}

function AppContent() {
  const [activeModule, setActiveModule] = useState('dashboard');

  function renderModule() {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveModule} />;
      case 'datahub':
        return <DataHub />;
      case 'watch':
        return <WatchAppV3 />;
      case 'ledger':
        return <LedgerApp />;
      case 'scholar':
        return <ScholarApp />;
      case 'briefing':
        return <BriefingApp />;
      case 'signal':
        return <SignalApp />;
      case 'shield':
        return <ShieldApp />;
      case 'fund':
        return <FundApp />;
      case 'grounds':
        return <GroundsApp />;
      case 'civic':
        return <CivicApp />;
      case 'draft':
        return <DraftApp />;
      case 'reports':
        return <ReportsApp />;
      default:
        return <ModulePlaceholder moduleId={activeModule} />;
    }
  }

  return (
    <>
      <PresentationModeSync />
      <SlateShell activeModule={activeModule} onNavigate={setActiveModule}>
        {renderModule()}
      </SlateShell>
    </>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onEnter={() => setShowSplash(false)} />;
  }

  return (
    <PresentationModeProvider>
      <DataStoreProvider>
        <AppContent />
      </DataStoreProvider>
    </PresentationModeProvider>
  );
}
