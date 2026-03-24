/**
 * Watch v2 — Main Entry Point
 * Orchestrates CEO Network View ↔ Principal Campus View
 * Reads role + selectedCampusId from the global DataStore
 * so the Sidebar toggle drives the view switch.
 */

import React from 'react';
import { useWatchData } from './useWatchData';
import { CEOView } from './CEOView';
import { PrincipalView } from './PrincipalView';
import { useRole } from '../../../data/DataStore';

export const WatchAppV2: React.FC = () => {
  const data = useWatchData();
  const { role, selectedCampusId, setRole, setCampus } = useRole();

  // Principal view — when the global role is 'principal' and a campus is selected
  if (role === 'principal' && selectedCampusId !== null && selectedCampusId !== undefined) {
    return (
      <PrincipalView
        data={data}
        campusId={selectedCampusId}
        onBack={() => {
          setRole('ceo');
        }}
      />
    );
  }

  // CEO view — default, or when role is 'ceo'
  return (
    <CEOView
      data={data}
      onSelectCampus={(campusId: number) => {
        // Clicking a campus in the CEO grid switches to principal view for that campus
        setCampus(campusId);
        setRole('principal');
      }}
    />
  );
};

export default WatchAppV2;
