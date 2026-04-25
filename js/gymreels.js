import { db, storage } from "./firebase-config.js"; 
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const reelsContainer = document.getElementById('reels-container');
const searchInput = document.getElementById('search-input');
const fileInput = document.getElementById('file-input');

let todosLosReels = [];
let sonidoGlobalActivado = false;

function cargarGymReels() {
    const q = query(collection(db, "biblioteca_rutinas"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
        todosLosReels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarFeed(todosLosReels);
    }, (error) => console.error("Error Firestore:", error));
}

function renderizarFeed(reels) {
    if (!reelsContainer) return;
    if (reels.length === 0) {
        reelsContainer.innerHTML = `<div style="color:white; text-align:center; padding-top:150px;">Cargando...</div>`;
        return;
    }

    reelsContainer.innerHTML = reels.map(reel => `
        <div class="reel-card">
            <video class="reel-video" src="${reel.videoURL}" loop playsinline muted 
                   onclick="window.togglePlayPause(this)"></video>
            <button class="mute-btn" onclick="window.toggleMuteAll(event)">
                <span class="mute-icon">${sonidoGlobalActivado ? "🔊" : "🔇"}</span>
            </button>
            <div class="side-actions">
                <div class="action-item"><span>❤️</span><small>1.2k</small></div>
                <div class="action-item"><span>💬</span><small>45</small></div>
                <div class="action-item"><span>🔖</span><small>Guardar</small></div>
                <div class="action-item"><span>✈️</span><small>Enviar</small></div>
            </div>
            <div class="video-info">
                <div class="tag-musculo">💪 ${reel.grupo || 'General'}</div>
                <h2>${reel.nombre}</h2>
                <p>${reel.tips || ''}</p>
            </div>
        </div>
    `).join('');

    configurarScrollAutoPlay();
}

window.togglePlayPause = (video) => {
    video.paused ? video.play().catch(() => {}) : video.pause();
};

window.toggleMuteAll = (event) => {
    event.stopPropagation();
    sonidoGlobalActivado = !sonidoGlobalActivado;
    document.querySelectorAll('.reel-video').forEach(v => v.muted = !sonidoGlobalActivado);
    document.querySelectorAll('.mute-icon').forEach(i => i.innerText = sonidoGlobalActivado ? "🔊" : "🔇");
};

function configurarScrollAutoPlay() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                video.play().catch(() => {}); 
                video.muted = !sonidoGlobalActivado;
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.6 });
    document.querySelectorAll('.reel-video').forEach(v => observer.observe(v));
}

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const nombre = prompt("Nombre:");
    const grupo = prompt("Músculo:");
    if (nombre && grupo) {
        try {
            const storageRef = ref(storage, `reels/${Date.now()}_${file.name}`);
            const uploadTask = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(uploadTask.ref);
            await addDoc(collection(db, "biblioteca_rutinas"), {
                nombre, grupo, videoURL: url, timestamp: serverTimestamp()
            });
            alert("Publicado");
        } catch (err) { alert("Error"); }
    }
});

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const f = e.target.value.toLowerCase();
        renderizarFeed(todosLosReels.filter(r => r.nombre.toLowerCase().includes(f) || (r.grupo && r.grupo.toLowerCase().includes(f))));
    });
}

cargarGymReels();