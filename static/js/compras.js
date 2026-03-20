// Compras Page Module (Calendar + Baskets + Products)
import API from './api.js';
import { mostrarNotificacion, ModalManager } from './ui.js';

let fechaSeleccionada = null;
let tiendaSeleccionada = null;
let cestasActuales = [];
let mesOffset = 0;
let productosHistorial = [];
let productosSugerencias = new Set();

// --- Public ---
export async function renderCompras() {
    const container = document.getElementById('page-compras');
    if (!container) return;

    container.innerHTML = `
        <div class="card">
            <div class="calendar-header">
                <h2 class="calendar-title">
                    <i class="fas fa-calendar-alt"></i>
                    <span id="calendar-month">Cargando...</span>
                </h2>
                <div class="calendar-nav">
                    <button id="cal-prev"><i class="fas fa-chevron-left"></i> Anterior</button>
                    <button id="cal-today"><i class="fas fa-dot-circle"></i> Hoy</button>
                    <button id="cal-next">Siguiente <i class="fas fa-chevron-right"></i></button>
                </div>
            </div>
            <div class="calendar-grid" id="calendar-grid"></div>
        </div>
    `;

    document.getElementById('cal-prev').addEventListener('click', () => { mesOffset--; cargarCalendario(); });
    document.getElementById('cal-today').addEventListener('click', () => { mesOffset = 0; cargarCalendario(); });
    document.getElementById('cal-next').addEventListener('click', () => { mesOffset++; cargarCalendario(); });

    cargarProductosHistorial();
    await cargarCalendario();
}

export function initFAB() {
    const fab = document.querySelector('.fab');
    if (fab) {
        fab.onclick = () => {
            abrirModalDiaTienda(new Date());
        };
    }
}

export function initModals() {
    // Tienda modal: item click handlers
    document.querySelectorAll('.tienda-item').forEach(item => {
        item.addEventListener('click', function () {
            document.querySelectorAll('.tienda-item').forEach(i => i.classList.remove('selected'));
            this.classList.add('selected');
            tiendaSeleccionada = this.querySelector('.tienda-nombre').textContent;
            if (tiendaSeleccionada !== 'Otro') {
                document.getElementById('nombre-tienda-personalizada').value = '';
            }
            document.getElementById('btn-confirmar-tienda').disabled = false;
        });
    });

    // Custom store name input
    const campoPersonalizado = document.getElementById('nombre-tienda-personalizada');
    if (campoPersonalizado) {
        campoPersonalizado.addEventListener('input', function () {
            const btn = document.getElementById('btn-confirmar-tienda');
            btn.disabled = !this.value.trim() && !tiendaSeleccionada;
        });
    }

    // Confirm store button
    document.getElementById('btn-confirmar-tienda')?.addEventListener('click', confirmarTienda);

    // Modal close buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => ModalManager.cerrarTodos());
    });

    // Save product button
    document.getElementById('btn-guardar-producto')?.addEventListener('click', guardarProducto);
}

// --- Calendar ---
async function cargarCalendario() {
    const productos = await API.getLista();
    renderCalendario(productos);
}

function renderCalendario(productos) {
    const grid = document.getElementById('calendar-grid');
    const monthLabel = document.getElementById('calendar-month');
    if (!grid || !monthLabel) return;

    const hoy = new Date();
    const base = new Date(hoy.getFullYear(), hoy.getMonth() + mesOffset, 1);
    const primerDia = new Date(base.getFullYear(), base.getMonth(), 1);
    const ultimoDia = new Date(base.getFullYear(), base.getMonth() + 1, 0);

    monthLabel.textContent = base.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    // Start from Monday of the week containing the 1st
    let inicio = new Date(primerDia);
    const diaSemana = inicio.getDay() === 0 ? 6 : inicio.getDay() - 1;
    inicio.setDate(inicio.getDate() - diaSemana);

    // Generate 5 weeks (35 days) to always fill the grid
    const dias = 35;
    let html = '';

    // Day-of-week headers
    const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    html += diasSemana.map(d => `<div style="text-align:center;font-weight:700;font-size:0.75rem;color:var(--text-light);padding:6px 0">${d}</div>`).join('');

    for (let i = 0; i < dias; i++) {
        const fecha = new Date(inicio);
        fecha.setDate(inicio.getDate() + i);
        const fechaStr = toDateStr(fecha);
        const productosDelDia = productos.filter(p => p.fecha === fechaStr);
        const esHoy = fecha.toDateString() === hoy.toDateString();
        const esMesActual = fecha.getMonth() === base.getMonth();

        let classes = ['calendar-day'];
        if (esHoy) classes.push('today');
        if (productosDelDia.length > 0) classes.push('has-products');
        if (!esMesActual) classes.push('other-month');

        html += `
            <div class="${classes.join(' ')}" data-fecha="${fechaStr}" data-count="${productosDelDia.length}"
                 style="${!esMesActual ? 'opacity:0.4' : ''};animation-delay:${i * 0.015}s">
                <div class="day-header">
                    <div class="day-number">${fecha.getDate()}</div>
                    <div class="day-name">${fecha.toLocaleDateString('es-ES', { weekday: 'short' })}</div>
                </div>
                <div class="day-products">
                    ${renderProductosDia(productosDelDia, fechaStr)}
                </div>
            </div>
        `;
    }

    grid.innerHTML = html;

    // Attach click handlers to days
    grid.querySelectorAll('.calendar-day').forEach(day => {
        day.addEventListener('click', (e) => {
            if (e.target.closest('.shopping-basket, .multiple-baskets, .simple-add-basket')) return;
            const fecha = day.dataset.fecha;
            const count = parseInt(day.dataset.count);
            if (count > 0) {
                abrirModalGestionCestas(new Date(fecha + 'T12:00:00'));
            } else {
                abrirModalDiaTienda(new Date(fecha + 'T12:00:00'));
            }
        });
    });

    // Basket click handlers
    grid.querySelectorAll('[data-basket-fecha]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            abrirModalGestionCestas(new Date(el.dataset.basketFecha + 'T12:00:00'));
        });
    });

    grid.querySelectorAll('[data-add-fecha]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            abrirModalDiaTienda(new Date(el.dataset.addFecha + 'T12:00:00'));
        });
    });
}

function renderProductosDia(productos, fechaStr) {
    if (productos.length === 0) {
        return `<div class="simple-add-basket" data-add-fecha="${fechaStr}">
            <span class="simple-basket-icon">+</span>
        </div>`;
    }

    const porTienda = {};
    productos.forEach(p => {
        const t = p.tienda || 'Sin tienda';
        if (!porTienda[t]) porTienda[t] = [];
        porTienda[t].push(p);
    });

    const tiendas = Object.keys(porTienda);

    if (tiendas.length === 1) {
        return `<div class="shopping-basket" data-basket-fecha="${fechaStr}">
            <div class="basket-count">${productos.length} prod.</div>
            <div class="basket-store">${tiendas[0]}</div>
        </div>`;
    }

    return `<div class="multiple-baskets" data-basket-fecha="${fechaStr}">
        <div class="baskets-header">
            <div class="basket-count">${productos.length} prod.</div>
            <div class="basket-store">${tiendas.length} tiendas</div>
        </div>
    </div>`;
}

// --- Tienda Modal ---
function abrirModalDiaTienda(fecha) {
    fechaSeleccionada = fecha;
    tiendaSeleccionada = null;

    const fechaLabel = document.getElementById('modal-dia-fecha');
    if (fechaLabel) {
        fechaLabel.textContent = fecha.toLocaleDateString('es-ES', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    document.querySelectorAll('.tienda-item').forEach(i => i.classList.remove('selected'));
    const campo = document.getElementById('nombre-tienda-personalizada');
    if (campo) campo.value = '';
    const btn = document.getElementById('btn-confirmar-tienda');
    if (btn) btn.disabled = true;

    ModalManager.abrir('tienda');
}

function confirmarTienda() {
    const personalizado = document.getElementById('nombre-tienda-personalizada')?.value.trim();
    const tiendaFinal = personalizado || tiendaSeleccionada;

    if (!tiendaFinal) {
        mostrarNotificacion('Selecciona o escribe una tienda', 'error');
        return;
    }

    tiendaSeleccionada = tiendaFinal;
    ModalManager.cerrar('tienda');
    abrirModalProducto();
}

// --- Gestion Cestas Modal ---
async function abrirModalGestionCestas(fecha) {
    fechaSeleccionada = fecha;
    const productos = await API.getLista();
    const fechaStr = toDateStr(fecha);
    const productosDelDia = productos.filter(p => p.fecha === fechaStr);

    // Group by store
    const porTienda = {};
    productosDelDia.forEach(p => {
        const t = p.tienda || 'Sin tienda';
        if (!porTienda[t]) porTienda[t] = [];
        porTienda[t].push(p);
    });

    cestasActuales = Object.entries(porTienda).map(([tienda, prods]) => ({ tienda, fecha: fechaStr, productos: prods }));

    const container = document.getElementById('cestas-container');
    if (!container) return;

    if (cestasActuales.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-basket"></i><p>No hay cestas para este día</p></div>`;
    } else {
        container.innerHTML = cestasActuales.map((cesta, idx) => {
            const total = cesta.productos.reduce((sum, p) => sum + ((p.precio || 0) * (p.cantidad || 1)), 0);
            return `
                <div class="cesta-item">
                    <div class="cesta-header">
                        <div class="cesta-tienda"><i class="fas fa-store"></i> ${cesta.tienda}</div>
                        <div class="cesta-acciones">
                            <button class="cesta-btn ver" data-cesta-add="${idx}" title="Añadir producto"><i class="fas fa-plus"></i></button>
                            <button class="cesta-btn eliminar" data-cesta-del="${idx}" title="Eliminar cesta"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    <div class="cesta-productos">
                        ${cesta.productos.map(p => `
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
                                <button class="cesta-btn eliminar" data-del-prod="${p.id}" title="Eliminar"><i class="fas fa-times"></i></button>
                            </div>
                        `).join('')}
                    </div>
                    ${total > 0 ? `<div class="total-presupuesto">Total estimado: ${total.toFixed(2)}€</div>` : ''}
                </div>
            `;
        }).join('');
    }

    ModalManager.abrir('gestion');

    // Attach event handlers after render
    container.querySelectorAll('[data-cesta-add]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.cestaAdd);
            tiendaSeleccionada = cestasActuales[idx].tienda;
            ModalManager.cerrar('gestion');
            abrirModalProducto();
        });
    });

    container.querySelectorAll('[data-cesta-del]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.cestaDel);
            const cesta = cestasActuales[idx];
            if (!confirm(`¿Eliminar la cesta de ${cesta.tienda}?`)) return;
            for (const p of cesta.productos) {
                await API.eliminarProducto(p.id);
            }
            mostrarNotificacion(`Cesta de ${cesta.tienda} eliminada`, 'success');
            ModalManager.cerrar('gestion');
            await cargarCalendario();
        });
    });

    container.querySelectorAll('[data-del-prod]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.delProd);
            await API.eliminarProducto(id);
            mostrarNotificacion('Producto eliminado', 'success');
            // Refresh the modal
            await abrirModalGestionCestas(fechaSeleccionada);
            await cargarCalendario();
        });
    });

    // New basket button
    const newBasketBtn = document.getElementById('btn-nueva-cesta');
    if (newBasketBtn) {
        newBasketBtn.onclick = () => {
            ModalManager.cerrar('gestion');
            abrirModalDiaTienda(fechaSeleccionada);
        };
    }
}

// --- Product Modal ---
function abrirModalProducto() {
    document.getElementById('modal-nombre').value = '';
    document.getElementById('modal-cantidad').value = '1';
    document.getElementById('modal-precio').value = '';
    document.getElementById('modal-categoria').value = 'General';
    document.getElementById('modal-urgente').checked = false;

    actualizarDatalist();
    ModalManager.abrir('producto');
    setTimeout(() => document.getElementById('modal-nombre')?.focus(), 150);
}

async function guardarProducto() {
    const nombre = document.getElementById('modal-nombre').value.trim();
    const cantidad = parseInt(document.getElementById('modal-cantidad').value) || 1;
    const precio = parseFloat(document.getElementById('modal-precio').value) || 0;
    const categoria = document.getElementById('modal-categoria').value;
    const urgente = document.getElementById('modal-urgente').checked;

    if (!nombre) {
        mostrarNotificacion('Escribe el nombre del producto', 'error');
        return;
    }

    guardarProductoEnHistorial(nombre);

    const resultado = await API.agregarProducto({
        nombre,
        cantidad,
        precio,
        categoria,
        urgente,
        fecha: toDateStr(fechaSeleccionada),
        tienda: tiendaSeleccionada || 'Sin tienda asignada'
    });

    if (resultado) {
        mostrarNotificacion(`${nombre} añadido`, 'success');
        ModalManager.cerrar('producto');
        await cargarCalendario();
    } else {
        mostrarNotificacion('Error al guardar el producto', 'error');
    }
}

// --- Autocomplete ---
function cargarProductosHistorial() {
    try {
        const guardados = localStorage.getItem('productosHistorial');
        if (guardados) {
            productosHistorial = JSON.parse(guardados);
            productosHistorial.forEach(p => productosSugerencias.add(p.nombre.toLowerCase()));
        }
    } catch { /* ignore */ }
}

function guardarProductoEnHistorial(nombre) {
    if (productosSugerencias.has(nombre.toLowerCase())) return;
    productosSugerencias.add(nombre.toLowerCase());
    productosHistorial.push({ nombre, timestamp: Date.now() });
    if (productosHistorial.length > 50) productosHistorial = productosHistorial.slice(-50);
    localStorage.setItem('productosHistorial', JSON.stringify(productosHistorial));
}

function actualizarDatalist() {
    const dl = document.getElementById('productos-sugeridos');
    if (dl) {
        dl.innerHTML = [...productosSugerencias].slice(0, 20).map(n => `<option value="${n}">`).join('');
    }
}

// --- Helpers ---
function toDateStr(date) {
    return date.toISOString().split('T')[0];
}
