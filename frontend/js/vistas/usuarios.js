// Variable global para la DataTable
let tablaUsuarios;

// Función de inicialización exigida por el router SPA
window.init_usuarios = function () {
    console.log("Módulo Usuarios inicializado");

    // Configurar DataTable
    inicializarTabla();

    // Cargar select de perfiles
    cargarPerfilesActivos();

    // Event listeners
    document.getElementById('btnNuevoUsuario').addEventListener('click', abrirModalCrearUsuario);
    document.getElementById('btnCerrarModal').addEventListener('click', cerrarModalUsuario);
    document.getElementById('btnCancelarModal').addEventListener('click', cerrarModalUsuario);
    document.getElementById('formUsuario').addEventListener('submit', guardarUsuario);
};

function inicializarTabla() {
    // Si ya existe la destruimos para reinicializar
    if ($.fn.DataTable.isDataTable('#tablaUsuarios')) {
        $('#tablaUsuarios').DataTable().destroy();
    }

    tablaUsuarios = $('#tablaUsuarios').DataTable({
        ajax: {
            url: 'http://localhost:3000/api/usuarios',
            dataSrc: 'data'
        },
        columns: [
            { data: 'id_usuario' },
            { data: 'nombre' },
            { data: 'usuario' },
            { data: 'perfil' },
            {
                data: 'estado',
                render: function (data) {
                    if (data === 1) return '<span class="badge-activo">Activo</span>';
                    return '<span class="badge-inactivo">Inactivo</span>';
                }
            },
            {
                data: null,
                render: function (data, type, row) {
                    const iconToggle = row.estado === 1 ? 'fa-ban' : 'fa-check';
                    const titleToggle = row.estado === 1 ? 'Desactivar' : 'Activar';

                    return `
                        <button class="btn-action btn-edit" onclick="abrirModalEditarUsuario(${row.id_usuario})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-toggle" onclick="cambiarEstadoUsuario(${row.id_usuario}, ${row.estado === 1 ? 0 : 1})" title="${titleToggle}">
                            <i class="fas ${iconToggle}"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="cambiarEstadoUsuario(${row.id_usuario}, 2)" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                }
            }
        ],
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
        }
    });
}

async function cargarPerfilesActivos() {
    try {
        const response = await fetch('http://localhost:3000/api/usuarios/perfiles');
        const result = await response.json();

        if (result.success) {
            const select = document.getElementById('id_perfil');
            // Limpiar y mantener la primera opción
            select.innerHTML = '<option value="">Seleccione...</option>';

            result.data.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id_perfil;
                opt.textContent = p.nombre;
                select.appendChild(opt);
            });
        }
    } catch (error) {
        console.error("Error al cargar perfiles", error);
    }
}

function abrirModalCrearUsuario() {
    document.getElementById('formUsuario').reset();
    document.getElementById('id_usuario').value = '';
    document.getElementById('modalTitle').textContent = 'Nuevo Usuario';

    // Contraseña requerida al crear
    document.getElementById('clave_login').required = true;
    document.getElementById('helpClave').style.display = 'none';

    document.getElementById('modalUsuario').style.display = 'flex';
}

function cerrarModalUsuario() {
    document.getElementById('modalUsuario').style.display = 'none';
}

// Variables globales para la vista, DataTables envía todo el objeto de la fila si lo buscamos
window.abrirModalEditarUsuario = function (id) {
    // Buscar datos en la tabla (forma rápida de evitar otra petición GET)
    const data = tablaUsuarios.rows().data().toArray().find(u => u.id_usuario === id);
    if (!data) return;

    document.getElementById('id_usuario').value = data.id_usuario;
    document.getElementById('nombre').value = data.nombre;
    document.getElementById('usuario_login').value = data.usuario;

    // Marcar el perfil correcto
    const select = document.getElementById('id_perfil');
    Array.from(select.options).forEach(opt => {
        if (opt.text === data.perfil) {
            select.value = opt.value;
        }
    });

    document.getElementById('modalTitle').textContent = 'Editar Usuario';

    // Contraseña no requerida al editar
    document.getElementById('clave_login').required = false;
    document.getElementById('clave_login').value = '';
    document.getElementById('helpClave').style.display = 'block';

    document.getElementById('modalUsuario').style.display = 'flex';
}

async function guardarUsuario(e) {
    e.preventDefault();

    // Obtener header auth (simulado)
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito'));

    const id = document.getElementById('id_usuario').value;
    const datos = {
        nombre: document.getElementById('nombre').value,
        usuario: document.getElementById('usuario_login').value,
        id_perfil: document.getElementById('id_perfil').value,
        clave: document.getElementById('clave_login').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `http://localhost:3000/api/usuarios/${id}` : 'http://localhost:3000/api/usuarios';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-user-profile': sessionData.id_perfil
            },
            body: JSON.stringify(datos)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: result.message,
                timer: 1500,
                showConfirmButton: false
            });
            cerrarModalUsuario();
            tablaUsuarios.ajax.reload(null, false);
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: result.message
            });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
}

// Función global ya que es llamada desde el onclick de DataTables HTML puro
window.cambiarEstadoUsuario = async function (id, estado) {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito'));

    let titulo = estado === 2 ? '¿Eliminar usuario?' : (estado === 1 ? '¿Activar usuario?' : '¿Desactivar usuario?');
    let texto = estado === 2 ? 'Esta acción no se puede deshacer.' : 'Cambiarás el acceso del usuario.';
    let icon = estado === 2 ? 'warning' : 'info';
    let btnColor = estado === 2 ? '#ef4444' : '#0f4c81';

    const confirm = await Swal.fire({
        title: titulo,
        text: texto,
        icon: icon,
        showCancelButton: true,
        confirmButtonColor: btnColor,
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
        try {
            const response = await fetch(`http://localhost:3000/api/usuarios/${id}/estado`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-profile': sessionData.id_perfil,
                    'x-user-id': sessionData.id_usuario // Para validar que no se borre a sí mismo
                },
                body: JSON.stringify({ estado })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                Swal.fire({ icon: 'success', title: 'Éxito', text: result.message, timer: 1500, showConfirmButton: false });
                tablaUsuarios.ajax.reload(null, false);
            } else {
                Swal.fire({ icon: 'error', title: 'Acción Denegada', text: result.message });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
        }
    }
}
