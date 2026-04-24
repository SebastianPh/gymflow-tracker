/* ==========================================================================
   CONFIGURACIÓN CENTRAL DE FIREBASE (ACTUALIZADA)
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db, storage, auth } from "./firebase-config.js";
// --- TUS CREDENCIALES REALES ---
const firebaseConfig = {
  apiKey: "AIzaSyAQojED7cjdFpriz3ziEgaNFA_xjjner7E",
  authDomain: "gymflow-app-25fe4.firebaseapp.com",
  projectId: "gymflow-app-25fe4",
  storageBucket: "gymflow-app-25fe4.firebasestorage.app",
  messagingSenderId: "815150848035",
  appId: "1:815150848035:web:96e8979194d1b14eaef996"
};

// Inicialización
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);