// UI Module: Notifications, Modals, Navigation

// --- Notifications ---
let notifStack = [];

export function mostrarNotificacion(mensaje, tipo = 'info') {
    const iconos = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    const el = document.createElement('div');
    el.className = `notification ${tipo}`;
    el.innerHTML = `<i class="fas ${iconos[tipo] || iconos.info}"></i><span>${mensaje}</span>`;

    // Stack notifications
    const offset = 20 + notifStack.length * 64;
    el.style.top = `${offset}px`;
    document.body.appendChild(el);
    notifStack.push(el);

    setTimeout(() => {
        el.style.animation = 'notifOut 0.3s ease forwards';
        setTimeout(() => {
            el.remove();
            notifStack = notifStack.filter(n => n !== el);
            repositionNotifs();
        }, 300);
    }, 3500);
}

function repositionNotifs() {
    notifStack.forEach((el, i) => {
        el.style.top = `${20 + i * 64}px`;
    });
}

// --- Modal Manager ---
const modalIds = {
    tienda: 'modal-dia-tienda',
    producto: 'modal-producto',
    gestion: 'modal-gestion-cestas'
};

let modalActivo = null;

export const ModalManager = {
    abrir(nombre) {
        this.cerrarTodos();
        const modal = document.getElementById(modalIds[nombre]);
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
            modalActivo = nombre;
        }
    },

    cerrar(nombre) {
        const modal = document.getElementById(modalIds[nombre]);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
        if (modalActivo === nombre) modalActivo = null;
    },

    cerrarTodos() {
        Object.values(modalIds).forEach(id => {
            const modal = document.getElementById(id);
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('show');
            }
        });
        modalActivo = null;
    },

    getActivo() { return modalActivo; }
};

// Global listeners for modals
document.addEventListener('keydown', e => { if (e.key === 'Escape') ModalManager.cerrarTodos(); });
document.addEventListener('click', e => { if (e.target.classList.contains('modal')) ModalManager.cerrarTodos(); });

// --- Navigation ---
let currentSection = null;
let navCallbacks = {};

export function registrarSeccion(nombre, callback) {
    navCallbacks[nombre] = callback;
}

export function navegarA(nombre) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navItems = document.querySelectorAll('.nav-item');
    const secciones = ['inicio', 'compras', 'estadisticas', 'configuracion'];
    const idx = secciones.indexOf(nombre);
    if (idx >= 0 && navItems[idx]) navItems[idx].classList.add('active');

    // Hide all page sections
    document.querySelectorAll('.page-section').forEach(s => {
        s.classList.remove('active');
    });

    // Show target section
    const target = document.getElementById(`page-${nombre}`);
    if (target) target.classList.add('active');

    // Execute callback
    if (navCallbacks[nombre]) navCallbacks[nombre]();
    currentSection = nombre;
}

export function getSeccionActual() { return currentSection; }
