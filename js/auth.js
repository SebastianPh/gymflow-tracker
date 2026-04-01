import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const authForm = document.getElementById('auth-form');
const toggleBtn = document.getElementById('toggle-auth');
const registerFields = document.getElementById('register-fields');

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
            await setDoc(doc(db, "users", res.user.uid), { nombre: name, planMaster: [] });
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
        }
    } catch (err) { alert("Error: " + err.message); }
};