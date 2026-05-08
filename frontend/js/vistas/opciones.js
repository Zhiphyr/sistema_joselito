let tablaOpciones;

window.init_opciones = function() {
    inicializarTablaOpciones();

    // Eventos
    document.getElementById('btnNuevaOpcion').addEventListener('click', abrirModalCrearOpcion);
    document.getElementById('btnCerrarModal').addEventListener('click', cerrarModalOpcion);
    document.getElementById('btnCancelarModal').addEventListener('click', cerrarModalOpcion);
    document.getElementById('formOpcion').addEventListener('submit', guardarOpcion);

    // Previsualización del ícono en tiempo real
    document.getElementById('icono_opcion').addEventListener('input', function(e) {
        const iconClass = e.target.value.trim() || 'fas fa-cube';
        document.getElementById('previewIcono').innerHTML = `<i class="${iconClass}"></i>`;
    });
};

function inicializarTablaOpciones() {
    if ($.fn.DataTable.isDataTable('#tablaOpciones')) {
        $('#tablaOpciones').DataTable().destroy();
    }

    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');

    tablaOpciones = $('#tablaOpciones').DataTable({
        ajax: {
            url: 'http://localhost:3000/api/opciones',
            headers: {
                'x-user-profile': sessionData.id_perfil
            },
            dataSrc: 'data'
        },
        columns: [
            { data: 'id_opcion' },
            { 
                data: 'icono',
                render: function(data) {
                    return `<i class="${data}" style="color: var(--brand-blue); font-size: 16px;"></i>`;
                },
                className: 'dt-center'
            },
            { data: 'nombre' },
            { 
                data: 'ruta',
                render: function(data) {
                    return `<span style="font-family: monospace; color: var(--text-secondary); background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">/${data}</span>`;
                }
            },
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
                    const iconToggle = row.estado === 1 ? 'fa-ban' : 'fa-check';
                    const titleToggle = row.estado === 1 ? 'Desactivar' : 'Activar';
                    
                    return `
                        <button class="btn-action btn-edit" onclick="abrirModalEditarOpcion(${row.id_opcion})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-toggle" onclick="cambiarEstadoOpcion(${row.id_opcion}, ${row.estado === 1 ? 0 : 1})" title="${titleToggle}">
                            <i class="fas ${iconToggle}"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="cambiarEstadoOpcion(${row.id_opcion}, 2)" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                }
            }
        ],
        language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json' }
    });
}

function abrirModalCrearOpcion() {
    document.getElementById('formOpcion').reset();
    document.getElementById('id_opcion').value = '';
    document.getElementById('modalTitle').textContent = 'Nueva Opción';
    document.getElementById('previewIcono').innerHTML = `<i class="fas fa-cube"></i>`;
    document.getElementById('icono_opcion').value = 'fas fa-cube';
    document.getElementById('modalOpcion').style.display = 'flex';
}

function cerrarModalOpcion() {
    document.getElementById('modalOpcion').style.display = 'none';
}

window.abrirModalEditarOpcion = function(id) {
    const data = tablaOpciones.rows().data().toArray().find(o => o.id_opcion === id);
    if (!data) return;

    document.getElementById('id_opcion').value = data.id_opcion;
    document.getElementById('nombre_opcion').value = data.nombre;
    document.getElementById('ruta_opcion').value = data.ruta;
    document.getElementById('icono_opcion').value = data.icono;
    document.getElementById('previewIcono').innerHTML = `<i class="${data.icono}"></i>`;
    
    document.getElementById('modalTitle').textContent = 'Editar Opción';
    document.getElementById('modalOpcion').style.display = 'flex';
};

async function guardarOpcion(e) {
    e.preventDefault();
    
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito'));
    const id = document.getElementById('id_opcion').value;
    
    const datos = {
        nombre: document.getElementById('nombre_opcion').value,
        ruta: document.getElementById('ruta_opcion').value,
        icono: document.getElementById('icono_opcion').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `http://localhost:3000/api/opciones/${id}` : 'http://localhost:3000/api/opciones';

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
            cerrarModalOpcion();
            tablaOpciones.ajax.reload(null, false);
            
            // Sugerir recargar si se modificó algo que el usuario está viendo (Opcional, pero bueno para UX)
            if (id == 1 || sessionData.id_perfil == 2) {
                // Notificación sutil para no molestar mucho
            }
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
}

window.cambiarEstadoOpcion = async function(id, estado) {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito'));
    
    let titulo = estado === 2 ? '¿Eliminar opción?' : (estado === 1 ? '¿Activar opción?' : '¿Desactivar opción?');
    let texto = estado === 2 ? 'La opción se eliminará del menú de todos los usuarios lógicamente.' : 'Cambiarás la disponibilidad de esta opción para todo el sistema.';
    
    const confirm = await Swal.fire({
        title: titulo, text: texto, icon: estado === 2 ? 'warning' : 'info',
        showCancelButton: true,
        confirmButtonColor: estado === 2 ? '#ef4444' : '#0f4c81',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, continuar'
    });

    if (confirm.isConfirmed) {
        try {
            const response = await fetch(`http://localhost:3000/api/opciones/${id}/estado`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-user-profile': sessionData.id_perfil },
                body: JSON.stringify({ estado })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                Swal.fire({ icon: 'success', title: 'Éxito', text: result.message, timer: 1500, showConfirmButton: false });
                tablaOpciones.ajax.reload(null, false);
            } else {
                Swal.fire({ icon: 'error', title: 'Acción Denegada', text: result.message });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
        }
    }
}
