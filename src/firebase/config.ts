import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAm-KqEWEY0TxujvW8VDvJRIiEyn5CtU8k",
  authDomain: "familyspot-92cd1.firebaseapp.com",
  databaseURL:
    "https://familyspot-92cd1-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "familyspot-92cd1",
  storageBucket: "familyspot-92cd1.firebasestorage.app",
  messagingSenderId: "15298027681",
  appId: "1:15298027681:web:b48a68e67498b61c8990e0",
  measurementId: "G-YWLYT1G0PW",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
