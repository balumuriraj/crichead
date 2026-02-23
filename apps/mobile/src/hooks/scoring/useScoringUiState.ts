import { useState } from 'react';
import type { TabKey } from '../../types/scoring';

export function useScoringUiState() {
  const [activeTab, setActiveTab] = useState<TabKey>('players');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('Match Settings');

  return {
    activeTab,
    setActiveTab,
    showSettingsModal,
    setShowSettingsModal,
    expandedSection,
    setExpandedSection,
  };
}
