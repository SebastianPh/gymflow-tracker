import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const authForm = document.getElementById('auth-form');
const toggleBtn = document.getElementById('toggle-auth');
const registerFields = document.getElementById('register-fields');

// Tu correo de administrador para que el sistema sepa quién manda
const ADMIN_EMAIL = "sebastiaphsistemas@gmail.com"; 

onAuthStateChanged(auth, (user) => {
    if (user) window.location.href = 'home.html';
});

toggleBtn.onclick = (e) => {
    e.preventDefault();
    const isReg = registerFields.classList.toggle('hidden');
    document.getElementById('auth-submit-btn').innerText = isReg ? 'Registrarse' : 'Entrar';
};

authForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const isReg = !registerFields.classList.contains('hidden');

    try {
        if (isReg) {
            const name = document.getElementById('display-name').value;
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            
            // Lógica de Rol: Si el correo coincide con el tuyo, eres admin, si no, eres user.
            const userRole = (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) ? "admin" : "user";

            // Guardamos el perfil con el nuevo campo 'rol'
            await setDoc(doc(db, "users", res.user.uid), { 
                nombre: name, 
                email: email, // Guardamos el email para facilitar consultas
                rol: userRole, 
                planMaster: [] 
            });
            
            console.log(`Usuario creado con éxito. Rol asignado: ${userRole}`);
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
        }
    } catch (err) { 
        alert("Error: " + err.message); 
    }
};