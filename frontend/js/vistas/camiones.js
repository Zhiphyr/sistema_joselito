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

    // Formateo y validación en tiempo real para Nombre
    document.getElementById('nombre_camion').addEventListener('input', function () {
        let val = this.value;
        val = val.replace(/[^a-zA-Z0-9 \-ñÑáéíóúÁÉÍÓÚ]/g, ''); // Solo letras, nums, espacios y guiones
        val = val.replace(/\s{2,}/g, ' '); // Colapsar espacios
        // Capitalizar primera letra de cada palabra
        val = val.replace(/\b\w/g, char => char.toUpperCase());
        this.value = val;
        
        if (val.trim().length < 3 || val.trim().length > 50) {
            this.style.borderColor = '#ef4444';
        } else {
            this.style.borderColor = '#10b981';
        }
    });

    // Formateo y validación para Placa
    document.getElementById('placa_camion').addEventListener('input', function () {
        let val = this.value.toUpperCase();
        val = val.replace(/[^A-Z0-9\-]/g, ''); // Sin espacios, solo alfanuméricos y guion
        this.value = val;

        const placaRegex = /^[A-Z0-9]{3}-\d{3}$/;
        if (!placaRegex.test(val)) {
            this.style.borderColor = '#ef4444';
        } else {
            this.style.borderColor = '#10b981';
        }
    });

    // Validación de Teléfono
    document.getElementById('telefono_camion').addEventListener('input', function () {
        let val = this.value.replace(/[^0-9]/g, ''); // Solo números
        this.value = val;
        
        const telfRegex = /^9\d{8}$/;
        if (!telfRegex.test(val)) {
            this.style.borderColor = '#ef4444';
        } else {
            this.style.borderColor = '#10b981';
        }
    });

    // Validación de Documento (DNI/RUC)
    const docInput = document.getElementById('numero_documento_camion');
    const docType = document.getElementById('tipo_documento_camion');
    const docBtn = document.getElementById('btnBuscarDocCamion');
    
    function validarDocumento() {
        let val = docInput.value.replace(/[^0-9]/g, ''); // Solo números
        const max = docType.value === 'DNI' ? 8 : 11;
        if (val.length > max) val = val.substring(0, max);
        docInput.value = val;
        
        if (val.length === max) {
            docBtn.disabled = false;
            docInput.style.borderColor = '#10b981';
        } else {
            docBtn.disabled = true;
            docInput.style.borderColor = '#ef4444';
        }
    }
    
    docInput.addEventListener('input', validarDocumento);
    docType.addEventListener('change', () => {
        docInput.value = '';
        validarDocumento();
    });
    // Validar en la carga inicial
    validarDocumento();
};

async function cargarTablaCamiones() {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const tbody = document.getElementById('tbody-camiones');

    if ($.fn.DataTable.isDataTable('#tabla-camiones')) {
        $('#tabla-camiones').DataTable().destroy();
    }

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

            $('#tabla-camiones').DataTable({
                language: {
                    url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
                },
                order: [[0, 'desc']], // Ordenar por ID descendente
                pageLength: 15,
                lengthMenu: [[15, 25, 50, -1], [15, 25, 50, "Todos"]],
                dom: '<"dt-top-controls"<"dt-left-controls"l>f>rt<"bottom-controls"ip>',
                columnDefs: [
                    { orderable: false, targets: 5 } // La columna de acciones no es ordenable
                ],
                destroy: true
            });

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
    document.getElementById('direccion_camion').value = data.direccion;
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
        direccion: document.getElementById('direccion_camion').value.trim(),
        telefono: document.getElementById('telefono_camion').value.trim()
    };

    // Validaciones estrictas antes de enviar
    if (datos.nombre.length < 3 || datos.nombre.length > 50) {
        return Swal.fire({ icon: 'warning', title: 'Atención', text: 'El nombre/unidad debe tener entre 3 y 50 caracteres.' });
    }
    const placaRegex = /^[A-Z0-9]{3}-\d{3}$/;
    if (!placaRegex.test(datos.placa)) {
        return Swal.fire({ icon: 'warning', title: 'Atención', text: 'El formato de la placa es inválido. Ej: ABC-123' });
    }
    const telfRegex = /^9\d{8}$/;
    if (!telfRegex.test(datos.telefono)) {
        return Swal.fire({ icon: 'warning', title: 'Atención', text: 'El teléfono debe tener exactamente 9 dígitos y empezar con 9.' });
    }
    if (datos.direccion.length > 150) {
        return Swal.fire({ icon: 'warning', title: 'Atención', text: 'La dirección no puede exceder los 150 caracteres.' });
    }

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
                direccion: datos.direccion,
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
