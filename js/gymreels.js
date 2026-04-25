import { db, storage } from "./firebase-config.js"; 
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const reelsContainer = document.getElementById('reels-container');
const searchInput = document.getElementById('search-input');
const fileInput = document.getElementById('file-input');

let todosLosReels = [];

// Listener de Firestore (Lee tu colección biblioteca_rutinas)
const q = query(collection(db, "biblioteca_rutinas"), orderBy("timestamp", "desc"));

onSnapshot(q, (snapshot) => {
    todosLosReels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizarFeed(todosLosReels);
});

function renderizarFeed(reels) {
    if (reels.length === 0) {
        reelsContainer.innerHTML = `<div style="color:white; text-align:center; padding-top:150px;">Cargando GymReels...</div>`;
        return;
    }

    reelsContainer.innerHTML = reels.map(reel => `
        <div class="reel-card">
            <video src="${reel.videoURL}" loop muted autoplay playsinline onclick="this.paused ? this.play() : this.pause()"></video>
            
            <div class="side-actions">
                <div class="action-item"><span>❤️</span><small>1.2k</small></div>
                <div class="action-item"><span>💬</span><small>45</small></div>
                <div class="action-item"><span>🔖</span><small>Guardar</small></div>
                <div class="action-item"><span>✈️</span><small>Enviar</small></div>
            </div>

            <div class="video-info">
                <p>💪 ${reel.grupo || 'General'}</p>
                <h2>${reel.nombre}</h2>
                <small style="opacity:0.8;">${reel.tips || 'Sin tips adicionales'}</small>
            </div>
        </div>
    `).join('');
}

// Subida de archivos corregida
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const nombre = prompt("Nombre del ejercicio (ej: Press Militar):");
    const grupo = prompt("Músculo (ej: Hombro):");
    const tips = prompt("Tips o consejos:");

    if (nombre && grupo) {
        try {
            const storageRef = ref(storage, `reels/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);

            await addDoc(collection(db, "biblioteca_rutinas"), {
                nombre,
                grupo,
                tips: tips || "",
                videoURL: url,
                timestamp: serverTimestamp()
            });
            alert("¡Ejercicio agregado a GymReels!");
        } catch (error) {
            console.error(error);
            alert("Error al subir. Revisa las reglas de Storage.");
        }
    }
});

// Buscador funcional
searchInput.addEventListener('input', (e) => {
    const filtro = e.target.value.toLowerCase();
    const filtrados = todosLosReels.filter(r => 
        r.nombre.toLowerCase().includes(filtro) || (r.grupo && r.grupo.toLowerCase().includes(filtro))
    );
    renderizarFeed(filtrados);
});