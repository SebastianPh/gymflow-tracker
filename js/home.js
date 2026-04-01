import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. GESTIÓN DE ESTADO DE SESIÓN ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            // Actualizar nombre del usuario
            document.getElementById('user-name').innerText = userDoc.data()?.nombre || "Atleta";
            // Renderizar calendario
            renderCalendar(user.uid);
        } catch (error) {
            console.error("Error al cargar datos de usuario:", error);
        }
    }
});

// --- 2. RENDERIZADO DEL CALENDARIO ---
async function renderCalendar(uid) {
    const container = document.getElementById('monthly-calendar');
    if (!container) return;

    try {
        // Consultar entrenamientos del usuario
        const q = query(collection(db, "entrenamientos"), where("uid", "==", uid));
        const snap = await getDocs(q);
        
        // Creamos un Set con las fechas guardadas para comparación rápida
        const trainedDays = new Set(snap.docs.map(d => d.data().fechaShort));

        container.innerHTML = '';
        const now = new Date();
        const today = now.getDate();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        
        // Calcular el último día del mes actual
        const lastDay = new Date(currentYear, currentMonth, 0).getDate();

        for (let i = 1; i <= lastDay; i++) {
            // GENERACIÓN DE FECHA MANUAL (Debe coincidir con train.js)
            const dateStr = `${i}/${currentMonth}/${currentYear}`;
            
            const hasTrained = trainedDays.has(dateStr);
            const isPast = i < today;

            const dayEl = document.createElement('div');
            dayEl.className = `calendar-day`;
            
            let content = `<small>${i}</small><br>`;

            if (hasTrained) {
                // ESTADO: ENTRENADO
                dayEl.style.background = '#10b981'; // Verde Neón
                dayEl.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.4)';
                dayEl.classList.add('done');
                content += '✅';
            } else if (isPast) {
                // ESTADO: DÍA PASADO SIN ENTRENAR
                dayEl.style.background = '#ef444433'; // Rojo tenue
                content += '❌';
            } else {
                // ESTADO: HOY (AÚN NO ENTRENA) O FUTURO
                dayEl.style.background = '#1e293b'; 
                content += ''; 
            }

            dayEl.innerHTML = content;
            container.appendChild(dayEl);
        }
        
        // Actualizar racha con la cantidad total de entrenamientos en el mes
        const streakEl = document.getElementById('user-streak');
        if (streakEl) streakEl.innerText = trainedDays.size;

    } catch (error) {
        console.error("Error al renderizar calendario:", error);
    }
}

// --- 3. CERRAR SESIÓN ---
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.onclick = async () => {
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            alert("Error al cerrar sesión");
        }
    };
}