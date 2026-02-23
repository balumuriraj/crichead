'use client';

import { useMemo } from 'react';
import { DataProviderContext } from '@crichead/core/hooks';
import { createLocalStorageDataProvider } from '@crichead/core';

export function Providers({ children }: { children: React.ReactNode }) {
  const dataProvider = useMemo(() => createLocalStorageDataProvider(), []);

  return (
    <DataProviderContext.Provider value={dataProvider}>
      {children}
    </DataProviderContext.Provider>
  );
}
