// Caché para edición rápida sin peticiones extra
window.camionesCache = [];

window.init_camiones = function () {
    console.log("Módulo Camiones inicializado");

    cargarTablaCamiones();

    document.getElementById('btnNuevoCamion').addEventListener('click', abrirModalCrearCamion);
    document.getElementById('btnCerrarModalCamion').addEventListener('click', cerrarModalCamion);
    document.getElementById('btnCancelarModalCamion').addEventListener('click', cerrarModalCamion);
    document.getElementById('formCamion').addEventListener('submit', guardarCamion);
    document.getElementById('btnBuscarDocCamion').addEventListener('click', buscarDocumentoConductorCamion);

    // Forzar placa en mayúsculas mientras el usuario escribe
    document.getElementById('placa_camion').addEventListener('input', function () {
        this.value = this.value.toUpperCase();
    });

    // Buscador en tiempo real
    document.getElementById('inputBuscarCamion').addEventListener('keyup', function (e) {
        const texto = e.target.value.toLowerCase();
        const filas = document.querySelectorAll('#tbody-camiones tr');
        filas.forEach(fila => {
            fila.style.display = fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
        });
    });
};

async function cargarTablaCamiones() {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const tbody = document.getElementById('tbody-camiones');

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:32px; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';

    try {
        const response = await fetch('http://localhost:3000/api/camiones', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();

        if (response.ok && result.success) {
            window.camionesCache = result.data;

            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:32px; color: var(--text-muted);">No se encontraron camiones registrados</td></tr>';
                return;
            }

            let filasHTML = '';
            result.data.forEach(c => {
                const badgeEstado = c.estado === 1
                    ? '<span class="badge-activo">Activo</span>'
                    : '<span class="badge-inactivo">Inactivo</span>';

                const iconToggle = c.estado === 1 ? 'fa-ban' : 'fa-check';
                const titleToggle = c.estado === 1 ? 'Desactivar' : 'Activar';

                filasHTML += `
                    <tr class="tabla-tr">
                        <td class="tabla-td tabla-id">${c.id_camion}</td>
                        <td class="tabla-td tabla-nombre">${c.nombre}</td>
                        <td class="tabla-td">
                            <span class="tabla-mono">${c.placa}</span>
                        </td>
                        <td class="tabla-td tabla-secundario">
                            <div style="font-weight: 600; color: var(--text-primary);">${c.conductor}</div>
                            <small>${c.tipo_documento}: ${c.numero_documento}</small>
                        </td>
                        <td class="tabla-td">${badgeEstado}</td>
                        <td class="tabla-td">
                            <button class="btn-action btn-edit" onclick="abrirModalEditarCamion(${c.id_camion})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-toggle" onclick="cambiarEstadoCamion(${c.id_camion}, ${c.estado === 1 ? 0 : 1})" title="${titleToggle}">
                                <i class="fas ${iconToggle}"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="cambiarEstadoCamion(${c.id_camion}, 2)" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = filasHTML;

        } else {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color: #ef4444;">Error: ${result.message}</td></tr>`;
        }
    } catch (error) {
        console.error("Error al cargar camiones:", error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:32px; color: #ef4444;">Error de conexión con el servidor</td></tr>';
    }
}

function abrirModalCrearCamion() {
    document.getElementById('formCamion').reset();
    document.getElementById('id_camion').value = '';
    document.getElementById('modalTitleCamion').textContent = 'Nuevo Camión';

    // Al crear: placa editable
    const placaInput = document.getElementById('placa_camion');
    placaInput.readOnly = false;
    placaInput.style.backgroundColor = '';
    placaInput.style.cursor = '';

    document.getElementById('modalCamion').style.display = 'flex';
}

function cerrarModalCamion() {
    document.getElementById('modalCamion').style.display = 'none';
}

window.abrirModalEditarCamion = function (id) {
    const data = window.camionesCache.find(c => c.id_camion === id);
    if (!data) return;

    document.getElementById('id_camion').value = data.id_camion;
    document.getElementById('nombre_camion').value = data.nombre;
    document.getElementById('placa_camion').value = data.placa;
    document.getElementById('tipo_documento_camion').value = data.tipo_documento;
    document.getElementById('numero_documento_camion').value = data.numero_documento;
    document.getElementById('conductor_camion').value = data.conductor;
    document.getElementById('telefono_camion').value = data.telefono;

    // En edición: placa inmutable
    const placaInput = document.getElementById('placa_camion');
    placaInput.readOnly = true;
    placaInput.style.backgroundColor = '#f1f5f9';
    placaInput.style.cursor = 'not-allowed';

    document.getElementById('modalTitleCamion').textContent = 'Editar Camión';
    document.getElementById('modalCamion').style.display = 'flex';
};

async function guardarCamion(e) {
    e.preventDefault();

    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const id = document.getElementById('id_camion').value;

    const datos = {
        nombre: document.getElementById('nombre_camion').value.trim(),
        placa: document.getElementById('placa_camion').value.trim().toUpperCase(),
        tipo_documento: document.getElementById('tipo_documento_camion').value,
        numero_documento: document.getElementById('numero_documento_camion').value.trim(),
        conductor: document.getElementById('conductor_camion').value.trim(),
        telefono: document.getElementById('telefono_camion').value.trim()
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `http://localhost:3000/api/camiones/${id}` : 'http://localhost:3000/api/camiones';

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

        // Lógica de Reactivación: el backend indica que la placa existe pero fue eliminada
        if (response.status === 409 && result.status === 'deleted_exists') {
            const confirmacion = await Swal.fire({
                title: 'Camión eliminado encontrado',
                html: `Un camión con la placa <strong>${datos.placa}</strong> fue eliminado anteriormente.<br>¿Deseas reactivarlo y actualizar sus datos?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#0f4c81',
                cancelButtonColor: '#64748b',
                confirmButtonText: '<i class="fas fa-redo"></i> Sí, reactivar',
                cancelButtonText: 'Cancelar'
            });

            if (confirmacion.isConfirmed) {
                await reactivarCamion(result.id_camion, datos);
            }
            return;
        }

        if (response.ok && result.success) {
            Swal.fire({ icon: 'success', title: 'Éxito', text: result.message, timer: 1500, showConfirmButton: false });
            cerrarModalCamion();
            cargarTablaCamiones();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message });
        }

    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
}

async function reactivarCamion(id, datos) {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');

    try {
        const response = await fetch(`http://localhost:3000/api/camiones/${id}/reactivar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-user-profile': sessionData.id_perfil
            },
            body: JSON.stringify({ 
                nombre: datos.nombre, 
                tipo_documento: datos.tipo_documento,
                numero_documento: datos.numero_documento,
                conductor: datos.conductor,
                telefono: datos.telefono 
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            Swal.fire({ icon: 'success', title: '¡Reactivado!', text: result.message, timer: 1500, showConfirmButton: false });
            cerrarModalCamion();
            cargarTablaCamiones();
        } else {
            Swal.fire({ icon: 'error', title: 'Error al reactivar', text: result.message });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión al intentar reactivar.' });
    }
}

window.cambiarEstadoCamion = async function (id, estado) {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');

    const titulo = estado === 2 ? '¿Eliminar camión?' : (estado === 1 ? '¿Activar camión?' : '¿Desactivar camión?');
    const texto = estado === 2 ? 'Esta acción es un borrado lógico. Podrás reactivarlo si registras la misma placa.' : 'Cambiarás el estado operativo del camión.';

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
        const response = await fetch(`http://localhost:3000/api/camiones/${id}/estado`, {
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
            cargarTablaCamiones();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
};

async function buscarDocumentoConductorCamion() {
    const tipo = document.getElementById('tipo_documento_camion').value;
    const numero = document.getElementById('numero_documento_camion').value.trim();
    const btn = document.getElementById('btnBuscarDocCamion');
    const icon = btn.querySelector('i');

    if (!numero) {
        Swal.fire({ icon: 'warning', title: 'Atención', text: 'Ingrese un número de documento' });
        return;
    }

    btn.disabled = true;
    icon.className = 'fas fa-spinner fa-spin';

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch(`http://localhost:3000/api/camiones/consultar-documento/${tipo}/${numero}`, {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();

        if (response.ok && result.success) {
            document.getElementById('conductor_camion').value = result.nombre;
            document.getElementById('numero_documento_camion').style.borderColor = '#10b981';
        } else {
            document.getElementById('conductor_camion').value = '';
            document.getElementById('numero_documento_camion').style.borderColor = '#ef4444';
            Swal.fire({ icon: 'error', title: 'Error', text: result.message || 'No se encontró el documento' });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión al consultar el documento' });
    } finally {
        btn.disabled = false;
        icon.className = 'fas fa-search';
    }
}
