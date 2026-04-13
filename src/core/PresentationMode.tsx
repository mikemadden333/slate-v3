/**
 * Slate v3 — Presentation Mode
 * ═══════════════════════════════════════════════════
 * Ctrl+Shift+P toggles a curated demo state across the entire app.
 * When active, the DataStore is overridden with a fixed, story-driven
 * snapshot that matches the demo script beat for beat.
 *
 * This is additive — it never modifies existing data or functionality.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface PresentationModeContextValue {
  isPresentationMode: boolean;
  togglePresentationMode: () => void;
}

const PresentationModeContext = createContext<PresentationModeContextValue>({
  isPresentationMode: false,
  togglePresentationMode: () => {},
});

export function PresentationModeProvider({ children }: { children: ReactNode }) {
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  const togglePresentationMode = useCallback(() => {
    setIsPresentationMode(prev => !prev);
  }, []);

  // Ctrl+Shift+P keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setIsPresentationMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <PresentationModeContext.Provider value={{ isPresentationMode, togglePresentationMode }}>
      {children}
    </PresentationModeContext.Provider>
  );
}

export function usePresentationMode() {
  return useContext(PresentationModeContext);
}
