// Estadisticas Page Module
import API from './api.js';

let chartsInitialized = false;

export async function renderEstadisticas() {
    const container = document.getElementById('page-estadisticas');
    if (!container) return;

    const stats = await API.getEstadisticas();
    if (!stats) {
        container.innerHTML = `<div class="card"><div class="empty-state"><i class="fas fa-chart-bar"></i><p>No se pudieron cargar las estadísticas</p></div></div>`;
        return;
    }

    const { resumen, por_categoria, por_tienda, por_usuario } = stats;

    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon green"><i class="fas fa-list"></i></div>
                <div class="stat-info">
                    <h3>${resumen.total}</h3>
                    <p>Total productos</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon blue"><i class="fas fa-check-double"></i></div>
                <div class="stat-info">
                    <h3>${resumen.comprados}</h3>
                    <p>Comprados</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange"><i class="fas fa-coins"></i></div>
                <div class="stat-info">
                    <h3>${resumen.gasto_total.toFixed(2)}€</h3>
                    <p>Gasto real</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon red"><i class="fas fa-receipt"></i></div>
                <div class="stat-info">
                    <h3>${resumen.gasto_estimado.toFixed(2)}€</h3>
                    <p>Presupuesto total</p>
                </div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="card">
                <div class="card-header"><h2><i class="fas fa-tags"></i> Por categoría</h2></div>
                <div class="chart-container"><canvas id="chart-categorias"></canvas></div>
            </div>
            <div class="card">
                <div class="card-header"><h2><i class="fas fa-store"></i> Por tienda</h2></div>
                <div class="chart-container"><canvas id="chart-tiendas"></canvas></div>
            </div>
            <div class="card">
                <div class="card-header"><h2><i class="fas fa-trophy"></i> Top categorías</h2></div>
                <ul class="ranking-list" id="ranking-categorias"></ul>
            </div>
            <div class="card">
                <div class="card-header"><h2><i class="fas fa-users"></i> Actividad por miembro</h2></div>
                <ul class="ranking-list" id="ranking-usuarios"></ul>
            </div>
        </div>
    `;

    renderCharts(por_categoria, por_tienda);
    renderRankings(por_categoria, por_usuario);
}

function renderCharts(porCategoria, porTienda) {
    const colores = [
        '#2ecc71', '#3498db', '#e74c3c', '#f39c12', '#9b59b6',
        '#1abc9c', '#e67e22', '#2c3e50', '#16a085', '#c0392b',
        '#8e44ad', '#d35400', '#27ae60', '#2980b9'
    ];

    // Category doughnut chart
    const catLabels = Object.keys(porCategoria);
    const catData = catLabels.map(k => porCategoria[k].cantidad);

    if (typeof Chart !== 'undefined' && document.getElementById('chart-categorias')) {
        new Chart(document.getElementById('chart-categorias'), {
            type: 'doughnut',
            data: {
                labels: catLabels,
                datasets: [{
                    data: catData,
                    backgroundColor: colores.slice(0, catLabels.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 12, font: { size: 11 } } }
                },
                cutout: '60%'
            }
        });
    }

    // Store bar chart
    const tiendaLabels = Object.keys(porTienda);
    const tiendaData = tiendaLabels.map(k => porTienda[k].cantidad);
    const tiendaGasto = tiendaLabels.map(k => porTienda[k].gasto);

    if (typeof Chart !== 'undefined' && document.getElementById('chart-tiendas')) {
        new Chart(document.getElementById('chart-tiendas'), {
            type: 'bar',
            data: {
                labels: tiendaLabels,
                datasets: [
                    {
                        label: 'Productos',
                        data: tiendaData,
                        backgroundColor: 'rgba(46, 204, 113, 0.7)',
                        borderRadius: 6
                    },
                    {
                        label: 'Gasto (€)',
                        data: tiendaGasto,
                        backgroundColor: 'rgba(52, 152, 219, 0.7)',
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 12, font: { size: 11 } } }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}

function renderRankings(porCategoria, porUsuario) {
    // Category ranking
    const catContainer = document.getElementById('ranking-categorias');
    if (catContainer) {
        const sorted = Object.entries(porCategoria).sort((a, b) => b[1].cantidad - a[1].cantidad);
        const maxCat = sorted.length > 0 ? sorted[0][1].cantidad : 1;
        catContainer.innerHTML = sorted.map(([nombre, data], i) => `
            <li class="ranking-item">
                <div class="ranking-pos">${i + 1}</div>
                <div style="flex:1">
                    <div style="font-weight:600;font-size:0.88rem;margin-bottom:4px">${nombre}</div>
                    <div class="ranking-bar">
                        <div class="ranking-fill" style="width:${(data.cantidad / maxCat * 100)}%"></div>
                    </div>
                </div>
                <div class="ranking-value">${data.cantidad}</div>
            </li>
        `).join('');
    }

    // User ranking
    const userContainer = document.getElementById('ranking-usuarios');
    if (userContainer) {
        const sorted = Object.entries(porUsuario).sort((a, b) => b[1].agregados - a[1].agregados);
        const maxUser = sorted.length > 0 ? sorted[0][1].agregados : 1;

        if (sorted.length === 0) {
            userContainer.innerHTML = '<li class="empty-state"><p>Sin datos de miembros</p></li>';
        } else {
            userContainer.innerHTML = sorted.map(([nombre, data], i) => `
                <li class="ranking-item">
                    <div class="ranking-pos">${i + 1}</div>
                    <div style="flex:1">
                        <div style="font-weight:600;font-size:0.88rem;margin-bottom:4px">${nombre}</div>
                        <div class="ranking-bar">
                            <div class="ranking-fill" style="width:${(data.agregados / maxUser * 100)}%"></div>
                        </div>
                        <div style="font-size:0.75rem;color:var(--text-light);margin-top:2px">
                            ${data.agregados} añadidos · ${data.comprados} comprados
                        </div>
                    </div>
                    <div class="ranking-value">${data.agregados}</div>
                </li>
            `).join('');
        }
    }
}
