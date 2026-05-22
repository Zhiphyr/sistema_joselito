// Caché para edición rápida
window.rutasCache = [];

window.init_rutas = function () {
    console.log("Módulo Rutas inicializado");

    cargarTablaRutas();

    document.getElementById('btnNuevaRuta').addEventListener('click', abrirModalCrearRuta);
    document.getElementById('btnCerrarModalRuta').addEventListener('click', cerrarModalRuta);
    document.getElementById('btnCancelarModalRuta').addEventListener('click', cerrarModalRuta);
    document.getElementById('formRuta').addEventListener('submit', guardarRuta);

    // Buscador en tiempo real
    document.getElementById('inputBuscarRuta').addEventListener('keyup', function (e) {
        const texto = e.target.value.toLowerCase();
        const filas = document.querySelectorAll('#tbody-rutas tr');
        filas.forEach(fila => {
            fila.style.display = fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
        });
    });
};

async function cargarTablaRutas() {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const tbody = document.getElementById('tbody-rutas');

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:32px; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';

    try {
        const response = await fetch('http://localhost:3000/api/rutas', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();

        if (response.ok && result.success) {
            window.rutasCache = result.data;

            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:32px; color: var(--text-muted);">No se encontraron rutas registradas</td></tr>';
                return;
            }

            let filasHTML = '';
            result.data.forEach(r => {
                const badgeEstado = r.estado === 1
                    ? '<span class="badge-activo">Activo</span>'
                    : '<span class="badge-inactivo">Inactivo</span>';

                const iconToggle = r.estado === 1 ? 'fa-ban' : 'fa-check';
                const titleToggle = r.estado === 1 ? 'Desactivar' : 'Activar';

                const trayectoUI = `
                    <div style="display: flex; align-items: center; gap: 8px; font-weight: 600;">
                        <span>${r.ciudad_origen}</span>
                        <i class="fas fa-long-arrow-alt-right" style="color: var(--brand-blue); opacity: 0.7;"></i>
                        <span>${r.ciudad_destino}</span>
                    </div>
                `;

                filasHTML += `
                    <tr class="tabla-tr">
                        <td class="tabla-td tabla-id">${r.id_ruta}</td>
                        <td class="tabla-td">${trayectoUI}</td>
                        <td class="tabla-td tabla-secundario">${r.descripcion || '<span style="color:#cbd5e1;font-style:italic;">Sin descripción</span>'}</td>
                        <td class="tabla-td">${badgeEstado}</td>
                        <td class="tabla-td">
                            <button class="btn-action btn-edit" onclick="abrirModalEditarRuta(${r.id_ruta})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-toggle" onclick="cambiarEstadoRuta(${r.id_ruta}, ${r.estado === 1 ? 0 : 1})" title="${titleToggle}">
                                <i class="fas ${iconToggle}"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="cambiarEstadoRuta(${r.id_ruta}, 2)" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = filasHTML;

        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:32px; color: #ef4444;">Error: ${result.message}</td></tr>`;
        }
    } catch (error) {
        console.error("Error al cargar rutas:", error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:32px; color: #ef4444;">Error de conexión con el servidor</td></tr>';
    }
}

function abrirModalCrearRuta() {
    document.getElementById('formRuta').reset();
    document.getElementById('id_ruta').value = '';
    document.getElementById('modalTitleRuta').textContent = 'Nueva Ruta';

    // Desbloquear campos de origen y destino
    const origenInput = document.getElementById('ciudad_origen_ruta');
    const destinoInput = document.getElementById('ciudad_destino_ruta');
    
    [origenInput, destinoInput].forEach(el => {
        el.readOnly = false;
        el.style.backgroundColor = '';
        el.style.cursor = '';
    });

    document.getElementById('modalRuta').style.display = 'flex';
}

function cerrarModalRuta() {
    document.getElementById('modalRuta').style.display = 'none';
}

window.abrirModalEditarRuta = function (id) {
    const data = window.rutasCache.find(r => r.id_ruta === id);
    if (!data) return;

    document.getElementById('id_ruta').value = data.id_ruta;
    document.getElementById('ciudad_origen_ruta').value = data.ciudad_origen;
    document.getElementById('ciudad_destino_ruta').value = data.ciudad_destino;
    document.getElementById('descripcion_ruta').value = data.descripcion || '';

    // Bloquear campos de origen y destino por regla de negocio
    const origenInput = document.getElementById('ciudad_origen_ruta');
    const destinoInput = document.getElementById('ciudad_destino_ruta');
    
    [origenInput, destinoInput].forEach(el => {
        el.readOnly = true;
        el.style.backgroundColor = '#f1f5f9';
        el.style.cursor = 'not-allowed';
    });

    document.getElementById('modalTitleRuta').textContent = 'Editar Ruta';
    document.getElementById('modalRuta').style.display = 'flex';
};

async function guardarRuta(e) {
    e.preventDefault();

    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const id = document.getElementById('id_ruta').value;

    const datos = {
        ciudad_origen: document.getElementById('ciudad_origen_ruta').value.trim(),
        ciudad_destino: document.getElementById('ciudad_destino_ruta').value.trim(),
        descripcion: document.getElementById('descripcion_ruta').value.trim()
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `http://localhost:3000/api/rutas/${id}` : 'http://localhost:3000/api/rutas';

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

        // Lógica de Reactivación
        if (response.status === 409 && result.status === 'deleted_exists') {
            const confirmacion = await Swal.fire({
                title: 'Ruta eliminada encontrada',
                html: `El trayecto de <strong>${datos.ciudad_origen}</strong> a <strong>${datos.ciudad_destino}</strong> fue eliminado anteriormente.<br>¿Deseas reactivarlo y actualizar su descripción?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#0f4c81',
                cancelButtonColor: '#64748b',
                confirmButtonText: '<i class="fas fa-redo"></i> Sí, reactivar',
                cancelButtonText: 'Cancelar'
            });

            if (confirmacion.isConfirmed) {
                await reactivarRuta(result.id_ruta, datos);
            }
            return;
        }

        if (response.ok && result.success) {
            Swal.fire({ icon: 'success', title: 'Éxito', text: result.message, timer: 1500, showConfirmButton: false });
            cerrarModalRuta();
            cargarTablaRutas();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message });
        }

    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
}

async function reactivarRuta(id, datos) {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');

    try {
        const response = await fetch(`http://localhost:3000/api/rutas/${id}/reactivar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-user-profile': sessionData.id_perfil
            },
            body: JSON.stringify({ descripcion: datos.descripcion })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            Swal.fire({ icon: 'success', title: '¡Reactivada!', text: result.message, timer: 1500, showConfirmButton: false });
            cerrarModalRuta();
            cargarTablaRutas();
        } else {
            Swal.fire({ icon: 'error', title: 'Error al reactivar', text: result.message });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión al intentar reactivar.' });
    }
}

window.cambiarEstadoRuta = async function (id, estado) {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');

    const titulo = estado === 2 ? '¿Eliminar ruta?' : (estado === 1 ? '¿Activar ruta?' : '¿Desactivar ruta?');
    const texto = estado === 2 ? 'Esta acción es un borrado lógico. Podrás reactivarla si registras el mismo trayecto.' : 'Cambiarás el estado de operación de la ruta.';

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

    if (!confirm.isConfirmed) return;

    try {
        const response = await fetch(`http://localhost:3000/api/rutas/${id}/estado`, {
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
            cargarTablaRutas();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
};
