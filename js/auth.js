import { auth, db } from './firebase-config.js';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const authForm = document.getElementById('auth-form');
const toggleBtn = document.getElementById('toggle-auth');
const registerFields = document.getElementById('register-fields');
const googleBtn = document.getElementById('google-btn'); // Referencia al nuevo botón

const ADMIN_EMAIL = "sebastiaphsistemas@gmail.com"; 

// Redirección si ya está logueado
onAuthStateChanged(auth, (user) => {
    if (user) window.location.href = 'home.html';
});

// --- LÓGICA DE GOOGLE ---
const loginConGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Verificar si el usuario ya existe en Firestore para no sobrescribir datos
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (!userDoc.exists()) {
            // Si es nuevo, asignamos rol según el correo
            const userRole = (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) ? "admin" : "user";
            
            await setDoc(doc(db, "users", user.uid), { 
                nombre: user.displayName || "Usuario de Google", 
                email: user.email,
                rol: userRole, 
                planMaster: [] 
            });
        }
        window.location.href = 'home.html';
    } catch (error) {
        console.error("Error Google:", error.code);
        alert("Error con Google: " + error.message);
    }
};

// Asignar evento al botón de Google
if (googleBtn) {
    googleBtn.onclick = loginConGoogle;
}

// Alternar entre Login y Registro
toggleBtn.onclick = (e) => {
    e.preventDefault();
    const isReg = registerFields.classList.toggle('hidden');
    // Corregimos el texto del botón según la vista
    document.getElementById('auth-submit-btn').innerText = isReg ? 'Registrarse' : 'Entrar';
    // Corregimos el texto del enlace inferior
    toggleBtn.innerText = isReg ? '¿Ya tienes cuenta? Entra' : '¿No tienes cuenta? Regístrate';
};

// Manejo del Formulario Tradicional
authForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const pass = document.getElementById('password').value.trim();
    const isReg = !registerFields.classList.contains('hidden');

    try {
        if (isReg) {
            const name = document.getElementById('display-name').value.trim();
            if (!name) return alert("Por favor ingresa tu nombre");

            const res = await createUserWithEmailAndPassword(auth, email, pass);
            const userRole = (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) ? "admin" : "user";

            await setDoc(doc(db, "users", res.user.uid), { 
                nombre: name, 
                email: email, 
                rol: userRole, 
                planMaster: [] 
            });
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
        }
    } catch (err) { 
        console.error("Error Auth:", err.code);
        // Manejo del error específico que reportó la usuaria
        if (err.code === 'auth/invalid-credential') {
            alert("El correo o la contraseña son incorrectos.");
        } else {
            alert("Error: " + err.message); 
        }
    }
};