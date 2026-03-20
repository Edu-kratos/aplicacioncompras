// Config Page Module
import API from './api.js';
import { mostrarNotificacion } from './ui.js';

export async function renderConfig() {
    const container = document.getElementById('page-configuracion');
    if (!container) return;

    const [miembros, codigoData] = await Promise.all([
        API.getMiembros(),
        API.getCodigoFamilia()
    ]);

    const usuario = await API.getUsuario();
    const codigo = codigoData?.codigo_invitacion || '—';
    const nombreFamilia = codigoData?.nombre_familia || 'Sin familia';

    container.innerHTML = `
        <div class="config-grid">
            <div>
                <div class="card" style="margin-bottom:20px">
                    <div class="card-header"><h2><i class="fas fa-user"></i> Mi perfil</h2></div>
                    <div class="config-section">
                        <div class="member-item" style="border:none;padding:0">
                            <div class="member-avatar" style="width:48px;height:48px;font-size:1.2rem">
                                ${usuario?.nombre?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                                <div class="member-name" style="font-size:1.1rem">${usuario?.nombre || 'Usuario'}</div>
                                <div class="member-email">${usuario?.email || ''}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h2><i class="fas fa-home"></i> Familia</h2></div>
                    <div class="config-section">
                        <h4>Nombre de familia</h4>
                        <p style="font-size:1.1rem;font-weight:600;color:var(--primary);margin-bottom:16px">${nombreFamilia}</p>
                        
                        <h4>Código de invitación</h4>
                        <div class="invite-code">
                            <span id="codigo-valor">${codigo}</span>
                            <button id="btn-copiar-codigo" title="Copiar código">
                                <i class="fas fa-copy"></i> Copiar
                            </button>
                        </div>
                        <p style="font-size:0.8rem;color:var(--text-light);margin-top:8px">
                            Comparte este código para que otros se unan a tu familia.
                        </p>
                    </div>
                </div>
            </div>
            <div>
                <div class="card" style="margin-bottom:20px">
                    <div class="card-header">
                        <h2><i class="fas fa-users"></i> Miembros (${miembros.length})</h2>
                    </div>
                    <ul class="member-list" id="config-miembros"></ul>
                </div>
                <div class="card">
                    <div class="card-header"><h2><i class="fas fa-info-circle"></i> Acerca de</h2></div>
                    <div class="config-section">
                        <p style="font-size:0.9rem;color:var(--text-light);margin-bottom:8px">
                            <strong>App Compras Familiares</strong> v2.0
                        </p>
                        <p style="font-size:0.85rem;color:var(--text-light)">
                            Aplicación colaborativa para planificar compras familiares.
                            Organiza tus compras por día, tienda y categoría.
                        </p>
                    </div>
                    <div class="config-section" style="margin-top:20px">
                        <button class="btn btn-danger" id="btn-logout-config">
                            <i class="fas fa-sign-out-alt"></i> Cerrar sesión
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Render members
    const membContainer = document.getElementById('config-miembros');
    if (membContainer) {
        if (miembros.length === 0) {
            membContainer.innerHTML = '<li class="empty-state"><p>No hay miembros en tu familia</p></li>';
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
    }

    // Copy code button
    document.getElementById('btn-copiar-codigo')?.addEventListener('click', () => {
        const codigoText = document.getElementById('codigo-valor')?.textContent;
        if (codigoText && codigoText !== '—') {
            navigator.clipboard.writeText(codigoText).then(() => {
                mostrarNotificacion('Código copiado al portapapeles', 'success');
            }).catch(() => {
                // Fallback
                const input = document.createElement('input');
                input.value = codigoText;
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                document.body.removeChild(input);
                mostrarNotificacion('Código copiado', 'success');
            });
        }
    });

    // Logout button
    document.getElementById('btn-logout-config')?.addEventListener('click', () => {
        if (confirm('¿Cerrar sesión?')) API.logout();
    });
}
