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
    
    if (inputBuscar) {
        inputBuscar.addEventListener('input', aplicarFiltrosHistorial);
    }
    if (selectEstado) {
        selectEstado.addEventListener('change', aplicarFiltrosHistorial);
    }
    
    // Delegación de eventos para los botones de las tarjetas
    const contenedor = document.getElementById('contenedor-tarjetas-viajes');
    if (contenedor) {
        contenedor.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-ver-detalles')) {
                const idViaje = e.target.getAttribute('data-id');
                abrirModalDetallesViaje(idViaje);
            }
        });
    }

    // Eventos para cerrar el modal de detalles
    document.getElementById('btn-cerrar-modal-x')?.addEventListener('click', cerrarModalDetallesViaje);
    document.getElementById('btn-cerrar-modal-btn')?.addEventListener('click', cerrarModalDetallesViaje);
    document.getElementById('modal-detalles-viaje')?.addEventListener('click', (e) => {
        if(e.target.id === 'modal-detalles-viaje') cerrarModalDetallesViaje();
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
    } else {
        spanEstado.style.background = '#dcfce7';
        spanEstado.style.color = '#16a34a';
    }

    // Fechas
    document.getElementById('modal-detalle-fecha-salida').textContent = formatFechaCompleta(viaje.fecha_salida);
    if (viaje.estado_operativo === 'En Ruta' || !viaje.fecha_llegada) {
        document.getElementById('modal-detalle-fecha-llegada').textContent = 'En Ruta';
    } else {
        document.getElementById('modal-detalle-fecha-llegada').textContent = formatFechaCompleta(viaje.fecha_llegada);
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
                                 viaje.estado_operativo === 'Llegó a Destino' ? 'llego_destino' : 'finalizado';
            if (estadoActual !== estadoFiltro) return false;
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
        const esEnRuta = viaje.estado_operativo === 'En Ruta';
        const colorEstado = esEnRuta ? 'var(--brand-blue)' : '#16a34a';
        const bgEstado = esEnRuta ? '#e0f2fe' : '#dcfce7';

        const tarjetaHtml = `
            <div class="card-viaje" style="background: #ffffff; border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); display: flex; gap: 24px;">
                
                <div style="display: flex; gap: 16px; min-width: 200px;">
                    <div style="width: 48px; height: 48px; border-radius: 12px; background: #e0f2fe; color: var(--brand-blue); display: flex; justify-content: center; align-items: center; font-size: 20px;">
                        <i class="fas fa-truck"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0 0 4px 0; font-size: 16px; color: var(--text-primary); font-weight: 700;">Viaje #${viaje.id_viaje}</h3>
                        <p style="margin: 0; font-size: 13px; color: var(--text-secondary);">${viaje.ciudad_origen || 'Origen'} - ${viaje.ciudad_destino || 'Destino'}</p>
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
                        <p style="margin: 0 0 4px 0; font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Estado Operativo</p>
                        <p style="margin: 0; font-size: 16px; color: ${colorEstado}; font-weight: 700;">${viaje.estado_operativo}</p>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 12px; min-width: 140px; border-left: 1px solid var(--border-light); padding-left: 24px;">
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
