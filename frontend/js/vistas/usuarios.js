// Caché para la edición rápida sin peticiones extra
window.usuariosCache = [];

// Función de inicialización exigida por el router SPA
window.init_usuarios = function () {
    console.log("Módulo Usuarios inicializado (Vanilla JS)");

    cargarTablaUsuarios();
    cargarPerfilesActivos();

    // Event listeners del modal
    document.getElementById('btnNuevoUsuario').addEventListener('click', abrirModalCrearUsuario);
    document.getElementById('btnCerrarModal').addEventListener('click', cerrarModalUsuario);
    document.getElementById('btnCancelarModal').addEventListener('click', cerrarModalUsuario);
    document.getElementById('formUsuario').addEventListener('submit', guardarUsuario);

    // Buscador en tiempo real
    document.getElementById('inputBuscarUsuario').addEventListener('keyup', function (e) {
        const texto = e.target.value.toLowerCase();
        const filas = document.querySelectorAll('#tbody-usuarios tr');
        filas.forEach(fila => {
            fila.style.display = fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
        });
    });
};

async function cargarTablaUsuarios() {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const tbody = document.getElementById('tbody-usuarios');

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:24px; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';

    try {
        const response = await fetch('http://localhost:3000/api/usuarios', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();

        if (response.ok && result.success) {
            window.usuariosCache = result.data;

            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:24px; color: var(--text-muted);">No se encontraron usuarios</td></tr>';
                return;
            }

            let filasHTML = '';
            result.data.forEach(u => {
                const badgeEstado = u.estado === 1
                    ? '<span class="badge-activo">Activo</span>'
                    : '<span class="badge-inactivo">Inactivo</span>';

                const iconToggle = u.estado === 1 ? 'fa-ban' : 'fa-check';
                const titleToggle = u.estado === 1 ? 'Desactivar' : 'Activar';

                filasHTML += `
                    <tr class="tabla-tr">
                        <td class="tabla-td tabla-id">${u.id_usuario}</td>
                        <td class="tabla-td tabla-nombre">${u.nombre}</td>
                        <td class="tabla-td tabla-secundario">${u.usuario}</td>
                        <td class="tabla-td tabla-secundario">${u.perfil}</td>
                        <td class="tabla-td">${badgeEstado}</td>
                        <td class="tabla-td">
                            <button class="btn-action btn-edit" onclick="abrirModalEditarUsuario(${u.id_usuario})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-toggle" onclick="cambiarEstadoUsuario(${u.id_usuario}, ${u.estado === 1 ? 0 : 1})" title="${titleToggle}">
                                <i class="fas ${iconToggle}"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="cambiarEstadoUsuario(${u.id_usuario}, 2)" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = filasHTML;
        } else {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color: #ef4444;">Error: ${result.message}</td></tr>`;
        }
    } catch (error) {
        console.error("Error al cargar usuarios:", error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:24px; color: #ef4444;">Error de conexión con el servidor</td></tr>';
    }
}

async function cargarPerfilesActivos() {
    try {
        const response = await fetch('http://localhost:3000/api/usuarios/perfiles');
        const result = await response.json();

        if (result.success) {
            const select = document.getElementById('id_perfil');
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
    document.getElementById('clave_login').required = true;
    document.getElementById('helpClave').style.display = 'none';
    document.getElementById('modalUsuario').style.display = 'flex';
}

function cerrarModalUsuario() {
    document.getElementById('modalUsuario').style.display = 'none';
}

window.abrirModalEditarUsuario = function (id) {
    const data = window.usuariosCache.find(u => u.id_usuario === id);
    if (!data) return;

    document.getElementById('id_usuario').value = data.id_usuario;
    document.getElementById('nombre').value = data.nombre;
    document.getElementById('usuario_login').value = data.usuario;

    // Marcar el perfil correcto en el select
    const select = document.getElementById('id_perfil');
    Array.from(select.options).forEach(opt => {
        if (opt.text === data.perfil) select.value = opt.value;
    });

    document.getElementById('modalTitle').textContent = 'Editar Usuario';
    document.getElementById('clave_login').required = false;
    document.getElementById('clave_login').value = '';
    document.getElementById('helpClave').style.display = 'block';
    document.getElementById('modalUsuario').style.display = 'flex';
};

async function guardarUsuario(e) {
    e.preventDefault();
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
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
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-user-profile': sessionData.id_perfil
            },
            body: JSON.stringify(datos)
        });
        const result = await response.json();

        if (response.ok && result.success) {
            Swal.fire({ icon: 'success', title: 'Éxito', text: result.message, timer: 1500, showConfirmButton: false });
            cerrarModalUsuario();
            cargarTablaUsuarios();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
}

window.cambiarEstadoUsuario = async function (id, estado) {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');

    const titulo = estado === 2 ? '¿Eliminar usuario?' : (estado === 1 ? '¿Activar usuario?' : '¿Desactivar usuario?');
    const texto = estado === 2 ? 'Esta acción no se puede deshacer.' : 'Cambiarás el acceso del usuario.';
    const btnColor = estado === 2 ? '#ef4444' : '#0f4c81';

    const confirm = await Swal.fire({
        title: titulo,
        text: texto,
        icon: estado === 2 ? 'warning' : 'info',
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
                    'x-user-id': sessionData.id_usuario
                },
                body: JSON.stringify({ estado })
            });
            const result = await response.json();

            if (response.ok && result.success) {
                Swal.fire({ icon: 'success', title: 'Éxito', text: result.message, timer: 1500, showConfirmButton: false });
                cargarTablaUsuarios();
            } else {
                Swal.fire({ icon: 'error', title: 'Acción Denegada', text: result.message });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
        }
    }
};
