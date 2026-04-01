import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let userUid = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) window.location.href = 'index.html';
    userUid = user.uid;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists() && userDoc.data().planMaster) {
        const plan = userDoc.data().planMaster;
        document.getElementById('days-count').value = plan.length;
        renderConfigInputs(plan.length, plan);
        document.getElementById('save-plan-btn').classList.remove('hidden');
    }
});

document.getElementById('days-count').onchange = (e) => {
    const val = parseInt(e.target.value);
    renderConfigInputs(val, []);
    document.getElementById('save-plan-btn').classList.toggle('hidden', val === 0);
};

function renderConfigInputs(count, existingData) {
    const list = document.getElementById('config-list');
    list.innerHTML = '';
    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

    for (let i = 0; i < count; i++) {
        const data = existingData[i] || { dayName: 'Lunes', muscle: '', exercises: [''] };
        const div = document.createElement('div');
        div.className = 'config-card';
        div.innerHTML = `
            <select class="c-day">${dias.map(d => `<option ${data.dayName === d ? 'selected' : ''}>${d}</option>`).join('')}</select>
            <input type="text" class="c-muscle" placeholder="Músculo" value="${data.muscle}">
            <div id="ex-list-${i}">
                ${data.exercises.map(ex => `<input type="text" class="c-ex" placeholder="Ejercicio" value="${ex}">`).join('')}
            </div>
            <button type="button" onclick="window.addExField(${i})">+ Ejercicio</button>
        `;
        list.appendChild(div);
    }
}

window.addExField = (id) => {
    const input = document.createElement('input');
    input.className = 'c-ex'; input.placeholder = 'Nuevo Ejercicio';
    document.getElementById(`ex-list-${id}`).appendChild(input);
};

document.getElementById('save-plan-btn').onclick = async () => {
    const plan = [];
    document.querySelectorAll('.config-card').forEach(card => {
        const exercises = Array.from(card.querySelectorAll('.c-ex')).map(i => i.value).filter(v => v);
        plan.push({
            dayName: card.querySelector('.c-day').value,
            muscle: card.querySelector('.c-muscle').value,
            exercises
        });
    });
    await setDoc(doc(db, "users", userUid), { planMaster: plan }, { merge: true });
    alert("¡Plan Maestro Guardado!");
};