let historialViajesTodos = [];
let currentPage = 1;
const LIMIT = 10;
let loadedRecords = 0;

/**
 * Inicializador de la vista Historial de Viajes
 * Es invocado dinámicamente por cargarVistaSPA
 */
async function init_historial_viajes() {
    console.log("Vista Historial de Viajes cargada");
    
    // Configurar listeners de filtrado
    const inputBuscar = document.getElementById('input-buscar-viaje');
    const selectEstado = document.getElementById('select-estado-viaje');
    const inputFechaSalida = document.getElementById('input-fecha-salida');
    const inputFechaLlegada = document.getElementById('input-fecha-llegada');
    
    const resetAndFetch = () => {
        currentPage = 1;
        loadedRecords = 0;
        document.getElementById('contenedor-tarjetas-viajes').innerHTML = '';
        fetchViajes(false);
    };

    if (inputBuscar) {
        inputBuscar.addEventListener('input', () => {
            clearTimeout(window.buscarTimeout);
            window.buscarTimeout = setTimeout(resetAndFetch, 500);
        });
    }
    if (selectEstado) selectEstado.addEventListener('change', resetAndFetch);
    if (inputFechaSalida) inputFechaSalida.addEventListener('change', resetAndFetch);
    if (inputFechaLlegada) inputFechaLlegada.addEventListener('change', resetAndFetch);

    // Botón Cargar Más
    const btnCargarMas = document.getElementById('btn-cargar-mas-viajes');
    if (btnCargarMas) {
        btnCargarMas.addEventListener('click', () => {
            currentPage++;
            fetchViajes(true);
        });
    }
    
    // Delegación de eventos para los botones de las tarjetas
    const contenedor = document.getElementById('contenedor-tarjetas-viajes');
    if (contenedor) {
        contenedor.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-ver-detalles')) {
                const idViaje = e.target.getAttribute('data-id');
                abrirModalDetallesViaje(idViaje);
            }
            if (e.target.classList.contains('btn-ver-cargas')) {
                const idViaje = e.target.getAttribute('data-id');
                abrirModalCargasViaje(idViaje);
            }
            if (e.target.classList.contains('btn-incidencia') || e.target.closest('.btn-incidencia')) {
                const btn = e.target.classList.contains('btn-incidencia') ? e.target : e.target.closest('.btn-incidencia');
                const idViaje = btn.getAttribute('data-id');
                abrirModalIncidencias(idViaje);
            }
        });
    }

    // Eventos para cerrar los modales
    document.getElementById('btn-cerrar-modal-x')?.addEventListener('click', cerrarModalDetallesViaje);
    document.getElementById('btn-cerrar-modal-btn')?.addEventListener('click', cerrarModalDetallesViaje);
    document.getElementById('modal-detalles-viaje')?.addEventListener('click', (e) => {
        if(e.target.id === 'modal-detalles-viaje') cerrarModalDetallesViaje();
    });

    document.getElementById('btn-cerrar-modal-cargas-x')?.addEventListener('click', cerrarModalCargasViaje);
    document.getElementById('modal-cargas-viaje')?.addEventListener('click', (e) => {
        if(e.target.id === 'modal-cargas-viaje') cerrarModalCargasViaje();
    });

    document.getElementById('btn-cerrar-modal-incidencias-x')?.addEventListener('click', cerrarModalIncidencias);
    document.getElementById('btn-cerrar-modal-incidencias-btn')?.addEventListener('click', cerrarModalIncidencias);
    document.getElementById('modal-incidencias-viaje')?.addEventListener('click', (e) => {
        if(e.target.id === 'modal-incidencias-viaje') cerrarModalIncidencias();
    });

    document.getElementById('btn-nueva-incidencia')?.addEventListener('click', mostrarFormularioNuevaIncidencia);
    
    document.getElementById('modal-incidencias-body')?.addEventListener('click', (e) => {
        if (e.target.id === 'btn-nueva-incidencia-empty' || e.target.closest('#btn-nueva-incidencia-empty')) {
            mostrarFormularioNuevaIncidencia();
        }
        if (e.target.id === 'btn-cancelar-incidencia') {
            const idViaje = document.getElementById('modal-incidencias-viaje').getAttribute('data-id-viaje');
            if (idViaje) abrirModalIncidencias(idViaje);
        }
        if (e.target.id === 'btn-guardar-incidencia' || e.target.closest('#btn-guardar-incidencia')) {
            guardarIncidencia();
        }
    });

    document.getElementById('modal-incidencias-body')?.addEventListener('input', (e) => {
        const targetId = e.target.id;
        if (!targetId || !targetId.startsWith('nueva-incidencia-')) return;

        // Validar no negativos
        if (e.target.type === 'number' && Number(e.target.value) < 0) {
            e.target.value = 0;
        }

        const perdidaInput = document.getElementById('nueva-incidencia-perdida');
        const gastosInput = document.getElementById('nueva-incidencia-gastos');
        const descuentoInput = document.getElementById('nueva-incidencia-descuento');
        const empresaInput = document.getElementById('nueva-incidencia-empresa');
        const labelTotal = document.getElementById('nueva-incidencia-total-repartir');

        if (!perdidaInput || !gastosInput || !descuentoInput || !empresaInput || !labelTotal) return;

        const p = Number(perdidaInput.value) || 0;
        const g = Number(gastosInput.value) || 0;
        const total = p + g;

        if (targetId === 'nueva-incidencia-perdida' || targetId === 'nueva-incidencia-gastos') {
            labelTotal.textContent = `S/ ${total.toFixed(2)}`;
            // Reajustar si ya habían montos y ahora el total es menor
            let d = Number(descuentoInput.value) || 0;
            if (d > total) {
                d = total;
                descuentoInput.value = total;
            }
            if (descuentoInput.value !== '') {
                empresaInput.value = (total - d).toFixed(2);
            }
        } else if (targetId === 'nueva-incidencia-descuento') {
            let d = Number(descuentoInput.value) || 0;
            if (d > total) {
                d = total;
                descuentoInput.value = total;
            }
            empresaInput.value = (total - d).toFixed(2);
        } else if (targetId === 'nueva-incidencia-empresa') {
            let emp = Number(empresaInput.value) || 0;
            if (emp > total) {
                emp = total;
                empresaInput.value = total;
            }
            descuentoInput.value = (total - emp).toFixed(2);
        }
    });
    
    await fetchViajes(false);
}

function abrirModalDetallesViaje(idStr) {
    const idViaje = Number(idStr);
    const viaje = historialViajesTodos.find(v => v.id_viaje === idViaje);
    if (!viaje) return;

    // Header
    document.getElementById('modal-detalle-titulo').textContent = `Detalles del Viaje #${viaje.id_viaje}`;
    document.getElementById('modal-detalle-ruta').textContent = `${viaje.ciudad_origen || 'Origen'} - ${viaje.ciudad_destino || 'Destino'}`;

    // Estado
    const spanEstado = document.getElementById('modal-detalle-estado');
    spanEstado.textContent = viaje.estado_operativo;
    if (viaje.estado_operativo === 'En Ruta') {
        spanEstado.style.background = '#e0f2fe';
        spanEstado.style.color = 'var(--brand-blue)';
    } else if (viaje.estado_operativo === 'Llegó a Destino') {
        spanEstado.style.background = '#dcfce7';
        spanEstado.style.color = '#16a34a';
    } else if (viaje.estado_operativo === 'Finalizado') {
        spanEstado.style.background = '#f1f5f9';
        spanEstado.style.color = '#475569';
    } else { // Incidencia
        spanEstado.style.background = '#fee2e2';
        spanEstado.style.color = '#dc2626';
    }

    // Fechas
    document.getElementById('modal-detalle-fecha-salida').textContent = formatFechaCompleta(viaje.fecha_salida);
    const elemLlegada = document.getElementById('modal-detalle-fecha-llegada');
    if ((viaje.estado_operativo === 'Llegó a Destino' || viaje.estado_operativo === 'Finalizado') && viaje.fecha_llegada) {
        elemLlegada.textContent = formatFechaCompleta(viaje.fecha_llegada);
    } else if (viaje.estado_operativo === 'En Ruta') {
        elemLlegada.textContent = 'En Ruta';
    } else {
        elemLlegada.innerHTML = `<span style="color: #dc2626; font-weight: 600;">${viaje.estado_operativo}</span>`;
    }

    // Vehículo
    document.getElementById('modal-detalle-vehiculo-nombre').textContent = viaje.vehiculo_nombre || '-';
    document.getElementById('modal-detalle-vehiculo-placa').textContent = viaje.vehiculo || '-';

    // Conductor
    document.getElementById('modal-detalle-chofer-nombre').textContent = viaje.chofer || '-';
    document.getElementById('modal-detalle-chofer-dni').textContent = viaje.chofer_dni || '-';
    document.getElementById('modal-detalle-chofer-telefono').textContent = viaje.chofer_telefono || '-';

    // Carga
    document.getElementById('modal-detalle-total-cargas').textContent = viaje.total_cargas;
    const pesoKg = Number(viaje.peso_total_kg);
    document.getElementById('modal-detalle-peso-total').textContent = `${pesoKg.toFixed(2)} (${(pesoKg/1000).toFixed(2)} Ton)`;

    // Finanzas
    document.getElementById('modal-detalle-tarifa').textContent = `S/ ${Number(viaje.tarifa_transportista || 0).toFixed(2)} / KG`;
    document.getElementById('modal-detalle-flete').textContent = `S/ ${Number(viaje.flete_total || 0).toFixed(2)}`;

    // Footer
    document.getElementById('modal-detalle-creador').textContent = viaje.usuario_creador || 'Desconocido';

    // Mostrar
    document.getElementById('modal-detalles-viaje').style.display = 'flex';
}

function cerrarModalDetallesViaje() {
    document.getElementById('modal-detalles-viaje').style.display = 'none';
}

async function abrirModalCargasViaje(idStr) {
    const idViaje = Number(idStr);
    const modalCargas = document.getElementById('modal-cargas-viaje');
    const modalBody = document.getElementById('modal-cargas-body');
    
    document.getElementById('modal-cargas-titulo').textContent = `Cargas del Viaje #${idViaje}`;
    document.getElementById('modal-cargas-subtitulo').textContent = `Total de cargas registradas: Cargando...`;
    modalBody.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    
    modalCargas.style.display = 'flex';

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch(`/api/viajes/${idViaje}/cargas`, {
            headers: { 'x-user-profile': sessionData.id_perfil || 1 }
        });
        const res = await response.json();

        if (response.ok && res.success) {
            const cargas = res.data;
            document.getElementById('modal-cargas-subtitulo').textContent = `Total de cargas registradas: ${cargas.length}`;
            
            if (cargas.length === 0) {
                modalBody.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">No hay cargas asociadas a este viaje.</div>';
                return;
            }

            let htmlContent = '';

            cargas.forEach((carga, index) => {
                let totalSacos = 0;
                let totalKilos = 0;
                let totalFlete = 0;

                let colorCobro = '#64748b', bgCobro = '#f1f5f9', borderCobro = '#e2e8f0';
                if (carga.estado_cobro === 'Completado') { colorCobro = '#16a34a'; bgCobro = '#dcfce7'; borderCobro = '#bbf7d0'; }
                else if (carga.estado_cobro === 'Parcial') { colorCobro = '#d97706'; bgCobro = '#fef3c7'; borderCobro = '#fde68a'; }
                else { colorCobro = '#dc2626'; bgCobro = '#fee2e2'; borderCobro = '#fecaca'; } // Pendiente o default

                let colorEntrega = '#64748b', bgEntrega = '#f1f5f9', borderEntrega = '#e2e8f0';
                if (carga.estado_entrega === 'Entregado') { colorEntrega = '#16a34a'; bgEntrega = '#dcfce7'; borderEntrega = '#bbf7d0'; }
                else if (carga.estado_entrega === 'En ruta') { colorEntrega = '#2563eb'; bgEntrega = '#dbeafe'; borderEntrega = '#bfdbfe'; }
                else if (carga.estado_entrega === 'Siniestrado') { colorEntrega = '#dc2626'; bgEntrega = '#fee2e2'; borderEntrega = '#fecaca'; }
                else if (carga.estado_entrega === 'Rechazado') { colorEntrega = '#ea580c'; bgEntrega = '#ffedd5'; borderEntrega = '#fed7aa'; }
                else { colorEntrega = '#d97706'; bgEntrega = '#fef3c7'; borderEntrega = '#fde68a'; } // En Almacen...

                let filasProductos = '';
                if (carga.detalles && carga.detalles.length > 0) {
                    carga.detalles.forEach(prod => {
                        totalSacos += Number(prod.cantidad_sacos);
                        totalKilos += Number(prod.peso_total);
                        totalFlete += Number(prod.flete_subtotal);

                        filasProductos += `
                            <tr>
                                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: var(--text-primary); white-space: nowrap;">${prod.producto || '-'}</td>
                                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: var(--text-secondary); white-space: nowrap;">${prod.marca_visual || 'Sin Marca'}</td>
                                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: center; white-space: nowrap;">${prod.cantidad_sacos}</td>
                                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: center; white-space: nowrap;">${prod.peso_unitario} kg</td>
                                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: center; font-weight: 700; color: var(--text-primary); white-space: nowrap;">${Number(prod.peso_total).toFixed(2)} kg</td>
                                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: center; white-space: nowrap;">S/ ${Number(prod.precio_peso).toFixed(2)}</td>
                                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700; color: var(--text-primary); white-space: nowrap;">S/ ${Number(prod.flete_subtotal).toFixed(2)}</td>
                            </tr>
                        `;
                    });
                } else {
                    filasProductos = `<tr><td colspan="7" style="padding: 16px; text-align: center; color: var(--text-muted);">No hay productos registrados en esta carga.</td></tr>`;
                }

                const filaTotales = `
                    <tr style="background: #f8fafc;">
                        <td colspan="2" style="padding: 16px; font-weight: 700; color: var(--text-primary); white-space: nowrap;">Totales de Carga</td>
                        <td style="padding: 16px; text-align: center; font-weight: 700; color: var(--brand-blue); white-space: nowrap;">${totalSacos} und</td>
                        <td style="padding: 16px; text-align: center; white-space: nowrap;"></td>
                        <td style="padding: 16px; text-align: center; font-weight: 700; color: var(--brand-blue); white-space: nowrap;">${totalKilos.toFixed(2)} kg</td>
                        <td style="padding: 16px; text-align: center; white-space: nowrap;"></td>
                        <td style="padding: 16px; text-align: right; font-weight: 700; color: #16a34a; font-size: 15px; white-space: nowrap;">S/ ${totalFlete.toFixed(2)}</td>
                    </tr>
                `;

                htmlContent += `
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                        <div style="padding: 16px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 12px; background: #fafafa; flex-wrap: wrap;">
                            <span style="background: #e0f2fe; color: var(--brand-blue); font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 4px; flex-shrink: 0; white-space: nowrap;">Carga ${index + 1}</span>
                            <span style="font-weight: 600; color: var(--text-primary); font-size: 12px;">${carga.remitente_nombre}</span>
                            <i class="fas fa-arrow-right" style="color: var(--text-muted); font-size: 12px;"></i>
                            <span style="font-weight: 600; color: var(--text-primary); font-size: 12px;">${carga.destinatario_nombre}</span>
                            
                            <div style="margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap;">
                                <span style="background: ${bgEntrega}; color: ${colorEntrega}; border: 1px solid ${borderEntrega}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                                    <i class="fas fa-box"></i> ${carga.estado_entrega || 'En Almacen'}
                                </span>
                                <span style="background: ${bgCobro}; color: ${colorCobro}; border: 1px solid ${borderCobro}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                                    <i class="fas fa-hand-holding-usd"></i> Cobro: ${carga.estado_cobro || 'Pendiente'}
                                </span>
                            </div>
                        </div>
                        <div style="overflow-x: auto; width: 100%;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 13px; min-width: 750px;">
                                <thead>
                                    <tr>
                                        <th style="text-align: left; padding: 12px 16px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">Producto</th>
                                        <th style="text-align: left; padding: 12px 16px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">Marca Visual</th>
                                        <th style="text-align: center; padding: 12px 16px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">Cant.</th>
                                        <th style="text-align: center; padding: 12px 16px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">Peso (U)</th>
                                        <th style="text-align: center; padding: 12px 16px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">Kilos Tot.</th>
                                        <th style="text-align: center; padding: 12px 16px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">Flete x Kg</th>
                                        <th style="text-align: right; padding: 12px 16px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">Flete Tot.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${filasProductos}
                                    ${filaTotales}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            });

            modalBody.innerHTML = htmlContent;

        } else {
            modalBody.innerHTML = '<div style="text-align: center; padding: 40px; color: #dc2626;"><i class="fas fa-exclamation-triangle"></i> Error al cargar los detalles.</div>';
        }
    } catch (error) {
        console.error('Error al cargar cargas del viaje:', error);
        modalBody.innerHTML = '<div style="text-align: center; padding: 40px; color: #dc2626;"><i class="fas fa-exclamation-triangle"></i> Error de conexión.</div>';
    }
}

function cerrarModalCargasViaje() {
    document.getElementById('modal-cargas-viaje').style.display = 'none';
}

async function abrirModalIncidencias(idStr) {
    const idViaje = Number(idStr);
    const modalIncidencias = document.getElementById('modal-incidencias-viaje');
    const modalBody = document.getElementById('modal-incidencias-body');
    
    document.getElementById('modal-incidencias-titulo').textContent = `Incidencias del Viaje #${idViaje}`;
    document.getElementById('modal-incidencias-subtitulo').textContent = `Total de incidencias registradas: Cargando...`;
    modalBody.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    
    modalIncidencias.style.display = 'flex';
    modalIncidencias.setAttribute('data-id-viaje', idViaje);

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch(`/api/viajes/${idViaje}/incidencias`, {
            headers: { 'x-user-profile': sessionData.id_perfil || 1 }
        });
        const res = await response.json();

        if (response.ok && res.success) {
            const incidencias = res.data;
            document.getElementById('modal-incidencias-subtitulo').textContent = `Total de incidencias registradas: ${incidencias.length}`;
            
            if (incidencias.length === 0) {
                modalBody.innerHTML = `
                    <div style="text-align: center; padding: 40px; margin: auto;">
                        <div style="width: 64px; height: 64px; border-radius: 50%; background: #f1f5f9; color: #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 16px;">
                            <i class="fas fa-exclamation"></i>
                        </div>
                        <h4 style="margin: 0 0 8px 0; font-size: 16px; color: var(--text-primary);">Sin incidencias</h4>
                        <p style="margin: 0 0 24px 0; font-size: 14px; color: var(--text-secondary);">Este viaje no tiene ninguna incidencia registrada.</p>
                        <button id="btn-nueva-incidencia-empty" style="background: #dc2626; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2); transition: all 0.2s;">
                            <i class="fas fa-plus"></i> Nueva Incidencia
                        </button>
                    </div>
                `;
                return;
            }

            let filasIncidencias = '';
            incidencias.forEach(inc => {
                const colorResolucion = inc.estado_resolucion === 'Resuelto' ? '#16a34a' : '#d97706';
                const bgResolucion = inc.estado_resolucion === 'Resuelto' ? '#dcfce7' : '#fef3c7';

                const mtoDescuento = inc.monto_descuento_chofer !== null 
                    ? `<span style="color: #ea580c; font-weight: 600;">S/ ${Number(inc.monto_descuento_chofer).toFixed(2)}</span>` 
                    : `<span style="color: #94a3b8; font-style: italic;">Por definir</span>`;
                    
                const mtoEmpresa = inc.monto_asumido_empresa !== null 
                    ? `<span style="color: #dc2626; font-weight: 600;">S/ ${Number(inc.monto_asumido_empresa).toFixed(2)}</span>` 
                    : `<span style="color: #94a3b8; font-style: italic;">Por definir</span>`;
                    
                // Asumiendo date extraido desde YYYY-MM-DD
                const fechaDate = new Date(inc.fecha_creacion);
                const fechaStr = fechaDate.toISOString().split('T')[0];

                filasIncidencias += `
                    <tr>
                        <td style="padding: 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                            <span style="background: #fee2e2; color: #dc2626; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; white-space: nowrap;">${inc.tipo_incidencia}</span>
                        </td>
                        <td style="padding: 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top; font-size: 13px; color: var(--text-primary); max-width: 250px; line-height: 1.5;" title="${inc.descripcion_detallada.replace(/"/g, '&quot;')}">
                            <div style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
                                ${inc.descripcion_detallada}
                            </div>
                        </td>
                        <td style="padding: 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top; font-weight: 600; color: var(--text-primary); white-space: nowrap;">
                            S/ ${Number(inc.valor_total_perdida).toFixed(2)}
                        </td>
                        <td style="padding: 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top; font-weight: 600; color: var(--text-primary); white-space: nowrap;">
                            S/ ${Number(inc.gastos_adicionales || 0).toFixed(2)}
                        </td>
                        <td style="padding: 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top; white-space: nowrap;">
                            ${mtoDescuento}
                        </td>
                        <td style="padding: 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top; white-space: nowrap;">
                            ${mtoEmpresa}
                        </td>
                        <td style="padding: 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                            <span style="background: ${bgResolucion}; color: ${colorResolucion}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;">${inc.estado_resolucion}</span>
                        </td>
                        <td style="padding: 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top; font-size: 12px; color: var(--text-secondary); white-space: nowrap;">
                            <span style="color: var(--text-primary); font-weight: 500;">${inc.usuario_registro}</span><br>
                            ${fechaStr}
                        </td>
                    </tr>
                `;
            });

            modalBody.innerHTML = `
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <div style="overflow-x: auto; width: 100%;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px; min-width: 800px; text-align: left;">
                            <thead>
                                <tr>
                                    <th style="padding: 12px 16px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap; font-size: 11px;">Tipo</th>
                                    <th style="padding: 12px 16px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; font-size: 11px;">Descripción</th>
                                    <th style="padding: 12px 16px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap; font-size: 11px;">Pérdida Total</th>
                                    <th style="padding: 12px 16px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap; font-size: 11px;">Gastos Extra</th>
                                    <th style="padding: 12px 16px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap; font-size: 11px;">Descuento a Chofer</th>
                                    <th style="padding: 12px 16px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap; font-size: 11px;">Pérdida Empresa</th>
                                    <th style="padding: 12px 16px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap; font-size: 11px;">Resolución</th>
                                    <th style="padding: 12px 16px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap; font-size: 11px;">Registro</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filasIncidencias}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

        } else {
            modalBody.innerHTML = '<div style="text-align: center; padding: 40px; color: #dc2626;"><i class="fas fa-exclamation-triangle"></i> Error al cargar los detalles.</div>';
        }
    } catch (error) {
        console.error('Error al cargar incidencias del viaje:', error);
        modalBody.innerHTML = '<div style="text-align: center; padding: 40px; color: #dc2626;"><i class="fas fa-exclamation-triangle"></i> Error de conexión.</div>';
    }
}

function cerrarModalIncidencias() {
    document.getElementById('modal-incidencias-viaje').style.display = 'none';
}

async function mostrarFormularioNuevaIncidencia() {
    const modalBody = document.getElementById('modal-incidencias-body');
    const idViaje = document.getElementById('modal-incidencias-viaje').getAttribute('data-id-viaje');
    
    if (document.getElementById('form-nueva-incidencia-container')) return;
    
    // Cambiamos el estilo del modal body para que pueda contener las dos columnas a full height
    modalBody.style.overflowY = 'hidden';
    modalBody.style.padding = '24px';
    
    modalBody.innerHTML = '<div style="text-align: center; width: 100%; padding: 40px; color: var(--text-muted);"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';

    let totalFleteViaje = 0;
    let perdidaTotal = 0;
    let htmlCargas = '';
    let perdidaYaRegistrada = 0;

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const [resCargasReq, resIncidenciasReq] = await Promise.all([
            fetch(`/api/viajes/${idViaje}/cargas`, { headers: { 'x-user-profile': sessionData.id_perfil || 1 } }),
            fetch(`/api/viajes/${idViaje}/incidencias`, { headers: { 'x-user-profile': sessionData.id_perfil || 1 } })
        ]);

        const res = await resCargasReq.json();
        const resInc = await resIncidenciasReq.json();
        
        if (resIncidenciasReq.ok && resInc.success && resInc.data) {
            resInc.data.forEach(inc => {
                perdidaYaRegistrada += Number(inc.valor_total_perdida) || 0;
            });
        }

        if (resCargasReq.ok && res.success) {
            const cargas = res.data;
            
            if (cargas.length === 0) {
                htmlCargas = '<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;">No hay cargas registradas en este viaje.</div>';
            } else {
                cargas.forEach((carga, index) => {
                    const flete = Number(carga.flete_total) || 0;
                    totalFleteViaje += flete;
                    
                    if (carga.estado_entrega === 'Rechazado' || carga.estado_entrega === 'Siniestrado') {
                        perdidaTotal += flete;
                    }

                    // Calcular Kilos
                    let totalKilos = 0;
                    if (carga.detalles && carga.detalles.length > 0) {
                        carga.detalles.forEach(d => totalKilos += Number(d.peso_total));
                    }
                    
                    let txtKilos = `${totalKilos.toFixed(2)} kg`;
                    if (totalKilos > 1000) {
                        txtKilos += ` <span style="font-size: 10px; color: var(--text-muted);">(${(totalKilos/1000).toFixed(2)} Ton)</span>`;
                    }

                    let colorEntrega = '#64748b', bgEntrega = '#f1f5f9', borderEntrega = '#e2e8f0';
                    if (carga.estado_entrega === 'Entregado') { colorEntrega = '#16a34a'; bgEntrega = '#dcfce7'; borderEntrega = '#bbf7d0'; }
                    else if (carga.estado_entrega === 'En ruta') { colorEntrega = '#2563eb'; bgEntrega = '#dbeafe'; borderEntrega = '#bfdbfe'; }
                    else if (carga.estado_entrega === 'Siniestrado') { colorEntrega = '#dc2626'; bgEntrega = '#fee2e2'; borderEntrega = '#fecaca'; }
                    else if (carga.estado_entrega === 'Rechazado') { colorEntrega = '#ea580c'; bgEntrega = '#ffedd5'; borderEntrega = '#fed7aa'; }
                    else { colorEntrega = '#d97706'; bgEntrega = '#fef3c7'; borderEntrega = '#fde68a'; }

                    htmlCargas += `
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div style="flex: 1; padding-right: 8px;">
                                    <span style="font-size: 11px; color: var(--brand-blue); font-weight: 700; display: inline-block; margin-bottom: 4px;">CARGA ${index + 1}</span>
                                    <div style="font-size: 12px; font-weight: 600; color: var(--text-primary); line-height: 1.2;">${carga.remitente_nombre}</div>
                                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;"><i class="fas fa-arrow-down" style="font-size: 10px; margin-right: 4px;"></i>${carga.destinatario_nombre}</div>
                                </div>
                                <span style="background: ${bgEntrega}; color: ${colorEntrega}; border: 1px solid ${borderEntrega}; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; white-space: nowrap;">
                                    ${carga.estado_entrega}
                                </span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #e2e8f0; padding-top: 8px; margin-top: 4px;">
                                <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary);"><i class="fas fa-weight-hanging" style="margin-right: 4px; color: #94a3b8;"></i>${txtKilos}</div>
                                <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">S/ ${flete.toFixed(2)}</div>
                            </div>
                        </div>
                    `;
                });
            }

        } else {
            htmlCargas = '<div style="padding: 16px; text-align: center; color: #dc2626; font-size: 13px;">Error al cargar las cargas.</div>';
        }

    } catch (error) {
        console.error('Error al obtener cargas/incidencias:', error);
        htmlCargas = '<div style="padding: 16px; text-align: center; color: #dc2626; font-size: 13px;">Error de conexión.</div>';
    }

    const fleteCobrable = totalFleteViaje - perdidaTotal;
    
    let remanente = perdidaTotal - perdidaYaRegistrada;
    if (remanente < 0) remanente = 0;

    let inputPerdidaHTML = '';
    let totalRepartirInicial = remanente.toFixed(2);
    if (remanente === 0) {
        inputPerdidaHTML = `
            <input type="number" id="nueva-incidencia-perdida" value="0.00" readonly style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; outline: none; background-color: #f1f5f9; cursor: not-allowed;">
            <label style="display: block; font-size: 10px; font-weight: 600; color: var(--text-secondary); margin-top: 6px;">(Sin remanente)</label>
        `;
        totalRepartirInicial = '0.00';
    } else {
        inputPerdidaHTML = `
            <input type="number" min="0" max="${remanente.toFixed(2)}" step="0.01" id="nueva-incidencia-perdida" value="${remanente.toFixed(2)}" placeholder="0" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; outline: none;">
            <label style="display: block; font-size: 10px; font-weight: 600; color: var(--text-secondary); margin-top: 6px;">(Máx: S/ ${remanente.toFixed(2)})</label>
        `;
    }

    let alertaRemanenteCero = '';
    if (remanente === 0 && perdidaTotal > 0) {
        alertaRemanenteCero = `
            <div style="background: #e0f2fe; color: #0284c7; padding: 12px 16px; border-radius: 6px; border: 1px solid #bae6fd; font-size: 13px; margin-bottom: 20px; display: flex; gap: 10px; align-items: flex-start;">
                <i class="fas fa-info-circle" style="margin-top: 2px;"></i>
                <div>Toda la carga de este viaje ya fue cuadrada. Utilice este formulario solo para registrar gastos adicionales o multas.</div>
            </div>
        `;
    }

    modalBody.innerHTML = `
        <div id="form-nueva-incidencia-container" style="display: grid; grid-template-columns: 1fr 380px; gap: 24px; align-items: stretch; height: 100%; min-height: 0;">
            
            <!-- FORMULARIO IZQUIERDA -->
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; overflow-y: auto;">
                <h4 style="margin: 0 0 20px 0; font-size: 16px; color: var(--text-primary); font-weight: 700;">Nueva Incidencia de Viaje</h4>
                ${alertaRemanenteCero}
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Tipo de Incidencia *</label>
                        <select id="nueva-incidencia-tipo" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; color: var(--text-primary); outline: none;">
                            <option value="Falla Mecánica">Falla Mecánica</option>
                            <option value="Retraso en Ruta">Retraso en Ruta</option>
                            <option value="Daño/Mala Estiba">Daño/Mala Estiba</option>
                            <option value="Faltante / Pérdida">Faltante / Pérdida</option>
                            <option value="Accidente">Accidente</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Estado Resolución</label>
                        <select id="nueva-incidencia-estado" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; color: var(--text-primary); outline: none;">
                            <option value="Pendiente">Pendiente</option>
                            <option value="Resuelto">Resuelto</option>
                        </select>
                    </div>
                </div>

                <div style="margin-bottom: 24px;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Descripción Detallada *</label>
                    <textarea id="nueva-incidencia-descripcion" rows="4" placeholder="Describe detalladamente qué ocurrió..." style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; color: var(--text-primary); outline: none; resize: vertical; box-sizing: border-box;"></textarea>
                </div>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                    <p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-dollar-sign" style="color: var(--text-muted);"></i> Impacto Financiero
                    </p>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Pérdida Total (S/)</label>
                            ${inputPerdidaHTML}
                        </div>
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Gastos Adicionales (S/)</label>
                            <input type="number" min="0" step="0.01" id="nueva-incidencia-gastos" placeholder="0" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; outline: none;">
                        </div>
                    </div>

                    <div style="background: #fee2e2; color: #dc2626; padding: 12px 16px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border: 1px solid #fecaca;">
                        <span style="font-size: 13px; font-weight: 600;">Total a repartir:</span>
                        <span style="font-size: 14px; font-weight: 800;" id="nueva-incidencia-total-repartir">S/ ${totalRepartirInicial}</span>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Descuento a Chofer (S/)</label>
                            <input type="number" min="0" step="0.01" id="nueva-incidencia-descuento" placeholder="0" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; outline: none;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Asumido por Empresa (S/)</label>
                            <input type="number" min="0" step="0.01" id="nueva-incidencia-empresa" placeholder="0" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; outline: none;">
                        </div>
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                    <button id="btn-cancelar-incidencia" style="padding: 8px 16px; background: #f1f5f9; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; color: var(--text-primary); cursor: pointer;">
                        Cancelar
                    </button>
                    <button id="btn-guardar-incidencia" style="padding: 8px 16px; background: #dc2626; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; color: white; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                        <i class="far fa-check-circle"></i> Guardar Incidencia
                    </button>
                </div>
            </div>

            <!-- PANEL LATERAL DERECHA (CARGAS Y RESUMEN) -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; flex-direction: column; height: 100%; overflow: hidden;">
                
                <!-- Header Lateral -->
                <div style="padding: 16px; border-bottom: 1px solid #e2e8f0; background: white; flex-shrink: 0;">
                    <h5 style="margin: 0; font-size: 14px; color: var(--text-primary); font-weight: 700; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-boxes" style="color: var(--brand-blue);"></i> Cargas del Viaje
                    </h5>
                </div>

                <!-- Lista Scrolleable -->
                <div style="flex: 1; overflow-y: auto; padding: 16px;">
                    ${htmlCargas}
                </div>

                <!-- Footer Financiero -->
                <div style="background: white; border-top: 1px solid #e2e8f0; padding: 16px; flex-shrink: 0; box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <h6 style="margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 0.5px;">Resumen Financiero</h6>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 13px; color: var(--text-secondary); font-weight: 600;">Total Flete Viaje</span>
                        <span style="font-size: 13px; color: var(--text-primary); font-weight: 600;">S/ ${totalFleteViaje.toFixed(2)}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <span style="font-size: 13px; color: #dc2626; font-weight: 600;">Pérdida (Rechaz./Sinies.)</span>
                        <span style="font-size: 13px; color: #dc2626; font-weight: 700;">- S/ ${perdidaTotal.toFixed(2)}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
                        <span style="font-size: 14px; color: var(--text-primary); font-weight: 800;">Flete Cobrable Estimado</span>
                        <span style="font-size: 16px; color: #16a34a; font-weight: 800;">S/ ${fleteCobrable.toFixed(2)}</span>
                    </div>
                </div>

            </div>
        </div>
    `;

    setTimeout(() => {
        if (remanente === 0) {
            const el = document.getElementById('nueva-incidencia-gastos');
            if (el) el.focus();
        }
    }, 100);
}

async function guardarIncidencia() {
    const idViaje = document.getElementById('modal-incidencias-viaje').getAttribute('data-id-viaje');
    if (!idViaje) return;

    const tipo = document.getElementById('nueva-incidencia-tipo').value;
    const estado = document.getElementById('nueva-incidencia-estado').value;
    const descripcion = document.getElementById('nueva-incidencia-descripcion').value.trim();
    
    if (!descripcion) {
        alert('Por favor ingresa una descripción detallada.');
        return;
    }

    const perdida = Number(document.getElementById('nueva-incidencia-perdida').value) || 0;
    const gastos = Number(document.getElementById('nueva-incidencia-gastos').value) || 0;
    
    const descChoferVal = document.getElementById('nueva-incidencia-descuento').value.trim();
    const asuEmpresaVal = document.getElementById('nueva-incidencia-empresa').value.trim();

    const descuento = descChoferVal !== '' ? Number(descChoferVal) : null;
    const empresa = asuEmpresaVal !== '' ? Number(asuEmpresaVal) : null;

    if (estado === 'Resuelto') {
        const sumDescuento = descuento || 0;
        const sumEmpresa = empresa || 0;
        const totalRepartir = perdida + gastos;
        if (Math.abs(totalRepartir - (sumDescuento + sumEmpresa)) > 0.01) {
            alert('Para marcar como Resuelto, los montos de descuento y asunción deben cubrir el 100% del costo del incidente.');
            return;
        }
    }

    const btnGuardar = document.getElementById('btn-guardar-incidencia');
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const payload = {
            tipo_incidencia: tipo,
            estado_resolucion: estado,
            descripcion_detallada: descripcion,
            valor_total_perdida: perdida,
            gastos_adicionales: gastos,
            monto_descuento_chofer: descuento,
            monto_asumido_empresa: empresa
        };

        const response = await fetch(`/api/viajes/${idViaje}/incidencias`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-profile': sessionData.id_perfil || 1
            },
            body: JSON.stringify(payload)
        });

        const res = await response.json();
        if (response.ok && res.success) {
            // Recargar modal
            abrirModalIncidencias(idViaje);
            // También recargar el historial por si la alerta roja debe desaparecer/cambiar
            cargarHistorialViajes();
        } else {
            alert(res.message || 'Error al guardar la incidencia.');
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = '<i class="far fa-check-circle"></i> Guardar Incidencia';
        }
    } catch (error) {
        console.error('Error al guardar incidencia:', error);
        alert('Error de conexión al guardar.');
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = '<i class="far fa-check-circle"></i> Guardar Incidencia';
    }
}

async function fetchViajes(isLoadMore = false) {
    const contenedor = document.getElementById('contenedor-tarjetas-viajes');
    const btnCargarMas = document.getElementById('btn-cargar-mas-viajes');
    
    if (!contenedor) return;

    if (!isLoadMore) {
        contenedor.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Cargando viajes...</p></div>';
        if (btnCargarMas) btnCargarMas.style.display = 'none';
    }

    try {
        const textoBuscar = document.getElementById('input-buscar-viaje')?.value || '';
        const estadoFiltro = document.getElementById('select-estado-viaje')?.value || 'todos';
        const fechaSalidaFiltro = document.getElementById('input-fecha-salida')?.value || '';
        const fechaLlegadaFiltro = document.getElementById('input-fecha-llegada')?.value || '';

        const params = new URLSearchParams({
            page: currentPage,
            limit: LIMIT
        });
        if (textoBuscar) params.append('search', textoBuscar);
        if (estadoFiltro !== 'todos') params.append('estado', estadoFiltro);
        if (fechaSalidaFiltro) params.append('fechaSalida', fechaSalidaFiltro);
        if (fechaLlegadaFiltro) params.append('fechaLlegada', fechaLlegadaFiltro);

        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch(`/api/viajes?${params.toString()}`, {
            headers: {
                'x-user-profile': sessionData.id_perfil || 1
            }
        });
        
        const res = await response.json();
        
        if (!isLoadMore) {
            contenedor.innerHTML = '';
        }

        if (response.ok && res.success) {
            const viajes = res.data;
            const totalRecords = res.totalRecords || 0;
            
            if (!isLoadMore) {
                historialViajesTodos = viajes;
            } else {
                historialViajesTodos = historialViajesTodos.concat(viajes);
            }

            loadedRecords += viajes.length;

            renderizarTarjetasViaje(viajes, isLoadMore);

            if (btnCargarMas) {
                if (loadedRecords >= totalRecords || viajes.length === 0) {
                    btnCargarMas.style.display = 'none';
                } else {
                    btnCargarMas.style.display = 'inline-block';
                }
            }
        } else {
            contenedor.innerHTML = '<p style="padding: 20px; color: #dc2626;"><i class="fas fa-exclamation-triangle"></i> Error al cargar los viajes.</p>';
            if (btnCargarMas) btnCargarMas.style.display = 'none';
        }
    } catch (error) {
        console.error('Error al cargar historial:', error);
        contenedor.innerHTML = '<p style="padding: 20px; color: #dc2626;"><i class="fas fa-exclamation-triangle"></i> No se pudo conectar con el servidor.</p>';
        if (btnCargarMas) btnCargarMas.style.display = 'none';
    }
}

function formatFechaCompleta(fechaISO) {
    if (!fechaISO) return '-';
    const date = new Date(fechaISO);
    return date.toLocaleString('es-PE', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    }).replace(',', '');
}

function renderizarTarjetasViaje(viajes, isLoadMore = false) {
    const contenedor = document.getElementById('contenedor-tarjetas-viajes');
    if (!contenedor) return;
    
    if (!document.getElementById('style-pulsing-red')) {
        document.head.insertAdjacentHTML('beforeend', `
            <style id="style-pulsing-red">
                @keyframes pulse-red {
                    0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.6); }
                    70% { box-shadow: 0 0 0 8px rgba(220, 38, 38, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
                }
                .badge-pulsing-red {
                    animation: pulse-red 2s infinite;
                }
                .btn-pulsing-red {
                    animation: pulse-red 2s infinite;
                    background: #dc2626 !important;
                    color: white !important;
                    border: none !important;
                    font-weight: 700 !important;
                }
                .btn-pulsing-red:hover {
                    background: #b91c1c !important;
                }
                @keyframes pulse-orange {
                    0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.6); }
                    70% { box-shadow: 0 0 0 8px rgba(249, 115, 22, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
                }
                .badge-pulsing-orange {
                    animation: pulse-orange 2s infinite;
                }
                .btn-pulsing-orange {
                    animation: pulse-orange 2s infinite;
                    background: #f97316 !important;
                    color: white !important;
                    border: none !important;
                    font-weight: 700 !important;
                }
                .btn-pulsing-orange:hover {
                    background: #ea580c !important;
                }
            </style>
        `);
    }

    if (!isLoadMore) {
        contenedor.innerHTML = '';
    }
    
    if (viajes.length === 0 && !isLoadMore) {
        contenedor.innerHTML = '<p style="padding: 20px; color: var(--text-muted);">No se encontraron viajes con esos filtros.</p>';
        return;
    }
    
    viajes.forEach(viaje => {
        let colorEstado, bgEstado;
        if (viaje.estado_operativo === 'En Ruta') { colorEstado = 'var(--brand-blue)'; bgEstado = '#e0f2fe'; }
        else if (viaje.estado_operativo === 'Llegó a Destino') { colorEstado = '#16a34a'; bgEstado = '#dcfce7'; }
        else if (viaje.estado_operativo === 'Finalizado') { colorEstado = '#475569'; bgEstado = '#f1f5f9'; }
        else { colorEstado = '#dc2626'; bgEstado = '#fee2e2'; } // Incidencia

        const tarjetaHtml = `
            <div class="card-viaje" style="background: #ffffff; border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); display: flex; gap: 24px;">
                <div style="display: flex; flex-direction: column; justify-content: space-between; width: 240px; flex-shrink: 0;">
                    <div style="display: flex; gap: 16px;">
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: #e0f2fe; color: var(--brand-blue); display: flex; justify-content: center; align-items: center; font-size: 20px; flex-shrink: 0;">
                            <i class="fas fa-truck"></i>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-start;">
                            <h3 style="margin: 0 0 4px 0; font-size: 16px; color: var(--text-primary); font-weight: 700;">Viaje #${viaje.id_viaje}</h3>
                            <p style="margin: 0; font-size: 13px; color: var(--text-secondary);">${viaje.ciudad_origen || 'Origen'} - ${viaje.ciudad_destino || 'Destino'}</p>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px; align-items: flex-start;">
                        ${viaje.estado_operativo === 'Incidencia' && !viaje.tiene_incidencia_reportada 
                            ? `<span class="badge-pulsing-red" style="background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-exclamation-circle"></i> Siniestro: Requiere Reporte</span>` 
                            : ''}
                        ${(viaje.estado_operativo === 'Llegó a Destino' || viaje.estado_operativo === 'Finalizado') && viaje.cargas_rechazadas > 0 && !viaje.tiene_incidencia_reportada
                            ? `<span class="badge-pulsing-orange" style="background: #f97316; color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-exclamation-triangle"></i> Reporte: (${viaje.cargas_rechazadas} Carga${viaje.cargas_rechazadas > 1 ? 's' : ''} Rechazada${viaje.cargas_rechazadas > 1 ? 's' : ''})</span>`
                            : ''}
                        ${viaje.id_viaje_origen 
                            ? `<span style="background: #ffedd5; color: #c2410c; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase; display: inline-block;">TRANSBORDO DEL VIAJE #${viaje.id_viaje_origen}</span>` 
                            : ''}
                    </div>
                </div>

                <div style="flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; border-left: 1px solid var(--border-light); padding-left: 24px; align-content: center;">
                    <div>
                        <p style="margin: 0 0 4px 0; font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-truck-moving"></i> Vehículo
                        </p>
                        <p style="margin: 0; font-size: 14px; color: var(--text-primary); font-weight: 500;">${viaje.vehiculo || '-'}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 4px 0; font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; display: flex; align-items: center; gap: 6px;">
                            <i class="far fa-user"></i> Chofer
                        </p>
                        <p style="margin: 0; font-size: 14px; color: var(--text-primary); font-weight: 500;">${viaje.chofer || '-'}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 4px 0; font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; display: flex; align-items: center; gap: 6px;">
                            <i class="far fa-calendar-alt"></i> Fecha Salida
                        </p>
                        <p style="margin: 0; font-size: 14px; color: var(--text-primary); font-weight: 500;">${formatFechaCompleta(viaje.fecha_salida)}</p>
                    </div>

                    <div>
                        <p style="margin: 0 0 4px 0; font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Cargas</p>
                        <p style="margin: 0; font-size: 16px; color: var(--text-primary); font-weight: 700;">${viaje.total_cargas}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 4px 0; font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Peso KG</p>
                        <p style="margin: 0; font-size: 16px; color: var(--text-primary); font-weight: 700;">
                            ${Number(viaje.peso_total_kg).toFixed(2)} 
                            <span style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">(${(Number(viaje.peso_total_kg) / 1000).toFixed(2)} Ton)</span>
                        </p>
                    </div>
                    <div>
                        <p style="margin: 0 0 4px 0; font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; display: flex; align-items: center; gap: 6px;">
                            <i class="far fa-calendar-check"></i> Fecha Llegada
                        </p>
                        <p style="margin: 0; font-size: 14px; color: var(--text-primary); font-weight: 500;">
                            ${(viaje.estado_operativo === 'Llegó a Destino' || viaje.estado_operativo === 'Finalizado') && viaje.fecha_llegada ? formatFechaCompleta(viaje.fecha_llegada) : `<span style="color: ${colorEstado}; font-weight: 600;">${viaje.estado_operativo}</span>`}
                        </p>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 12px; min-width: 140px; border-left: 1px solid var(--border-light); padding-left: 24px;">
                    <span style="background: ${bgEstado}; color: ${colorEstado}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">${viaje.estado_operativo}</span>
                    <div style="display: flex; flex-direction: column; gap: 8px; width: 100%; margin-top: auto;">
                        <button class="btn-viaje btn-ver-detalles" data-id="${viaje.id_viaje}">Ver detalles</button>
                        <button class="btn-viaje btn-ver-cargas" data-id="${viaje.id_viaje}">Ver cargas</button>
                        ${viaje.estado_operativo === 'Incidencia' && !viaje.tiene_incidencia_reportada 
                            ? `<button class="btn-viaje btn-incidencia btn-pulsing-red" data-id="${viaje.id_viaje}"><i class="fas fa-exclamation-circle"></i> Reportar</button>`
                            : (viaje.estado_operativo === 'Llegó a Destino' || viaje.estado_operativo === 'Finalizado') && viaje.cargas_rechazadas > 0 && !viaje.tiene_incidencia_reportada
                                ? `<button class="btn-viaje btn-incidencia btn-pulsing-orange" data-id="${viaje.id_viaje}"><i class="fas fa-exclamation-triangle"></i> Reportar</button>`
                                : `<button class="btn-viaje btn-incidencia" data-id="${viaje.id_viaje}" ${viaje.estado_operativo === 'Incidencia' ? 'style="color: #dc2626; background: #fee2e2;"' : ''}>Ver incidencias</button>`}
                    </div>
                </div>
            </div>
        `;
        
        contenedor.insertAdjacentHTML('beforeend', tarjetaHtml);
    });
}

// Hacer disponible globalmente
window.init_historial_viajes = init_historial_viajes;
