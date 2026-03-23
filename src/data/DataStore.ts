/**
 * Slate v3 — DataStore
 * ═══════════════════════════════════════════════════
 * THE single source of truth for all Slate data.
 * Every module reads from here. Every update flows through here.
 * Persists to localStorage. Designed so swapping to a real DB
 * is a one-file change.
 *
 * v3.1 — Golden Thread: Emergency Event Bus
 * Emergency events propagate across modules via the store.
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type { SlateStore, UserRole, EmergencyEvent } from '../core/types';
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
  | { type: 'ADD_EMERGENCY'; payload: EmergencyEvent }
  | { type: 'UPDATE_EMERGENCY'; payload: { id: string; updates: Partial<EmergencyEvent> } }
  | { type: 'RESOLVE_EMERGENCY'; payload: string }
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
    case 'ADD_EMERGENCY': {
      const event = action.payload;
      // Golden Thread: When an emergency is added, it automatically:
      // 1. Creates a work order in Facilities
      const newWorkOrder = {
        id: event.workOrderId || `WO-E-${Date.now()}`,
        campus: event.campus,
        description: `EMERGENCY: ${event.title}`,
        priority: 'urgent' as const,
        status: 'open' as const,
        dateSubmitted: event.timestamp,
        assignedTo: 'Emergency Response Team',
        category: mapEmergencyToCategory(event.type),
        estimatedCost: event.estimatedCost,
        daysOpen: 0,
        notes: event.description,
      };
      // 2. Creates a risk entry in Shield
      const newRisk = {
        id: event.riskId || `RSK-E-${Date.now()}`,
        name: `EMERGENCY: ${event.title}`,
        dateIdentified: event.timestamp,
        description: `${event.description}\n\nEstimated financial impact: $${event.estimatedCost.toLocaleString()}. ${event.occupancyImpact ? 'Building occupancy is affected.' : ''}`,
        lens: 'Emergent' as const,
        category: 'Facilities',
        owner: event.reportedBy,
        likelihood: 5,
        impact: event.severity === 'critical' ? 5 : event.severity === 'high' ? 4 : 3,
        velocity: 'Fast' as const,
        controls: 'Emergency response protocol activated',
        mitigation: 'Immediate assessment and remediation in progress',
        mitigationStatus: 'In Progress',
        targetScore: 6,
        tier: 'Tier 1 — Board Focus' as const,
        kri: 'Facilities emergency count',
        lastReview: event.timestamp,
        nextReview: new Date(Date.now() + 7 * 86400000).toISOString(),
        trend: '↑ Increasing' as const,
        notes: `Auto-generated from Grounds emergency entry. Contact: ${event.contactPhone}`,
      };
      return {
        ...state,
        emergencyEvents: [...state.emergencyEvents, { ...event, watchAlertSent: true, briefingFlagged: true, ledgerImpactModeled: true }],
        facilities: {
          ...state.facilities,
          workOrders: [newWorkOrder, ...state.facilities.workOrders],
          lastUpdated: new Date().toISOString(),
        },
        risks: {
          ...state.risks,
          register: [newRisk, ...state.risks.register],
          lastUpdated: new Date().toISOString(),
        },
      };
    }
    case 'UPDATE_EMERGENCY':
      return {
        ...state,
        emergencyEvents: state.emergencyEvents.map(e =>
          e.id === action.payload.id ? { ...e, ...action.payload.updates } : e
        ),
      };
    case 'RESOLVE_EMERGENCY':
      return {
        ...state,
        emergencyEvents: state.emergencyEvents.map(e =>
          e.id === action.payload ? { ...e, status: 'resolved' as const } : e
        ),
      };
    case 'RESET_TO_DEMO':
      return { ...VERITAS_DEFAULTS };
    default:
      return state;
  }
}

function mapEmergencyToCategory(type: string): 'hvac' | 'plumbing' | 'electrical' | 'structural' | 'security' | 'grounds' | 'fire-safety' | 'general' {
  const map: Record<string, 'hvac' | 'plumbing' | 'electrical' | 'structural' | 'security' | 'grounds' | 'fire-safety' | 'general'> = {
    'roof-collapse': 'structural',
    'flooding': 'plumbing',
    'fire': 'fire-safety',
    'hvac-failure': 'hvac',
    'gas-leak': 'general',
    'structural': 'structural',
    'security': 'security',
    'other': 'general',
  };
  return map[type] || 'general';
}

// ─── Load from localStorage ───────────────────────────────────────────────

function loadStore(): SlateStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults to handle schema evolution
      return { ...VERITAS_DEFAULTS, ...parsed, emergencyEvents: parsed.emergencyEvents || [] };
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
  addEmergency: (event: EmergencyEvent) => void;
  resolveEmergency: (id: string) => void;
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
  const addEmergency = useCallback((event: EmergencyEvent) => dispatch({ type: 'ADD_EMERGENCY', payload: event }), []);
  const resolveEmergency = useCallback((id: string) => dispatch({ type: 'RESOLVE_EMERGENCY', payload: id }), []);
  const resetToDemo = useCallback(() => dispatch({ type: 'RESET_TO_DEMO' }), []);

  const value: DataStoreContextValue = { store, dispatch, setRole, setCampus, addEmergency, resolveEmergency, resetToDemo };

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

export function useEmergencies() {
  const { store, addEmergency, resolveEmergency } = useDataStore();
  return {
    events: store.emergencyEvents,
    activeEvents: store.emergencyEvents.filter(e => e.status === 'active'),
    addEmergency,
    resolveEmergency,
  };
}
