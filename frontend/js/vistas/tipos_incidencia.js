window.tiposCache = [];

const API_TIPOS = 'http://localhost:3000/api/incidencias/tipos';

window.init_tipos_incidencia = function () {
    console.log("Módulo Tipos de Incidencia inicializado");

    cargarTablaTipos();

    document.getElementById('btnNuevoTipo').addEventListener('click', abrirModalCrearTipo);
    document.getElementById('btnCerrarModalTipo').addEventListener('click', cerrarModalTipo);
    document.getElementById('btnCancelarModalTipo').addEventListener('click', cerrarModalTipo);
    document.getElementById('formTipo').addEventListener('submit', guardarTipo);

    document.getElementById('inputBuscarTipo').addEventListener('keyup', function (e) {
        const texto = e.target.value.toLowerCase();
        document.querySelectorAll('#tbody-tipos tr').forEach(fila => {
            fila.style.display = fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
        });
    });
};

function sesionTipo() {
    return JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
}
function headersTipo() {
    const s = sesionTipo();
    return { 'Content-Type': 'application/json', 'x-user-profile': s.id_perfil, 'x-user-id': s.id_usuario };
}

async function cargarTablaTipos() {
    const tbody = document.getElementById('tbody-tipos');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:32px; color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';

    try {
        const res = await fetch(API_TIPOS, { headers: headersTipo() });
        const result = await res.json();

        if (res.ok && result.success) {
            window.tiposCache = result.data;

            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:32px; color:var(--text-muted);">No hay tipos registrados</td></tr>';
                return;
            }

            let html = '';
            result.data.forEach(t => {
                const badge = t.estado === 1
                    ? '<span class="badge-activo">Activo</span>'
                    : '<span class="badge-inactivo">Inactivo</span>';
                const iconToggle = t.estado === 1 ? 'fa-ban' : 'fa-check';
                const titleToggle = t.estado === 1 ? 'Desactivar' : 'Activar';

                let badgeAfecta;
                if (t.afecta_default === 'Transportista') badgeAfecta = '<span class="badge-inactivo">Transportista</span>';
                else if (t.afecta_default === 'Cliente') badgeAfecta = '<span class="badge-tipo-ruc">Cliente</span>';
                else badgeAfecta = '<span class="badge-tipo-dni">Empresa</span>';

                html += `
                    <tr class="tabla-tr">
                        <td class="tabla-td tabla-id">${t.id_tipo}</td>
                        <td class="tabla-td tabla-nombre">${t.nombre}</td>
                        <td class="tabla-td">${badgeAfecta}</td>
                        <td class="tabla-td">${badge}</td>
                        <td class="tabla-td">
                            <button class="btn-action btn-edit" onclick="abrirModalEditarTipo(${t.id_tipo})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-toggle" onclick="cambiarEstadoTipo(${t.id_tipo}, ${t.estado === 1 ? 0 : 1})" title="${titleToggle}">
                                <i class="fas ${iconToggle}"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="cambiarEstadoTipo(${t.id_tipo}, 2)" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:32px; color:#ef4444;">Error: ${result.message}</td></tr>`;
        }
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:32px; color:#ef4444;">Error de conexión</td></tr>';
    }
}

function abrirModalCrearTipo() {
    document.getElementById('formTipo').reset();
    document.getElementById('id_tipo').value = '';
    document.getElementById('modalTitleTipo').textContent = 'Nuevo Tipo';
    document.getElementById('modalTipo').style.display = 'flex';
}

function cerrarModalTipo() {
    document.getElementById('modalTipo').style.display = 'none';
}

window.abrirModalEditarTipo = function (id) {
    const data = window.tiposCache.find(t => t.id_tipo === id);
    if (!data) return;
    document.getElementById('id_tipo').value = data.id_tipo;
    document.getElementById('nombre_tipo').value = data.nombre;
    document.getElementById('afecta_tipo').value = data.afecta_default;
    document.getElementById('modalTitleTipo').textContent = 'Editar Tipo';
    document.getElementById('modalTipo').style.display = 'flex';
};

async function guardarTipo(e) {
    e.preventDefault();
    const id = document.getElementById('id_tipo').value;
    const datos = {
        nombre: document.getElementById('nombre_tipo').value.trim(),
        afecta_default: document.getElementById('afecta_tipo').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_TIPOS}/${id}` : API_TIPOS;

    try {
        const res = await fetch(url, { method, headers: headersTipo(), body: JSON.stringify(datos) });
        const result = await res.json();
        if (res.ok && result.success) {
            Swal.fire({ icon: 'success', title: 'Éxito', text: result.message, timer: 1500, showConfirmButton: false });
            cerrarModalTipo();
            cargarTablaTipos();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message });
        }
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
}

window.cambiarEstadoTipo = async function (id, estado) {
    const titulo = estado === 2 ? '¿Eliminar tipo?' : (estado === 1 ? '¿Activar tipo?' : '¿Desactivar tipo?');
    const texto = estado === 2 ? 'Fallará si hay incidencias usando este tipo.' : 'Cambiarás la disponibilidad de este tipo.';

    const confirm = await Swal.fire({
        title: titulo, text: texto,
        icon: estado === 2 ? 'warning' : 'info',
        showCancelButton: true,
        confirmButtonColor: estado === 2 ? '#ef4444' : '#0f4c81',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, continuar', cancelButtonText: 'Cancelar'
    });
    if (!confirm.isConfirmed) return;

    try {
        const res = await fetch(`${API_TIPOS}/${id}/estado`, {
            method: 'PATCH', headers: headersTipo(), body: JSON.stringify({ estado })
        });
        const result = await res.json();
        if (res.ok && result.success) {
            Swal.fire({ icon: 'success', title: 'Éxito', text: result.message, timer: 1500, showConfirmButton: false });
            cargarTablaTipos();
        } else {
            Swal.fire({ icon: 'error', title: 'Acción Denegada', text: result.message });
        }
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
};
