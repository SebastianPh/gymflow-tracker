import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let startTime;
let timerInterval;
let todayRoutine = null;
let userUid = null;

// --- 1. BLOQUE DE VERIFICACIÓN INICIAL (LA CLAVE DEL CAMBIO) ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    userUid = user.uid;

    // A. Generamos la fecha manual de HOY (estándar D/M/AAAA)
    const d = new Date();
    const fechaHoyManual = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    
    // B. Obtenemos el contenedor pre-entrenamiento
    const preTrainUI = document.getElementById('pre-train-ui');
    const titleEl = document.getElementById('routine-title');
    const btnStart = document.getElementById('btn-start');

    // C. CONSULTA CRÍTICA: ¿Ya entrenó hoy?
    const q = query(
        collection(db, "entrenamientos"), 
        where("uid", "==", userUid), 
        where("fechaShort", "==", fechaHoyManual)
    );
    
    try {
        const snap = await getDocs(q);

        // SI YA EXISTE UN REGISTRO DE HOY: Mostramos el mensaje de descanso
        if (!snap.empty) {
            titleEl.innerHTML = `
                <div style="text-align: center; color: #10b981;">
                    <span style="font-size: 3rem;">✅</span><br>
                    <strong>¡Entrenamiento Completado!</strong><br>
                    <span style="font-size: 1rem; color: #94a3b8; font-weight: 400;">
                        Buen trabajo hoy, Sebastian. A descansar para tu próximo entrenamiento.
                    </span>
                </div>
            `;
            btnStart.classList.add('hidden'); // Ocultamos el botón para que no vuelva a entrenar
            document.getElementById('routine-date').classList.add('hidden'); // Ocultamos la fecha opcional
            return; // Detenemos la ejecución aquí, no cargamos rutina
        }

        // SI NO HA ENTRENADO: Procedemos a cargar la rutina del día
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
        console.error("Error en la verificación de entrenamiento:", error);
    }
});

// --- 2. INICIAR ENTRENAMIENTO ACTIVO (SIN CAMBIOS) ---
document.getElementById('btn-start').onclick = () => {
    if (!todayRoutine) return;

    document.getElementById('pre-train-ui').classList.add('hidden');
    document.getElementById('active-train-ui').classList.remove('hidden');
    
    // Iniciar Cronómetro
    startTime = new Date();
    timerInterval = setInterval(() => {
        const diff = Math.floor((new Date() - startTime) / 1000);
        const hrs = Math.floor(diff / 3600).toString().padStart(2, '0');
        const mins = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const secs = (diff % 60).toString().padStart(2, '0');
        document.getElementById('cronometro').innerText = `${hrs}:${mins}:${secs}`;
    }, 1000);

    // Renderizar Ejercicios
    const list = document.getElementById('workout-list');
    list.innerHTML = ''; 
    
    todayRoutine.exercises.forEach((ex, i) => {
        const div = document.createElement('div');
        div.className = 'exercise-card';
        div.innerHTML = `
            <h4>${ex}</h4>
            <div id="sets-${i}">
                <div class="set-row">
                    <input type="number" class="r" placeholder="Reps">
                    <input type="number" class="w" placeholder="Kg">
                </div>
            </div>
            <button type="button" class="btn-add-set" onclick="window.addSetField(${i})">+ Serie</button>
        `;
        list.appendChild(div);
    });
};

// --- 3. AGREGAR SERIES (SIN CAMBIOS) ---
window.addSetField = (id) => {
    const container = document.getElementById(`sets-${id}`);
    const row = document.createElement('div'); 
    row.className = 'set-row';
    row.innerHTML = `<input type="number" class="r" placeholder="Reps"><input type="number" class="w" placeholder="Kg">`;
    container.appendChild(row);
};

// --- 4. FINALIZAR Y GUARDAR (MANUAL DATE - SIN CAMBIOS) ---
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
        alert("Por favor, registra al menos una serie.");
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
        alert("¡Entrenamiento guardado!");
        window.location.href = 'home.html';
        
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Error crítico al guardar.");
    }
};