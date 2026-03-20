// API Client Module
const API = {
    async _fetch(url, options = {}) {
        try {
            const res = await fetch(url, {
                headers: { 'Content-Type': 'application/json' },
                ...options
            });
            if (res.status === 401) {
                window.location.href = '/login';
                return null;
            }
            return res;
        } catch (err) {
            console.error(`API error [${url}]:`, err);
            throw err;
        }
    },

    async getUsuario() {
        const res = await this._fetch('/api/usuario');
        return res?.ok ? res.json() : null;
    },

    async getLista() {
        const res = await this._fetch('/api/lista');
        return res?.ok ? res.json() : [];
    },

    async getEstadisticas() {
        const res = await this._fetch('/api/estadisticas');
        return res?.ok ? res.json() : null;
    },

    async getMiembros() {
        const res = await this._fetch('/api/familia/miembros');
        return res?.ok ? res.json() : [];
    },

    async getCodigoFamilia() {
        const res = await this._fetch('/api/familia/codigo');
        return res?.ok ? res.json() : null;
    },

    async agregarProducto(data) {
        const res = await this._fetch('/api/producto', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return res?.ok ? res.json() : null;
    },

    async actualizarProducto(id, data) {
        const res = await this._fetch(`/api/producto/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return res?.ok ? res.json() : null;
    },

    async eliminarProducto(id) {
        const res = await this._fetch(`/api/producto/${id}`, { method: 'DELETE' });
        return res?.ok;
    },

    async logout() {
        await this._fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
    }
};

export default API;
