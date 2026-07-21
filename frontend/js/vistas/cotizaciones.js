let tablaCotizaciones = null;
let debounceBusquedaId = null;
let cotizacionActual = null;
let detallesActual = [];
let idCotizacionSeleccionada = null;
let clientesDisponibles = [];
let productosDisponibles = [];
let rutasDisponibles = [];
let cargaActual = null;
let detalleCargaActual = [];
let filaProductoTrigger = null;

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

    document.getElementById('btnAccionWhatsapp').addEventListener('click', () => {
        if (!cotizacionActual || !cotizacionActual.telefono) return;
        const mensaje = `Hola ${cotizacionActual.nombres}, le escribimos de Transportes Joselito respecto a su cotización #${cotizacionActual.id_cotizacion}.`;
        window.open(`https://wa.me/51${cotizacionActual.telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
        marcarCotizacionComoContactada();
    });

    document.getElementById('btnAccionCorreo').addEventListener('click', () => {
        if (!cotizacionActual || !cotizacionActual.correo) return;
        const asunto = encodeURIComponent(`Cotización #${cotizacionActual.id_cotizacion} - Transportes Joselito`);
        window.location.href = `mailto:${cotizacionActual.correo}?subject=${asunto}`;
        marcarCotizacionComoContactada();
    });

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

    document.getElementById('btnNuevaCotizacion').addEventListener('click', abrirFormularioCrearCotizacion);
    document.getElementById('btnCerrarCrearCotizacion').addEventListener('click', cerrarFormularioCrearCotizacion);
    document.getElementById('btnCancelarCrearCotizacion').addEventListener('click', cerrarFormularioCrearCotizacion);
    document.getElementById('btnGuardarCotizacionInterna').addEventListener('click', guardarCotizacionInterna);
    document.getElementById('btnAgregarProductoCrear').addEventListener('click', agregarFilaProductoCrear);

    document.getElementById('crear-nombres').addEventListener('input', function () {
        this.value = this.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ\s]/g, '');
    });

    document.getElementById('crear-telefono').addEventListener('input', function () {
        let val = this.value.replace(/[^0-9]/g, '').slice(0, 9);
        if (val.length > 0 && val[0] !== '9') {
            val = val.slice(1);
        }
        this.value = val;
    });

    document.getElementById('crear-correo').addEventListener('input', function () {
        const val = this.value.trim();
        if (val.length === 0) {
            this.style.borderColor = '';
            return;
        }
        this.style.borderColor = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? '#10b981' : '#ef4444';
    });

    document.getElementById('lista-productos-crear').addEventListener('click', (e) => {
        if (e.target.closest('.btn-nuevo-producto-rapido')) {
            abrirModalNuevoProductoRapido(e.target.closest('.crear-producto-row'));
        }
        if (e.target.closest('.btn-quitar-fila-crear')) {
            const lista = document.getElementById('lista-productos-crear');
            if (lista.children.length > 1) {
                e.target.closest('.crear-producto-row').remove();
            } else {
                Swal.fire({ icon: 'info', title: 'Debe existir al menos un producto', timer: 1500, showConfirmButton: false });
            }
        }
    });

    document.getElementById('lista-productos-crear').addEventListener('change', (e) => {
        if (e.target.classList.contains('crear-prod-select')) {
            actualizarBotonNuevoProducto(e.target.closest('.crear-producto-row'));
        }
        if (e.target.classList.contains('crear-prod-fragil') || e.target.classList.contains('crear-prod-perecible')) {
            aplicarExclusividadCaracteristica(e.target);
        }
    });

    document.getElementById('lista-productos-crear').addEventListener('input', (e) => {
        if (e.target.classList.contains('crear-prod-peso')) {
            filtrarDecimal(e.target, 8, 2);
        }
        if (e.target.classList.contains('crear-prod-cant')) {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
        }
    });

    document.getElementById('btnCerrarModalProductoRapido').addEventListener('click', cerrarModalNuevoProductoRapido);
    document.getElementById('btnCancelarProductoRapido').addEventListener('click', cerrarModalNuevoProductoRapido);
    document.getElementById('btnGuardarProductoRapido').addEventListener('click', guardarProductoRapido);
    document.getElementById('npr-nombre').addEventListener('input', validarBotonGuardarProductoRapido);
    document.getElementById('npr-descripcion').addEventListener('input', validarBotonGuardarProductoRapido);
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

let currentStart = 0;
const currentLength = 15;
let todasCargadas = false;

function inicializarTablaCotizaciones() {
    // Se reinician aquí porque init_cotizaciones() se vuelve a ejecutar cada vez que se
    // reingresa a la vista, pero este script solo se carga/ejecuta una vez (dashboard.js
    // no reinyecta el <script> en visitas posteriores), así que estas variables de módulo
    // conservan su valor entre visitas si no se resetean explícitamente aquí.
    currentStart = 0;
    todasCargadas = false;

    // Simulamos tablaCotizaciones para que tablaCotizaciones.ajax.reload() no rompa nada
    tablaCotizaciones = {
        ajax: {
            reload: function() {
                currentStart = 0;
                todasCargadas = false;
                document.getElementById('lista-cotizaciones').innerHTML = '';
                cargarCotizaciones();
            }
        }
    };

    const btnCargarMas = document.getElementById('btnCargarMasCotizaciones');
    if (btnCargarMas) {
        btnCargarMas.addEventListener('click', () => {
            currentStart += currentLength;
            cargarCotizaciones();
        });
    }

    cargarCotizaciones();
}

async function cargarCotizaciones() {
    if (todasCargadas) return;

    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const idBusqueda = document.getElementById('buscador-id-cotizacion').value.trim();
    const fechaDesde = document.getElementById('filtro-fecha-desde').value;
    const fechaHasta = document.getElementById('filtro-fecha-hasta').value;

    const url = new URL('http://localhost:3000/api/cotizaciones');
    url.searchParams.append('start', currentStart);
    url.searchParams.append('length', currentLength);
    if (idBusqueda) url.searchParams.append('idBusqueda', idBusqueda);
    if (fechaDesde) url.searchParams.append('fechaDesde', fechaDesde);
    if (fechaHasta) url.searchParams.append('fechaHasta', fechaHasta);

    try {
        const btnCargarMas = document.getElementById('btnCargarMasCotizaciones');
        if(btnCargarMas) btnCargarMas.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';

        const response = await fetch(url.toString(), {
            headers: { 'x-user-profile': sessionData.id_perfil || 1 }
        });
        const result = await response.json();

        const lista = document.getElementById('lista-cotizaciones');
        if (currentStart === 0 && (!result.data || result.data.length === 0)) {
            lista.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-muted);">No se encontraron cotizaciones.</div>';
            if(btnCargarMas) btnCargarMas.style.display = 'none';
            return;
        }

        let html = '';
        (result.data || []).forEach(c => {
            const fechaStr = formatearFecha(c.fecha_registro);
            html += `
                <div class="cotizacion-list-card" data-id="${c.id_cotizacion}" onclick="seleccionarTarjetaCotizacion(this, ${c.id_cotizacion})">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                        <span style="font-weight: 700; color: var(--text-primary); font-size: 14px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%;">${c.nombres}</span>
                        ${badgeEstadoCotizacion(c.estado)}
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); display: flex; gap: 8px;">
                        <span style="font-weight: 600;">ID #${c.id_cotizacion}</span>
                        <span>&bull;</span>
                        <span>${fechaStr}</span>
                    </div>
                </div>
            `;
        });

        if (currentStart === 0) {
            lista.innerHTML = html;
        } else {
            lista.insertAdjacentHTML('beforeend', html);
        }

        if (btnCargarMas) {
            btnCargarMas.innerHTML = 'Cargar más';
            if (result.data.length < currentLength) {
                btnCargarMas.style.display = 'none';
                todasCargadas = true;
            } else {
                btnCargarMas.style.display = 'block';
            }
        }
    } catch (error) {
        console.error("Error al cargar cotizaciones:", error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el listado de cotizaciones.' });
    }
}

function seleccionarTarjetaCotizacion(elemento, idCotizacion) {
    document.querySelectorAll('.cotizacion-list-card').forEach(el => el.classList.remove('active'));
    elemento.classList.add('active');
    
    // Smooth transition
    const detalle = document.getElementById('detalle-cotizacion-card');
    detalle.style.opacity = '0';
    setTimeout(() => {
        cargarDetalleCotizacion(idCotizacion);
        detalle.style.opacity = '1';
    }, 150);
}

async function cargarDetalleCotizacion(id) {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');

    try {
        const response = await fetch(`http://localhost:3000/api/cotizaciones/${id}`, {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();

        if (response.ok && result.success) {
            renderDetalleCotizacion(result.cotizacion, result.detalles, result.carga, result.detalleCarga);
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message || 'No se pudo obtener el detalle de la cotización.' });
        }
    } catch (error) {
        console.error('Error al cargar detalle de cotización:', error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Error de conexión con el servidor.' });
    }
}

function renderDetalleCotizacion(cotizacion, detalles, carga, detalleCarga) {
    cotizacionActual = cotizacion;
    detallesActual = detalles || [];
    idCotizacionSeleccionada = cotizacion.id_cotizacion;
    cargaActual = carga || null;
    detalleCargaActual = detalleCarga || [];

    document.getElementById('detalle-cotizacion-vacio').style.display = 'none';
    document.getElementById('crear-cotizacion-card').style.display = 'none';
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

    document.getElementById('detalle-origen').innerHTML = cotizacion.origen === 'Interna'
        ? '<span class="badge-origen-interna">Interna</span>'
        : '<span class="badge-origen-publica">Pública</span>';

    const tieneTelefono = cotizacion.telefono && cotizacion.telefono.trim() !== '';
    const tieneCorreo = cotizacion.correo && cotizacion.correo.trim() !== '';

    const btnWhatsapp = document.getElementById('btnAccionWhatsapp');
    const btnCorreo = document.getElementById('btnAccionCorreo');
    btnWhatsapp.style.display = tieneTelefono ? 'inline-flex' : 'none';
    btnCorreo.style.display = tieneCorreo ? 'inline-flex' : 'none';

    const tbodyDetalle = document.getElementById('tbody-detalle-cotizacion');
    if (!detalles || detalles.length === 0) {
        tbodyDetalle.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:16px; color: var(--text-muted);">Sin productos registrados</td></tr>';
    } else {
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
                    <td class="tabla-td" style="text-align: right; white-space: nowrap;">${d.cantidad}</td>
                    <td class="tabla-td" style="text-align: right; white-space: nowrap;">${Number(d.peso_unitario).toFixed(2)} kg</td>
                    <td class="tabla-td" style="text-align: right; white-space: nowrap;">${Number(d.peso_total).toFixed(2)} kg</td>
                    <td class="tabla-td">${caracteristicas}</td>
                    <td class="tabla-td" style="text-align: right; white-space: nowrap;">S/ ${Number(d.subtotal_calculado).toFixed(2)}</td>
                </tr>
            `;
        });
        tbodyDetalle.innerHTML = filasHTML;
    }

    renderCargaGenerada(cargaActual, detalleCargaActual);
}

function renderCargaGenerada(carga, detalleCarga) {
    const seccion = document.getElementById('detalle-carga-generada-section');

    if (!carga) {
        seccion.style.display = 'none';
        return;
    }

    seccion.style.display = 'block';
    document.getElementById('carga-remitente').textContent = carga.remitente_nombre || '-';
    document.getElementById('carga-destinatario').textContent = carga.destinatario_nombre || '-';
    document.getElementById('carga-flete-total').textContent = `S/ ${Number(carga.flete_total).toFixed(2)}`;

    const tbody = document.getElementById('tbody-carga-generada');
    if (!detalleCarga || detalleCarga.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px; color: var(--text-muted);">Sin líneas de carga registradas</td></tr>';
        return;
    }

    tbody.innerHTML = detalleCarga.map(d => `
        <tr class="tabla-tr">
            <td class="tabla-td">${d.producto_nombre}</td>
            <td class="tabla-td">${d.marca_visual || '-'}</td>
            <td class="tabla-td" style="text-align: right; white-space: nowrap;">${d.cantidad_sacos} / ${Number(d.peso_unitario).toFixed(2)} kg</td>
            <td class="tabla-td" style="text-align: right; white-space: nowrap;">S/ ${Number(d.precio_peso).toFixed(2)}</td>
            <td class="tabla-td" style="text-align: right; white-space: nowrap;">S/ ${Number(d.flete_subtotal).toFixed(2)}</td>
        </tr>
    `).join('');
}

// ============================================================
// Contactar (WhatsApp / Correo) -> marca la cotización como "Contactado"
// ============================================================

async function marcarCotizacionComoContactada() {
    if (!cotizacionActual || cotizacionActual.estado !== 'Pendiente') return;

    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');

    try {
        const response = await fetch(`http://localhost:3000/api/cotizaciones/${idCotizacionSeleccionada}/contactar`, {
            method: 'PATCH',
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();

        if (response.ok && result.success) {
            tablaCotizaciones.ajax.reload(null, false);
            cargarDetalleCotizacion(idCotizacionSeleccionada);
        }
    } catch (error) {
        console.error('Error al marcar cotización como contactada:', error);
    }
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

    document.getElementById('aprobar-resumen-cotizacion').innerHTML =
        `<div style="font-size: 16px;">
            <strong style="color: var(--accent-bronze); margin-right: 8px;">Cotización #${cotizacionActual.id_cotizacion}</strong>
            <span style="color: var(--text-secondary);">&bull; ${cotizacionActual.nombres}</span>
        </div>
        <div style="font-weight: 500; display: flex; align-items: center; gap: 6px;">
            <i class="fas fa-map-marker-alt" style="color: #ef4444;"></i> ${cotizacionActual.ciudad_origen} &rarr; ${cotizacionActual.ciudad_destino}
        </div>
        <div style="font-size: 16px;">
            <span style="color: var(--text-secondary);">Flete estimado:</span>
            <strong style="color: black;">S/ ${Number(cotizacionActual.flete_estimado_min).toFixed(2)} - S/ ${Number(cotizacionActual.flete_estimado_max).toFixed(2)}</strong>
        </div>`;

    cerrarPanelesNuevoCliente();

    document.getElementById('tbody-aprobar-productos').innerHTML =
        '<tr><td colspan="6" style="text-align:center; padding:16px;"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';
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
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:16px; color: var(--text-muted);">Sin productos registrados</td></tr>';
        return;
    }

    let filas = '';
    detallesActual.forEach(d => {
        const cantidad = Number(d.cantidad);
        const pesoUnitario = Number(d.peso_unitario);
        let match = null;
        let matchExacto = false;
        if (d.id_producto) {
            match = productosDisponibles.find(p => p.id_producto === Number(d.id_producto));
            if (match) matchExacto = true;
        }
        if (!match) {
            const nombreCotizado = (d.producto || '').trim().toLowerCase();
            match = productosDisponibles.find(p => p.nombre.trim().toLowerCase() === nombreCotizado);
        }

        let opciones = '<option value="">Seleccione...</option>';
        productosDisponibles.forEach(p => {
            const selected = match && match.id_producto === p.id_producto ? 'selected' : '';
            opciones += `<option value="${p.id_producto}" ${selected}>${p.nombre}</option>`;
        });

        filas += `
            <tr class="tabla-tr">
                <td class="tabla-td" style="min-width: 250px;">
                    <div class="aprobar-prod-etiqueta">Cotizado como: ${d.producto}</div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        ${matchExacto ? `
                        <div class="aprobar-prod-locked-badge" id="aprobar-prod-badge-${d.id_cotizacion_detalle}">
                            <span>${match.nombre}</span>
                            <i class="fas fa-lock" title="Producto mapeado automáticamente desde el catálogo."></i>
                        </div>
                        <select class="form-control aprobar-select-producto" id="aprobar-prod-${d.id_cotizacion_detalle}" style="display: none;">${opciones}</select>
                        ` : `
                        <select class="form-control aprobar-select-producto" id="aprobar-prod-${d.id_cotizacion_detalle}" style="width: 100%;">${opciones}</select>
                        `}
                    </div>
                </td>
                <td class="tabla-td" style="text-align: center;"><input type="text" class="form-control aprobar-input-marca" id="aprobar-marca-${d.id_cotizacion_detalle}" placeholder="Ej. Marca Verde" style="text-align: center;"></td>
                <td class="tabla-td" style="text-align: right; white-space: nowrap; color: var(--text-secondary);">${cantidad} / ${pesoUnitario.toFixed(2)} kg</td>
                <td class="tabla-td" style="text-align: right;">
                    <div class="aprobar-input-group">
                        <span class="aprobar-input-group-prefix">S/</span>
                        <input type="number" min="0.01" max="99999999.99" step="0.01" class="aprobar-input-tarifa" id="aprobar-tarifa-${d.id_cotizacion_detalle}" placeholder="0.00">
                    </div>
                </td>
                <td class="tabla-td" id="aprobar-pesototal-${d.id_cotizacion_detalle}" style="text-align: right; white-space: nowrap;">${(cantidad * pesoUnitario).toFixed(2)} kg</td>
                <td class="tabla-td" id="aprobar-subtotal-${d.id_cotizacion_detalle}" style="text-align: right; white-space: nowrap; font-weight: 600;">S/ 0.00</td>
            </tr>
        `;
    });
    tbody.innerHTML = filas;

    detallesActual.forEach(d => {
        const inputTarifa = document.getElementById(`aprobar-tarifa-${d.id_cotizacion_detalle}`);
        inputTarifa.addEventListener('input', () => {
            filtrarDecimal(inputTarifa, 8, 2);
            actualizarFleteTotalAprobar();
        });
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

        if (!marcaVisual) {
            Swal.fire({ icon: 'warning', title: 'Faltan datos', text: `Ingrese la marca visual para "${d.producto}".` });
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
    const wrapper = document.getElementById(`wrapper-select-${rol}`);

    panel.style.display = mostrar ? 'block' : 'none';
    if (wrapper) wrapper.style.display = mostrar ? 'none' : 'block';

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

// ============================================================
// Nueva Cotización (panel inline en la card de detalle)
// ============================================================

function abrirFormularioCrearCotizacion() {
    document.querySelectorAll('.cotizacion-list-card').forEach(el => el.classList.remove('active'));
    document.getElementById('detalle-cotizacion-vacio').style.display = 'none';
    document.getElementById('detalle-cotizacion-card').style.display = 'none';
    document.getElementById('crear-cotizacion-card').style.display = 'block';

    document.getElementById('crear-nombres').value = '';
    document.getElementById('crear-telefono').value = '';
    document.getElementById('crear-correo').value = '';
    document.getElementById('lista-productos-crear').innerHTML = '';

    Promise.all([cargarRutasParaCrear(), cargarProductosDisponibles()])
        .then(() => agregarFilaProductoCrear());
}

function cerrarFormularioCrearCotizacion() {
    document.getElementById('crear-cotizacion-card').style.display = 'none';
    const hayCotizacionCargada = !!idCotizacionSeleccionada;
    document.getElementById('detalle-cotizacion-vacio').style.display = hayCotizacionCargada ? 'none' : 'flex';
    document.getElementById('detalle-cotizacion-card').style.display = hayCotizacionCargada ? 'block' : 'none';
}

async function cargarRutasParaCrear() {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');

    try {
        const response = await fetch('http://localhost:3000/api/rutas', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();
        rutasDisponibles = (result.data || []).filter(r => r.estado === 1);

        const select = document.getElementById('crear-ruta');
        select.innerHTML = '<option value="">Seleccione una ruta...</option>' +
            rutasDisponibles.map(r => `<option value="${r.id_ruta}">${r.ciudad_origen} → ${r.ciudad_destino}</option>`).join('');
    } catch (error) {
        console.error('Error al cargar rutas:', error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la lista de rutas.' });
    }
}

function opcionesProductoHTML() {
    return '<option value="">Seleccione...</option>' +
        productosDisponibles.map(p => `<option value="${p.id_producto}">${p.nombre}</option>`).join('');
}

function agregarFilaProductoCrear() {
    const lista = document.getElementById('lista-productos-crear');

    const html = `
        <div class="crear-producto-row">
            <div style="display: flex; gap: 12px; align-items: flex-end;">
                <div style="flex: 3;">
                    <label style="display: block; margin-bottom: 4px; font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Producto</label>
                    <div style="display: flex; gap: 8px;">
                        <select class="form-control crear-prod-select" style="flex: 1;">${opcionesProductoHTML()}</select>
                        <button type="button" class="btn-secondary btn-nuevo-producto-rapido" style="width: auto;" title="Registrar producto nuevo">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                <div style="flex: 1.5;">
                    <label style="display: block; margin-bottom: 4px; font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Peso Unit.(Kg)</label>
                    <input type="number" class="form-control crear-prod-peso" min="0.1" max="99999999.99" step="0.01" placeholder="Ej. 10.5">
                </div>
                <div style="width: 90px; flex-shrink: 0;">
                    <label style="display: block; margin-bottom: 4px; font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Cantidad</label>
                    <input type="number" class="form-control crear-prod-cant" min="1" max="99999" placeholder="Ej. 5">
                </div>
                <button type="button" class="btn-quitar-fila-crear" title="Quitar" style="background: none; border: none; color: #ef4444; font-size: 16px; cursor: pointer; margin-bottom: 10px;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="crear-checkbox-group">
                <label class="crear-chip-label">
                    <input type="checkbox" class="crear-prod-fragil">
                    <span>Frágil</span>
                </label>
                <label class="crear-chip-label">
                    <input type="checkbox" class="crear-prod-perecible">
                    <span>Perecible</span>
                </label>
            </div>
        </div>
    `;
    lista.insertAdjacentHTML('beforeend', html);
}

function actualizarBotonNuevoProducto(fila) {
    if (!fila) return;
    const select = fila.querySelector('.crear-prod-select');
    const btn = fila.querySelector('.btn-nuevo-producto-rapido');
    btn.disabled = select.value !== '';
}

function aplicarExclusividadCaracteristica(checkboxCambiado) {
    if (!checkboxCambiado.checked) return;
    const fila = checkboxCambiado.closest('.crear-producto-row');
    const otra = checkboxCambiado.classList.contains('crear-prod-fragil')
        ? fila.querySelector('.crear-prod-perecible')
        : fila.querySelector('.crear-prod-fragil');
    if (otra) otra.checked = false;
}

function filtrarDecimal(input, maxEnteros, maxDecimales) {
    let val = input.value;
    if (val.includes('.')) {
        let [entero, decimal] = val.split('.');
        entero = entero.slice(0, maxEnteros);
        decimal = decimal.slice(0, maxDecimales);
        input.value = `${entero}.${decimal}`;
    } else if (val.length > maxEnteros) {
        input.value = val.slice(0, maxEnteros);
    }
}

function refrescarTodosLosSelectsProducto() {
    document.querySelectorAll('.crear-prod-select').forEach(select => {
        const valorActual = select.value;
        select.innerHTML = opcionesProductoHTML();
        select.value = valorActual;
    });
}

async function guardarCotizacionInterna() {
    const nombres = document.getElementById('crear-nombres').value.trim();
    const telefono = document.getElementById('crear-telefono').value.trim();
    const correo = document.getElementById('crear-correo').value.trim();
    const id_ruta = document.getElementById('crear-ruta').value;

    if (!nombres || !telefono || !id_ruta) {
        Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Complete nombres, teléfono y ruta.' });
        return;
    }

    if (!/^[A-ZÁÉÍÓÚÑ\s]+$/.test(nombres)) {
        Swal.fire({ icon: 'warning', title: 'Nombre inválido', text: 'El nombre solo debe contener letras.' });
        return;
    }

    if (!/^9\d{8}$/.test(telefono)) {
        Swal.fire({ icon: 'warning', title: 'Teléfono inválido', text: 'El teléfono debe tener 9 dígitos y empezar con 9.' });
        return;
    }

    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        Swal.fire({ icon: 'warning', title: 'Correo inválido', text: 'Ingrese un correo con formato válido.' });
        return;
    }

    const productos = [];
    for (const fila of document.querySelectorAll('#lista-productos-crear .crear-producto-row')) {
        const idProducto = fila.querySelector('.crear-prod-select').value;
        const peso = Number(fila.querySelector('.crear-prod-peso').value);
        const cantidad = Number(fila.querySelector('.crear-prod-cant').value);

        if (!idProducto) {
            Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Seleccione un producto de catálogo en cada fila.' });
            return;
        }
        if (!(peso > 0) || !(cantidad > 0)) {
            Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Peso y cantidad deben ser mayores a 0 en cada fila.' });
            return;
        }

        productos.push({
            id_producto: Number(idProducto),
            peso_unitario: peso,
            cantidad,
            fragil: fila.querySelector('.crear-prod-fragil').checked,
            perecible: fila.querySelector('.crear-prod-perecible').checked
        });
    }

    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const btn = document.getElementById('btnGuardarCotizacionInterna');
    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        const response = await fetch('http://localhost:3000/api/cotizaciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-profile': sessionData.id_perfil },
            body: JSON.stringify({ nombres, telefono, correo, id_ruta, productos })
        });
        const result = await response.json();

        if (response.ok && result.success) {
            cerrarFormularioCrearCotizacion();
            Swal.fire({ icon: 'success', title: 'Cotización registrada', timer: 1500, showConfirmButton: false });
            tablaCotizaciones.ajax.reload();
            await cargarDetalleCotizacion(result.id_cotizacion);
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message || 'No se pudo registrar la cotización.' });
        }
    } catch (error) {
        console.error('Error al registrar cotización interna:', error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Error de conexión con el servidor.' });
    } finally {
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }
}

// ============================================================
// Modal rápido: registrar producto nuevo desde el formulario de creación
// ============================================================

function abrirModalNuevoProductoRapido(fila) {
    filaProductoTrigger = fila;
    document.getElementById('npr-nombre').value = '';
    document.getElementById('npr-descripcion').value = '';
    document.getElementById('npr-nombre').style.borderColor = '';
    document.getElementById('npr-descripcion').style.borderColor = '';
    document.getElementById('btnGuardarProductoRapido').disabled = true;
    document.getElementById('modalNuevoProductoRapido').style.display = 'flex';
}

function cerrarModalNuevoProductoRapido() {
    document.getElementById('modalNuevoProductoRapido').style.display = 'none';
    filaProductoTrigger = null;
}

// Mismas reglas que controllers/productoController.js::registrar
function validarNombreProductoRapido() {
    const input = document.getElementById('npr-nombre');
    const val = input.value.trim().toUpperCase();
    const regex = /^[A-Z0-9ÁÉÍÓÚÑ\s\-,.]+$/;
    const ok = val.length >= 3 && val.length <= 60 && regex.test(val);
    input.style.borderColor = val.length === 0 ? '' : (ok ? '#10b981' : '#ef4444');
    return ok;
}

function validarDescripcionProductoRapido() {
    const input = document.getElementById('npr-descripcion');
    const val = input.value.trim();
    if (val.length === 0) {
        input.style.borderColor = '';
        return true;
    }
    const regex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s,.\n-]*$/;
    const ok = val.length <= 250 && regex.test(val);
    input.style.borderColor = ok ? '#10b981' : '#ef4444';
    return ok;
}

function validarBotonGuardarProductoRapido() {
    document.getElementById('btnGuardarProductoRapido').disabled =
        !(validarNombreProductoRapido() && validarDescripcionProductoRapido());
}

async function guardarProductoRapido() {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const nombre = document.getElementById('npr-nombre').value.trim().toUpperCase();
    const descripcion = document.getElementById('npr-descripcion').value.trim();

    try {
        const response = await fetch('http://localhost:3000/api/productos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-profile': sessionData.id_perfil },
            body: JSON.stringify({ nombre, descripcion })
        });
        const result = await response.json();

        if (response.status === 409 && result.reactivar) {
            const confirmar = await Swal.fire({
                title: 'Producto inactivo detectado',
                text: `El producto "${result.productoInfo.nombre}" ya existe pero está inactivo o eliminado. ¿Desea reactivarlo y usarlo?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, reactivar',
                cancelButtonText: 'Cancelar'
            });

            if (confirmar.isConfirmed) {
                await fetch(`http://localhost:3000/api/productos/${result.productoInfo.id_producto}/estado`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'x-user-profile': sessionData.id_perfil },
                    body: JSON.stringify({ estado: 1 })
                });
                await cargarProductosDisponibles();
                refrescarTodosLosSelectsProducto();
                if (filaProductoTrigger) {
                    filaProductoTrigger.querySelector('.crear-prod-select').value = result.productoInfo.id_producto;
                    actualizarBotonNuevoProducto(filaProductoTrigger);
                }
                cerrarModalNuevoProductoRapido();
                Swal.fire({ icon: 'success', title: 'Producto reactivado', timer: 1500, showConfirmButton: false });
            }
            return;
        }

        if (response.ok && result.success) {
            await cargarProductosDisponibles();
            refrescarTodosLosSelectsProducto();
            if (filaProductoTrigger) {
                filaProductoTrigger.querySelector('.crear-prod-select').value = result.id;
                actualizarBotonNuevoProducto(filaProductoTrigger);
            }
            cerrarModalNuevoProductoRapido();
            Swal.fire({ icon: 'success', title: 'Producto registrado', timer: 1500, showConfirmButton: false });
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message });
        }
    } catch (error) {
        console.error('Error al registrar producto rápido:', error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
}
