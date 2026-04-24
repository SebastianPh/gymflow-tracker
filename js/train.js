import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let startTime;
let timerInterval;
let todayRoutine = null;
let userUid = null;

// --- 1. VERIFICACIÓN INICIAL ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    userUid = user.uid;

    const d = new Date();
    const fechaHoyManual = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    const preTrainUI = document.getElementById('pre-train-ui');
    const titleEl = document.getElementById('routine-title');
    const btnStart = document.getElementById('btn-start');

    const q = query(
        collection(db, "entrenamientos"), 
        where("uid", "==", userUid), 
        where("fechaShort", "==", fechaHoyManual)
    );
    
    try {
        const snap = await getDocs(q);
        if (!snap.empty) {
            titleEl.innerHTML = `
                <div style="text-align: center; color: #10b981;">
                    <span style="font-size: 3rem;">✅</span><br>
                    <strong>¡Entrenamiento Completado!</strong><br>
                    <span style="font-size: 1rem; color: #94a3b8; font-weight: 400;">
                        Buen trabajo hoy, Sebastian. A descansar.
                    </span>
                </div>
            `;
            btnStart.classList.add('hidden');
            return;
        }

        const userDoc = await getDoc(doc(db, "users", user.uid));
        const plan = userDoc.data()?.planMaster || [];
        const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        const dayName = diasSemana[new Date().getDay()];
        todayRoutine = plan.find(p => p.dayName === dayName);

        if (todayRoutine) {
            titleEl.innerText = `Hoy toca: ${todayRoutine.muscle}`;
            btnStart.classList.remove('hidden');
        } else {
            titleEl.innerText = "Día de Descanso";
            btnStart.classList.add('hidden');
        }
    } catch (error) {
        console.error("Error:", error);
    }
});

// --- 2. RENDERIZADO PRO ---
document.getElementById('btn-start').onclick = () => {
    if (!todayRoutine) return;

    document.getElementById('pre-train-ui').classList.add('hidden');
    document.getElementById('active-train-ui').classList.remove('hidden');
    
    startTime = new Date();
    timerInterval = setInterval(() => {
        const diff = Math.floor((new Date() - startTime) / 1000);
        const hrs = Math.floor(diff / 3600).toString().padStart(2, '0');
        const mins = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const secs = (diff % 60).toString().padStart(2, '0');
        document.getElementById('cronometro').innerText = `${hrs}:${mins}:${secs}`;
    }, 1000);

    const list = document.getElementById('workout-list');
    list.innerHTML = ''; 
    
    todayRoutine.exercises.forEach((ex, i) => {
        const div = document.createElement('div');
        div.className = 'exercise-card pro-card';
        div.id = `card-${i}`;
        div.innerHTML = `
            <div class="card-header">
                <h4>${ex}</h4>
                <span class="status-badge" id="badge-${i}">En curso</span>
            </div>
            <div id="sets-${i}" class="sets-container">
                </div>
            <div class="card-actions" id="actions-${i}">
                <button type="button" class="btn-pro-add" onclick="window.addSetField(${i})">+ Añadir Serie</button>
                <button type="button" class="btn-pro-check" onclick="window.finishExercise(${i})">Finalizar Ejercicio</button>
            </div>
        `;
        list.appendChild(div);
        window.addSetField(i); // Genera la primera serie
    });
};

// --- 3. FUNCIONES DE INTERFAZ (ESTADOS GRIS/VERDE) ---
window.addSetField = (id) => {
    const container = document.getElementById(`sets-${id}`);
    const setNum = container.children.length + 1;
    const row = document.createElement('div'); 
    row.className = 'set-row-pro';
    row.innerHTML = `
        <span class="set-num">${setNum}</span>
        <input type="number" class="r" placeholder="Reps" oninput="window.checkSet(this)">
        <span class="x-mark">×</span>
        <input type="number" class="w" placeholder="Kg" oninput="window.checkSet(this)">
        <div class="check-circle"></div>
    `;
    container.appendChild(row);
};

window.checkSet = (input) => {
    const row = input.parentElement;
    const r = row.querySelector('.r').value;
    const w = row.querySelector('.w').value;
    if (r > 0 && w > 0) {
        row.classList.add('set-completed');
    } else {
        row.classList.remove('set-completed');
    }
};

window.finishExercise = (id) => {
    const card = document.getElementById(`card-${id}`);
    const badge = document.getElementById(`badge-${id}`);
    const actions = document.getElementById(`actions-${id}`);
    const sets = document.getElementById(`sets-${id}`);
    
    card.classList.add('card-finished');
    badge.innerText = "✓ Completado";
    badge.style.background = "#10b981";
    actions.style.display = "none";
    sets.style.display = "none"; // Colapsar series para ahorrar espacio
};

// --- 4. GUARDAR DATOS ---
document.getElementById('btn-finish').onclick = async () => {
    const exercisesData = [];
    document.querySelectorAll('.exercise-card').forEach(card => {
        const nombre = card.querySelector('h4').innerText;
        const reps = Array.from(card.querySelectorAll('.r')).map(i => i.value);
        const weights = Array.from(card.querySelectorAll('.w')).map(i => i.value);
        const info = reps.map((r, idx) => {
            return (r && weights[idx]) ? `${r}x${weights[idx]}kg` : null;
        }).filter(v => v !== null);

        if (info.length > 0) exercisesData.push({ nombre: nombre, series: info.join(' | ') });
    });

    if (exercisesData.length === 0) {
        alert("Registra al menos un ejercicio completo.");
        return;
    }

    const d = new Date();
    const fechaManual = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

    try {
        await addDoc(collection(db, "entrenamientos"), {
            uid: auth.currentUser.uid,
            fechaShort: fechaManual, 
            fechaFull: new Date(),
            duracion: document.getElementById('cronometro').innerText,
            ejercicios: exercisesData
        });
        clearInterval(timerInterval);
        alert("¡Entrenamiento guardado con éxito!");
        window.location.href = 'home.html';
    } catch (error) {
        console.error("Error:", error);
    }
};