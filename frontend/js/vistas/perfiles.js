let tablaPerfiles;
let todasLasOpciones = []; // Caché de opciones del sistema

window.init_perfiles = function() {
    inicializarTablaPerfiles();
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
};

function inicializarTablaPerfiles() {
    if ($.fn.DataTable.isDataTable('#tablaPerfiles')) {
        $('#tablaPerfiles').DataTable().destroy();
    }

    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');

    tablaPerfiles = $('#tablaPerfiles').DataTable({
        ajax: {
            url: 'http://localhost:3000/api/perfiles',
            dataSrc: 'data'
        },
        columns: [
            { data: 'id_perfil' },
            { data: 'nombre' },
            { data: 'descripcion' },
            { 
                data: 'estado',
                render: function(data) {
                    if (data === 1) return '<span class="badge-activo">Activo</span>';
                    return '<span class="badge-inactivo">Inactivo</span>';
                }
            },
            {
                data: null,
                render: function(data, type, row) {
                    // Si es el ID 2, deshabilitamos acciones destructivas SOLO si el usuario logueado NO es el Developer (1)
                    const isDeveloper = sessionData.id_perfil === 1;
                    const isProtectedAdmin = row.id_perfil === 2 && !isDeveloper;
                    const iconToggle = row.estado === 1 ? 'fa-ban' : 'fa-check';
                    const titleToggle = row.estado === 1 ? 'Desactivar' : 'Activar';
                    
                    let actions = '';

                    if (isProtectedAdmin) {
                        actions = `<span style="font-size: 11px; color: var(--text-muted); font-weight: 500;">Protegido</span>`;
                    } else {
                        actions = `
                            <button class="btn-action btn-edit" onclick="abrirModalEditarPerfil(${row.id_perfil})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action" style="color: #6366f1;" onclick="abrirModalPermisos(${row.id_perfil}, '${row.nombre}')" title="Permisos">
                                <i class="fas fa-shield-alt"></i>
                            </button>
                            <button class="btn-action btn-toggle" onclick="cambiarEstadoPerfil(${row.id_perfil}, ${row.estado === 1 ? 0 : 1})" title="${titleToggle}">
                                <i class="fas ${iconToggle}"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="cambiarEstadoPerfil(${row.id_perfil}, 2)" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        `;
                    }

                    return actions;
                }
            }
        ],
        language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json' }
    });
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

window.abrirModalEditarPerfil = function(id) {
    const data = tablaPerfiles.rows().data().toArray().find(p => p.id_perfil === id);
    if (!data) return;

    document.getElementById('id_perfil').value = data.id_perfil;
    document.getElementById('nombre_perfil').value = data.nombre;
    document.getElementById('descripcion_perfil').value = data.descripcion || '';
    
    document.getElementById('modalTitle').textContent = 'Editar Perfil';
    document.getElementById('modalPerfil').style.display = 'flex';
};

async function guardarPerfil(e) {
    e.preventDefault();
    
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito'));
    const id = document.getElementById('id_perfil').value;
    
    const datos = {
        nombre: document.getElementById('nombre_perfil').value,
        descripcion: document.getElementById('descripcion_perfil').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `http://localhost:3000/api/perfiles/${id}` : 'http://localhost:3000/api/perfiles';

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
            Swal.fire({ icon: 'success', title: 'Éxito', text: result.message, timer: 1500, showConfirmButton: false });
            cerrarModalPerfil();
            tablaPerfiles.ajax.reload(null, false);
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
}

window.cambiarEstadoPerfil = async function(id, estado) {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito'));
    
    let titulo = estado === 2 ? '¿Eliminar perfil?' : (estado === 1 ? '¿Activar perfil?' : '¿Desactivar perfil?');
    let texto = estado === 2 ? 'Esta acción es irreversible y fallará si hay usuarios usando este perfil.' : 'Cambiarás la disponibilidad de este perfil.';
    
    const confirm = await Swal.fire({
        title: titulo, text: texto, icon: estado === 2 ? 'warning' : 'info',
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
                tablaPerfiles.ajax.reload(null, false);
            } else {
                Swal.fire({ icon: 'error', title: 'Acción Denegada', text: result.message });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
        }
    }
}

// -------------------------
// PERMISOS RBAC (Modal 2)
// -------------------------

async function cargarOpcionesSistema() {
    try {
        const response = await fetch('http://localhost:3000/api/perfiles/opciones');
        const result = await response.json();
        if (result.success) {
            todasLasOpciones = result.data;
        }
    } catch (error) {
        console.error("Error al cargar opciones maestras", error);
    }
}

function cerrarModalPermisos() {
    document.getElementById('modalPermisos').style.display = 'none';
}

window.abrirModalPermisos = async function(id_perfil, nombre) {
    document.getElementById('id_perfil_permisos').value = id_perfil;
    document.getElementById('nombrePerfilPermisos').textContent = nombre;
    
    const contenedor = document.getElementById('contenedorOpciones');
    contenedor.innerHTML = '<div style="text-align: center; color: var(--text-muted); grid-column: 1 / -1;"><i class="fas fa-spinner fa-spin"></i> Cargando accesos...</div>';
    
    document.getElementById('modalPermisos').style.display = 'flex';

    try {
        const response = await fetch(`http://localhost:3000/api/perfiles/${id_perfil}/permisos`);
        const result = await response.json();
        
        let opcionesAsignadas = [];
        if (result.success) opcionesAsignadas = result.data; // Array de IDs

        // Renderizar checkboxes
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
            
            checkbox.addEventListener('change', function() {
                if(this.checked) label.classList.add('checked');
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
}

async function guardarPermisos(e) {
    e.preventDefault();
    
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito'));
    const id_perfil = document.getElementById('id_perfil_permisos').value;
    
    // Recopilar IDs seleccionados
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
