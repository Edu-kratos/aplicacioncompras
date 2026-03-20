# Aplicación de Compras Familiares
# Permite a familias planificar sus compras semanales de forma colaborativa

from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import json
import os
import logging
import threading
from datetime import datetime, timedelta
import hashlib
import random
import string
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', os.urandom(24).hex())

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Archivos de datos
ARCHIVO_USUARIOS = 'usuarios.json'
ARCHIVO_FAMILIAS = 'familias.json'
ARCHIVO_LISTAS = 'listas.json'

# Lock para acceso concurrente a archivos JSON
_file_lock = threading.Lock()

# Funciones de gestión de datos
def cargar_datos(archivo):
    """Carga datos desde un archivo JSON"""
    with _file_lock:
        try:
            if not os.path.exists(archivo):
                with open(archivo, 'w', encoding='utf-8') as f:
                    json.dump([], f)
            with open(archivo, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f"Error cargando {archivo}: {e}")
            return []

def guardar_datos(datos, archivo):
    """Guarda datos en un archivo JSON"""
    with _file_lock:
        with open(archivo, 'w', encoding='utf-8') as f:
            json.dump(datos, f, indent=2, ensure_ascii=False)

def siguiente_id(lista):
    """Genera el siguiente ID seguro basado en el máximo existente"""
    if not lista:
        return 1
    return max(item.get('id', 0) for item in lista) + 1

def generar_codigo_invitacion():
    """Genera un código de invitación único de 8 caracteres"""
    while True:
        codigo = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        familias = cargar_datos(ARCHIVO_FAMILIAS)
        if not any(familia.get('codigo_invitacion') == codigo for familia in familias):
            return codigo

def encriptar_password(password):
    """Encripta una contraseña con werkzeug (pbkdf2)"""
    return generate_password_hash(password)

def verificar_password(password, hash_guardado):
    """Verifica contraseña soportando formato legacy SHA-256 y nuevo werkzeug"""
    if hash_guardado.startswith('pbkdf2:') or hash_guardado.startswith('scrypt:'):
        return check_password_hash(hash_guardado, password)
    # Fallback: formato legacy SHA-256 (usuarios existentes)
    return hashlib.sha256(password.encode()).hexdigest() == hash_guardado

# Esquema canónico de producto
CAMPOS_PRODUCTO = ('id', 'nombre', 'cantidad', 'categoria', 'urgente', 'precio',
                   'fecha', 'tienda', 'id_usuario', 'nombre_usuario', 'id_familia',
                   'comprado', 'fecha_agregado')

def migrar_productos():
    """Migra productos antiguos al esquema actual en el arranque"""
    listas = cargar_datos(ARCHIVO_LISTAS)
    if not listas:
        return
    modificado = False
    for p in listas:
        # Corregir IDs string a int
        if isinstance(p.get('id'), str):
            try:
                p['id'] = int(p['id'])
                modificado = True
            except ValueError:
                pass
        # Migrar campos renombrados
        if 'id_usuario_agrego' in p and 'id_usuario' not in p:
            p['id_usuario'] = p.pop('id_usuario_agrego')
            p['nombre_usuario'] = p.pop('nombre_usuario_agrego', 'Desconocido')
            modificado = True
        if 'id_usuario' not in p:
            p['id_usuario'] = p.get('id_usuario_agrego', 0)
            modificado = True
        if 'nombre_usuario' not in p:
            p['nombre_usuario'] = p.get('nombre_usuario_agrego', 'Desconocido')
            modificado = True
        # Añadir campos faltantes con defaults
        if 'precio' not in p:
            p['precio'] = 0
            modificado = True
        if 'fecha' not in p:
            p['fecha'] = p.get('fecha_agregado', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))[:10]
            modificado = True
        if 'tienda' not in p:
            p['tienda'] = 'Sin tienda asignada'
            modificado = True
        if 'fecha_agregado' not in p:
            ts = p.pop('timestamp', None)
            if ts:
                try:
                    dt = datetime.fromisoformat(ts)
                    p['fecha_agregado'] = dt.strftime('%Y-%m-%d %H:%M:%S')
                except (ValueError, TypeError):
                    p['fecha_agregado'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            else:
                p['fecha_agregado'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            modificado = True
        elif 'timestamp' in p:
            p.pop('timestamp', None)
            modificado = True
        # Limpiar campos legacy sobrantes
        for legacy in ('id_usuario_agrego', 'nombre_usuario_agrego'):
            if legacy in p:
                p.pop(legacy)
                modificado = True
    if modificado:
        guardar_datos(listas, ARCHIVO_LISTAS)
        logger.info('Productos migrados al esquema actual')

# Ejecutar migración al arrancar
migrar_productos()

# Rutas principales
@app.route('/')
def index():
    """Página principal"""
    return render_template('index.html')

@app.route('/login')
def login_page():
    """Página de login"""
    return render_template('login.html')

@app.route('/registro')
def registro_page():
    """Página de registro"""
    return render_template('registro.html')

@app.route('/unirse-familia')
def unirse_familia_page():
    """Página para unirse a una familia"""
    if 'usuario' not in session:
        return redirect('/login')
    return render_template('unirse_familia.html')

@app.route('/app')
def app_page():
    """Aplicación principal"""
    if 'usuario' not in session:
        return redirect('/login')
    
    # Permitir acceso a usuarios con o sin familia
    return render_template('app.html', usuario=session['usuario'])

# API de usuarios
@app.route('/api/registro', methods=['POST'])
def api_registro():
    """Registra un nuevo usuario"""
    data = request.json
    if not data:
        return jsonify({'error': 'Datos requeridos'}), 400
    
    # Validar campos obligatorios
    for campo in ('nombre', 'email', 'password'):
        if not data.get(campo, '').strip():
            return jsonify({'error': f'El campo {campo} es obligatorio'}), 400
    
    usuarios = cargar_datos(ARCHIVO_USUARIOS)
    familias = cargar_datos(ARCHIVO_FAMILIAS)
    
    # Verificar si el email ya existe
    for usuario in usuarios:
        if usuario['email'] == data['email']:
            return jsonify({'error': 'El email ya está registrado'}), 400
    
    # Buscar o crear familia
    id_familia = None
    codigo_invitacion_resp = None
    if data.get('nombre_familia'):
        for familia in familias:
            if familia['nombre'].lower() == data['nombre_familia'].lower():
                id_familia = familia['id']
                codigo_invitacion_resp = familia.get('codigo_invitacion')
                break
        
        if id_familia is None:
            nueva_familia = {
                'id': siguiente_id(familias),
                'nombre': data['nombre_familia'],
                'codigo_invitacion': generar_codigo_invitacion(),
                'fecha_creacion': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            familias.append(nueva_familia)
            guardar_datos(familias, ARCHIVO_FAMILIAS)
            id_familia = nueva_familia['id']
            codigo_invitacion_resp = nueva_familia['codigo_invitacion']
    
    # Crear usuario
    nuevo_usuario = {
        'id': siguiente_id(usuarios),
        'nombre': data['nombre'].strip(),
        'email': data['email'].strip(),
        'password': encriptar_password(data['password']),
        'id_familia': id_familia,
        'fecha_registro': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    
    usuarios.append(nuevo_usuario)
    guardar_datos(usuarios, ARCHIVO_USUARIOS)
    
    # Iniciar sesión automáticamente
    session['usuario'] = {
        'id': nuevo_usuario['id'],
        'nombre': nuevo_usuario['nombre'],
        'email': nuevo_usuario['email'],
        'id_familia': nuevo_usuario['id_familia']
    }
    
    return jsonify({
        'usuario': session['usuario'],
        'mensaje': 'Usuario registrado exitosamente',
        'codigo_invitacion': codigo_invitacion_resp
    }), 201

@app.route('/api/login', methods=['POST'])
def api_login():
    """Inicia sesión de usuario"""
    data = request.json
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email y contraseña son obligatorios'}), 400
    
    usuarios = cargar_datos(ARCHIVO_USUARIOS)
    
    for i, usuario in enumerate(usuarios):
        if usuario['email'] == data['email']:
            if verificar_password(data['password'], usuario['password']):
                # Migrar hash legacy a werkzeug si es necesario
                if not usuario['password'].startswith(('pbkdf2:', 'scrypt:')):
                    usuarios[i]['password'] = encriptar_password(data['password'])
                    guardar_datos(usuarios, ARCHIVO_USUARIOS)
                
                session['usuario'] = {
                    'id': usuario['id'],
                    'nombre': usuario['nombre'],
                    'email': usuario['email'],
                    'id_familia': usuario['id_familia']
                }
                return jsonify({'usuario': session['usuario']})
            else:
                return jsonify({'error': 'Contraseña incorrecta'}), 401
    
    return jsonify({'error': 'Usuario no encontrado'}), 404

@app.route('/api/familia/codigo', methods=['GET'])
def api_obtener_codigo_familia():
    """Obtiene el código de invitación de la familia del usuario"""
    if 'usuario' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    id_familia = session['usuario']['id_familia']
    if not id_familia:
        return jsonify({'error': 'No perteneces a ninguna familia'}), 400
    
    familias = cargar_datos(ARCHIVO_FAMILIAS)
    for familia in familias:
        if familia['id'] == id_familia:
            return jsonify({
                'codigo_invitacion': familia.get('codigo_invitacion'),
                'nombre_familia': familia['nombre']
            })
    
    return jsonify({'error': 'Familia no encontrada'}), 404

@app.route('/api/usuario', methods=['GET'])
def api_usuario():
    """Obtiene los datos del usuario actual"""
    if 'usuario' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    return jsonify(session['usuario'])

@app.route('/api/familias/buscar', methods=['GET'])
def api_buscar_familias():
    """Busca familias por nombre"""
    if 'usuario' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    query = request.args.get('q', '').strip()
    familias = cargar_datos(ARCHIVO_FAMILIAS)
    
    if not query:
        return jsonify([])
    
    # Buscar familias que contengan el query en el nombre
    resultados = []
    for familia in familias:
        if query.lower() in familia['nombre'].lower():
            resultados.append({
                'id': familia['id'],
                'nombre': familia['nombre'],
                'fecha_creacion': familia['fecha_creacion']
            })
    
    return jsonify(resultados)

@app.route('/api/familia/unirse-codigo', methods=['POST'])
def api_unirse_familia_codigo():
    """Une a un usuario a una familia usando código de invitación"""
    if 'usuario' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    data = request.json
    codigo_invitacion = data.get('codigo_invitacion', '').strip().upper()
    
    if not codigo_invitacion:
        return jsonify({'error': 'Código de invitación requerido'}), 400
    
    # Verificar que la familia existe con ese código
    familias = cargar_datos(ARCHIVO_FAMILIAS)
    familia_encontrada = None
    for familia in familias:
        if familia.get('codigo_invitacion') == codigo_invitacion:
            familia_encontrada = familia
            break
    
    if not familia_encontrada:
        return jsonify({'error': 'Código de invitación inválido'}), 404
    
    # Actualizar el usuario con la familia
    usuarios = cargar_datos(ARCHIVO_USUARIOS)
    for i, usuario in enumerate(usuarios):
        if usuario['id'] == session['usuario']['id']:
            usuarios[i]['id_familia'] = familia_encontrada['id']
            session['usuario']['id_familia'] = familia_encontrada['id']
            guardar_datos(usuarios, ARCHIVO_USUARIOS)
            break
    
    return jsonify({
        'mensaje': 'Te has unido a la familia exitosamente',
        'familia': {
            'id': familia_encontrada['id'],
            'nombre': familia_encontrada['nombre']
        }
    })

@app.route('/api/logout', methods=['POST'])
def api_logout():
    """Cierra sesión"""
    session.pop('usuario', None)
    return jsonify({'mensaje': 'Sesión cerrada'})

# API de lista de compras
@app.route('/api/lista', methods=['GET'])
def obtener_lista():
    """Obtiene la lista de compras del usuario"""
    if 'usuario' not in session:
        return jsonify({'error': 'No autorizado', 'redirect': '/login'}), 401
    
    listas = cargar_datos(ARCHIVO_LISTAS)
    id_familia = session['usuario']['id_familia']
    id_usuario_actual = session['usuario']['id']
    
    # Filtrar productos segun el tipo de usuario
    if id_familia:
        productos = [p for p in listas if p.get('id_familia') == id_familia]
    else:
        productos = [p for p in listas if p.get('id_usuario') == id_usuario_actual]
    
    # Ordenar por fecha agregado (mas reciente primero)
    productos.sort(key=lambda x: x.get('fecha_agregado', ''), reverse=True)
    return jsonify(productos)

# API de productos (rutas unificadas)
@app.route('/api/producto', methods=['POST'])
def agregar_producto():
    """Agrega un nuevo producto a la lista"""
    if 'usuario' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    data = request.json
    if not data or not data.get('nombre', '').strip():
        return jsonify({'error': 'El nombre del producto es obligatorio'}), 400
    
    listas = cargar_datos(ARCHIVO_LISTAS)
    
    nuevo_producto = {
        'id': siguiente_id(listas),
        'nombre': data['nombre'].strip(),
        'cantidad': data.get('cantidad', 1),
        'categoria': data.get('categoria', 'General'),
        'urgente': data.get('urgente', False),
        'precio': data.get('precio', 0),
        'fecha': data.get('fecha', datetime.now().strftime('%Y-%m-%d')),
        'tienda': data.get('tienda', 'Sin tienda asignada'),
        'id_usuario': session['usuario']['id'],
        'nombre_usuario': session['usuario']['nombre'],
        'id_familia': session['usuario']['id_familia'],
        'comprado': False,
        'fecha_agregado': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    
    listas.append(nuevo_producto)
    guardar_datos(listas, ARCHIVO_LISTAS)
    
    return jsonify({'mensaje': 'Producto agregado correctamente', 'producto': nuevo_producto}), 201

@app.route('/api/producto/<int:id_producto>', methods=['PUT'])
def actualizar_producto(id_producto):
    """Actualiza un producto"""
    if 'usuario' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    data = request.json
    if not data:
        return jsonify({'error': 'Datos requeridos'}), 400
    
    listas = cargar_datos(ARCHIVO_LISTAS)
    id_familia = session['usuario']['id_familia']
    
    for i, producto in enumerate(listas):
        if producto['id'] == id_producto and producto.get('id_familia') == id_familia:
            campos_editables = ('comprado', 'cantidad', 'urgente', 'precio', 'categoria', 'tienda', 'nombre')
            for campo in campos_editables:
                if campo in data:
                    producto[campo] = data[campo]
            
            if data.get('comprado'):
                producto['fecha_comprado'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                producto['comprado_por'] = session['usuario']['nombre']
            
            listas[i] = producto
            guardar_datos(listas, ARCHIVO_LISTAS)
            return jsonify(producto)
    
    return jsonify({'error': 'Producto no encontrado'}), 404

@app.route('/api/producto/<int:id_producto>', methods=['DELETE'])
def eliminar_producto(id_producto):
    """Elimina un producto"""
    if 'usuario' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    listas = cargar_datos(ARCHIVO_LISTAS)
    id_familia = session['usuario']['id_familia']
    
    for i, producto in enumerate(listas):
        if producto['id'] == id_producto and producto.get('id_familia') == id_familia:
            listas.pop(i)
            guardar_datos(listas, ARCHIVO_LISTAS)
            return jsonify({'mensaje': 'Producto eliminado'})
    
    return jsonify({'error': 'Producto no encontrado'}), 404

@app.route('/api/familia/miembros', methods=['GET'])
def obtener_miembros():
    """Obtiene los miembros de la familia"""
    if 'usuario' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    usuarios = cargar_datos(ARCHIVO_USUARIOS)
    id_familia = session['usuario']['id_familia']
    
    miembros = []
    for usuario in usuarios:
        if usuario['id_familia'] == id_familia:
            miembros.append({
                'id': usuario['id'],
                'nombre': usuario['nombre'],
                'email': usuario['email']
            })
    
    return jsonify(miembros)

@app.route('/api/estadisticas', methods=['GET'])
def api_estadisticas():
    """Devuelve estadísticas de compras de la familia"""
    if 'usuario' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    listas = cargar_datos(ARCHIVO_LISTAS)
    id_familia = session['usuario']['id_familia']
    id_usuario = session['usuario']['id']
    
    if id_familia:
        productos = [p for p in listas if p.get('id_familia') == id_familia]
    else:
        productos = [p for p in listas if p.get('id_usuario') == id_usuario]
    
    total = len(productos)
    comprados = sum(1 for p in productos if p.get('comprado'))
    pendientes = total - comprados
    urgentes = sum(1 for p in productos if p.get('urgente') and not p.get('comprado'))
    
    def gasto(p):
        return (p.get('precio', 0) or 0) * (p.get('cantidad', 1) or 1)
    
    gasto_total = sum(gasto(p) for p in productos if p.get('comprado'))
    gasto_estimado = sum(gasto(p) for p in productos)
    
    por_categoria = {}
    for p in productos:
        cat = p.get('categoria', 'General')
        if cat not in por_categoria:
            por_categoria[cat] = {'cantidad': 0, 'gasto': 0}
        por_categoria[cat]['cantidad'] += 1
        por_categoria[cat]['gasto'] = round(por_categoria[cat]['gasto'] + gasto(p), 2)
    
    por_tienda = {}
    for p in productos:
        tienda = p.get('tienda', 'Sin tienda')
        if tienda not in por_tienda:
            por_tienda[tienda] = {'cantidad': 0, 'gasto': 0}
        por_tienda[tienda]['cantidad'] += 1
        por_tienda[tienda]['gasto'] = round(por_tienda[tienda]['gasto'] + gasto(p), 2)
    
    por_usuario = {}
    for p in productos:
        nombre = p.get('nombre_usuario', 'Desconocido')
        if nombre not in por_usuario:
            por_usuario[nombre] = {'agregados': 0, 'comprados': 0}
        por_usuario[nombre]['agregados'] += 1
        if p.get('comprado'):
            por_usuario[nombre]['comprados'] += 1
    
    recientes = sorted(productos, key=lambda x: x.get('fecha_agregado', ''), reverse=True)[:10]
    
    return jsonify({
        'resumen': {
            'total': total,
            'comprados': comprados,
            'pendientes': pendientes,
            'urgentes': urgentes,
            'gasto_total': round(gasto_total, 2),
            'gasto_estimado': round(gasto_estimado, 2)
        },
        'por_categoria': por_categoria,
        'por_tienda': por_tienda,
        'por_usuario': por_usuario,
        'recientes': recientes
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
