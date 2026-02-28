// services/firebaseConfig.js
// React Native Firebase SDK - for production/real devices

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';

// No need to initialize - React Native Firebase auto-configures from
// google-services.json (Android) and GoogleService-Info.plist (iOS)

export { firestore, auth, storage };
export const db = firestore();
