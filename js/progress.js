import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let mainChart;
let exerciseChart;

// --- 1. UTILIDADES DE PROCESAMIENTO ---

const extraerMetricasSesion = (ejercicios) => {
    let pesoMaximo = 0;
    let totalReps = 0;
    let totalSeries = 0;

    ejercicios.forEach(ex => {
        const seriesArr = ex.series.split('|');
        seriesArr.forEach(s => {
            const partes = s.toLowerCase().split('x');
            const reps = parseInt(partes[0]) || 0;
            const peso = parseInt(partes[1]) || 0;

            if (peso > pesoMaximo) pesoMaximo = peso;
            totalReps += reps;
            totalSeries++;
        });
    });

    return {
        fuerza: pesoMaximo,
        resistencia: totalSeries > 0 ? (totalReps / totalSeries) : 0
    };
};

const extraerPesoMaximoEjercicio = (seriesStr) => {
    const matches = seriesStr.match(/(\d+)kg/g);
    if (!matches) return 0;
    const pesos = matches.map(m => parseInt(m.replace('kg', '')));
    return Math.max(...pesos);
};

// --- 2. RENDERIZADO DE COMPONENTES ---

const renderizarTabla = (container, data) => {
    const row = document.createElement('tr');
    const ejerciciosHtml = data.ejercicios.map(ex => `
        <div class="exercise-row">
            <span class="ex-name">${ex.nombre}</span>
            <span class="ex-series">${ex.series}</span>
        </div>
    `).join('');

    row.innerHTML = `
        <td class="col-date"><span class="date-badge">${data.fechaShort}</span></td>
        <td class="col-time"><span class="time-label">⏱ ${data.duracion}</span></td>
        <td class="col-details"><div class="details-container">${ejerciciosHtml}</div></td>
    `;
    container.appendChild(row);
};

const inicializarSelector = (selector, nombresSet) => {
    selector.innerHTML = '';
    nombresSet.forEach(nombre => {
        const opt = document.createElement('option');
        opt.value = nombre;
        opt.textContent = nombre;
        selector.appendChild(opt);
    });
};

// --- 3. LÓGICA DE GRÁFICAS ---

const dibujarGraficaGeneral = (canvasId, entrenamientos) => {
    const ctx = document.getElementById(canvasId);
    const dataAlReves = [...entrenamientos].reverse();

    if (mainChart) mainChart.destroy();
    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dataAlReves.map(d => d.fechaShort),
            datasets: [
                {
                    label: 'Fuerza (Máximo Kg)',
                    data: dataAlReves.map(d => extraerMetricasSesion(d.ejercicios).fuerza),
                    borderColor: '#ffffff',
                    borderWidth: 3,
                    tension: 0.3,
                    fill: false
                },
                {
                    label: 'Resistencia (Promedio Reps)',
                    data: dataAlReves.map(d => extraerMetricasSesion(d.ejercicios).resistencia),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: '#334155' } }
            },
            plugins: { legend: { labels: { color: '#fff' } } }
        }
    });
};

const actualizarGraficaDetalle = (nombreEjer, entrenamientos) => {
    const dataAlReves = [...entrenamientos].reverse();
    const labels = [];
    const pesos = [];

    dataAlReves.forEach(d => {
        const found = d.ejercicios.find(e => e.nombre === nombreEjer);
        if (found) {
            labels.push(d.fechaShort);
            pesos.push(extraerPesoMaximoEjercicio(found.series));
        }
    });

    if (exerciseChart) exerciseChart.destroy();
    exerciseChart = new Chart(document.getElementById('exerciseChart'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `Progreso en ${nombreEjer} (Kg)`,
                data: pesos,
                backgroundColor: '#10b981',
                borderRadius: 5
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
};

// --- 4. FLUJO PRINCIPAL ---

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'index.html'; return; }

    const tableBody = document.getElementById('progress-table-body');
    const selector = document.getElementById('exerciseSelector');
    
    try {
        const q = query(
            collection(db, "entrenamientos"), 
            where("uid", "==", user.uid),
            orderBy("fechaFull", "desc")
        );
        
        const snap = await getDocs(q);
        tableBody.innerHTML = ''; 

        if (snap.empty) {
            tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Sin datos.</td></tr>`;
            return;
        }

        const entrenamientosRaw = [];
        const listaEjerciciosSet = new Set();

        snap.forEach(doc => {
            const data = doc.data();
            entrenamientosRaw.push(data);
            data.ejercicios.forEach(ex => listaEjerciciosSet.add(ex.nombre));
            renderizarTabla(tableBody, data);
        });

        // Inicializar UI de gráficas
        inicializarSelector(selector, listaEjerciciosSet);
        dibujarGraficaGeneral('mainChart', entrenamientosRaw);
        
        // Listener del selector
        selector.addEventListener('change', (e) => actualizarGraficaDetalle(e.target.value, entrenamientosRaw));
        
        // Carga inicial de la gráfica de detalle
        if (selector.value) actualizarGraficaDetalle(selector.value, entrenamientosRaw);

    } catch (error) {
        console.error("Error:", error);
        tableBody.innerHTML = `<tr><td colspan="3" style="color:red;">Error de conexión.</td></tr>`;
    }
});