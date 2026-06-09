let historialViajesTodos = [];

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
    
    if (inputBuscar) {
        inputBuscar.addEventListener('input', aplicarFiltrosHistorial);
    }
    if (selectEstado) {
        selectEstado.addEventListener('change', aplicarFiltrosHistorial);
    }
    if (inputFechaSalida) {
        inputFechaSalida.addEventListener('change', aplicarFiltrosHistorial);
    }
    if (inputFechaLlegada) {
        inputFechaLlegada.addEventListener('change', aplicarFiltrosHistorial);
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
    
    await cargarHistorialViajes();
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

async function cargarHistorialViajes() {
    const contenedor = document.getElementById('contenedor-tarjetas-viajes');
    if (!contenedor) return;
    
    contenedor.innerHTML = '<p style="padding: 20px; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Cargando viajes...</p>';
    
    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch('/api/viajes', {
            headers: {
                'x-user-profile': sessionData.id_perfil || 1
            }
        });
        
        const res = await response.json();
        if (response.ok && res.success) {
            historialViajesTodos = res.data;
            aplicarFiltrosHistorial();
        } else {
            contenedor.innerHTML = '<p style="padding: 20px; color: #dc2626;"><i class="fas fa-exclamation-triangle"></i> Error al cargar los viajes.</p>';
        }
    } catch (error) {
        console.error('Error al cargar historial:', error);
        contenedor.innerHTML = '<p style="padding: 20px; color: #dc2626;"><i class="fas fa-exclamation-triangle"></i> No se pudo conectar con el servidor.</p>';
    }
}

function aplicarFiltrosHistorial() {
    const textoBuscar = document.getElementById('input-buscar-viaje')?.value.toLowerCase() || '';
    const estadoFiltro = document.getElementById('select-estado-viaje')?.value || 'todos';
    const fechaSalidaFiltro = document.getElementById('input-fecha-salida')?.value;
    const fechaLlegadaFiltro = document.getElementById('input-fecha-llegada')?.value;
    
    let filtrados = historialViajesTodos.filter(viaje => {
        // Filtrar por texto (ID, Placa o Chofer)
        const coincideTexto = 
            String(viaje.id_viaje).includes(textoBuscar) || 
            (viaje.vehiculo && viaje.vehiculo.toLowerCase().includes(textoBuscar)) ||
            (viaje.chofer && viaje.chofer.toLowerCase().includes(textoBuscar));
            
        if (!coincideTexto) return false;
        
        // Filtrar por estado
        if (estadoFiltro !== 'todos') {
            const estadoActual = viaje.estado_operativo === 'En Ruta' ? 'en_ruta' : 
                                 viaje.estado_operativo === 'Llegó a Destino' ? 'llego_destino' : 
                                 viaje.estado_operativo === 'Finalizado' ? 'finalizado' : 'incidencia';
            if (estadoActual !== estadoFiltro) return false;
        }

        // Filtrar por fecha de salida
        if (fechaSalidaFiltro) {
            if (!viaje.fecha_salida) return false;
            const dSalida = new Date(viaje.fecha_salida);
            const localDateSalida = `${dSalida.getFullYear()}-${String(dSalida.getMonth() + 1).padStart(2, '0')}-${String(dSalida.getDate()).padStart(2, '0')}`;
            if (localDateSalida !== fechaSalidaFiltro) return false;
        }

        // Filtrar por fecha de llegada
        if (fechaLlegadaFiltro) {
            if (!viaje.fecha_llegada) return false;
            const dLlegada = new Date(viaje.fecha_llegada);
            const localDateLlegada = `${dLlegada.getFullYear()}-${String(dLlegada.getMonth() + 1).padStart(2, '0')}-${String(dLlegada.getDate()).padStart(2, '0')}`;
            if (localDateLlegada !== fechaLlegadaFiltro) return false;
        }
        
        return true;
    });
    
    renderizarTarjetasViaje(filtrados);
}

function formatFechaCompleta(fechaISO) {
    if (!fechaISO) return '-';
    const date = new Date(fechaISO);
    return date.toLocaleString('es-PE', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    }).replace(',', '');
}

function renderizarTarjetasViaje(viajes) {
    const contenedor = document.getElementById('contenedor-tarjetas-viajes');
    if (!contenedor) return;
    
    contenedor.innerHTML = '';
    
    if (viajes.length === 0) {
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
                    ${viaje.id_viaje_origen ? `<div style="margin-top: 12px;"><span style="background: #ffedd5; color: #c2410c; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase; display: inline-block;">TRANSBORDO DEL VIAJE #${viaje.id_viaje_origen}</span></div>` : ''}
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
                        <button class="btn-viaje btn-incidencia" data-id="${viaje.id_viaje}">Ver incidencias</button>
                    </div>
                </div>
            </div>
        `;
        
        contenedor.insertAdjacentHTML('beforeend', tarjetaHtml);
    });
}

// Hacer disponible globalmente
window.init_historial_viajes = init_historial_viajes;
