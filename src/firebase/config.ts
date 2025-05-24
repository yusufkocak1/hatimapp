import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCHG7pGWP1wm8did5ULebp-QPz3gRb2kHs",
  authDomain: "hatim-app-8eb96.firebaseapp.com",
  projectId: "hatim-app-8eb96",
  storageBucket: "hatim-app-8eb96.appspot.com",
  messagingSenderId: "644355268191",
  appId: "1:644355268191:web:3e409de357f4ac1d6585ea",
  measurementId: "G-SFVRWNBSB9"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export default app;
