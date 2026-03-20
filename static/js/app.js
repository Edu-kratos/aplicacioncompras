// Main Entry Point
import API from './api.js';
import { navegarA, registrarSeccion, mostrarNotificacion } from './ui.js';
import { renderDashboard } from './dashboard.js';
import { renderCompras, initFAB, initModals } from './compras.js';
import { renderEstadisticas } from './estadisticas.js';
import { renderConfig } from './config.js';

// Register page sections
registrarSeccion('inicio', renderDashboard);
registrarSeccion('compras', renderCompras);
registrarSeccion('estadisticas', renderEstadisticas);
registrarSeccion('configuracion', renderConfig);

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load user
        const usuario = await API.getUsuario();
        if (!usuario) return;

        // Update header
        document.getElementById('user-name').textContent = usuario.nombre;

        // Load family name
        const miembros = await API.getMiembros();
        const familyLabel = document.getElementById('family-name');
        if (familyLabel) {
            familyLabel.textContent = miembros.length > 1
                ? `${miembros.length} miembros`
                : 'Individual';
        }

        // Init modals and FAB (from compras module)
        initModals();
        initFAB();

        // Setup nav items
        const navItems = document.querySelectorAll('.nav-item');
        const secciones = ['inicio', 'compras', 'estadisticas', 'configuracion', 'logout'];
        navItems.forEach((item, i) => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                if (secciones[i] === 'logout') {
                    if (confirm('¿Cerrar sesión?')) API.logout();
                } else {
                    navegarA(secciones[i]);
                }
            });
        });

        // Header logout button
        document.getElementById('btn-logout')?.addEventListener('click', () => {
            if (confirm('¿Cerrar sesión?')) API.logout();
        });

        // Navigate to dashboard
        navegarA('inicio');

        // Auto-refresh every 60s
        setInterval(() => {
            const seccion = document.querySelector('.page-section.active')?.id?.replace('page-', '');
            if (seccion === 'inicio') renderDashboard();
            else if (seccion === 'compras') renderCompras();
        }, 60000);

    } catch (err) {
        console.error('Error inicializando app:', err);
        mostrarNotificacion('Error al inicializar la aplicación', 'error');
    }
});
