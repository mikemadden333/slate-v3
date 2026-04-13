/**
 * Slate v3 — SlateShell
 * The main application shell: Sidebar + TopBar + Content area.
 * Handles module routing and keyboard shortcuts.
 */

import React, { useState, useEffect, useCallback, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import AskSlate from './AskSlate';
import { bg, transition, brand, fontSize, fontWeight, font } from '../core/theme';
import { usePresentationMode } from '../core/PresentationMode';

interface SlateShellProps {
  activeModule: string;
  onNavigate: (moduleId: string) => void;
  children: ReactNode;
}

export default function SlateShell({ activeModule, onNavigate, children }: SlateShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [askSlateOpen, setAskSlateOpen] = useState(false);
  const { isPresentationMode, togglePresentationMode } = usePresentationMode();

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

        {/* Presentation Mode Banner */}
        {isPresentationMode && (
          <div style={{
            background: `linear-gradient(90deg, ${brand.gold}22 0%, ${brand.gold}10 100%)`,
            borderBottom: `1px solid ${brand.gold}40`,
            padding: '6px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: brand.gold,
                boxShadow: `0 0 6px ${brand.gold}`,
                display: 'inline-block',
                animation: 'demoPulse 2s ease-in-out infinite',
              }} />
              <span style={{
                fontSize: fontSize.xs, fontWeight: fontWeight.bold,
                color: brand.gold, textTransform: 'uppercase', letterSpacing: '1.5px',
                fontFamily: font.body,
              }}>
                Presentation Mode Active — Veritas Charter Schools Demo Dataset
              </span>
            </div>
            <button
              onClick={togglePresentationMode}
              style={{
                fontSize: fontSize.xs, color: brand.gold, background: 'none',
                border: `1px solid ${brand.gold}40`, borderRadius: 4,
                padding: '2px 10px', cursor: 'pointer', fontFamily: font.body,
                letterSpacing: '0.5px',
              }}
            >
              Exit Demo Mode
            </button>
            <style>{`@keyframes demoPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
          </div>
        )}

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
