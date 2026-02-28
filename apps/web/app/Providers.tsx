'use client';

import { useMemo } from 'react';
import { DataProviderContext } from '@crichead/core/hooks';
import { createOfflineStorageDataProvider } from '@crichead/core';

export function Providers({ children }: { children: React.ReactNode }) {
  const dataProvider = useMemo(() => createOfflineStorageDataProvider(), []);

  return (
    <DataProviderContext.Provider value={dataProvider}>
      {children}
    </DataProviderContext.Provider>
  );
}
