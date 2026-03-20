# 🛒 Compras Familiares

Aplicación web móvil para que familias puedan planificar sus compras semanales de forma colaborativa.

## 🌟 Características

- **Multiusuario**: Varios miembros de la familia pueden usar la misma cuenta
- **Lista compartida**: Todos ven los productos que añaden los demás
- **Actualización en tiempo real**: La lista se actualiza automáticamente cada 30 segundos
- **Categorías**: Organiza los productos por categorías (Frutas, Lácteos, Limpieza, etc.)
- **Prioridades**: Marca productos como urgentes
- **Seguimiento**: Marca productos como comprados y ve quién los agregó
- **Diseño móvil-friendly**: Interfaz optimizada para usar en el móvil

## 🚀 Instalación

1. **Clonar o descargar el proyecto**
2. **Instalar dependencias**:
   ```bash
   pip install -r requirements.txt
   ```
3. **Iniciar la aplicación**:
   ```bash
   python app.py
   ```
4. **Abrir en el navegador**: `http://localhost:5000`

## 📱 Uso

### Para la primera familia:
1. Crea una cuenta con el nombre de tu familia
2. Añade productos a la lista de compras
3. Invita a otros miembros a crear cuenta con el mismo nombre de familia

### Para unirse a una familia existente:
1. Crea una cuenta usando el mismo nombre de familia
2. Verás automáticamente la lista de compras compartida

## 🏗️ Estructura del proyecto

```
App_Compras_Familiares/
├── app.py                 # Aplicación Flask principal
├── requirements.txt        # Dependencias de Python
├── templates/            # Archivos HTML
│   ├── index.html        # Página de bienvenida
│   ├── login.html        # Inicio de sesión
│   ├── registro.html     # Registro de usuarios
│   └── app.html          # Aplicación principal
├── usuarios.json         # Base de datos de usuarios
├── familias.json         # Base de datos de familias
└── listas_compras.json   # Lista de productos
```

## 🔧 Tecnologías

- **Backend**: Python con Flask
- **Frontend**: HTML5, CSS3, JavaScript vanilla
- **Base de datos**: Archivos JSON (sencillo y portable)
- **Diseño**: Responsive design para móviles

## 📋 Funcionalidades principales

### Gestión de usuarios
- Registro e inicio de sesión
- Agrupación por familias
- Contraseñas encriptadas con SHA-256

### Lista de compras
- Añadir productos con cantidad y categoría
- Marcar como urgente
- Marcar como comprado
- Eliminar productos
- Ver quién agregó cada producto

### Interfaz
- Diseño moderno y minimalista
- Colores agradables y accesibles
- Totalmente funcional en móviles
- Auto-recarga para ver cambios en tiempo real

## 🌐 Acceso desde otros dispositivos

Para que otros miembros de la familia accedan desde sus móviles:

1. **En la misma red WiFi**: Usan tu IP local (ej: `http://192.168.1.100:5000`)
2. **Desde cualquier lugar**: Necesitarías desplegar la app en un servidor

Para encontrar tu IP local:
- Windows: Abre CMD y escribe `ipconfig`
- Mac/Linux: Abre terminal y escribe `ifconfig`

## 🔒 Seguridad

- Contraseñas encriptadas
- Sesiones seguras
- Validación de datos de entrada
- Aislamiento por familias

## 🚀 Mejoras futuras

- [ ] Notificaciones push en móvil
- [ ] Chat familiar para coordinar compras
- [ ] Sugerencias de productos basadas en historial
- [ ] Modo offline con sincronización
- [ ] Subida de fotos de productos
- [ ] Integración con supermercados online

## 📞 Soporte

Si encuentras algún problema o tienes sugerencias, crea un issue en el repositorio o contacta con el desarrollador.

---

**¡Disfruta organizando tus compras familiares! 🏠🛒**
