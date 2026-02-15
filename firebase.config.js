/**
 * Firebase Configuration Template
 *
 * This file contains placeholder Firebase configuration values.
 * Replace these values with your actual Firebase project credentials.
 *
 * To get these values:
 * 1. Go to Firebase Console: https://console.firebase.google.com/
 * 2. Select your project
 * 3. Go to Project Settings > General
 * 4. Scroll down to "Your apps" section
 * 5. Click on your web app or create a new one
 * 6. Copy the config object
 */

module.exports = {
  // Firebase Client Configuration (used by web and mobile apps)
  client: {
  apiKey: "AIzaSyC4EKVna2ChIW0L-RXnFHt0LBkUX7NvIAI",
  authDomain: "crichead-app.firebaseapp.com",
  projectId: "crichead-app",
  storageBucket: "crichead-app.firebasestorage.app",
  messagingSenderId: "345345271554",
  appId: "1:345345271554:web:f2dc213b6cbf909639441b",
  measurementId: "G-M0SY4HQJ29" // Optional: for Analytics
  },

  // Firebase Admin Configuration (used by server-side code)
  admin: {
    projectId: "crichead-app",
    // For service account credentials, create a JSON file at:
    // ./serviceAccountKey.json
    // Download from: Firebase Console > Project Settings > Service Accounts > Generate New Private Key
    serviceAccountPath: "./serviceAccountKey.json"
  }
};
