/**
 * Slate v3 — SlateShell
 * The main application shell: Sidebar + TopBar + Content area.
 * Handles module routing and keyboard shortcuts.
 */

import React, { useState, useEffect, useCallback, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import AskSlate from './AskSlate';
import { bg, transition } from '../core/theme';

interface SlateShellProps {
  activeModule: string;
  onNavigate: (moduleId: string) => void;
  children: ReactNode;
}

export default function SlateShell({ activeModule, onNavigate, children }: SlateShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [askSlateOpen, setAskSlateOpen] = useState(false);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Cmd/Ctrl + K → Ask Slate
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setAskSlateOpen(prev => !prev);
    }
    // Escape → Close Ask Slate
    if (e.key === 'Escape' && askSlateOpen) {
      setAskSlateOpen(false);
    }
    // Cmd/Ctrl + B → Toggle sidebar
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      setSidebarCollapsed(prev => !prev);
    }
  }, [askSlateOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: bg.app,
    }}>
      <Sidebar
        activeModule={activeModule}
        onNavigate={onNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
      />

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: transition.smooth,
      }}>
        <TopBar
          activeModule={activeModule}
          onAskSlate={() => setAskSlateOpen(true)}
        />

        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: 24,
        }}>
          {children}
        </div>
      </div>

      <AskSlate
        isOpen={askSlateOpen}
        onClose={() => setAskSlateOpen(false)}
        activeModule={activeModule}
      />
    </div>
  );
}
