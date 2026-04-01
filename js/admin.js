import { auth, db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function cargarUsuarios() {
    const tableBody = document.getElementById('users-list');
    const querySnapshot = await getDocs(collection(db, "users"));
    
    tableBody.innerHTML = ''; // Limpiar tabla

    querySnapshot.forEach((doc) => {
        const user = doc.data();
        const row = `
            <tr>
                <td>${user.nombre || 'Sin nombre'}</td>
                <td>${user.email || 'Sin email'}</td>
                <td><span class="admin-badge">${user.rol}</span></td>
                <td>
                    <button class="btn-action btn-view">Ver Rutinas</button>
                    <button class="btn-action btn-delete">Banear</button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

cargarUsuarios();