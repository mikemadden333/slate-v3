/**
 * Slate v3 — DataStore
 * ═══════════════════════════════════════════════════
 * THE single source of truth for all Slate data.
 * Every module reads from here. Every update flows through here.
 * Persists to localStorage. Designed so swapping to a real DB
 * is a one-file change.
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type { SlateStore, UserRole } from '../core/types';
import { VERITAS_DEFAULTS } from './defaults/veritas';

// ─── Storage Key ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'slate-v3-data';

// ─── Actions ──────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_STORE'; payload: SlateStore }
  | { type: 'UPDATE_ENROLLMENT'; payload: Partial<SlateStore['enrollment']> }
  | { type: 'UPDATE_FINANCIALS'; payload: Partial<SlateStore['financials']> }
  | { type: 'UPDATE_STAFF'; payload: Partial<SlateStore['staff']> }
  | { type: 'UPDATE_RISKS'; payload: Partial<SlateStore['risks']> }
  | { type: 'UPDATE_FUNDRAISING'; payload: Partial<SlateStore['fundraising']> }
  | { type: 'UPDATE_COMPLIANCE'; payload: Partial<SlateStore['compliance']> }
  | { type: 'UPDATE_FACILITIES'; payload: Partial<SlateStore['facilities']> }
  | { type: 'UPDATE_CIVIC'; payload: Partial<SlateStore['civic']> }
  | { type: 'UPDATE_NETWORK'; payload: Partial<SlateStore['network']> }
  | { type: 'SET_ROLE'; payload: UserRole }
  | { type: 'SET_CAMPUS'; payload: number }
  | { type: 'RESET_TO_DEMO' };

// ─── Reducer ──────────────────────────────────────────────────────────────

function reducer(state: SlateStore, action: Action): SlateStore {
  switch (action.type) {
    case 'SET_STORE':
      return action.payload;
    case 'UPDATE_ENROLLMENT':
      return { ...state, enrollment: { ...state.enrollment, ...action.payload, lastUpdated: new Date().toISOString() } };
    case 'UPDATE_FINANCIALS':
      return { ...state, financials: { ...state.financials, ...action.payload, lastUpdated: new Date().toISOString() } };
    case 'UPDATE_STAFF':
      return { ...state, staff: { ...state.staff, ...action.payload, lastUpdated: new Date().toISOString() } };
    case 'UPDATE_RISKS':
      return { ...state, risks: { ...state.risks, ...action.payload, lastUpdated: new Date().toISOString() } };
    case 'UPDATE_FUNDRAISING':
      return { ...state, fundraising: { ...state.fundraising, ...action.payload, lastUpdated: new Date().toISOString() } };
    case 'UPDATE_COMPLIANCE':
      return { ...state, compliance: { ...state.compliance, ...action.payload, lastUpdated: new Date().toISOString() } };
    case 'UPDATE_FACILITIES':
      return { ...state, facilities: { ...state.facilities, ...action.payload, lastUpdated: new Date().toISOString() } };
    case 'UPDATE_CIVIC':
      return { ...state, civic: { ...state.civic, ...action.payload, lastUpdated: new Date().toISOString() } };
    case 'UPDATE_NETWORK':
      return { ...state, network: { ...state.network, ...action.payload } };
    case 'SET_ROLE':
      return { ...state, role: action.payload };
    case 'SET_CAMPUS':
      return { ...state, selectedCampusId: action.payload };
    case 'RESET_TO_DEMO':
      return { ...VERITAS_DEFAULTS };
    default:
      return state;
  }
}

// ─── Load from localStorage ───────────────────────────────────────────────

function loadStore(): SlateStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults to handle schema evolution
      return { ...VERITAS_DEFAULTS, ...parsed };
    }
  } catch (e) {
    console.warn('[DataStore] Failed to load from localStorage, using defaults', e);
  }
  return { ...VERITAS_DEFAULTS };
}

// ─── Context ──────────────────────────────────────────────────────────────

interface DataStoreContextValue {
  store: SlateStore;
  dispatch: React.Dispatch<Action>;
  // Convenience methods
  setRole: (role: UserRole) => void;
  setCampus: (campusId: number) => void;
  resetToDemo: () => void;
}

const DataStoreContext = createContext<DataStoreContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────

interface DataStoreProviderProps {
  children: ReactNode;
}

export function DataStoreProvider({ children }: DataStoreProviderProps) {
  const [store, dispatch] = useReducer(reducer, null, loadStore);

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      console.warn('[DataStore] Failed to persist to localStorage', e);
    }
  }, [store]);

  const setRole = useCallback((role: UserRole) => dispatch({ type: 'SET_ROLE', payload: role }), []);
  const setCampus = useCallback((campusId: number) => dispatch({ type: 'SET_CAMPUS', payload: campusId }), []);
  const resetToDemo = useCallback(() => dispatch({ type: 'RESET_TO_DEMO' }), []);

  const value: DataStoreContextValue = { store, dispatch, setRole, setCampus, resetToDemo };

  return React.createElement(DataStoreContext.Provider, { value }, children);
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useDataStore(): DataStoreContextValue {
  const ctx = useContext(DataStoreContext);
  if (!ctx) throw new Error('useDataStore must be used within a DataStoreProvider');
  return ctx;
}

// ─── Selector Hooks (for performance — modules only re-render on their slice) ──

export function useNetwork() {
  const { store } = useDataStore();
  return store.network;
}

export function useEnrollment() {
  const { store } = useDataStore();
  return store.enrollment;
}

export function useFinancials() {
  const { store } = useDataStore();
  return store.financials;
}

export function useStaff() {
  const { store } = useDataStore();
  return store.staff;
}

export function useRisks() {
  const { store } = useDataStore();
  return store.risks;
}

export function useFundraising() {
  const { store } = useDataStore();
  return store.fundraising;
}

export function useCompliance() {
  const { store } = useDataStore();
  return store.compliance;
}

export function useFacilities() {
  const { store } = useDataStore();
  return store.facilities;
}

export function useCivic() {
  const { store } = useDataStore();
  return store.civic;
}

export function useRole() {
  const { store, setRole, setCampus } = useDataStore();
  return { role: store.role, selectedCampusId: store.selectedCampusId, setRole, setCampus };
}
