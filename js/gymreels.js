import { db, storage, auth } from "./firebase-config.js"; 
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const reelsContainer = document.getElementById('reels-container');
const searchInput = document.getElementById('search-input');
const fileInput = document.getElementById('file-input');

let todosLosReels = [];

// Carga de videos en tiempo real
const q = query(collection(db, "biblioteca_rutinas"), orderBy("timestamp", "desc"));

onSnapshot(q, (snapshot) => {
    todosLosReels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizarFeed(todosLosReels);
});

function renderizarFeed(reels) {
    if (reels.length === 0) {
        reelsContainer.innerHTML = `<div style="color:white; text-align:center; padding-top:100px;">Sin videos aún.</div>`;
        return;
    }
    reelsContainer.innerHTML = reels.map(reel => `
        <div class="reel-card">
            <video src="${reel.videoURL}" loop muted autoplay playsinline onclick="this.paused ? this.play() : this.pause()"></video>
            <div style="position: absolute; bottom: 100px; left: 20px; color: white; text-shadow: 2px 2px 4px #000;">
                <h2>${reel.nombre}</h2>
                <p>💪 ${reel.grupo}</p>
            </div>
        </div>
    `).join('');
}

// Buscador
searchInput.addEventListener('input', (e) => {
    const filtro = e.target.value.toLowerCase();
    const filtrados = todosLosReels.filter(r => 
        r.nombre.toLowerCase().includes(filtro) || r.grupo.toLowerCase().includes(filtro)
    );
    renderizarFeed(filtrados);
});

// Subida de archivos
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const nombre = prompt("Nombre del ejercicio:");
    const grupo = prompt("Grupo muscular:");

    if (nombre && grupo) {
        try {
            const storageRef = ref(storage, `reels/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);

            await addDoc(collection(db, "biblioteca_rutinas"), {
                nombre,
                grupo,
                videoURL: url,
                timestamp: serverTimestamp()
            });
            alert("¡Subido!");
        } catch (error) {
            alert("Error al subir video.");
        }
    }
});