// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDkCg-dddRG2NzrQGk35hOitFj7jBcAyCo",
  authDomain: "doubly-messenging.firebaseapp.com",
  projectId: "doubly-messenging",
  storageBucket: "doubly-messenging.appspot.com",
  messagingSenderId: "418458858405",
  appId: "1:418458858405:web:c24ae8c4cbfc007ed92e4c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);