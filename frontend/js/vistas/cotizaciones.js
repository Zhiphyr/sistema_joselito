let tablaCotizaciones = null;
let debounceBusquedaId = null;
let cotizacionActual = null;
let detallesActual = [];
let idCotizacionSeleccionada = null;
let clientesDisponibles = [];
let productosDisponibles = [];

window.init_cotizaciones = function () {
    console.log("Módulo Cotizaciones inicializado");

    inicializarTablaCotizaciones();
    configurarEventosCotizaciones();
};

function configurarEventosCotizaciones() {
    document.getElementById('buscador-id-cotizacion').addEventListener('input', () => {
        clearTimeout(debounceBusquedaId);
        debounceBusquedaId = setTimeout(() => {
            if (tablaCotizaciones) tablaCotizaciones.ajax.reload();
        }, 400);
    });

    document.getElementById('btnToggleFiltros').addEventListener('click', () => {
        const panel = document.getElementById('panelFiltros');
        panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    });

    document.getElementById('btnAplicarFiltros').addEventListener('click', () => {
        if (tablaCotizaciones) tablaCotizaciones.ajax.reload();
    });

    document.getElementById('btnLimpiarFiltros').addEventListener('click', () => {
        document.getElementById('filtro-fecha-desde').value = '';
        document.getElementById('filtro-fecha-hasta').value = '';
        if (tablaCotizaciones) tablaCotizaciones.ajax.reload();
    });

    document.getElementById('btnRechazarCotizacion').addEventListener('click', rechazarCotizacionActual);
    document.getElementById('btnAprobarCotizacion').addEventListener('click', abrirModalAprobar);
    document.getElementById('btnCerrarModalAprobar').addEventListener('click', cerrarModalAprobar);
    document.getElementById('btnCancelarAprobar').addEventListener('click', cerrarModalAprobar);
    document.getElementById('btnConfirmarAprobar').addEventListener('click', confirmarAprobarCotizacion);

    ['remitente', 'destinatario'].forEach(rol => {
        document.getElementById(`btnNuevo${capitalizar(rol)}`).addEventListener('click', () => togglePanelNuevoCliente(rol, true));
        document.getElementById(`nc-${rol}-btnCancelar`).addEventListener('click', () => togglePanelNuevoCliente(rol, false));
        document.getElementById(`nc-${rol}-btnGuardar`).addEventListener('click', () => guardarNuevoCliente(rol));
        document.getElementById(`nc-${rol}-btnBuscar`).addEventListener('click', () => buscarDocumentoNuevoCliente(rol));

        document.getElementById(`nc-${rol}-tipo_documento`).addEventListener('change', function () {
            document.getElementById(`nc-${rol}-numero_documento`).value = '';
            document.getElementById(`nc-${rol}-nombre_razon_social`).value = '';
            document.getElementById(`nc-${rol}-numero_documento`).maxLength = this.value === 'DNI' ? 8 : 11;
            validarBotonGuardarNuevoCliente(rol);
        });

        document.getElementById(`nc-${rol}-numero_documento`).addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9]/g, '');
            document.getElementById(`nc-${rol}-nombre_razon_social`).value = '';
            validarBotonGuardarNuevoCliente(rol);
        });

        document.getElementById(`nc-${rol}-telefono`).addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9]/g, '');
            validarBotonGuardarNuevoCliente(rol);
        });

        document.getElementById(`nc-${rol}-correo`).addEventListener('input', () => validarBotonGuardarNuevoCliente(rol));
    });
}

function capitalizar(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function badgeEstadoCotizacion(estado) {
    const clases = {
        'Pendiente': 'badge-estado-pendiente',
        'Contactado': 'badge-estado-contactado',
        'Convertido a Carga': 'badge-estado-convertido',
        'Rechazado/Vencido': 'badge-estado-rechazado'
    };
    const clase = clases[estado] || 'badge-estado-pendiente';
    return `<span class="${clase}">${estado}</span>`;
}

function formatearFecha(fecha) {
    if (!fecha) return '-';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function inicializarTablaCotizaciones() {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');

    if ($.fn.DataTable.isDataTable('#tabla-cotizaciones')) {
        $('#tabla-cotizaciones').DataTable().destroy();
        $('#tabla-cotizaciones tbody').empty();
    }

    tablaCotizaciones = $('#tabla-cotizaciones').DataTable({
        serverSide: true,
        processing: true,
        searching: false,
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
        },
        pageLength: 15,
        lengthMenu: [[15, 25, 50, 100], [15, 25, 50, 100]],
        order: [[3, 'desc']],
        dom: '<"dt-top-controls"<"dt-left-controls"l>>rt<"bottom-controls"ip>',
        ajax: (data, callback) => {
            data.idBusqueda = document.getElementById('buscador-id-cotizacion').value.trim();
            data.fechaDesde = document.getElementById('filtro-fecha-desde').value;
            data.fechaHasta = document.getElementById('filtro-fecha-hasta').value;

            $.ajax({
                url: 'http://localhost:3000/api/cotizaciones',
                data,
                headers: { 'x-user-profile': sessionData.id_perfil },
                success: callback,
                error: () => {
                    callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
                    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el listado de cotizaciones.' });
                }
            });
        },
        columns: [
            { data: 'id_cotizacion', className: 'tabla-td tabla-id' },
            { data: 'nombres', className: 'tabla-td tabla-nombre' },
            { data: 'estado', className: 'tabla-td', render: (estado) => badgeEstadoCotizacion(estado) },
            { data: 'fecha_registro', className: 'tabla-td tabla-secundario', render: (fecha) => formatearFecha(fecha) }
        ]
    });

    $('#tabla-cotizaciones tbody').on('click', 'tr', function () {
        const fila = tablaCotizaciones.row(this).data();
        if (!fila) return;

        $('#tabla-cotizaciones tbody tr').removeClass('fila-seleccionada');
        $(this).addClass('fila-seleccionada');

        cargarDetalleCotizacion(fila.id_cotizacion);
    });
}

async function cargarDetalleCotizacion(id) {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');

    try {
        const response = await fetch(`http://localhost:3000/api/cotizaciones/${id}`, {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();

        if (response.ok && result.success) {
            renderDetalleCotizacion(result.cotizacion, result.detalles);
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message || 'No se pudo obtener el detalle de la cotización.' });
        }
    } catch (error) {
        console.error('Error al cargar detalle de cotización:', error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Error de conexión con el servidor.' });
    }
}

function renderDetalleCotizacion(cotizacion, detalles) {
    cotizacionActual = cotizacion;
    detallesActual = detalles || [];
    idCotizacionSeleccionada = cotizacion.id_cotizacion;

    document.getElementById('detalle-cotizacion-vacio').style.display = 'none';
    document.getElementById('detalle-cotizacion-card').style.display = 'block';

    const puedeGestionar = cotizacion.estado === 'Pendiente' || cotizacion.estado === 'Contactado';
    document.getElementById('btnAprobarCotizacion').style.display = puedeGestionar ? '' : 'none';
    document.getElementById('btnRechazarCotizacion').style.display = puedeGestionar ? '' : 'none';

    document.getElementById('detalle-titulo').textContent = `Cotización #${cotizacion.id_cotizacion}`;
    document.getElementById('detalle-badge-estado').innerHTML = badgeEstadoCotizacion(cotizacion.estado);

    document.getElementById('detalle-nombres').textContent = cotizacion.nombres || '-';
    document.getElementById('detalle-telefono').textContent = cotizacion.telefono && cotizacion.telefono.trim() !== ''
        ? cotizacion.telefono
        : 'No registrado';
    document.getElementById('detalle-correo').textContent = cotizacion.correo && cotizacion.correo.trim() !== ''
        ? cotizacion.correo
        : 'No registrado';
    document.getElementById('detalle-fecha').textContent = formatearFecha(cotizacion.fecha_registro);
    document.getElementById('detalle-ruta').textContent = `${cotizacion.ciudad_origen} → ${cotizacion.ciudad_destino}`;
    document.getElementById('detalle-flete').textContent =
        `S/ ${Number(cotizacion.flete_estimado_min).toFixed(2)} - S/ ${Number(cotizacion.flete_estimado_max).toFixed(2)}`;

    const tieneTelefono = cotizacion.telefono && cotizacion.telefono.trim() !== '';
    const tieneCorreo = cotizacion.correo && cotizacion.correo.trim() !== '';

    const btnWhatsapp = document.getElementById('btnAccionWhatsapp');
    const btnCorreo = document.getElementById('btnAccionCorreo');
    btnWhatsapp.style.display = tieneTelefono ? 'inline-flex' : 'none';
    btnCorreo.style.display = tieneCorreo ? 'inline-flex' : 'none';

    const tbodyDetalle = document.getElementById('tbody-detalle-cotizacion');
    if (!detalles || detalles.length === 0) {
        tbodyDetalle.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:16px; color: var(--text-muted);">Sin productos registrados</td></tr>';
        return;
    }

    let filasHTML = '';
    detalles.forEach(d => {
        let caracteristicas = '';
        if (d.es_fragil) caracteristicas += '<span class="badge-caracteristica">Frágil</span>';
        if (d.es_perecible) caracteristicas += '<span class="badge-caracteristica">Perecible</span>';
        if (d.es_mudanza) caracteristicas += '<span class="badge-caracteristica">Mudanza</span>';
        if (!caracteristicas) caracteristicas = '-';

        filasHTML += `
            <tr class="tabla-tr">
                <td class="tabla-td">${d.producto}</td>
                <td class="tabla-td">${d.cantidad}</td>
                <td class="tabla-td">${Number(d.peso_unitario).toFixed(2)} kg</td>
                <td class="tabla-td">${Number(d.peso_total).toFixed(2)} kg</td>
                <td class="tabla-td">${caracteristicas}</td>
                <td class="tabla-td">S/ ${Number(d.subtotal_calculado).toFixed(2)}</td>
            </tr>
        `;
    });

    tbodyDetalle.innerHTML = filasHTML;
}

// ============================================================
// Rechazar cotización
// ============================================================

async function rechazarCotizacionActual() {
    if (!idCotizacionSeleccionada) return;

    const confirmar = await Swal.fire({
        title: '¿Rechazar cotización?',
        text: 'La cotización pasará al estado "Rechazado/Vencido".',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, rechazar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmar.isConfirmed) return;

    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');

    try {
        const response = await fetch(`http://localhost:3000/api/cotizaciones/${idCotizacionSeleccionada}/rechazar`, {
            method: 'PATCH',
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();

        if (response.ok && result.success) {
            Swal.fire({ icon: 'success', title: 'Cotización rechazada', timer: 1500, showConfirmButton: false });
            tablaCotizaciones.ajax.reload(null, false);
            cargarDetalleCotizacion(idCotizacionSeleccionada);
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message || 'No se pudo rechazar la cotización.' });
        }
    } catch (error) {
        console.error('Error al rechazar cotización:', error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Error de conexión con el servidor.' });
    }
}

// ============================================================
// Aprobar cotización -> Formulario de Recepción de Carga
// ============================================================

async function abrirModalAprobar() {
    if (!cotizacionActual) return;

    document.getElementById('aprobar-resumen-cotizacion').textContent =
        `${cotizacionActual.nombres} · ${cotizacionActual.ciudad_origen} → ${cotizacionActual.ciudad_destino} · ` +
        `Flete estimado: S/ ${Number(cotizacionActual.flete_estimado_min).toFixed(2)} - S/ ${Number(cotizacionActual.flete_estimado_max).toFixed(2)}`;

    cerrarPanelesNuevoCliente();

    document.getElementById('tbody-aprobar-productos').innerHTML =
        '<tr><td colspan="7" style="text-align:center; padding:16px;"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';
    document.getElementById('modalAprobarCotizacion').style.display = 'flex';

    await Promise.all([poblarSelectsClientes(), cargarProductosDisponibles()]);
    construirFilasProductosAprobar();
}

function cerrarModalAprobar() {
    document.getElementById('modalAprobarCotizacion').style.display = 'none';
}

async function poblarSelectsClientes() {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');

    try {
        const response = await fetch('http://localhost:3000/api/clientes', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();
        clientesDisponibles = (result.data || []).filter(c => c.estado === 1);
        renderizarSelectsClientes();
    } catch (error) {
        console.error('Error al cargar clientes:', error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la lista de clientes.' });
    }
}

function renderizarSelectsClientes() {
    const selectRem = document.getElementById('aprobar-select-remitente');
    const selectDest = document.getElementById('aprobar-select-destinatario');
    const remitenteActual = selectRem.value;
    const destinatarioActual = selectDest.value;

    selectRem.innerHTML = '<option value="">Seleccione un cliente remitente...</option>';
    selectDest.innerHTML = '<option value="">Seleccione un cliente destinatario...</option>';

    clientesDisponibles.forEach(c => {
        const opcion = `<option value="${c.id_cliente}">${c.nombre_razon_social} (${c.numero_documento})</option>`;
        selectRem.innerHTML += opcion;
        selectDest.innerHTML += opcion;
    });

    selectRem.value = remitenteActual;
    selectDest.value = destinatarioActual;
}

async function cargarProductosDisponibles() {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');

    try {
        const response = await fetch('http://localhost:3000/api/productos', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();
        productosDisponibles = (result.data || []).filter(p => p.estado === 1);
    } catch (error) {
        console.error('Error al cargar productos:', error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el catálogo de productos.' });
    }
}

function construirFilasProductosAprobar() {
    const tbody = document.getElementById('tbody-aprobar-productos');

    if (!detallesActual || detallesActual.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:16px; color: var(--text-muted);">Sin productos registrados</td></tr>';
        return;
    }

    let filas = '';
    detallesActual.forEach(d => {
        const cantidad = Number(d.cantidad);
        const pesoUnitario = Number(d.peso_unitario);
        const nombreCotizado = (d.producto || '').trim().toLowerCase();
        const match = productosDisponibles.find(p => p.nombre.trim().toLowerCase() === nombreCotizado);

        let opciones = '<option value="">Seleccione...</option>';
        productosDisponibles.forEach(p => {
            const selected = match && match.id_producto === p.id_producto ? 'selected' : '';
            opciones += `<option value="${p.id_producto}" ${selected}>${p.nombre}</option>`;
        });

        filas += `
            <tr class="tabla-tr">
                <td class="tabla-td">${d.producto}</td>
                <td class="tabla-td"><select class="form-control aprobar-select-producto" id="aprobar-prod-${d.id_cotizacion_detalle}">${opciones}</select></td>
                <td class="tabla-td"><input type="text" class="form-control aprobar-input-marca" id="aprobar-marca-${d.id_cotizacion_detalle}" placeholder="Opcional"></td>
                <td class="tabla-td tabla-secundario">${cantidad} / ${pesoUnitario.toFixed(2)} kg</td>
                <td class="tabla-td"><input type="number" min="0.01" step="0.01" class="form-control aprobar-input-tarifa" id="aprobar-tarifa-${d.id_cotizacion_detalle}" placeholder="0.00"></td>
                <td class="tabla-td" id="aprobar-pesototal-${d.id_cotizacion_detalle}">${(cantidad * pesoUnitario).toFixed(2)} kg</td>
                <td class="tabla-td" id="aprobar-subtotal-${d.id_cotizacion_detalle}">S/ 0.00</td>
            </tr>
        `;
    });
    tbody.innerHTML = filas;

    detallesActual.forEach(d => {
        document.getElementById(`aprobar-tarifa-${d.id_cotizacion_detalle}`).addEventListener('input', actualizarFleteTotalAprobar);
    });

    actualizarFleteTotalAprobar();
}

function calcularFilaAprobar(detalle) {
    const cantidad = Number(detalle.cantidad);
    const pesoUnitario = Number(detalle.peso_unitario);
    const pesoTotal = cantidad * pesoUnitario;
    const tarifa = Number(document.getElementById(`aprobar-tarifa-${detalle.id_cotizacion_detalle}`).value) || 0;
    const subtotal = pesoTotal * tarifa;

    document.getElementById(`aprobar-subtotal-${detalle.id_cotizacion_detalle}`).textContent = `S/ ${subtotal.toFixed(2)}`;
    return subtotal;
}

function actualizarFleteTotalAprobar() {
    let total = 0;
    detallesActual.forEach(d => {
        total += calcularFilaAprobar(d);
    });
    document.getElementById('aprobar-flete-total').textContent = `S/ ${total.toFixed(2)}`;
}

async function confirmarAprobarCotizacion() {
    const idRemitente = document.getElementById('aprobar-select-remitente').value;
    const idDestinatario = document.getElementById('aprobar-select-destinatario').value;

    if (!idRemitente || !idDestinatario) {
        Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Seleccione remitente y destinatario.' });
        return;
    }

    if (idRemitente === idDestinatario) {
        Swal.fire({ icon: 'warning', title: 'Datos inválidos', text: 'El remitente y el destinatario no pueden ser el mismo cliente.' });
        return;
    }

    const productos = [];
    for (const d of detallesActual) {
        const idProducto = document.getElementById(`aprobar-prod-${d.id_cotizacion_detalle}`).value;
        const marcaVisual = document.getElementById(`aprobar-marca-${d.id_cotizacion_detalle}`).value.trim();
        const tarifa = Number(document.getElementById(`aprobar-tarifa-${d.id_cotizacion_detalle}`).value);

        if (!idProducto) {
            Swal.fire({ icon: 'warning', title: 'Faltan datos', text: `Seleccione el producto de catálogo para "${d.producto}".` });
            return;
        }

        if (!tarifa || tarifa <= 0) {
            Swal.fire({ icon: 'warning', title: 'Faltan datos', text: `Ingrese una tarifa válida para "${d.producto}".` });
            return;
        }

        productos.push({
            id_cotizacion_detalle: d.id_cotizacion_detalle,
            id_producto: Number(idProducto),
            marca_visual: marcaVisual,
            precio_peso: tarifa
        });
    }

    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const btn = document.getElementById('btnConfirmarAprobar');
    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        const response = await fetch(`http://localhost:3000/api/cotizaciones/${idCotizacionSeleccionada}/aprobar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-profile': sessionData.id_perfil },
            body: JSON.stringify({
                id_remitente: Number(idRemitente),
                id_destinatario: Number(idDestinatario),
                productos
            })
        });
        const result = await response.json();

        if (response.ok && result.success) {
            cerrarModalAprobar();
            Swal.fire({ icon: 'success', title: 'Carga registrada', text: `Se generó la carga #${result.id_carga}.`, timer: 2000, showConfirmButton: false });
            tablaCotizaciones.ajax.reload(null, false);
            cargarDetalleCotizacion(idCotizacionSeleccionada);
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message || 'No se pudo registrar la carga.' });
        }
    } catch (error) {
        console.error('Error al aprobar cotización:', error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Error de conexión con el servidor.' });
    } finally {
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }
}

// ============================================================
// Mini-formulario "Nuevo cliente" (remitente / destinatario)
// ============================================================

function togglePanelNuevoCliente(rol, mostrar) {
    const panel = document.getElementById(`panelNuevo${capitalizar(rol)}`);
    panel.style.display = mostrar ? 'block' : 'none';

    if (mostrar) {
        document.getElementById(`nc-${rol}-tipo_documento`).value = 'DNI';
        document.getElementById(`nc-${rol}-tipo_documento`).disabled = false;
        document.getElementById(`nc-${rol}-numero_documento`).value = '';
        document.getElementById(`nc-${rol}-numero_documento`).maxLength = 8;
        document.getElementById(`nc-${rol}-numero_documento`).readOnly = false;
        document.getElementById(`nc-${rol}-nombre_razon_social`).value = '';
        document.getElementById(`nc-${rol}-direccion`).value = '';
        document.getElementById(`nc-${rol}-telefono`).value = (cotizacionActual && cotizacionActual.telefono) || '';
        document.getElementById(`nc-${rol}-correo`).value = (cotizacionActual && cotizacionActual.correo) || '';

        ['numero_documento', 'telefono', 'correo'].forEach(campo => {
            document.getElementById(`nc-${rol}-${campo}`).style.borderColor = '';
        });

        validarBotonGuardarNuevoCliente(rol);
    }
}

function cerrarPanelesNuevoCliente() {
    togglePanelNuevoCliente('remitente', false);
    togglePanelNuevoCliente('destinatario', false);
}

function validarDocumentoNuevoCliente(rol) {
    const tipo = document.getElementById(`nc-${rol}-tipo_documento`).value;
    const inputNum = document.getElementById(`nc-${rol}-numero_documento`);
    const num = inputNum.value.trim();
    const btnLupa = document.getElementById(`nc-${rol}-btnBuscar`);

    let regex = null;
    if (tipo === 'DNI') regex = /^\d{8}$/;
    if (tipo === 'RUC') regex = /^(10|15|17|20)\d{9}$/;

    if (regex && regex.test(num)) {
        inputNum.style.borderColor = '#10b981';
        btnLupa.disabled = false;
        btnLupa.style.opacity = '1';
        btnLupa.style.cursor = 'pointer';
        return true;
    } else {
        inputNum.style.borderColor = num.length > 0 ? '#ef4444' : '';
        btnLupa.disabled = true;
        btnLupa.style.opacity = '0.5';
        btnLupa.style.cursor = 'not-allowed';
        return false;
    }
}

function validarTelefonoNuevoCliente(rol) {
    const input = document.getElementById(`nc-${rol}-telefono`);
    const tel = input.value.trim();
    const regex = /^9\d{8}$/;

    if (regex.test(tel)) {
        input.style.borderColor = '#10b981';
        return true;
    } else {
        input.style.borderColor = tel.length > 0 ? '#ef4444' : '';
        return false;
    }
}

function validarCorreoNuevoCliente(rol) {
    const input = document.getElementById(`nc-${rol}-correo`);
    const correo = input.value.trim();

    if (correo.length === 0) {
        input.style.borderColor = '';
        return true;
    }

    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (regex.test(correo)) {
        input.style.borderColor = '#10b981';
        return true;
    } else {
        input.style.borderColor = '#ef4444';
        return false;
    }
}

function validarBotonGuardarNuevoCliente(rol) {
    const numDoc = document.getElementById(`nc-${rol}-numero_documento`).value.trim();
    const nombre = document.getElementById(`nc-${rol}-nombre_razon_social`).value.trim();
    const btnGuardar = document.getElementById(`nc-${rol}-btnGuardar`);

    const docValido = validarDocumentoNuevoCliente(rol);
    const telValido = validarTelefonoNuevoCliente(rol);
    const correoValido = validarCorreoNuevoCliente(rol);
    const nombreValido = nombre.length > 0 && nombre !== 'Consultando...' && nombre !== 'No se encontró el documento';
    const esDuplicado = docValido && clientesDisponibles.some(c => c.numero_documento === numDoc);

    if (docValido && telValido && correoValido && nombreValido && !esDuplicado) {
        btnGuardar.disabled = false;
        btnGuardar.style.opacity = '1';
        btnGuardar.style.cursor = 'pointer';
    } else {
        btnGuardar.disabled = true;
        btnGuardar.style.opacity = '0.5';
        btnGuardar.style.cursor = 'not-allowed';
    }
}

async function buscarDocumentoNuevoCliente(rol) {
    const tipo = document.getElementById(`nc-${rol}-tipo_documento`).value;
    const numero = document.getElementById(`nc-${rol}-numero_documento`).value.trim();
    const btn = document.getElementById(`nc-${rol}-btnBuscar`);
    const inputNombre = document.getElementById(`nc-${rol}-nombre_razon_social`);

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
            inputNombre.value = 'No se encontró el documento';
            Swal.fire({ icon: 'error', title: 'Consulta fallida', text: result.message || 'No se encontró el documento' });
        }
    } catch (error) {
        inputNombre.value = 'No se encontró el documento';
        Swal.fire({ icon: 'error', title: 'Error', text: 'Error de conexión al consultar el documento.' });
    } finally {
        btn.innerHTML = iconoOriginal;
        btn.disabled = false;
        validarBotonGuardarNuevoCliente(rol);
    }
}

async function guardarNuevoCliente(rol) {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');

    const datos = {
        tipo_documento: document.getElementById(`nc-${rol}-tipo_documento`).value,
        numero_documento: document.getElementById(`nc-${rol}-numero_documento`).value,
        nombre_razon_social: document.getElementById(`nc-${rol}-nombre_razon_social`).value,
        direccion: document.getElementById(`nc-${rol}-direccion`).value,
        telefono: document.getElementById(`nc-${rol}-telefono`).value,
        correo: document.getElementById(`nc-${rol}-correo`).value
    };

    try {
        const response = await fetch('http://localhost:3000/api/clientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-profile': sessionData.id_perfil },
            body: JSON.stringify(datos)
        });
        const result = await response.json();

        if (response.status === 409 && result.reactivar) {
            const confirmar = await Swal.fire({
                title: 'Cliente inactivo detectado',
                text: 'El documento ya está registrado pero el cliente se encuentra inactivo o eliminado. ¿Desea reactivarlo y usarlo?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, reactivar',
                cancelButtonText: 'Cancelar'
            });

            if (confirmar.isConfirmed) {
                await fetch(`http://localhost:3000/api/clientes/${result.clienteInfo.id_cliente}/estado`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'x-user-profile': sessionData.id_perfil },
                    body: JSON.stringify({ estado: 1 })
                });
                await poblarSelectsClientes();
                document.getElementById(`aprobar-select-${rol}`).value = result.clienteInfo.id_cliente;
                togglePanelNuevoCliente(rol, false);
                Swal.fire({ icon: 'success', title: 'Cliente reactivado', timer: 1500, showConfirmButton: false });
            }
            return;
        }

        if (response.ok && result.success) {
            await poblarSelectsClientes();
            document.getElementById(`aprobar-select-${rol}`).value = result.id;
            togglePanelNuevoCliente(rol, false);
            Swal.fire({ icon: 'success', title: 'Cliente registrado', timer: 1500, showConfirmButton: false });
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
}
