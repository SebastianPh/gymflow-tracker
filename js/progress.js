import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    const tableBody = document.getElementById('progress-table-body');
    
    try {
        // Consultamos entrenamientos ordenados por fecha real (fechaFull)
        const q = query(
            collection(db, "entrenamientos"), 
            where("uid", "==", user.uid),
            orderBy("fechaFull", "desc")
        );
        
        const snap = await getDocs(q);
        tableBody.innerHTML = ''; // Limpiar cargando...

        if (snap.empty) {
            tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:2rem;">Aún no hay entrenamientos registrados. ¡Empieza hoy!</td></tr>`;
            return;
        }

        snap.forEach(doc => {
            const data = doc.data();
            
            // Creamos una fila por cada entrenamiento
            const row = document.createElement('tr');
            
            // Formateamos los ejercicios para que se vean como etiquetas neón
            const ejerciciosHtml = data.ejercicios.map(ex => `
                <div class="exercise-row">
                    <span class="ex-name">${ex.nombre}</span>
                    <span class="ex-series">${ex.series}</span>
                </div>
            `).join('');

            row.innerHTML = `
                <td class="col-date">
                    <span class="date-badge">${data.fechaShort}</span>
                </td>
                <td class="col-time">
                    <span class="time-label">⏱ ${data.duracion}</span>
                </td>
                <td class="col-details">
                    <div class="details-container">
                        ${ejerciciosHtml}
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Error al cargar progreso:", error);
        tableBody.innerHTML = `<tr><td colspan="3" style="color:red;">Error al cargar datos. Verifica la consola.</td></tr>`;
    }
});