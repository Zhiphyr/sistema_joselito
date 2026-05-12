// Caché para edición rápida y el modal de permisos
window.perfilesCache = [];
let todasLasOpciones = [];

window.init_perfiles = function () {
    console.log("Módulo Perfiles inicializado (Vanilla JS)");

    cargarTablaPerfiles();
    cargarOpcionesSistema();

    // Eventos Modal 1 (Datos)
    document.getElementById('btnNuevoPerfil').addEventListener('click', abrirModalCrearPerfil);
    document.getElementById('btnCerrarModal').addEventListener('click', cerrarModalPerfil);
    document.getElementById('btnCancelarModal').addEventListener('click', cerrarModalPerfil);
    document.getElementById('formPerfil').addEventListener('submit', guardarPerfil);

    // Eventos Modal 2 (Permisos)
    document.getElementById('btnCerrarModalPermisos').addEventListener('click', cerrarModalPermisos);
    document.getElementById('btnCancelarModalPermisos').addEventListener('click', cerrarModalPermisos);
    document.getElementById('formPermisos').addEventListener('submit', guardarPermisos);

    // Buscador en tiempo real
    document.getElementById('inputBuscarPerfil').addEventListener('keyup', function (e) {
        const texto = e.target.value.toLowerCase();
        const filas = document.querySelectorAll('#tbody-perfiles tr');
        filas.forEach(fila => {
            fila.style.display = fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
        });
    });
};

// -------------------------
// TABLA PRINCIPAL
// -------------------------

async function cargarTablaPerfiles() {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const tbody = document.getElementById('tbody-perfiles');

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:24px; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';

    try {
        const response = await fetch('http://localhost:3000/api/perfiles', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();

        if (response.ok && result.success) {
            window.perfilesCache = result.data;

            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:24px; color: var(--text-muted);">No se encontraron perfiles</td></tr>';
                return;
            }

            const isDeveloper = sessionData.id_perfil === 1;
            let filasHTML = '';

            result.data.forEach(p => {
                const badgeEstado = p.estado === 1
                    ? '<span class="badge-activo">Activo</span>'
                    : '<span class="badge-inactivo">Inactivo</span>';

                const iconToggle = p.estado === 1 ? 'fa-ban' : 'fa-check';
                const titleToggle = p.estado === 1 ? 'Desactivar' : 'Activar';
                const descripcion = p.descripcion
                    ? p.descripcion
                    : '<span style="color:#aaa; font-style:italic;">Sin descripción</span>';

                // Proteger perfil Administrador (id 2) si no es Developer
                const isProtectedAdmin = p.id_perfil === 2 && !isDeveloper;

                let acciones = '';
                if (isProtectedAdmin) {
                    acciones = '<span style="font-size: 11px; color: var(--text-muted); font-weight: 500;">Protegido</span>';
                } else {
                    acciones = `
                        <button class="btn-action btn-edit" onclick="abrirModalEditarPerfil(${p.id_perfil})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action" style="color: #6366f1;" onclick="abrirModalPermisos(${p.id_perfil}, '${p.nombre}')" title="Permisos">
                            <i class="fas fa-shield-alt"></i>
                        </button>
                        <button class="btn-action btn-toggle" onclick="cambiarEstadoPerfil(${p.id_perfil}, ${p.estado === 1 ? 0 : 1})" title="${titleToggle}">
                            <i class="fas ${iconToggle}"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="cambiarEstadoPerfil(${p.id_perfil}, 2)" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                }

                filasHTML += `
                    <tr class="tabla-tr">
                        <td class="tabla-td tabla-id">${p.id_perfil}</td>
                        <td class="tabla-td tabla-nombre">${p.nombre}</td>
                        <td class="tabla-td tabla-secundario">${descripcion}</td>
                        <td class="tabla-td">${badgeEstado}</td>
                        <td class="tabla-td">${acciones}</td>
                    </tr>
                `;
            });

            tbody.innerHTML = filasHTML;
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color: #ef4444;">Error: ${result.message}</td></tr>`;
        }
    } catch (error) {
        console.error("Error al cargar perfiles:", error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:24px; color: #ef4444;">Error de conexión con el servidor</td></tr>';
    }
}

// -------------------------
// CRUD PERFILES (Modal 1)
// -------------------------

function abrirModalCrearPerfil() {
    document.getElementById('formPerfil').reset();
    document.getElementById('id_perfil').value = '';
    document.getElementById('modalTitle').textContent = 'Nuevo Perfil';
    document.getElementById('modalPerfil').style.display = 'flex';
}

function cerrarModalPerfil() {
    document.getElementById('modalPerfil').style.display = 'none';
}

window.abrirModalEditarPerfil = function (id) {
    const data = window.perfilesCache.find(p => p.id_perfil === id);
    if (!data) return;

    document.getElementById('id_perfil').value = data.id_perfil;
    document.getElementById('nombre_perfil').value = data.nombre;
    document.getElementById('descripcion_perfil').value = data.descripcion || '';

    document.getElementById('modalTitle').textContent = 'Editar Perfil';
    document.getElementById('modalPerfil').style.display = 'flex';
};

async function guardarPerfil(e) {
    e.preventDefault();
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const id = document.getElementById('id_perfil').value;

    const datos = {
        nombre: document.getElementById('nombre_perfil').value,
        descripcion: document.getElementById('descripcion_perfil').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `http://localhost:3000/api/perfiles/${id}` : 'http://localhost:3000/api/perfiles';

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
            cerrarModalPerfil();
            cargarTablaPerfiles();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
}

window.cambiarEstadoPerfil = async function (id, estado) {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');

    const titulo = estado === 2 ? '¿Eliminar perfil?' : (estado === 1 ? '¿Activar perfil?' : '¿Desactivar perfil?');
    const texto = estado === 2 ? 'Esta acción es irreversible y fallará si hay usuarios usando este perfil.' : 'Cambiarás la disponibilidad de este perfil.';

    const confirm = await Swal.fire({
        title: titulo,
        text: texto,
        icon: estado === 2 ? 'warning' : 'info',
        showCancelButton: true,
        confirmButtonColor: estado === 2 ? '#ef4444' : '#0f4c81',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
        try {
            const response = await fetch(`http://localhost:3000/api/perfiles/${id}/estado`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-user-profile': sessionData.id_perfil },
                body: JSON.stringify({ estado })
            });
            const result = await response.json();

            if (response.ok && result.success) {
                Swal.fire({ icon: 'success', title: 'Éxito', text: result.message, timer: 1500, showConfirmButton: false });
                cargarTablaPerfiles();
            } else {
                Swal.fire({ icon: 'error', title: 'Acción Denegada', text: result.message });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
        }
    }
};

// -------------------------
// PERMISOS RBAC (Modal 2)
// -------------------------

async function cargarOpcionesSistema() {
    try {
        const response = await fetch('http://localhost:3000/api/perfiles/opciones');
        const result = await response.json();
        if (result.success) todasLasOpciones = result.data;
    } catch (error) {
        console.error("Error al cargar opciones maestras", error);
    }
}

function cerrarModalPermisos() {
    document.getElementById('modalPermisos').style.display = 'none';
}

window.abrirModalPermisos = async function (id_perfil, nombre) {
    document.getElementById('id_perfil_permisos').value = id_perfil;
    document.getElementById('nombrePerfilPermisos').textContent = nombre;

    const contenedor = document.getElementById('contenedorOpciones');
    contenedor.innerHTML = '<div style="text-align: center; color: var(--text-muted); grid-column: 1 / -1;"><i class="fas fa-spinner fa-spin"></i> Cargando accesos...</div>';

    document.getElementById('modalPermisos').style.display = 'flex';

    try {
        const response = await fetch(`http://localhost:3000/api/perfiles/${id_perfil}/permisos`);
        const result = await response.json();

        let opcionesAsignadas = [];
        if (result.success) opcionesAsignadas = result.data;

        contenedor.innerHTML = '';
        todasLasOpciones.forEach(op => {
            const isChecked = opcionesAsignadas.includes(op.id_opcion);

            const label = document.createElement('label');
            label.className = `opcion-card ${isChecked ? 'checked' : ''}`;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = op.id_opcion;
            checkbox.checked = isChecked;
            checkbox.className = 'permiso-checkbox';

            checkbox.addEventListener('change', function () {
                if (this.checked) label.classList.add('checked');
                else label.classList.remove('checked');
            });

            const info = document.createElement('div');
            info.className = 'opcion-info';

            const title = document.createElement('span');
            title.innerHTML = `<i class="${op.icono}" style="color: var(--brand-blue); margin-right: 6px;"></i> ${op.nombre}`;

            const route = document.createElement('small');
            route.textContent = `Ruta: /${op.ruta}`;

            info.appendChild(title);
            info.appendChild(route);
            label.appendChild(checkbox);
            label.appendChild(info);
            contenedor.appendChild(label);
        });
    } catch (error) {
        contenedor.innerHTML = '<div style="color: #ef4444; grid-column: 1 / -1;">Error al cargar permisos.</div>';
    }
};

async function guardarPermisos(e) {
    e.preventDefault();
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const id_perfil = document.getElementById('id_perfil_permisos').value;

    const checkboxes = document.querySelectorAll('.permiso-checkbox:checked');
    const opcionesSeleccionadas = Array.from(checkboxes).map(cb => parseInt(cb.value));

    try {
        const response = await fetch(`http://localhost:3000/api/perfiles/${id_perfil}/permisos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-profile': sessionData.id_perfil
            },
            body: JSON.stringify({ opciones: opcionesSeleccionadas })
        });
        const result = await response.json();

        if (response.ok && result.success) {
            Swal.fire({ icon: 'success', title: 'Permisos Actualizados', text: result.message, timer: 1500, showConfirmButton: false });
            cerrarModalPermisos();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
}
