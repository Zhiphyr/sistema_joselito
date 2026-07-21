// Caché para la edición rápida sin peticiones extra
window.usuariosCache = [];

// Función de inicialización exigida por el router SPA
window.init_usuarios = function () {
    console.log("Módulo Usuarios inicializado");

    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const idPerfil = parseInt(sessionData.id_perfil);

    // Ocultar botón nuevo si no es admin/dev
    const btnNuevoUsuario = document.getElementById('btnNuevoUsuario');
    if (idPerfil !== 1 && idPerfil !== 2) {
        if (btnNuevoUsuario) btnNuevoUsuario.style.display = 'none';
    } else {
        if (btnNuevoUsuario) btnNuevoUsuario.style.display = 'inline-flex';
    }

    cargarTablaUsuarios();
    cargarPerfilesActivos();

    // Event listeners del modal
    document.getElementById('btnNuevoUsuario').addEventListener('click', abrirModalCrearUsuario);
    document.getElementById('btnCerrarModal').addEventListener('click', cerrarModalUsuario);
    document.getElementById('btnCancelarModal').addEventListener('click', cerrarModalUsuario);
    document.getElementById('formUsuario').addEventListener('submit', guardarUsuario);

    document.getElementById('btnTogglePasswordUsuario').addEventListener('click', function () {
        const input = document.getElementById('clave_login');
        const icono = this.querySelector('i');
        const mostrar = input.type === 'password';
        input.type = mostrar ? 'text' : 'password';
        icono.className = mostrar ? 'fas fa-eye-slash' : 'fas fa-eye';
    });

    // El buscador en tiempo real ahora es manejado por DataTables
};

async function cargarTablaUsuarios() {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const idPerfilLogueado = parseInt(sessionData.id_perfil);
    const tbody = document.getElementById('tbody-usuarios');

    // Destruir instancia anterior si existe
    if ($.fn.DataTable.isDataTable('#tabla-usuarios')) {
        $('#tabla-usuarios').DataTable().destroy();
    }

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:24px; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';

    try {
        const response = await fetch('http://localhost:3000/api/usuarios', {
            headers: { 'x-user-profile': idPerfilLogueado }
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

                let accionesHTML = '';
                if (idPerfilLogueado === 1 || idPerfilLogueado === 2) {
                    accionesHTML = `
                        <button class="btn-action btn-edit" onclick="abrirModalEditarUsuario(${u.id_usuario})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-toggle" onclick="cambiarEstadoUsuario(${u.id_usuario}, ${u.estado === 1 ? 0 : 1})" title="${titleToggle}">
                            <i class="fas ${iconToggle}"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="cambiarEstadoUsuario(${u.id_usuario}, 2)" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                } else {
                    accionesHTML = '<span class="badge-inactivo" style="background:var(--bg-card); color:var(--text-muted); border:1px solid var(--border-light);">Protegido</span>';
                }

                filasHTML += `
                    <tr class="tabla-tr">
                        <td class="tabla-td tabla-id">${u.id_usuario}</td>
                        <td class="tabla-td tabla-nombre">${u.nombre}</td>
                        <td class="tabla-td tabla-secundario">${u.usuario}</td>
                        <td class="tabla-td tabla-secundario">${u.perfil}</td>
                        <td class="tabla-td">${badgeEstado}</td>
                        <td class="tabla-td">
                            ${accionesHTML}
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = filasHTML;

            // Inicializar DataTables
            $('#tabla-usuarios').DataTable({
                language: {
                    url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
                },
                order: [[0, 'desc']], // Ordenar por ID descendente
                dom: '<"dt-top-controls"<"dt-left-controls"l>f>rt<"bottom-controls"ip>',
                pageLength: 15,
                lengthMenu: [15, 25, 50, 100]
            });
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

window.validarBotonGuardarUsuario = function () {
    const nombreInput = document.getElementById('nombre');
    const usuarioInput = document.getElementById('usuario_login');
    const idPerfilInput = document.getElementById('id_perfil');
    const claveInput = document.getElementById('clave_login');
    const btnGuardar = document.getElementById('btnGuardarUsuario');
    const idUsuario = document.getElementById('id_usuario').value;

    let esValido = true;

    // Validación de Nombre
    const nombreVal = nombreInput.value;
    const regexNombre = /^[A-Z\s]{3,70}$/;
    if (!regexNombre.test(nombreVal)) {
        nombreInput.classList.add('is-invalid');
        esValido = false;
    } else {
        nombreInput.classList.remove('is-invalid');
    }

    // Validación de Usuario
    const usuarioVal = usuarioInput.value;
    const regexUsuario = /^[a-z0-9._]+$/;
    let usuarioDuplicado = false;
    if (usuarioVal.length > 0) {
        usuarioDuplicado = window.usuariosCache.some(u => 
            u.usuario === usuarioVal && u.id_usuario.toString() !== idUsuario
        );
    }
    
    if (usuarioVal.length === 0 || !regexUsuario.test(usuarioVal) || usuarioDuplicado) {
        usuarioInput.classList.add('is-invalid');
        esValido = false;
    } else {
        usuarioInput.classList.remove('is-invalid');
    }

    // Validación de Perfil
    if (idPerfilInput.value === "") {
        idPerfilInput.classList.add('is-invalid');
        esValido = false;
    } else {
        idPerfilInput.classList.remove('is-invalid');
    }

    // Validación de Contraseña
    const claveVal = claveInput.value;
    const regexClave = /^(?=.*[A-Z])(?=.*\d)\S{8,}$/;
    const helpClave = document.getElementById('helpClave');
    let claveInvalida = false;

    if (!idUsuario) {
        // Creando nuevo: obligatorio
        if (!regexClave.test(claveVal)) {
            claveInput.classList.add('is-invalid');
            claveInvalida = true;
            esValido = false;
        } else {
            claveInput.classList.remove('is-invalid');
        }
    } else {
        // Editando: opcional
        if (claveVal.length > 0 && !regexClave.test(claveVal)) {
            claveInput.classList.add('is-invalid');
            claveInvalida = true;
            esValido = false;
        } else {
            claveInput.classList.remove('is-invalid');
        }
    }

    if (claveInvalida) {
        helpClave.style.color = '#ef4444'; // Rojo
        helpClave.textContent = 'La contraseña no cumple con el formato (Mín. 8 caracteres, 1 mayúscula, 1 número)';
    } else {
        helpClave.style.color = 'var(--text-muted)';
        helpClave.textContent = 'Políticas: Mínimo 8 caracteres, al menos 1 letra mayúscula y 1 número.';
    }

    return { esValido, claveInvalida };
};

function abrirModalCrearUsuario() {
    document.getElementById('formUsuario').reset();
    document.getElementById('id_usuario').value = '';
    document.getElementById('modalTitle').textContent = 'Nuevo Usuario';
    document.getElementById('clave_login').required = true;
    document.getElementById('clave_login').placeholder = 'Ej. Joselito123';

    const helpClave = document.getElementById('helpClave');
    helpClave.textContent = 'Políticas: Mínimo 8 caracteres, al menos 1 letra mayúscula y 1 número.';
    helpClave.style.display = 'block';

    // Crear siempre permite elegir el perfil (nunca es "uno mismo")
    document.getElementById('grupoPerfil').style.display = 'block';
    document.getElementById('id_perfil').disabled = false;
    document.getElementById('avisoPerfilPropio').style.display = 'none';

    const inputs = document.querySelectorAll('#formUsuario .form-control');
    inputs.forEach(input => input.classList.remove('is-invalid'));

    document.getElementById('modalUsuario').style.display = 'flex';
    window.validarBotonGuardarUsuario();
}

function cerrarModalUsuario() {
    document.getElementById('modalUsuario').style.display = 'none';

    const inputClave = document.getElementById('clave_login');
    inputClave.type = 'password';
    document.getElementById('btnTogglePasswordUsuario').querySelector('i').className = 'fas fa-eye';
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
    document.getElementById('clave_login').placeholder = 'Dejar en blanco para no cambiar';

    const helpClave = document.getElementById('helpClave');
    helpClave.textContent = 'Políticas: Mínimo 8 caracteres, al menos 1 letra mayúscula y 1 número.';
    helpClave.style.display = 'block';

    // Un usuario no puede cambiar su propio perfil (evita que se autodegrade/promueva)
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const esUsuarioPropio = parseInt(sessionData.id_usuario) === parseInt(data.id_usuario);
    document.getElementById('grupoPerfil').style.display = esUsuarioPropio ? 'none' : 'block';
    document.getElementById('avisoPerfilPropio').style.display = esUsuarioPropio ? 'block' : 'none';

    const inputs = document.querySelectorAll('#formUsuario .form-control');
    inputs.forEach(input => input.classList.remove('is-invalid'));

    document.getElementById('modalUsuario').style.display = 'flex';
    window.validarBotonGuardarUsuario();
};

async function guardarUsuario(e) {
    e.preventDefault();

    const status = window.validarBotonGuardarUsuario();
    if (!status.esValido) {
        let errorMsg = 'Revisa los campos marcados en rojo.';
        if (status.claveInvalida) {
            errorMsg = 'La contraseña no cumple con los requisitos mínimos de seguridad.';
        }
        Swal.fire({ icon: 'warning', title: 'Datos incompletos', text: errorMsg });
        return;
    }

    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const id = document.getElementById('id_usuario').value;

    const datos = {
        nombre: document.getElementById('nombre').value.trim(),
        usuario: document.getElementById('usuario_login').value.trim(),
        id_perfil: document.getElementById('id_perfil').value,
        clave: document.getElementById('clave_login').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `http://localhost:3000/api/usuarios/${id}` : 'http://localhost:3000/api/usuarios';

    const esEdicionPropia = id && parseInt(sessionData.id_usuario) === parseInt(id);

    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-user-profile': sessionData.id_perfil,
                'x-user-id': sessionData.id_usuario
            },
            body: JSON.stringify(datos)
        });
        const result = await response.json();

        if (response.ok && result.success) {
            cerrarModalUsuario();

            if (esEdicionPropia) {
                // Modificar la propia cuenta invalida los datos cacheados en sessionStorage
                // (nombre, usuario, contraseña), así que forzamos a re-loguearse.
                await Swal.fire({
                    icon: 'success',
                    title: 'Datos actualizados',
                    text: 'Por seguridad, debes iniciar sesión nuevamente.',
                    confirmButtonText: 'Ir al login'
                });
                sessionStorage.removeItem('usuario_joselito');
                window.location.href = '/login.html';
                return;
            }

            Swal.fire({ icon: 'success', title: 'Éxito', text: result.message, timer: 1500, showConfirmButton: false });
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
