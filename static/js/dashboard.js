// Dashboard Page Module
import API from './api.js';
import { mostrarNotificacion, navegarA } from './ui.js';

export async function renderDashboard() {
    const container = document.getElementById('page-inicio');
    if (!container) return;

    const [productos, miembros, stats] = await Promise.all([
        API.getLista(),
        API.getMiembros(),
        API.getEstadisticas()
    ]);

    const resumen = stats?.resumen || { total: 0, pendientes: 0, urgentes: 0, gasto_estimado: 0 };
    const recientes = stats?.recientes || [];
    const hoyStr = new Date().toISOString().split('T')[0];
    const productosHoy = productos.filter(p => p.fecha === hoyStr);

    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon green"><i class="fas fa-shopping-basket"></i></div>
                <div class="stat-info">
                    <h3>${resumen.pendientes}</h3>
                    <p>Productos pendientes</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon red"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="stat-info">
                    <h3>${resumen.urgentes}</h3>
                    <p>Urgentes</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon blue"><i class="fas fa-check-circle"></i></div>
                <div class="stat-info">
                    <h3>${resumen.comprados}</h3>
                    <p>Comprados</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange"><i class="fas fa-euro-sign"></i></div>
                <div class="stat-info">
                    <h3>${resumen.gasto_estimado.toFixed(2)}€</h3>
                    <p>Presupuesto estimado</p>
                </div>
            </div>
        </div>

        <div class="dashboard-grid">
            <div>
                <div class="card" style="margin-bottom:20px">
                    <div class="card-header">
                        <h2><i class="fas fa-calendar-day"></i> Compras de hoy</h2>
                    </div>
                    <div id="dashboard-hoy"></div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <h2><i class="fas fa-history"></i> Actividad reciente</h2>
                    </div>
                    <ul class="activity-list" id="dashboard-actividad"></ul>
                </div>
            </div>
            <div>
                <div class="card" style="margin-bottom:20px">
                    <div class="card-header">
                        <h2><i class="fas fa-bolt"></i> Acciones rápidas</h2>
                    </div>
                    <div class="quick-actions">
                        <button class="quick-action-btn" id="qa-compras">
                            <i class="fas fa-calendar-alt"></i>
                            Ver calendario
                        </button>
                        <button class="quick-action-btn" id="qa-stats">
                            <i class="fas fa-chart-bar"></i>
                            Estadísticas
                        </button>
                        <button class="quick-action-btn" id="qa-familia">
                            <i class="fas fa-users"></i>
                            Mi familia
                        </button>
                        <button class="quick-action-btn" id="qa-add">
                            <i class="fas fa-plus-circle"></i>
                            Añadir producto
                        </button>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <h2><i class="fas fa-users"></i> Familia</h2>
                    </div>
                    <ul class="member-list" id="dashboard-miembros"></ul>
                </div>
            </div>
        </div>
    `;

    // Render today's products
    const hoyContainer = document.getElementById('dashboard-hoy');
    if (productosHoy.length === 0) {
        hoyContainer.innerHTML = `<div class="empty-state"><i class="fas fa-sun"></i><p>No hay compras programadas para hoy</p></div>`;
    } else {
        const porTienda = {};
        productosHoy.forEach(p => {
            const t = p.tienda || 'Sin tienda';
            if (!porTienda[t]) porTienda[t] = [];
            porTienda[t].push(p);
        });
        hoyContainer.innerHTML = Object.entries(porTienda).map(([tienda, prods]) => `
            <div style="margin-bottom:12px">
                <div style="font-weight:600;color:var(--primary);margin-bottom:6px">
                    <i class="fas fa-store"></i> ${tienda}
                </div>
                ${prods.map(p => `
                    <div class="producto-item">
                        <div class="producto-info">
                            <div class="producto-nombre">${p.nombre}</div>
                            <div class="producto-detalles">
                                <span class="badge badge-qty">${p.cantidad}x</span>
                                <span class="badge badge-cat">${p.categoria}</span>
                                ${p.precio ? `<span class="badge badge-price">${p.precio}€</span>` : ''}
                                ${p.urgente ? '<span class="badge badge-urgent">Urgente</span>' : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    // Render recent activity
    const actContainer = document.getElementById('dashboard-actividad');
    if (recientes.length === 0) {
        actContainer.innerHTML = '<li class="empty-state"><p>Sin actividad reciente</p></li>';
    } else {
        actContainer.innerHTML = recientes.slice(0, 8).map(p => {
            const tipo = p.comprado ? 'bought' : (p.urgente ? 'urgent' : 'added');
            const accion = p.comprado ? 'compró' : 'añadió';
            const fecha = p.fecha_agregado ? timeAgo(p.fecha_agregado) : '';
            return `
                <li class="activity-item">
                    <div class="activity-dot ${tipo}"></div>
                    <div class="activity-text"><strong>${p.nombre_usuario || 'Alguien'}</strong> ${accion} <strong>${p.nombre}</strong></div>
                    <div class="activity-time">${fecha}</div>
                </li>
            `;
        }).join('');
    }

    // Render family members
    const membContainer = document.getElementById('dashboard-miembros');
    if (miembros.length === 0) {
        membContainer.innerHTML = '<li class="empty-state"><p>Sin miembros</p></li>';
    } else {
        membContainer.innerHTML = miembros.map(m => `
            <li class="member-item">
                <div class="member-avatar">${m.nombre.charAt(0).toUpperCase()}</div>
                <div>
                    <div class="member-name">${m.nombre}</div>
                    <div class="member-email">${m.email}</div>
                </div>
            </li>
        `).join('');
    }

    // Quick action buttons
    document.getElementById('qa-compras')?.addEventListener('click', () => navegarA('compras'));
    document.getElementById('qa-stats')?.addEventListener('click', () => navegarA('estadisticas'));
    document.getElementById('qa-familia')?.addEventListener('click', () => navegarA('configuracion'));
    document.getElementById('qa-add')?.addEventListener('click', () => {
        navegarA('compras');
        setTimeout(() => document.querySelector('.fab')?.click(), 300);
    });
}

function timeAgo(fechaStr) {
    const fecha = new Date(fechaStr.replace(' ', 'T'));
    const ahora = new Date();
    const diff = Math.floor((ahora - fecha) / 1000);
    if (diff < 60) return 'ahora';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
    return `hace ${Math.floor(diff / 86400)}d`;
}
