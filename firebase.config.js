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
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID" // Optional: for Analytics
  },

  // Firebase Admin Configuration (used by server-side code)
  admin: {
    projectId: "YOUR_PROJECT_ID",
    // For service account credentials, create a JSON file at:
    // ./serviceAccountKey.json
    // Download from: Firebase Console > Project Settings > Service Accounts > Generate New Private Key
    serviceAccountPath: "./serviceAccountKey.json"
  }
};
