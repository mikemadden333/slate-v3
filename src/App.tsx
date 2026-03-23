/**
 * Slate v3 — App
 * Root component: DataStore provider + Shell + Module router.
 */

import React, { useState, lazy, Suspense } from 'react';
import { DataStoreProvider } from './data/DataStore';
import SlateShell from './shell/SlateShell';
import Dashboard from './modules/dashboard/Dashboard';
import DataHub from './data/DataHub';
import WatchApp from './modules/watch/WatchApp';
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

function AppContent() {
  const [activeModule, setActiveModule] = useState('dashboard');

  function renderModule() {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveModule} />;
      case 'datahub':
        return <DataHub />;
      case 'watch':
        return <WatchApp />;
      // Phase 3+ modules will be added here
      default:
        return <ModulePlaceholder moduleId={activeModule} />;
    }
  }

  return (
    <SlateShell activeModule={activeModule} onNavigate={setActiveModule}>
      {renderModule()}
    </SlateShell>
  );
}

export default function App() {
  return (
    <DataStoreProvider>
      <AppContent />
    </DataStoreProvider>
  );
}
