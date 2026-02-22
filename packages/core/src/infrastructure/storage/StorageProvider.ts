export interface StorageProvider {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

let provider: StorageProvider | null = null;

export function setStorageProvider(p: StorageProvider) {
  provider = p;
}

export function getStorageProvider(): StorageProvider {
  if (!provider) throw new Error("StorageProvider not initialized");
  return provider;
}
