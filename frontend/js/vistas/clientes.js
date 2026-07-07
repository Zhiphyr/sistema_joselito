// Caché para edición rápida sin peticiones extra
window.clientesCache = [];

window.init_clientes = function () {
    console.log("Módulo Clientes inicializado");

    cargarTablaClientes();
    configurarEventosDocumento();

    document.getElementById('btnNuevoCliente').addEventListener('click', abrirModalCrearCliente);
    document.getElementById('btnCerrarModal').addEventListener('click', cerrarModalCliente);
    document.getElementById('btnCancelarModal').addEventListener('click', cerrarModalCliente);
    document.getElementById('formCliente').addEventListener('submit', guardarCliente);
    document.getElementById('btnBuscarDocumento').addEventListener('click', buscarDocumentoEnApiExterna);

    // Buscador en tiempo real
    document.getElementById('inputBuscarCliente').addEventListener('keyup', function (e) {
        const texto = e.target.value.toLowerCase();
        const filas = document.querySelectorAll('#tbody-clientes tr');
        filas.forEach(fila => {
            fila.style.display = fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
        });
    });
};

async function cargarTablaClientes() {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const tbody = document.getElementById('tbody-clientes');

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';

    try {
        const response = await fetch('http://localhost:3000/api/clientes', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();

        if (response.ok && result.success) {
            window.clientesCache = result.data;

            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color: var(--text-muted);">No se encontraron clientes</td></tr>';
                return;
            }

            let filasHTML = '';
            result.data.forEach(c => {
                const badgeEstado = c.estado === 1
                    ? '<span class="badge-activo">Activo</span>'
                    : '<span class="badge-inactivo">Inactivo</span>';

                const iconToggle = c.estado === 1 ? 'fa-ban' : 'fa-check';
                const titleToggle = c.estado === 1 ? 'Desactivar' : 'Activar';

                // Badge de tipo de documento
                const badgeTipoDoc = c.tipo_documento === 'RUC'
                    ? '<span class="badge-tipo-ruc">RUC</span>'
                    : '<span class="badge-tipo-dni">DNI</span>';

                filasHTML += `
                    <tr class="tabla-tr">
                        <td class="tabla-td tabla-id">${c.id_cliente}</td>
                        <td class="tabla-td">${badgeTipoDoc}</td>
                        <td class="tabla-td"><span class="tabla-mono">${c.numero_documento}</span></td>
                        <td class="tabla-td tabla-nombre">${c.nombre_razon_social}</td>
                        <td class="tabla-td tabla-secundario">${c.telefono}</td>
                        <td class="tabla-td">${badgeEstado}</td>
                        <td class="tabla-td">
                            <button class="btn-action btn-edit" onclick="abrirModalEditarCliente(${c.id_cliente})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-toggle" onclick="cambiarEstadoCliente(${c.id_cliente}, ${c.estado === 1 ? 0 : 1})" title="${titleToggle}">
                                <i class="fas ${iconToggle}"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="cambiarEstadoCliente(${c.id_cliente}, 2)" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = filasHTML;
        } else {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color: #ef4444;">Error: ${result.message}</td></tr>`;
        }
    } catch (error) {
        console.error("Error al cargar clientes:", error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color: #ef4444;">Error de conexión con el servidor</td></tr>';
    }
}

function configurarEventosDocumento() {
    const tipoDoc = document.getElementById('tipo_documento');
    const numDoc = document.getElementById('numero_documento');

    tipoDoc.addEventListener('change', function () {
        numDoc.value = '';
        numDoc.maxLength = this.value === 'DNI' ? 8 : 11;
    });

    numDoc.addEventListener('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '');
    });
}

function abrirModalCrearCliente() {
    document.getElementById('formCliente').reset();
    document.getElementById('id_cliente').value = '';
    document.getElementById('modalTitle').textContent = 'Nuevo Cliente';

    // Al crear, los campos de documento son editables
    document.getElementById('tipo_documento').disabled = false;
    document.getElementById('numero_documento').readOnly = false;
    document.getElementById('numero_documento').maxLength = 8;

    document.getElementById('modalCliente').style.display = 'flex';
}

function cerrarModalCliente() {
    document.getElementById('modalCliente').style.display = 'none';
}

window.abrirModalEditarCliente = function (id) {
    const data = window.clientesCache.find(c => c.id_cliente === id);
    if (!data) return;

    document.getElementById('id_cliente').value = data.id_cliente;
    document.getElementById('tipo_documento').value = data.tipo_documento;
    document.getElementById('numero_documento').value = data.numero_documento;
    document.getElementById('nombre_razon_social').value = data.nombre_razon_social;
    document.getElementById('telefono').value = data.telefono;
    document.getElementById('correo').value = data.correo || '';

    // Regla: En edición, los documentos son inmutables
    document.getElementById('tipo_documento').disabled = true;
    document.getElementById('numero_documento').readOnly = true;

    document.getElementById('modalTitle').textContent = 'Editar Cliente';
    document.getElementById('modalCliente').style.display = 'flex';
};

async function guardarCliente(e) {
    e.preventDefault();

    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const id = document.getElementById('id_cliente').value;

    const tipoDocEl = document.getElementById('tipo_documento');
    const numDocEl = document.getElementById('numero_documento');

    const datos = {
        tipo_documento: tipoDocEl.options[tipoDocEl.selectedIndex].value,
        numero_documento: numDocEl.value,
        nombre_razon_social: document.getElementById('nombre_razon_social').value,
        telefono: document.getElementById('telefono').value,
        correo: document.getElementById('correo').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `http://localhost:3000/api/clientes/${id}` : 'http://localhost:3000/api/clientes';

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
        if (response.status === 409 && result.reactivar) {
            const confirm = await Swal.fire({
                title: 'Cliente inactivo detectado',
                text: 'El documento ya está registrado pero el cliente se encuentra inactivo o eliminado. ¿Desea reactivarlo?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, reactivar',
                cancelButtonText: 'Cancelar'
            });

            if (confirm.isConfirmed) {
                const updateConfirm = await Swal.fire({
                    title: '¿Actualizar datos?',
                    text: '¿Desea actualizar los datos de este cliente o solo reactivarlo con la información antigua?',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, abrir edición',
                    cancelButtonText: 'Solo reactivar'
                });

                if (updateConfirm.isConfirmed) {
                    cerrarModalCliente();
                    abrirModalEdicionEspecial(result.clienteInfo);
                } else {
                    await cambiarEstadoCliente(result.clienteInfo.id_cliente, 1, true);
                    cerrarModalCliente();
                    cargarTablaClientes();
                }
            }
            return;
        }

        if (response.ok && result.success) {
            Swal.fire({ icon: 'success', title: 'Éxito', text: result.message, timer: 1500, showConfirmButton: false });
            cerrarModalCliente();
            cargarTablaClientes();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
}

function abrirModalEdicionEspecial(data) {
    document.getElementById('id_cliente').value = data.id_cliente;
    document.getElementById('tipo_documento').value = data.tipo_documento;
    document.getElementById('numero_documento').value = data.numero_documento;
    document.getElementById('nombre_razon_social').value = data.nombre_razon_social;
    document.getElementById('telefono').value = data.telefono;
    document.getElementById('correo').value = data.correo || '';

    document.getElementById('tipo_documento').disabled = true;
    document.getElementById('numero_documento').readOnly = true;

    document.getElementById('modalTitle').textContent = 'Editar y Reactivar Cliente';
    document.getElementById('modalCliente').style.display = 'flex';

    cambiarEstadoCliente(data.id_cliente, 1, true);
}

window.cambiarEstadoCliente = async function (id, estado, silent = false) {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');

    if (!silent) {
        const titulo = estado === 2 ? '¿Eliminar cliente?' : (estado === 1 ? '¿Activar cliente?' : '¿Desactivar cliente?');
        const texto = estado === 2 ? 'Esta acción es irreversible (borrado lógico).' : 'Cambiarás el estado del cliente en el sistema.';

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
    }

    try {
        const response = await fetch(`http://localhost:3000/api/clientes/${id}/estado`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-user-profile': sessionData.id_perfil
            },
            body: JSON.stringify({ estado })
        });

        const result = await response.json();

        if (!silent) {
            if (response.ok && result.success) {
                Swal.fire({ icon: 'success', title: 'Éxito', text: result.message, timer: 1500, showConfirmButton: false });
                cargarTablaClientes();
            } else {
                Swal.fire({ icon: 'error', title: 'Error', text: result.message });
            }
        } else {
            if (response.ok && result.success) {
                cargarTablaClientes();
            }
        }
    } catch (error) {
        if (!silent) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
        }
    }
};

async function buscarDocumentoEnApiExterna() {
    const tipo = document.getElementById('tipo_documento').value;
    const numero = document.getElementById('numero_documento').value.trim();
    const btn = document.getElementById('btnBuscarDocumento');
    const inputNombre = document.getElementById('nombre_razon_social');

    if (!numero) {
        Swal.fire({ icon: 'warning', title: 'Campo vacío', text: 'Por favor, ingrese un número de documento.' });
        return;
    }

    if (tipo === 'DNI' && numero.length !== 8) {
        Swal.fire({ icon: 'warning', title: 'Formato incorrecto', text: 'El DNI debe tener 8 dígitos.' });
        return;
    }

    if (tipo === 'RUC' && numero.length !== 11) {
        Swal.fire({ icon: 'warning', title: 'Formato incorrecto', text: 'El RUC debe tener 11 dígitos.' });
        return;
    }

    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const iconoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
    inputNombre.value = 'Consultando...';

    try {
        const response = await fetch(`http://localhost:3000/api/clientes/consultar-documento/${tipo}/${numero}`, {
            method: 'GET',
            headers: { 'x-user-profile': sessionData.id_perfil }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            inputNombre.value = result.nombre;
        } else {
            inputNombre.value = '';
            Swal.fire({ icon: 'error', title: 'Consulta fallida', text: result.message || 'No se encontró el documento' });
        }
    } catch (error) {
        inputNombre.value = '';
        Swal.fire({ icon: 'error', title: 'Error', text: 'Error de conexión al consultar el documento.' });
    } finally {
        btn.innerHTML = iconoOriginal;
        btn.disabled = false;
    }
}
