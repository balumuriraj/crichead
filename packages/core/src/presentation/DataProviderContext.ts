/**
 * DataProviderContext — React context for injecting a DataProvider.
 *
 * Apps wrap their tree with <DataProviderContext.Provider value={adapter}>
 * and hooks call useDataProvider() to access data operations.
 */

import { createContext, useContext } from 'react';
import type { DataProvider } from '../application/ports/DataProvider';

export const DataProviderContext = createContext<DataProvider | null>(null);

/**
 * Access the injected DataProvider. Throws if no provider is set.
 */
export function useDataProvider(): DataProvider {
  const provider = useContext(DataProviderContext);
  if (!provider) {
    throw new Error(
      'useDataProvider: No DataProvider found. ' +
      'Wrap your app with <DataProviderContext.Provider value={...}>.'
    );
  }
  return provider;
}
