// Caché para edición rápida sin peticiones extra
window.opcionesCache = [];

window.init_opciones = function () {
    console.log("Módulo Opciones inicializado");

    cargarTablaOpciones();

    // Eventos del modal
    document.getElementById('btnNuevaOpcion').addEventListener('click', abrirModalCrearOpcion);
    document.getElementById('btnCerrarModal').addEventListener('click', cerrarModalOpcion);
    document.getElementById('btnCancelarModal').addEventListener('click', cerrarModalOpcion);
    document.getElementById('formOpcion').addEventListener('submit', guardarOpcion);

    // Previsualización del ícono en tiempo real
    document.getElementById('icono_opcion').addEventListener('input', function (e) {
        const iconClass = e.target.value.trim() || 'fas fa-cube';
        document.getElementById('previewIcono').innerHTML = `<i class="${iconClass}"></i>`;
    });

    // Buscador en tiempo real
    document.getElementById('inputBuscarOpcion').addEventListener('keyup', function (e) {
        const texto = e.target.value.toLowerCase();
        const filas = document.querySelectorAll('#tbody-opciones tr');
        filas.forEach(fila => {
            fila.style.display = fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
        });
    });
};

async function cargarTablaOpciones() {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const tbody = document.getElementById('tbody-opciones');

    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:24px; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';

    try {
        const response = await fetch('http://localhost:3000/api/opciones', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();

        if (response.ok && result.success) {
            window.opcionesCache = result.data;
            poblarDatalistCategorias();

            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:24px; color: var(--text-muted);">No se encontraron opciones</td></tr>';
                return;
            }

            let filasHTML = '';
            result.data.forEach(op => {
                const badgeEstado = op.estado === 1
                    ? '<span class="badge-activo">Activo</span>'
                    : '<span class="badge-inactivo">Inactivo</span>';

                const iconToggle = op.estado === 1 ? 'fa-ban' : 'fa-check';
                const titleToggle = op.estado === 1 ? 'Desactivar' : 'Activar';

                filasHTML += `
                    <tr class="tabla-tr">
                        <td class="tabla-td tabla-id">${op.id_opcion}</td>
                        <td class="tabla-td" style="text-align: center;">
                            <i class="${op.icono}" style="color: var(--brand-blue); font-size: 18px;"></i>
                        </td>
                        <td class="tabla-td tabla-nombre">${op.nombre}</td>
                        <td class="tabla-td"><span class="tabla-mono">/${op.ruta}</span></td>
                        <td class="tabla-td">${op.categoria ? op.categoria : '<span style="color: var(--text-muted);">—</span>'}</td>
                        <td class="tabla-td tabla-mono">${op.orden}</td>
                        <td class="tabla-td">${badgeEstado}</td>
                        <td class="tabla-td">
                            <button class="btn-action btn-edit" onclick="abrirModalEditarOpcion(${op.id_opcion})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-toggle" onclick="cambiarEstadoOpcion(${op.id_opcion}, ${op.estado === 1 ? 0 : 1})" title="${titleToggle}">
                                <i class="fas ${iconToggle}"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="cambiarEstadoOpcion(${op.id_opcion}, 2)" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = filasHTML;
        } else {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color: #ef4444;">Error: ${result.message}</td></tr>`;
        }
    } catch (error) {
        console.error("Error al cargar opciones:", error);
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:24px; color: #ef4444;">Error de conexión con el servidor</td></tr>';
    }
}

function poblarDatalistCategorias() {
    const datalist = document.getElementById('listaCategorias');
    const categorias = [...new Set(
        window.opcionesCache
            .map(op => op.categoria)
            .filter(c => c && c.trim() !== '')
    )].sort();

    datalist.innerHTML = categorias.map(c => `<option value="${c}"></option>`).join('');
}

function abrirModalCrearOpcion() {
    document.getElementById('formOpcion').reset();
    document.getElementById('id_opcion').value = '';
    document.getElementById('modalTitle').textContent = 'Nueva Opción';
    document.getElementById('previewIcono').innerHTML = '<i class="fas fa-cube"></i>';
    document.getElementById('icono_opcion').value = 'fas fa-cube';
    document.getElementById('categoria_opcion').value = '';
    document.getElementById('orden_opcion').value = 0;
    document.getElementById('modalOpcion').style.display = 'flex';
}

function cerrarModalOpcion() {
    document.getElementById('modalOpcion').style.display = 'none';
}

window.abrirModalEditarOpcion = function (id) {
    const data = window.opcionesCache.find(op => op.id_opcion === id);
    if (!data) return;

    document.getElementById('id_opcion').value = data.id_opcion;
    document.getElementById('nombre_opcion').value = data.nombre;
    document.getElementById('ruta_opcion').value = data.ruta;
    document.getElementById('icono_opcion').value = data.icono;
    document.getElementById('previewIcono').innerHTML = `<i class="${data.icono}"></i>`;
    document.getElementById('categoria_opcion').value = data.categoria || '';
    document.getElementById('orden_opcion').value = data.orden ?? 0;

    document.getElementById('modalTitle').textContent = 'Editar Opción';
    document.getElementById('modalOpcion').style.display = 'flex';
};

async function guardarOpcion(e) {
    e.preventDefault();
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const id = document.getElementById('id_opcion').value;

    const datos = {
        nombre: document.getElementById('nombre_opcion').value,
        ruta: document.getElementById('ruta_opcion').value,
        icono: document.getElementById('icono_opcion').value,
        categoria: document.getElementById('categoria_opcion').value,
        orden: parseInt(document.getElementById('orden_opcion').value, 10) || 0
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `http://localhost:3000/api/opciones/${id}` : 'http://localhost:3000/api/opciones';

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
            cerrarModalOpcion();
            cargarTablaOpciones();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
}

window.cambiarEstadoOpcion = async function (id, estado) {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');

    const titulo = estado === 2 ? '¿Eliminar opción?' : (estado === 1 ? '¿Activar opción?' : '¿Desactivar opción?');
    const texto = estado === 2
        ? 'La opción se eliminará del menú de todos los usuarios lógicamente.'
        : 'Cambiarás la disponibilidad de esta opción para todo el sistema.';

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
            const response = await fetch(`http://localhost:3000/api/opciones/${id}/estado`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-profile': sessionData.id_perfil
                },
                body: JSON.stringify({ estado })
            });
            const result = await response.json();

            if (response.ok && result.success) {
                Swal.fire({ icon: 'success', title: 'Éxito', text: result.message, timer: 1500, showConfirmButton: false });
                cargarTablaOpciones();
            } else {
                Swal.fire({ icon: 'error', title: 'Acción Denegada', text: result.message });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
        }
    }
};
