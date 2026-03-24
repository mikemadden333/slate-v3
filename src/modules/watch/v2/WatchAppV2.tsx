/**
 * Watch v2 — Main Entry Point
 * Orchestrates CEO Network View ↔ Principal Campus View
 * Single data hook feeds both views.
 */

import React, { useState, useCallback } from 'react';
import { useWatchData } from './useWatchData';
import { CEOView } from './CEOView';
import { PrincipalView } from './PrincipalView';

export const WatchAppV2: React.FC = () => {
  const data = useWatchData();
  const [selectedCampusId, setSelectedCampusId] = useState<number | null>(null);

  const handleSelectCampus = useCallback((campusId: number) => {
    setSelectedCampusId(campusId);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedCampusId(null);
  }, []);

  if (selectedCampusId !== null) {
    return (
      <PrincipalView
        data={data}
        campusId={selectedCampusId}
        onBack={handleBack}
      />
    );
  }

  return (
    <CEOView
      data={data}
      onSelectCampus={handleSelectCampus}
    />
  );
};

export default WatchAppV2;
