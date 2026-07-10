// Caché para edición rápida
window.rutasCache = [];

const CIUDADES_PERU = [
    "Lima", "Callao", "Arequipa", "Trujillo", "Chiclayo", "Piura", "Iquitos", 
    "Cusco", "Chimbote", "Huancayo", "Tacna", "Ica", "Juliaca", "Pucallpa", 
    "Sullana", "Cajamarca", "Chincha Alta", "Ayacucho", "Huánuco", "Puno", 
    "Tarapoto", "Huaraz", "Tumbes", "Talara", "Pisco", "Paita", "Moquegua", 
    "Ilo", "Puerto Maldonado", "Chachapoyas", "Moyobamba", "Cerro de Pasco", 
    "Huancavelica", "Abancay", "Nazca", "Cañete", "Barranca", "Chota", "Jaén", 
    "Yurimaguas", "Tingo María", "La Merced", "Oxapampa", "Satipo", "Chepén", 
    "Pacasmayo", "Mollendo", "Camaná", "Pedregal", "Sicuani"
];

window.init_rutas = function () {
    console.log("Módulo Rutas inicializado");

    cargarTablaRutas();

    document.getElementById('btnNuevaRuta').addEventListener('click', abrirModalCrearRuta);
    document.getElementById('btnCerrarModalRuta').addEventListener('click', cerrarModalRuta);
    document.getElementById('btnCancelarModalRuta').addEventListener('click', cerrarModalRuta);
    document.getElementById('formRuta').addEventListener('submit', guardarRuta);

    configurarAutocompleteYValidaciones();
};

async function cargarTablaRutas() {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const tbody = document.getElementById('tbody-rutas');

    if ($.fn.DataTable.isDataTable('#tabla-rutas')) {
        $('#tabla-rutas').DataTable().destroy();
    }

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:32px; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';

    try {
        const response = await fetch('http://localhost:3000/api/rutas', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();

        if (response.ok && result.success) {
            window.rutasCache = result.data;

            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:32px; color: var(--text-muted);">No se encontraron rutas registradas</td></tr>';
                return;
            }

            let filasHTML = '';
            result.data.forEach(r => {
                const badgeEstado = r.estado === 1
                    ? '<span class="badge-activo">Activo</span>'
                    : '<span class="badge-inactivo">Inactivo</span>';

                const iconToggle = r.estado === 1 ? 'fa-ban' : 'fa-check';
                const titleToggle = r.estado === 1 ? 'Desactivar' : 'Activar';

                let fechaFormateada = '-';
                if (r.fecha_creacion) {
                    const dateObj = new Date(r.fecha_creacion);
                    const dia = String(dateObj.getDate()).padStart(2, '0');
                    const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const anio = dateObj.getFullYear();
                    fechaFormateada = `${dia}/${mes}/${anio}`;
                }

                filasHTML += `
                    <tr class="tabla-tr">
                        <td class="tabla-td tabla-id">${r.id_ruta}</td>
                        <td class="tabla-td" style="font-weight: 600;">${r.ciudad_origen}</td>
                        <td class="tabla-td" style="font-weight: 600;">${r.ciudad_destino}</td>
                        <td class="tabla-td tabla-secundario">${r.descripcion || '<span style="color:#cbd5e1;font-style:italic;">Sin descripción</span>'}</td>
                        <td class="tabla-td tabla-secundario">${fechaFormateada}</td>
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

            $('#tabla-rutas').DataTable({
                language: {
                    url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
                },
                order: [[0, 'desc']], // Ordenar por ID descendente
                pageLength: 15,
                lengthMenu: [[15, 25, 50, -1], [15, 25, 50, "Todos"]],
                dom: '<"dt-top-controls"<"dt-left-controls"l>f>rt<"bottom-controls"ip>',
                columnDefs: [
                    { orderable: false, targets: 6 } // La columna de acciones no es ordenable
                ],
                destroy: true
            });

        } else {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color: #ef4444;">Error: ${result.message}</td></tr>`;
        }
    } catch (error) {
        console.error("Error al cargar rutas:", error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:32px; color: #ef4444;">Error de conexión con el servidor</td></tr>';
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

    if (datos.ciudad_origen === datos.ciudad_destino) {
        Swal.fire({
            icon: 'error',
            title: 'Validación',
            text: 'La Ciudad de Origen y la Ciudad de Destino no pueden ser iguales.'
        });
        return;
    }

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

        if (response.status === 409 && result.status === 'active_trips') {
            Swal.fire({
                icon: 'warning',
                title: 'Acción Bloqueada',
                text: result.message,
                confirmButtonColor: '#eab308' // Amarillo advertencia
            });
            return;
        }

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

function configurarAutocompleteYValidaciones() {
    const origenInput = document.getElementById('ciudad_origen_ruta');
    const destinoInput = document.getElementById('ciudad_destino_ruta');
    const descInput = document.getElementById('descripcion_ruta');
    const btnGuardar = document.getElementById('btnGuardarRuta');
    const listOrigen = document.getElementById('autocomplete_origen');
    const listDestino = document.getElementById('autocomplete_destino');

    let debounceTimer;

    function formatoInputCiudades(input) {
        // Eliminar múltiples espacios y caracteres no permitidos (solo letras y espacios)
        let val = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').replace(/\s{2,}/g, ' ');
        // Convertir todo a mayúsculas
        input.value = val.toUpperCase();
        validarFormulario();
    }

    function configurarAutocomplete(input, list) {
        input.addEventListener('input', function() {
            formatoInputCiudades(input);
            clearTimeout(debounceTimer);
            
            debounceTimer = setTimeout(() => {
                const query = input.value.trim().toUpperCase();
                list.innerHTML = '';
                
                if (query.length >= 3) {
                    const matches = CIUDADES_PERU.filter(ciudad => ciudad.toUpperCase().includes(query)).slice(0, 5);
                    
                    if (matches.length > 0) {
                        list.style.display = 'block';
                        matches.forEach(match => {
                            const li = document.createElement('li');
                            li.textContent = match.toUpperCase();
                            li.addEventListener('click', () => {
                                input.value = li.textContent;
                                list.style.display = 'none';
                                validarFormulario();
                            });
                            list.appendChild(li);
                        });
                    } else {
                        list.style.display = 'none';
                    }
                } else {
                    list.style.display = 'none';
                }
            }, 300);
        });

        // Ocultar al perder el foco, con un pequeño delay para permitir el click
        input.addEventListener('blur', () => {
            setTimeout(() => { list.style.display = 'none'; }, 200);
        });
    }

    configurarAutocomplete(origenInput, listOrigen);
    configurarAutocomplete(destinoInput, listDestino);

    // Validación Descripción
    descInput.addEventListener('input', function() {
        let val = descInput.value.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s,.\n-]/g, '');
        descInput.value = val;
    });

    function validarFormulario() {
        const origen = origenInput.value.trim();
        const destino = destinoInput.value.trim();

        let isValid = true;

        if (origen.length < 3) isValid = false;
        if (destino.length < 3) isValid = false;

        if (origen === destino && origen.length > 0) {
            origenInput.style.borderColor = '#ef4444';
            destinoInput.style.borderColor = '#ef4444';
            isValid = false;
        } else {
            origenInput.style.borderColor = 'var(--border-light)';
            destinoInput.style.borderColor = 'var(--border-light)';
        }

        btnGuardar.disabled = !isValid;
    }

    // Inicial Validación
    validarFormulario();
}
