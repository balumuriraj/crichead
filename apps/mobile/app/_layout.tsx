import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initializeFirebase } from '@crichead/core';

initializeFirebase({
  apiKey: 'AIzaSyC4EKVna2ChIW0L-RXnFHt0LBkUX7NvIAI',
  authDomain: 'crichead-app.firebaseapp.com',
  projectId: 'crichead-app',
  storageBucket: 'crichead-app.firebasestorage.app',
  messagingSenderId: '345345271554',
  appId: '1:345345271554:web:f2dc213b6cbf909639441b',
});

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="match/[id]"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
