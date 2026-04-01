import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentPlan = [];
let timerInterval;
let startTime;

// --- 1. ESTADO DE USUARIO ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('main-header').classList.remove('hidden');
        document.getElementById('home-view').classList.remove('hidden');
        
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            document.getElementById('user-name-display').innerText = userDoc.data().nombre || "Sebastian";
            currentPlan = userDoc.data().planMaster || [];
        }
        renderCalendar();
        setupNavigation();
    } else {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('main-header').classList.add('hidden');
        document.getElementById('home-view').classList.add('hidden');
    }
});

// --- 2. NAVEGACIÓN ---
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('#view-manager > section');
    navButtons.forEach(btn => {
        btn.onclick = () => {
            const target = btn.getAttribute('data-view');
            if (target === 'train-view') loadTodayRoutine();
            if (target === 'stats-view') loadProgressTable();
            if (target === 'home-view') renderCalendar();
            if (target === 'config-view') loadConfigFields();

            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            views.forEach(v => v.classList.add('hidden'));
            document.getElementById(target).classList.remove('hidden');
        };
    });
}

// --- 3. CONFIGURACIÓN (RESTAURADA Y GUARDADA) ---
function loadConfigFields() {
    const select = document.getElementById('days-count');
    const list = document.getElementById('weekly-config-list');
    
    // Si ya hay un plan, cargarlo en el selector
    if (currentPlan.length > 0) {
        select.value = currentPlan.length;
        renderInputs(currentPlan.length, currentPlan);
        document.getElementById('save-full-config').classList.remove('hidden');
    }

    select.onchange = (e) => {
        const val = parseInt(e.target.value);
        renderInputs(val, []);
        document.getElementById('save-full-config').classList.toggle('hidden', val === 0);
    };
}

function renderInputs(count, data) {
    const list = document.getElementById('weekly-config-list');
    list.innerHTML = '';
    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    
    for (let i = 0; i < count; i++) {
        const item = data[i] || { dayName: 'Lunes', muscle: '', exercises: [''] };
        const div = document.createElement('div');
        div.className = 'config-card';
        div.innerHTML = `
            <select class="c-day">${dias.map(d => `<option ${item.dayName === d ? 'selected' : ''}>${d}</option>`).join('')}</select>
            <input type="text" class="c-muscle" placeholder="Grupo Muscular" value="${item.muscle}">
            <div class="c-ex-list" id="ex-list-${i}">
                ${item.exercises.map(ex => `<input type="text" class="c-ex" placeholder="Ejercicio" value="${ex}">`).join('')}
            </div>
            <button class="btn-add-ex" onclick="addInput(${i})">+ Ejercicio</button>
        `;
        list.appendChild(div);
    }
}

window.addInput = (id) => {
    const container = document.getElementById(`ex-list-${id}`);
    const input = document.createElement('input');
    input.className = 'c-ex'; input.placeholder = 'Nuevo Ejercicio';
    container.appendChild(input);
};

document.getElementById('save-full-config').onclick = async () => {
    const plan = [];
    document.querySelectorAll('.config-card').forEach(card => {
        const muscle = card.querySelector('.c-muscle').value;
        const exercises = Array.from(card.querySelectorAll('.c-ex')).map(i => i.value).filter(v => v);
        if(muscle) plan.push({ dayName: card.querySelector('.c-day').value, muscle, exercises });
    });
    await setDoc(doc(db, "users", auth.currentUser.uid), { planMaster: plan }, { merge: true });
    currentPlan = plan;
    alert("Plan Maestro Guardado");
};

// --- 4. CALENDARIO CORREGIDO ---
async function renderCalendar() {
    const container = document.getElementById('monthly-calendar');
    const q = query(collection(db, "entrenamientos"), where("uid", "==", auth.currentUser.uid));
    const snap = await getDocs(q);
    const trainedDays = snap.docs.map(d => d.data().fechaShort);

    container.innerHTML = '';
    const now = new Date();
    const today = now.getDate();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    for (let i = 1; i <= lastDay; i++) {
        const dateStr = `${i}/${now.getMonth() + 1}/${now.getFullYear()}`;
        const done = trainedDays.includes(dateStr);
        const isFuture = i > today;

        const div = document.createElement('div');
        div.className = `calendar-day ${done ? 'done' : ''}`;
        div.style.background = done ? '#10b981' : (isFuture ? '#1e293b' : '#ef444433');
        
        let icon = done ? '✅' : (isFuture ? '' : '❌');
        div.innerHTML = `<small>${i}</small><br>${icon}`;
        container.appendChild(div);
    }
    document.getElementById('user-streak').innerText = trainedDays.length;
}

// --- 5. ENTRENAMIENTO ---
function loadTodayRoutine() {
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const hoy = dias[new Date().getDay()];
    const routine = currentPlan.find(p => p.dayName === hoy);
    const list = document.getElementById('exercises-session-list');

    document.getElementById('today-date-info').innerText = `${hoy}, ${new Date().toLocaleDateString()}`;

    if (routine) {
        document.getElementById('today-title').innerText = `Hoy: ${routine.muscle}`;
        list.innerHTML = '';
        routine.exercises.forEach((ex, i) => {
            const card = document.createElement('div');
            card.className = 'exercise-card-active';
            card.innerHTML = `
                <h4>${ex}</h4>
                <div class="sets" id="sets-${i}">
                    <div class="set-row">
                        <input type="number" class="s-reps" placeholder="Reps">
                        <input type="number" class="s-weight" placeholder="Kg">
                    </div>
                </div>
                <button onclick="addSet(${i})">+ Serie</button>
            `;
            list.appendChild(card);
        });
    } else {
        document.getElementById('today-title').innerText = "Día de Descanso";
        document.getElementById('start-session').classList.add('hidden');
    }
}

window.addSet = (id) => {
    const row = document.createElement('div'); row.className = 'set-row';
    row.innerHTML = `<input type="number" class="s-reps" placeholder="Reps"><input type="number" class="s-weight" placeholder="Kg">`;
    document.getElementById(`sets-${id}`).appendChild(row);
};

document.getElementById('start-session').onclick = () => {
    document.getElementById('pre-training').classList.add('hidden');
    document.getElementById('active-session').classList.remove('hidden');
    startTime = new Date();
    timerInterval = setInterval(() => {
        const diff = Math.floor((new Date() - startTime) / 1000);
        document.getElementById('cronometro').innerText = new Date(diff * 1000).toISOString().substr(11, 8);
    }, 1000);
};

document.getElementById('finish-session').onclick = async () => {
    const results = [];
    document.querySelectorAll('.exercise-card-active').forEach(card => {
        const reps = Array.from(card.querySelectorAll('.s-reps')).map(i => i.value);
        const weights = Array.from(card.querySelectorAll('.s-weight')).map(i => i.value);
        const series = reps.map((r, idx) => r && weights[idx] ? `${r}x${weights[idx]}kg` : null).filter(v => v);
        if(series.length > 0) results.push({ nombre: card.querySelector('h4').innerText, info: series.join(' | ') });
    });

    await addDoc(collection(db, "entrenamientos"), {
        uid: auth.currentUser.uid,
        fechaShort: new Date().toLocaleDateString(),
        fechaFull: new Date(),
        duracion: document.getElementById('cronometro').innerText,
        ejercicios: results
    });
    location.reload();
};

// --- 6. PROGRESO ---
async function loadProgressTable() {
    const body = document.getElementById('workout-history-body');
    body.innerHTML = '';
    const q = query(collection(db, "entrenamientos"), where("uid", "==", auth.currentUser.uid), orderBy("fechaFull", "desc"));
    const snap = await getDocs(q);
    snap.forEach(doc => {
        const d = doc.data();
        const detail = d.ejercicios.map(e => `<strong>${e.nombre}:</strong> ${e.info}`).join('<br>');
        body.innerHTML += `<tr><td>${d.fechaShort}</td><td>${d.duracion}</td><td>${detail}</td></tr>`;
    });
}

// --- 7. AUTH & LOGOUT ---
document.getElementById('logout-btn').onclick = () => signOut(auth);
document.getElementById('toggle-auth').onclick = () => document.getElementById('register-fields').classList.toggle('hidden');
document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const isReg = !document.getElementById('register-fields').classList.contains('hidden');
    try {
        if (isReg) {
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "users", res.user.uid), { nombre: document.getElementById('display-name').value, planMaster: [] });
        } else { await signInWithEmailAndPassword(auth, email, pass); }
    } catch (err) { alert(err.message); }
};