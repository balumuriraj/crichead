import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setStorageProvider,
  saveLocalMatchCore,
  loadLocalMatchCore,
  listLocalMatchesCore,
  generateLocalId,
  type LocalMatchRecord,
} from '@crichead/core';

// Ensure the core storage service uses our React Native explicit implementation
setStorageProvider({
  getItem: AsyncStorage.getItem.bind(AsyncStorage),
  setItem: AsyncStorage.setItem.bind(AsyncStorage),
  removeItem: AsyncStorage.removeItem.bind(AsyncStorage),
});

export {
  saveLocalMatchCore as saveLocalMatch,
  loadLocalMatchCore as loadLocalMatch,
  listLocalMatchesCore as listLocalMatches,
  generateLocalId,
  type LocalMatchRecord,
};
