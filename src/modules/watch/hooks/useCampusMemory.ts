/**
 * useCampusMemory — The app remembers.
 *
 * Persists principal state across sessions:
 * - Last visit timestamp
 * - Last score and label
 * - Whether retaliation window was active
 * - Items they're watching
 *
 * Generates "Since you were last here" context on return visits.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { CampusRisk } from '../engine/types';

export interface CampusMemory {
  lastVisit: string;
  lastScore: number;
  lastLabel: string;
  lastRetWin: boolean;
  lastRetZoneId: string;
  watchedItems: WatchedItem[];
}

export interface WatchedItem {
  id: string;
  type: 'zone' | 'incident' | 'news';
  label: string;
  addedAt: string;
  resolved?: boolean;
}

export interface SinceLastVisit {
  show: boolean;
  hoursAgo: number;
  scoreChange: number;
  prevScore: number;
  prevLabel: string;
  wasRetWin: boolean;
  retWindowUpdate: string | null;
  newIncidentCount: number;
}

const MEMORY_KEY = (campusId: number) => `pulse_campus_memory_${campusId}`;

function loadMemory(campusId: number): CampusMemory | null {
  try {
    const raw = localStorage.getItem(MEMORY_KEY(campusId));
    if (!raw) return null;
    return JSON.parse(raw) as CampusMemory;
  } catch {
    return null;
  }
}

function saveMemory(campusId: number, memory: CampusMemory) {
  localStorage.setItem(MEMORY_KEY(campusId), JSON.stringify(memory));
}

export function useCampusMemory(campusId: number, risk: CampusRisk) {
  const [sinceLastVisit, setSinceLastVisit] = useState<SinceLastVisit | null>(null);
  const [memory, setMemory] = useState<CampusMemory | null>(null);
  const [showCard, setShowCard] = useState(false);
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Safe accessors — guard against risk being undefined/null during initial render
  const riskScore = risk?.score ?? 0;
  const riskLabel = risk?.label ?? 'LOW';
  const riskInRetWin = risk?.inRetaliationWindow ?? false;
  const riskZones = risk?.contagionZones ?? [];

  // Load memory and compute "since last visit" on mount
  useEffect(() => {
    const prev = loadMemory(campusId);
    setMemory(prev);

    if (prev) {
      const lastMs = new Date(prev.lastVisit).getTime();
      const hoursAgo = (Date.now() - lastMs) / 3600000;

      // Only show "since last visit" if > 2 hours
      if (hoursAgo >= 2) {
        const scoreChange = riskScore - prev.lastScore;

        let retWindowUpdate: string | null = null;
        if (prev.lastRetWin && riskInRetWin) {
          const retZone = riskZones.find(z => z.retWin);
          if (retZone) {
            const hoursRemaining = Math.max(0, Math.round(72 - retZone.ageH));
            retWindowUpdate = `The retaliation window you were monitoring has advanced — ${hoursRemaining}h remaining.`;
          }
        } else if (prev.lastRetWin && !riskInRetWin) {
          retWindowUpdate = 'The retaliation window you were monitoring has closed. Risk is returning to baseline.';
        }

        setSinceLastVisit({
          show: true,
          hoursAgo: Math.round(hoursAgo),
          scoreChange,
          prevScore: prev.lastScore,
          prevLabel: prev.lastLabel,
          wasRetWin: prev.lastRetWin,
          retWindowUpdate,
          newIncidentCount: 0, // We don't track this precisely, but the count is useful
        });

        setShowCard(true);

        // Auto-hide after 30 seconds
        autoHideTimer.current = setTimeout(() => setShowCard(false), 30_000);
      }
    }

    // Save current state as the new memory
    const newMemory: CampusMemory = {
      lastVisit: new Date().toISOString(),
      lastScore: riskScore,
      lastLabel: riskLabel,
      lastRetWin: riskInRetWin,
      lastRetZoneId: riskZones.find(z => z.retWin)?.incidentId ?? '',
      watchedItems: prev?.watchedItems ?? [],
    };
    saveMemory(campusId, newMemory);

    return () => {
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campusId]);

  // Save score updates continuously
  useEffect(() => {
    const prev = loadMemory(campusId);
    if (prev) {
      saveMemory(campusId, { ...prev, lastScore: riskScore, lastLabel: riskLabel, lastRetWin: riskInRetWin });
    }
  }, [campusId, riskScore, riskLabel, riskInRetWin]);

  const dismissCard = useCallback(() => {
    setShowCard(false);
    if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
  }, []);

  const addWatchedItem = useCallback((item: Omit<WatchedItem, 'addedAt'>) => {
    const mem = loadMemory(campusId);
    if (!mem) return;
    const newItem: WatchedItem = { ...item, addedAt: new Date().toISOString() };
    if (!mem.watchedItems.some(w => w.id === item.id)) {
      mem.watchedItems.push(newItem);
      saveMemory(campusId, mem);
      setMemory({ ...mem });
    }
  }, [campusId]);

  const removeWatchedItem = useCallback((itemId: string) => {
    const mem = loadMemory(campusId);
    if (!mem) return;
    mem.watchedItems = mem.watchedItems.filter(w => w.id !== itemId);
    saveMemory(campusId, mem);
    setMemory({ ...mem });
  }, [campusId]);

  // Check for resolved watched items
  const resolvedItems = (memory?.watchedItems ?? []).filter(w => {
    if (w.type === 'zone') {
      // Check if the zone has closed
      return !riskZones.some(z => z.incidentId === w.id);
    }
    return false;
  });

  // Score change context
  const scoreChangeText = memory && memory.lastScore !== riskScore
    ? (() => {
        const diff = riskScore - memory.lastScore;
        const timeLabel = (() => {
          const h = (Date.now() - new Date(memory.lastVisit).getTime()) / 3600000;
          if (h < 12) return 'this morning';
          if (h < 24) return 'yesterday';
          return `${Math.round(h / 24)} days ago`;
        })();
        if (diff > 0) return `↑ +${diff} since ${timeLabel}`;
        if (diff < 0) return `↓ ${diff} since ${timeLabel}`;
        return null;
      })()
    : null;

  return {
    sinceLastVisit: showCard ? sinceLastVisit : null,
    dismissCard,
    memory,
    addWatchedItem,
    removeWatchedItem,
    resolvedItems,
    scoreChangeText,
    scoreChangeDirection: memory ? (riskScore > memory.lastScore ? 'up' : riskScore < memory.lastScore ? 'down' : null) : null,
  };
}
