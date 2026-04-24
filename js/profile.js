import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM ---
    const uploadProfile = document.getElementById('upload-profile');
    const profilePic = document.getElementById('profile-pic');
    const uploadBanner = document.getElementById('upload-banner');
    const bannerImg = document.getElementById('banner-img');
    const uploadProgress = document.getElementById('upload-progress');
    const photosGrid = document.getElementById('photos-grid');
    const postBtn = document.getElementById('post-status');
    const statusInput = document.getElementById('user-note');

    // --- 1. ESCUCHA DE ESTADO DE AUTENTICACIÓN ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Usuario sincronizado:", user.uid);
            suscribeToUserData(user.uid);
        } else {
            window.location.href = "login.html"; // Redirigir si no hay sesión
        }
    });

    // --- 2. SINCRONIZACIÓN EN TIEMPO REAL CON FIRESTORE ---
    function suscribeToUserData(uid) {
        const userDocRef = doc(db, "users", uid);
        
        // onSnapshot actualiza la pantalla automáticamente si cambias algo desde otro dispositivo
        onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // Actualizar Imágenes principales
                if (data.avatarURL) profilePic.src = data.avatarURL;
                if (data.bannerURL) bannerImg.src = data.bannerURL;
                
                // Limpiar y renderizar Fotos de progreso
                photosGrid.innerHTML = "";
                if (data.photos) {
                    data.photos.reverse().forEach(photo => renderPhoto(photo.src, photo.fecha, photo.hora));
                }

                // Limpiar y renderizar Notas/Estados
                // (Nota: Tendrías que ajustar tu HTML para tener un contenedor de notas vacío)
                document.querySelectorAll('.status-card').forEach(el => el.remove());
                if (data.notes) {
                    data.notes.reverse().forEach(note => renderNote(note.text, note.tiempo));
                }
            }
        });
    }

    // --- 3. FUNCIONES DE CARGA A STORAGE + FIRESTORE ---

    async function uploadImageToStorage(file, path) {
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    }

    // Guardar Avatar y Banner
    [uploadProfile, uploadBanner].forEach(input => {
        input.addEventListener('change', async (e) => {
            const user = auth.currentUser;
            const file = e.target.files[0];
            if (!file || !user) return;

            const isAvatar = e.target.id === 'upload-profile';
            const path = `users/${user.uid}/${isAvatar ? 'avatar' : 'banner'}_${Date.now()}.jpg`;

            try {
                const url = await uploadImageToStorage(file, path);
                const userDocRef = doc(db, "users", user.uid);
                
                const updateData = isAvatar ? { avatarURL: url } : { bannerURL: url };
                await setDoc(userDocRef, updateData, { merge: true });
                alert("Imagen actualizada en la nube");
            } catch (error) {
                console.error("Error al subir imagen:", error);
            }
        });
    });

    // Guardar Álbum de Progreso
    uploadProgress.addEventListener('change', async (e) => {
        const user = auth.currentUser;
        const file = e.target.files[0];
        if (!file || !user) return;

        try {
            const path = `users/${user.uid}/progress/${Date.now()}.jpg`;
            const url = await uploadImageToStorage(file, path);

            const now = new Date();
            const photoObj = {
                src: url,
                fecha: now.toLocaleDateString(),
                hora: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: Date.now()
            };

            await updateDoc(doc(db, "users", user.uid), {
                photos: arrayUnion(photoObj)
            });
        } catch (error) {
            console.error("Error al guardar foto de progreso:", error);
        }
    });

    // Guardar Notas
    postBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        const text = statusInput.value.trim();
        if (text === "" || !user) return;

        try {
            const ahora = new Date();
            const noteObj = {
                text,
                tiempo: ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: Date.now()
            };

            await updateDoc(doc(db, "users", user.uid), {
                notes: arrayUnion(noteObj)
            });
            statusInput.value = "";
        } catch (error) {
            console.error("Error al publicar nota:", error);
        }
    });

    // --- 4. FUNCIONES DE RENDERIZADO (UI) ---
    function renderPhoto(src, fecha, hora) {
        const card = document.createElement('div');
        card.className = 'photo-card';
        card.innerHTML = `
            <img src="${src}">
            <div class="photo-desc">
                <span>📅 ${fecha}</span><br>
                <span>⏰ ${hora}</span>
            </div>
        `;
        photosGrid.appendChild(card);
    }

    function renderNote(text, tiempo) {
        const newStatus = document.createElement('div');
        newStatus.className = 'status-card';
        newStatus.style.marginTop = '15px';
        newStatus.innerHTML = `
            <p style="margin: 0; color: #f8fafc;">${text}</p>
            <small style="color: #10b981; font-size: 0.7rem; display: block; margin-top: 10px;">
                Publicado a las ${tiempo}
            </small>
        `;
        // Insertar después del área de entrada
        statusInput.parentElement.after(newStatus);
    }
});