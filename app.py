# Aplicación de Compras Familiares
# Permite a familias planificar sus compras semanales de forma colaborativa

from flask import Flask, render_template, request, jsonify, session, redirect
import json
import os
from datetime import datetime, timedelta
import hashlib
import random
import string

app = Flask(__name__)
app.secret_key = 'compras_familiares_2024'

# Archivos de datos
ARCHIVO_USUARIOS = 'usuarios.json'
ARCHIVO_FAMILIAS = 'familias.json'
ARCHIVO_LISTAS = 'listas.json'  # Corregido: usar listas.json en lugar de calendario_compras.json

# Funciones de gestión de datos
def cargar_datos(archivo):
    """Carga datos desde un archivo JSON"""
    try:
        if not os.path.exists(archivo):
            with open(archivo, 'w') as f:
                json.dump([], f)
        with open(archivo, 'r') as f:
            return json.load(f)
    except:
        return []

def generar_codigo_invitacion():
    """Genera un código de invitación único de 8 caracteres"""
    while True:
        # Generar código de 8 caracteres (letras y números)
        codigo = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        
        # Verificar que no exista
        familias = cargar_datos(ARCHIVO_FAMILIAS)
        if not any(familia.get('codigo_invitacion') == codigo for familia in familias):
            return codigo

def guardar_datos(datos, archivo):
    """Guarda datos en un archivo JSON"""
    with open(archivo, 'w') as f:
        json.dump(datos, f, indent=2)

# Funciones obsoletas eliminadas para simplificar el código

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
    usuarios = cargar_datos(ARCHIVO_USUARIOS)
    familias = cargar_datos(ARCHIVO_FAMILIAS)
    
    # Verificar si el email ya existe
    for usuario in usuarios:
        if usuario['email'] == data['email']:
            return jsonify({'error': 'El email ya está registrado'}), 400
    
    # Buscar o crear familia
    id_familia = None
    if data.get('nombre_familia'):
        for familia in familias:
            if familia['nombre'].lower() == data['nombre_familia'].lower():
                id_familia = familia['id']
                break
        
        if id_familia is None:
            nueva_familia = {
                'id': len(familias) + 1,
                'nombre': data['nombre_familia'],
                'codigo_invitacion': generar_codigo_invitacion(),
                'fecha_creacion': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            familias.append(nueva_familia)
            guardar_datos(familias, ARCHIVO_FAMILIAS)
            id_familia = nueva_familia['id']
    
    # Crear usuario
    nuevo_usuario = {
        'id': len(usuarios) + 1,
        'nombre': data['nombre'],
        'email': data['email'],
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
        'codigo_invitacion': nueva_familia.get('codigo_invitacion') if id_familia else None
    }), 201

@app.route('/api/login', methods=['POST'])
def api_login():
    """Inicia sesión de usuario"""
    data = request.json
    usuarios = cargar_datos(ARCHIVO_USUARIOS)
    
    for usuario in usuarios:
        if usuario['email'] == data['email']:
            if usuario['password'] == encriptar_password(data['password']):
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

def encriptar_password(password):
    """Encripta una contraseña"""
    return hashlib.sha256(password.encode()).hexdigest()

# API de lista de compras
@app.route('/api/lista', methods=['GET'])
def obtener_lista():
    """Obtiene la lista de compras del usuario"""
    print(f"[DEBUG] Petición recibida a /api/lista")
    print(f"[DEBUG] Headers: {dict(request.headers)}")
    print(f"[DEBUG] Cookies: {request.cookies}")
    print(f"[DEBUG] Sesión actual: {dict(session)}")
    
    try:
        if 'usuario' not in session:
            print(f"[DEBUG] Usuario no en sesión - redirigiendo a login")
            return jsonify({'error': 'No autorizado', 'redirect': '/login'}), 401
        
        listas = cargar_datos(ARCHIVO_LISTAS)
        print(f"[DEBUG] Cargando {len(listas)} productos del archivo")
        
        id_familia = session['usuario']['id_familia']
        id_usuario_actual = session['usuario']['id']
        print(f"[DEBUG] Usuario: {session['usuario']['nombre']}, ID: {id_usuario_actual}, Familia: {id_familia}")
        
        # Filtrar productos segun el tipo de usuario
        if id_familia:
            # Usuario con familia: solo productos de su familia
            productos_familia = [p for p in listas if p.get('id_familia') == id_familia]
            print(f"[DEBUG] Usuario con familia, encontrados {len(productos_familia)} productos con id_familia")
            # Debug: mostrar primeros 3 productos
            for i, p in enumerate(productos_familia[:3]):
                print(f"[DEBUG] Producto {i}: {p}")
        else:
            # Usuario individual: solo sus propios productos
            productos_familia = [p for p in listas if p.get('id_usuario_agrego') == id_usuario_actual]
            print(f"[DEBUG] Usuario individual, encontrados {len(productos_familia)} productos con id_usuario_agrego")
            # Debug: mostrar primeros 3 productos
            for i, p in enumerate(productos_familia[:3]):
                print(f"[DEBUG] Producto {i}: {p}")
        
        # Validar y depurar productos antes de devolver
        productos_validos = []
        for p in productos_familia:
            # Verificar que tenga todos los campos requeridos
            if not all(key in p for key in ['id', 'nombre', 'categoria', 'cantidad']):
                print(f"[ERROR] Producto inválido (campos faltantes): {p}")
                continue
            
            # Verificar que tenga fecha_agregado y que sea válida
            if 'fecha_agregado' not in p:
                print(f"[ERROR] Producto sin fecha_agregado: {p}")
                continue
                
            try:
                fecha_agregado = p['fecha_agregado']
                # Parsear fecha - acepta múltiples formatos
                if isinstance(fecha_agregado, str):
                    # Intentar parsear diferentes formatos de fecha
                    formatos_fecha = [
                        '%Y-%m-%d %H:%M:%S',
                        '%Y-%m-%d %H:%M',
                        '%Y-%m-%d %H:%M:%S.%f'
                    ]
                    
                    fecha_parseada = None
                    for formato in formatos_fecha:
                        try:
                            from datetime import datetime
                            fecha_parseada = datetime.strptime(fecha_agregado, formato)
                            print(f"[DEBUG] Fecha parseada exitosamente: {fecha_parseada} (formato: {formato})")
                            break
                        except ValueError:
                            print(f"[DEBUG] Formato {formato} fallido para fecha: {fecha_agregado}")
                            continue
                    
                    if fecha_parseada is None:
                        print(f"[ERROR] No se pudo parsear fecha: {fecha_agregado}")
                        continue
                        
                    # Usar la fecha parseada exitosamente
                    p['fecha_agregado'] = fecha_parseada.strftime('%Y-%m-%d %H:%M:%S')
                    
            except Exception as e:
                print(f"[ERROR] Error procesando fecha de producto {p.get('id', 'desconocido')}: {p.get('fecha_agregado', 'no-definida')} - Error: {e}")
                continue
            
            productos_validos.append(p)
        
        print(f"[DEBUG] Devolviendo {len(productos_validos)} productos válidos")
        
        # Ordenar por fecha agregado (mas reciente primero)
        productos_validos.sort(key=lambda x: x['fecha_agregado'], reverse=True)
        
        try:
            response_data = jsonify(productos_validos)
            print(f"[DEBUG] Respuesta JSON creada correctamente")
            print(f"[DEBUG] Tipo de respuesta: {type(response_data)}")
            return response_data
        except Exception as json_error:
            print(f"[ERROR] Error creando JSON: {str(json_error)}")
            print(f"[ERROR] Tipo de error JSON: {type(json_error)}")
            return jsonify({'error': 'Error al crear respuesta JSON'}), 500
    
    except Exception as e:
        print(f"[ERROR] Error en obtener_lista: {str(e)}")
        print(f"[ERROR] Tipo de error: {type(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Error interno del servidor'}), 500

# API de productos (rutas unificadas)
@app.route('/api/producto', methods=['POST'])
def agregar_producto():
    """Agrega un producto a la lista"""
    if 'usuario' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    data = request.json
    listas = cargar_datos(ARCHIVO_LISTAS)
    
    nuevo_producto = {
        'id': len(listas) + 1,
        'nombre': data['nombre'],
        'cantidad': data.get('cantidad', 1),
        'categoria': data.get('categoria', 'General'),
        'tienda': data.get('tienda', 'Sin tienda asignada'),  # Nuevo campo
        'id_familia': session['usuario']['id_familia'],
        'id_usuario_agrego': session['usuario']['id'],
        'nombre_usuario_agrego': session['usuario']['nombre'],
        'fecha_agregado': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'comprado': False,
        'urgente': data.get('urgente', False)
    }
    
    listas.append(nuevo_producto)
    guardar_datos(listas, ARCHIVO_LISTAS)
    
    return jsonify(nuevo_producto), 201

@app.route('/api/producto/<int:id_producto>', methods=['PUT'])
def actualizar_producto(id_producto):
    """Actualiza un producto"""
    if 'usuario' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    listas = cargar_datos(ARCHIVO_LISTAS)
    id_familia = session['usuario']['id_familia']
    
    for i, producto in enumerate(listas):
        if producto['id'] == id_producto and producto.get('id_familia') == id_familia:
            data = request.json
            
            if 'comprado' in data:
                producto['comprado'] = data['comprado']
                if data['comprado']:
                    producto['fecha_comprado'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    producto['id_usuario_compro'] = session['usuario']['id']
                    producto['nombre_usuario_compro'] = session['usuario']['nombre']
            
            if 'cantidad' in data:
                producto['cantidad'] = data['cantidad']
            
            if 'urgente' in data:
                producto['urgente'] = data['urgente']
            
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
