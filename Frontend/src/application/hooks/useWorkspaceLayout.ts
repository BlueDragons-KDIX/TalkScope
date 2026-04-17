import { useState } from 'react';
import { type LayoutNode, type PanelId } from '@/domain/models/layoutTypes';
import { makeDefaultLayout, removeLeaf } from '@/presentation/layouts/layoutUtils';
import { toast } from 'sonner';

export function useWorkspaceLayout() {
  const [layout, setLayout] = useState<LayoutNode>(makeDefaultLayout);
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDictionaryManagerOpen, setIsDictionaryManagerOpen] = useState(false);
  const [settings, setSettings] = useState({ darkMode: false, themeColor: 'indigo' });

  const closePanel = (panelId: PanelId) => {
    const nextLayout = removeLeaf(layout, panelId);
    if (nextLayout) {
      setLayout(nextLayout);
    } else {
      toast.error('最後のパネルは閉じられません');
    }
  };

  return {
    layout, setLayout,
    isLayoutMenuOpen, setIsLayoutMenuOpen,
    isSettingsOpen, setIsSettingsOpen,
    isDictionaryManagerOpen, setIsDictionaryManagerOpen,
    settings, setSettings,
    closePanel,
  };
}
