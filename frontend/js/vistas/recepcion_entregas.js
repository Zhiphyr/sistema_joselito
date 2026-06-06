let viajesRecepcionTodos = [];
let cargasGestionActual = [];

async function init_recepcion_entregas() {
    console.log("Inicializando Recepción y Entregas...");
    await cargarViajesRecepcion();

    // Eventos para cerrar el modal
    document.getElementById('btn-cerrar-modal-gestionar-x')?.addEventListener('click', () => {
        document.getElementById('modal-gestionar-entregas').style.display = 'none';
    });
    document.getElementById('btn-cerrar-modal-gestionar-btn')?.addEventListener('click', () => {
        document.getElementById('modal-gestionar-entregas').style.display = 'none';
    });

    // Delegación para Entregar al Cliente
    const modalBody = document.getElementById('modal-gestionar-body');
    if (modalBody && !modalBody.dataset.eventsAttached) {
        modalBody.addEventListener('click', async (e) => {
            const btnEntregar = e.target.closest('.btn-entregar-cliente.pendiente');
            if (btnEntregar) {
                const idCarga = btnEntregar.getAttribute('data-id');
                const idViaje = btnEntregar.getAttribute('data-id-viaje');
                const estadoCobro = btnEntregar.getAttribute('data-estado-cobro');
                const estadoViaje = btnEntregar.getAttribute('data-estado-viaje');
                await confirmarEntregaCarga(idCarga, idViaje, estadoCobro, estadoViaje);
            }
        });
        modalBody.dataset.eventsAttached = 'true';
    }
}

async function confirmarEntregaCarga(idCarga, idViaje, estadoCobro, estadoViaje) {
    if (estadoViaje === 'En Ruta') {
        const confirmParada = await Swal.fire({
            title: 'Parada Intermedia',
            text: '¿Desea registrar la entrega de esta carga como una parada intermedia?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, registrar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#2563eb'
        });
        if (!confirmParada.isConfirmed) return;
    }
    
    if (estadoCobro === 'Pendiente' || estadoCobro === 'Parcial') {
        const confirmDeuda = await Swal.fire({
            title: 'Pago Pendiente',
            text: 'Esta carga tiene un pago pendiente. ¿Desea enviar la deuda a la lista de Fletes por Cobrar?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, aceptar y entregar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d97706'
        });
        if (!confirmDeuda.isConfirmed) return;
    } else {
        const confirmNormal = await Swal.fire({
            title: 'Confirmar Entrega',
            text: '¿Desea registrar esta carga como Entregada al cliente?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, entregar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#16a34a'
        });
        if (!confirmNormal.isConfirmed) return;
    }
    
    try {
        const response = await fetch(`/api/viajes/cargas/${idCarga}/entregar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-user-profile': localStorage.getItem('user_id') || 1
            }
        });
        const data = await response.json();
        
        if (data.success) {
            if (data.viajeFinalizado) {
                Swal.fire('¡Viaje Finalizado!', 'Se han entregado todas las cargas. El viaje ha culminado exitosamente.', 'success');
                document.getElementById('modal-gestionar-entregas').style.display = 'none';
            } else {
                Swal.fire('¡Carga Entregada!', 'La carga ha sido marcada como entregada exitosamente.', 'success');
                abrirModalGestionarEntregas(idViaje, estadoViaje);
            }
            cargarViajesRecepcion(); // Para refrescar la grilla principal
        } else {
            Swal.fire('Error', data.message, 'error');
        }
    } catch (error) {
        console.error('Error al entregar carga:', error);
        Swal.fire('Error', 'Hubo un problema de conexión al procesar la entrega.', 'error');
    }
}

async function cargarViajesRecepcion() {
    try {
        const response = await fetch('/api/viajes/recepcion/activos', {
            headers: {
                'x-user-profile': localStorage.getItem('user_id') || 1
            }
        });
        
        const data = await response.json();
        if (data.success) {
            renderizarTarjetasRecepcion(data.data);
        } else {
            console.error('Error del servidor al obtener viajes:', data.message);
        }
    } catch (error) {
        console.error('Error de red al obtener viajes:', error);
    }
}

function renderizarTarjetasRecepcion(viajes) {
    const contenedor = document.getElementById('contenedor-viajes-recepcion');
    if (!contenedor) return;
    
    contenedor.innerHTML = '';
    
    if (!viajes || viajes.length === 0) {
        contenedor.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-muted); background: white; border-radius: 12px; border: 1px dashed var(--border-light);">
                <i class="fas fa-truck-loading fa-3x" style="margin-bottom: 16px; opacity: 0.5;"></i>
                <h3 style="margin: 0 0 8px 0; color: var(--text-primary);">No hay viajes activos</h3>
                <p style="margin: 0;">Actualmente no hay viajes "En Ruta" ni llegados a destino listos para recepción.</p>
            </div>
        `;
        return;
    }
    
    viajes.forEach(viaje => {
        const esEnRuta = viaje.estado_operativo === 'En Ruta';
        
        // Colores del badge superior
        const badgeColor = esEnRuta ? '#2563eb' : '#16a34a';
        const badgeBg = esEnRuta ? '#eff6ff' : '#dcfce7';
        
        // Fechas
        let fechaSalidaFormateada = '-';
        if (viaje.fecha_salida) {
            const date = new Date(viaje.fecha_salida);
            fechaSalidaFormateada = date.toLocaleString('en-CA', { 
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', hour12: false
            }).replace(',', '');
        }

        let fechaLlegadaValor = '-';
        if (esEnRuta) {
            fechaLlegadaValor = `<span style="color: #2563eb; font-weight: 600;">En Ruta</span>`;
        } else if (viaje.fecha_llegada) {
            const dateLlegada = new Date(viaje.fecha_llegada);
            fechaLlegadaValor = dateLlegada.toLocaleString('en-CA', { 
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', hour12: false
            }).replace(',', '');
        } else {
            fechaLlegadaValor = `<span style="color: #16a34a; font-weight: 600;">Llegó a Destino</span>`;
        }

        const pesoTon = (parseFloat(viaje.peso_total_kg) / 1000).toFixed(1);
        
        let botonLlegadaHtml = '';
        if (esEnRuta) {
            botonLlegadaHtml = `
                <button class="btn-llegada btn-en-ruta" data-id="${viaje.id_viaje}">
                    <i class="far fa-check-circle"></i> Llegada
                </button>
            `;
        } else {
            botonLlegadaHtml = `
                <button class="btn-llegada btn-llegada-registrada" disabled>
                    <i class="far fa-check-circle"></i> Llegada
                </button>
            `;
        }
        
        const tarjetaHtml = `
            <div class="card-recepcion">
                <!-- Header -->
                <div class="card-recepcion-header">
                    <h3>Viaje #${viaje.id_viaje}</h3>
                    <span class="badge-estado" style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeColor}33;">
                        <span class="dot-parpadeo" style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${badgeColor};"></span>
                        ${viaje.estado_operativo}
                    </span>
                </div>
                
                <!-- Destino -->
                <div class="card-row" style="margin-bottom: 24px;">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${viaje.ciudad_origen} - ${viaje.ciudad_destino}</span>
                </div>
                
                <!-- Detalles -->
                <div class="card-detalles">
                    <div class="detalle-item">
                        <i class="fas fa-truck"></i>
                        <div>
                            <span class="detalle-label">VEHÍCULO</span>
                            <span class="detalle-valor principal">${viaje.vehiculo}</span>
                            <span class="detalle-valor secundario">${viaje.vehiculo_nombre || 'Sin nombre'}</span>
                        </div>
                    </div>
                    
                    <div class="detalle-item">
                        <i class="far fa-user"></i>
                        <div>
                            <span class="detalle-label">CHOFER</span>
                            <span class="detalle-valor principal">${viaje.chofer}</span>
                        </div>
                    </div>
                    
                    <div class="detalle-item">
                        <i class="far fa-clock"></i>
                        <div>
                            <span class="detalle-label">FECHA DE SALIDA</span>
                            <span class="detalle-valor principal">${fechaSalidaFormateada}</span>
                        </div>
                    </div>
                    
                    <div class="detalle-item">
                        <i class="far fa-calendar-check"></i>
                        <div>
                            <span class="detalle-label">FECHA DE LLEGADA</span>
                            <span class="detalle-valor principal">${fechaLlegadaValor}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Resumen Cargas -->
                <div class="resumen-cargas">
                    <div class="resumen-item">
                        <i class="fas fa-box"></i>
                        <div>
                            <span class="resumen-label">Cargas</span>
                            <span class="resumen-valor">${viaje.total_cargas}</span>
                        </div>
                    </div>
                    <div class="resumen-divider"></div>
                    <div class="resumen-item">
                        <div>
                            <span class="resumen-label">Peso Total</span>
                            <span class="resumen-valor">${parseFloat(viaje.peso_total_kg).toFixed(2)} kg <span style="color: var(--text-muted); font-size: 9px; font-weight: 500;">(${pesoTon} Ton)</span></span>
                        </div>
                    </div>
                </div>
                
                <!-- Acciones -->
                <div class="card-acciones">
                    <button class="btn-incidencia" data-id="${viaje.id_viaje}">
                        <i class="fas fa-exclamation-triangle"></i> Incidencia
                    </button>
                    ${esEnRuta ? `
                    <button class="btn-transbordo" data-id="${viaje.id_viaje}">
                        <i class="fas fa-exchange-alt"></i> Transbordo
                    </button>
                    ${botonLlegadaHtml}
                    <button class="btn-gestionar" data-id="${viaje.id_viaje}" data-estado="${viaje.estado_operativo}">
                        <i class="fas fa-tasks"></i> Entregas
                    </button>
                    ` : `
                    ${botonLlegadaHtml}
                    <button class="btn-gestionar" data-id="${viaje.id_viaje}" data-estado="${viaje.estado_operativo}" style="grid-column: span 2;">
                        <i class="fas fa-tasks"></i> Entregas
                    </button>
                    `}
                </div>
            </div>
        `;
        
        contenedor.insertAdjacentHTML('beforeend', tarjetaHtml);
    });

    // Delegación de eventos para la botonera
    if (!contenedor.dataset.eventsAttached) {
        contenedor.addEventListener('click', async (e) => {
            // Marcar Llegada
            const btnLlegada = e.target.closest('.btn-en-ruta');
            if (btnLlegada) {
                const idViaje = btnLlegada.getAttribute('data-id');
                await confirmarMarcarLlegada(idViaje);
            }
            
            // Gestionar Entregas
            const btnGestionar = e.target.closest('.btn-gestionar');
            if (btnGestionar) {
                const idViaje = btnGestionar.getAttribute('data-id');
                const estadoOperativo = btnGestionar.getAttribute('data-estado');
                abrirModalGestionarEntregas(idViaje, estadoOperativo);
            }
        });
        contenedor.dataset.eventsAttached = 'true';
    }
}

async function confirmarMarcarLlegada(idViaje) {
    const result = await Swal.fire({
        title: '¿Confirmar Llegada?',
        text: `¿Estás seguro de registrar la llegada del Viaje #${idViaje} a su destino?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, marcar llegada',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`/api/viajes/${idViaje}/llegada`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-profile': localStorage.getItem('user_id') || 1
                }
            });
            const data = await response.json();
            
            if (data.success) {
                Swal.fire('¡Llegada Registrada!', data.message, 'success');
                cargarViajesRecepcion(); // Recargar la grilla automáticamente
            } else {
                Swal.fire('Error', data.message, 'error');
            }
        } catch (error) {
            console.error('Error al marcar llegada:', error);
            Swal.fire('Error', 'Hubo un problema de conexión.', 'error');
        }
    }
}

async function abrirModalGestionarEntregas(idViaje, estadoOperativo) {
    const modal = document.getElementById('modal-gestionar-entregas');
    const tituloViaje = document.getElementById('modal-gestionar-titulo-viaje');
    const body = document.getElementById('modal-gestionar-body');
    
    if (!modal || !body) return;
    
    tituloViaje.textContent = `Viaje #${idViaje}`;
    body.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; padding: 48px; color: var(--text-muted);">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
        </div>
    `;
    modal.style.display = 'flex';
    
    try {
        const response = await fetch(`/api/viajes/${idViaje}/cargas`, {
            headers: {
                'x-user-profile': localStorage.getItem('user_id') || 1
            }
        });
        const data = await response.json();
        
        if (data.success) {
            cargasGestionActual = data.data;
            renderizarCargasGestionar(data.data, idViaje, estadoOperativo);
        } else {
            body.innerHTML = `<div style="text-align: center; color: #dc2626; padding: 24px;">Error: ${data.message}</div>`;
        }
    } catch (error) {
        console.error('Error al obtener cargas:', error);
        body.innerHTML = `<div style="text-align: center; color: #dc2626; padding: 24px;">Error de conexión.</div>`;
    }
}

function renderizarCargasGestionar(cargas, idViaje, estadoOperativo) {
    const body = document.getElementById('modal-gestionar-body');
    body.innerHTML = '';
    
    if (!cargas || cargas.length === 0) {
        body.innerHTML = `
            <div style="text-align: center; padding: 48px; color: var(--text-muted); background: white; border-radius: 8px; border: 1px dashed #cbd5e1;">
                <p>No hay cargas registradas en este viaje.</p>
            </div>
        `;
        return;
    }
    
    cargas.forEach(carga => {
        // Colores de Cobro
        let colorCobro = '#dc2626', bgCobro = '#fef2f2', borderCobro = '#fecaca'; // Rojo para Pendiente por defecto
        if (carga.estado_cobro === 'Completado' || carga.estado_cobro === 'Realizado') { 
            colorCobro = '#16a34a'; bgCobro = '#dcfce7'; borderCobro = '#bbf7d0'; // Verde
        } else if (carga.estado_cobro === 'Parcial') { 
            colorCobro = '#d97706'; bgCobro = '#fef3c7'; borderCobro = '#fde68a'; // Amarillo
        }
        
        let textoCobro = carga.estado_cobro || 'Pendiente';

        // Colores de Entrega
        let colorEntrega = '#2563eb', bgEntrega = '#eff6ff', borderEntrega = '#bfdbfe'; // Azul para En Ruta por defecto
        if (carga.estado_entrega === 'Entregado') { 
            colorEntrega = '#16a34a'; bgEntrega = '#dcfce7'; borderEntrega = '#bbf7d0'; // Verde
        } else if (carga.estado_entrega === 'En Almacen de Destino') { 
            colorEntrega = '#d97706'; bgEntrega = '#fef3c7'; borderEntrega = '#fde68a'; // Amarillo
        }
        
        let btnAccionHtml = '';
        if (carga.estado_entrega === 'Entregado') {
            btnAccionHtml = `
                <div style="display: flex; gap: 8px;">
                    <button class="btn-entregar-cliente entregado" disabled style="width: 100%;">
                        <i class="far fa-check-circle"></i> Carga Entregada
                    </button>
                </div>
            `;
        } else if (carga.estado_entrega === 'Rechazado') {
            btnAccionHtml = `
                <div style="display: flex; gap: 8px;">
                    <button class="btn-entregar-cliente entregado" disabled style="width: 100%; background: #fee2e2; color: #dc2626; border-color: #fecaca;">
                        <i class="fas fa-times"></i> Carga Rechazada
                    </button>
                </div>
            `;
        } else {
            btnAccionHtml = `
                <div style="display: flex; gap: 8px;">
                    <button class="btn-entrega-parcial" data-id="${carga.id_carga}" data-id-viaje="${idViaje}" data-estado-viaje="${estadoOperativo}">
                        <i class="fas fa-box-open"></i> Entrega Parcial
                    </button>
                    <button class="btn-entregar-cliente pendiente" data-id="${carga.id_carga}" data-id-viaje="${idViaje}" data-estado-viaje="${estadoOperativo}" data-estado-cobro="${carga.estado_cobro || 'Pendiente'}">
                        <i class="far fa-check-circle"></i> Entregar al Cliente
                    </button>
                </div>
            `;
        }

        let filasProductos = '';
        let totalBultos = 0;
        let pesoTotal = 0;
        
        if (carga.detalles && carga.detalles.length > 0) {
            carga.detalles.forEach(prod => {
                totalBultos += parseFloat(prod.cantidad_sacos);
                pesoTotal += parseFloat(prod.peso_total);
                
                filasProductos += `
                    <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: var(--text-primary); font-weight: 500;">${prod.producto}</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: center;">
                            <span style="font-size: 10px; font-weight: 700; background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 4px; color: var(--text-secondary);">${prod.marca_visual || '-'}</span>
                        </td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: center; font-weight: 700;">${prod.cantidad_sacos}</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: right; color: var(--text-secondary);">${parseFloat(prod.peso_total).toFixed(0)} kg</td>
                    </tr>
                `;
            });
        }
        
        const cardHtml = `
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column;">
                
                <!-- Header Carga -->
                <div style="padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-cube" style="color: var(--text-muted); font-size: 18px;"></i>
                        <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary);">Carga #${carga.id_carga}</h4>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <span style="background: ${bgCobro}; color: ${colorCobro}; border: 1px solid ${borderCobro}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">Cobro: ${textoCobro}</span>
                        <span style="background: ${bgEntrega}; color: ${colorEntrega}; border: 1px solid ${borderEntrega}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">Entrega: ${carga.estado_entrega || 'En Ruta'}</span>
                    </div>
                </div>

                <!-- Remitente / Destinatario -->
                <div style="padding: 0 20px 16px 20px; display: flex; align-items: center; gap: 24px; border-bottom: 1px solid #f1f5f9;">
                    <div>
                        <span style="display: block; font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;"><i class="far fa-user"></i> Remitente</span>
                        <span style="font-size: 13px; color: var(--text-secondary);">${carga.remitente_nombre}</span>
                    </div>
                    <i class="fas fa-arrow-right" style="color: #cbd5e1; margin-top: 14px;"></i>
                    <div>
                        <span style="display: block; font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;"><i class="fas fa-map-marker-alt"></i> Destinatario</span>
                        <span style="font-size: 13px; color: var(--text-primary); font-weight: 500;">${carga.destinatario_nombre}</span>
                    </div>
                </div>

                <!-- Tabla Productos -->
                <div style="width: 100%; overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr>
                                <th style="text-align: left; padding: 12px 16px; font-size: 10px; font-weight: 700; color: var(--text-muted); border-bottom: 1px solid #e2e8f0;">PRODUCTO</th>
                                <th style="text-align: center; padding: 12px 16px; font-size: 10px; font-weight: 700; color: var(--text-muted); border-bottom: 1px solid #e2e8f0;">MARCA VISUAL</th>
                                <th style="text-align: center; padding: 12px 16px; font-size: 10px; font-weight: 700; color: var(--text-muted); border-bottom: 1px solid #e2e8f0;">CANTIDAD</th>
                                <th style="text-align: right; padding: 12px 16px; font-size: 10px; font-weight: 700; color: var(--text-muted); border-bottom: 1px solid #e2e8f0;">KILOS TOTALES</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filasProductos}
                        </tbody>
                    </table>
                </div>

                <!-- Footer Carga -->
                <div style="padding: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; background: #fafafa;">
                    <div style="display: flex; gap: 24px;">
                        <div>
                            <span style="display: block; font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">TOTAL BULTOS</span>
                            <span style="font-size: 16px; font-weight: 700; color: var(--text-primary);">${totalBultos}</span>
                        </div>
                        <div style="width: 1px; height: 32px; background: #cbd5e1;"></div>
                        <div>
                            <span style="display: block; font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">PESO TOTAL</span>
                            <span style="font-size: 16px; font-weight: 700; color: var(--text-primary);">${pesoTotal.toFixed(0)} kg</span>
                        </div>
                    </div>
                    <div>
                        ${btnAccionHtml}
                    </div>
                </div>

            </div>
        `;
        
        body.insertAdjacentHTML('beforeend', cardHtml);
    });
}

// Inyectar estilos específicos para esta vista si no existen
if (!document.getElementById('recepcion-styles')) {
    const style = document.createElement('style');
    style.id = 'recepcion-styles';
    style.textContent = `

        #modal-gestionar-body > * {
            flex-shrink: 0;
        }

        .card-recepcion {
            background: white;
            border-radius: 12px;
            border: 1px solid var(--border-light);
            padding: 24px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            transition: box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .card-recepcion:hover {
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            border-color: #cbd5e1;
        }
        
        .card-recepcion-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        .card-recepcion-header h3 {
            margin: 0;
            font-size: 18px;
            color: var(--text-primary);
            font-weight: 700;
        }
        .badge-estado {
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        @keyframes blink-dot {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(0.8); }
            100% { opacity: 1; transform: scale(1); }
        }
        
        .dot-parpadeo {
            animation: blink-dot 1.5s infinite ease-in-out;
        }
        
        .card-row {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--text-secondary);
            font-size: 14px;
        }
        
        .card-detalles {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 24px;
        }
        .detalle-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            color: var(--text-muted);
        }
        .detalle-item i {
            margin-top: 2px;
        }
        .detalle-item > div {
            display: flex;
            flex-direction: column;
        }
        .detalle-label {
            font-size: 11px;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            margin-bottom: 2px;
        }
        .detalle-valor.principal {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-primary);
        }
        .detalle-valor.secundario {
            font-size: 12px;
            color: var(--text-secondary);
        }
        
        .resumen-cargas {
            background: #f8fafc;
            border-radius: 8px;
            padding: 16px;
            display: flex;
            align-items: center;
            margin-bottom: 24px;
        }
        .resumen-item {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 12px;
            color: var(--text-muted);
        }
        .resumen-divider {
            width: 1px;
            height: 30px;
            background: #e2e8f0;
            margin: 0 16px;
        }
        .resumen-label {
            display: block;
            font-size: 11px;
            color: var(--text-secondary);
            margin-bottom: 4px;
        }
        .resumen-valor {
            display: block;
            font-size: 14px;
            font-weight: 700;
            color: var(--text-primary);
        }
        
        .card-acciones {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: auto;
        }
        .btn-incidencia, .btn-llegada, .btn-transbordo, .btn-gestionar {
            width: 100%;
            padding: 10px;
            border-radius: 8px;
            border: none;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s;
        }
        .btn-incidencia {
            background: #fef2f2;
            color: #dc2626;
        }
        .btn-incidencia:hover {
            background: #fee2e2;
        }
        .btn-en-ruta {
            background: #2563eb;
            color: white;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
        }
        .btn-en-ruta:hover {
            background: #1d4ed8;
        }
        .btn-llegada-registrada {
            background: #f0fdf4;
            color: #16a34a;
            cursor: not-allowed;
            border: 1px solid #bbf7d0;
        }
        
        .btn-transbordo {
            background: #fff7ed;
            color: #ea580c;
        }
        .btn-transbordo:hover {
            background: #ffedd5;
        }
        
        .btn-gestionar {
            border: 1px solid #e2e8f0;
            background: white;
            color: var(--text-secondary);
        }
        .btn-gestionar:hover {
            background: #f8fafc;
            border-color: #cbd5e1;
            color: var(--text-primary);
        }

        .btn-entregar-cliente {
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
        }
        .btn-entregar-cliente.pendiente {
            background: #16a34a;
            color: white;
            box-shadow: 0 2px 4px rgba(22, 163, 74, 0.2);
        }
        .btn-entregar-cliente.pendiente:hover {
            background: #15803d;
        }
        .btn-entregar-cliente.entregado {
            background: #dcfce7;
            color: #16a34a;
            border: 1px solid #bbf7d0;
            cursor: not-allowed;
        }

        .btn-entrega-parcial {
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            border: 1px solid #cbd5e1;
            background: white;
            color: var(--text-secondary);
            transition: all 0.2s;
        }
        .btn-entrega-parcial:hover {
            background: #f8fafc;
            border-color: #94a3b8;
            color: var(--text-primary);
        }
    `;
    document.head.appendChild(style);
}

function abrirModalEntregaParcial(idCargaStr) {
    const idCarga = Number(idCargaStr);
    const carga = cargasGestionActual.find(c => c.id_carga === idCarga);
    if (!carga) return;

    document.getElementById('modal-parcial-titulo').textContent = `Gestión de Entrega - Carga #${carga.id_carga}`;
    document.getElementById('modal-parcial-remitente').textContent = carga.remitente_nombre || '-';
    document.getElementById('modal-parcial-destinatario').textContent = carga.destinatario_nombre || '-';

    document.getElementById('modal-parcial-step1').style.display = 'block';
    document.getElementById('modal-parcial-step2').style.display = 'none';
    document.getElementById('footer-step1').style.display = 'flex';
    document.getElementById('footer-step2').style.display = 'none';

    const bodyProductos = document.getElementById('modal-parcial-productos');
    bodyProductos.innerHTML = '';

    if (carga.detalles && carga.detalles.length > 0) {
        carga.detalles.forEach((prod, index) => {
            const maxSacos = parseInt(prod.cantidad_sacos);
            const html = `
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 12px; flex-wrap: wrap; gap: 16px;">
                <div>
                    <h4 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: var(--text-primary);">${prod.producto}</h4>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <span style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 12px; color: var(--text-secondary);">Total Original: <span style="font-weight: 700;">${maxSacos}</span></span>
                        <span class="span-marca-visual" style="font-size: 12px; font-style: italic; color: var(--text-muted);">Marca: ${prod.marca_visual || '-'}</span>
                    </div>
                </div>

                <div style="display: flex; gap: 16px;">
                    <div>
                        <label style="display: block; font-size: 10px; font-weight: 700; color: #16a34a; margin-bottom: 4px; text-transform: uppercase;">Aceptados</label>
                        <input type="number" class="input-parcial-aceptado" data-id-detalle="${prod.id_detalle}" data-index="${index}" data-total="${maxSacos}" value="${maxSacos}" min="0" max="${maxSacos}" style="width: 80px; padding: 8px; border: 1px solid #16a34a; border-radius: 6px; font-size: 14px; font-weight: 600; color: #16a34a; outline: none; background: #f0fdf4;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 10px; font-weight: 700; color: #dc2626; margin-bottom: 4px; text-transform: uppercase;">Rechazados</label>
                        <input type="number" class="input-parcial-rechazado" data-id-detalle="${prod.id_detalle}" data-index="${index}" data-total="${maxSacos}" value="0" min="0" max="${maxSacos}" style="width: 80px; padding: 8px; border: 1px solid #dc2626; border-radius: 6px; font-size: 14px; font-weight: 600; color: #dc2626; outline: none; background: white;">
                    </div>
                </div>
            </div>
            `;
            bodyProductos.insertAdjacentHTML('beforeend', html);
        });
    }

    document.getElementById('modal-entrega-parcial').style.display = 'flex';
}

document.addEventListener('click', async (e) => {
    const btnParcial = e.target.closest('.btn-entrega-parcial');
    if (btnParcial) {
        const idCarga = btnParcial.getAttribute('data-id');
        const estadoViaje = btnParcial.getAttribute('data-estado-viaje');
        const carga = cargasGestionActual.find(c => c.id_carga === Number(idCarga));
        const estadoCobro = carga ? carga.estado_cobro : 'Pendiente';

        if (estadoViaje === 'En Ruta') {
            const confirmParada = await Swal.fire({
                title: 'Parada Intermedia',
                text: '¿Desea registrar la entrega de esta carga como una parada intermedia?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, registrar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#2563eb'
            });
            if (!confirmParada.isConfirmed) return;
        }
        
        if (estadoCobro === 'Pendiente' || estadoCobro === 'Parcial') {
            const confirmDeuda = await Swal.fire({
                title: 'Pago Pendiente',
                text: 'Esta carga tiene un pago pendiente. ¿Desea enviar la deuda a la lista de Fletes por Cobrar?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, aceptar y continuar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#d97706'
            });
            if (!confirmDeuda.isConfirmed) return;
        }

        abrirModalEntregaParcial(idCarga);
    }
    
    if (e.target.closest('#btn-cerrar-modal-parcial-x') || e.target.closest('#btn-cerrar-modal-parcial-btn')) {
        const modalParcial = document.getElementById('modal-entrega-parcial');
        if (modalParcial) modalParcial.style.display = 'none';
    }
    
    if (e.target.id === 'modal-entrega-parcial') {
        e.target.style.display = 'none';
    }

    if (e.target.closest('#btn-ver-resumen-parcial')) {
        const aceptadosContainer = document.getElementById('resumen-aceptados-container');
        const rechazadosContainer = document.getElementById('resumen-rechazados-container');
        aceptadosContainer.innerHTML = '';
        rechazadosContainer.innerHTML = '';
        
        let hasRechazados = false;
        let hasAceptados = false;

        const rows = document.querySelectorAll('#modal-parcial-productos > div');
        rows.forEach(row => {
            const nombreProducto = row.querySelector('h4').textContent;
            const marcaText = row.querySelector('.span-marca-visual').textContent;
            
            const inputAceptado = row.querySelector('.input-parcial-aceptado');
            const inputRechazado = row.querySelector('.input-parcial-rechazado');
            
            const aceptados = parseInt(inputAceptado.value) || 0;
            const rechazados = parseInt(inputRechazado.value) || 0;
            
            if (aceptados > 0) {
                hasAceptados = true;
                aceptadosContainer.insertAdjacentHTML('beforeend', `
                    <div style="background: white; border-radius: 6px; padding: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <div>
                            <h5 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: var(--text-primary);">${nombreProducto}</h5>
                            <span style="font-size: 11px; font-style: italic; color: var(--text-muted);">${marcaText}</span>
                        </div>
                        <span style="background: #dcfce7; color: #16a34a; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 12px;">${aceptados} sacos</span>
                    </div>
                `);
            }
            
            if (rechazados > 0) {
                hasRechazados = true;
                rechazadosContainer.insertAdjacentHTML('beforeend', `
                    <div style="background: white; border-radius: 6px; padding: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <div>
                            <h5 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: var(--text-primary);">${nombreProducto}</h5>
                            <span style="font-size: 11px; font-style: italic; color: var(--text-muted);">${marcaText}</span>
                        </div>
                        <span style="background: #fee2e2; color: #dc2626; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 12px;">${rechazados} sacos</span>
                    </div>
                `);
            }
        });
        
        if (!hasAceptados) {
            aceptadosContainer.innerHTML = '<span style="font-size: 12px; font-style: italic; color: var(--text-muted);">No hay productos aceptados.</span>';
        }
        if (!hasRechazados) {
            rechazadosContainer.innerHTML = '<span style="font-size: 12px; font-style: italic; color: #dc2626;">No hay productos rechazados.</span>';
        }

        document.getElementById('modal-parcial-step1').style.display = 'none';
        document.getElementById('footer-step1').style.display = 'none';
        
        document.getElementById('modal-parcial-step2').style.display = 'block';
        document.getElementById('footer-step2').style.display = 'flex';
    }

    if (e.target.closest('#btn-volver-editar-parcial')) {
        document.getElementById('modal-parcial-step2').style.display = 'none';
        document.getElementById('footer-step2').style.display = 'none';
        
        document.getElementById('modal-parcial-step1').style.display = 'block';
        document.getElementById('footer-step1').style.display = 'flex';
    }

    if (e.target.closest('#btn-confirmar-entrega-parcial')) {
        const titulo = document.getElementById('modal-parcial-titulo').textContent;
        const idCarga = parseInt(titulo.split('#')[1]);
        
        const productosAceptados = [];
        const productosRechazados = [];
        
        const rows = document.querySelectorAll('#modal-parcial-productos > div');
        rows.forEach(row => {
            const inputAceptado = row.querySelector('.input-parcial-aceptado');
            const inputRechazado = row.querySelector('.input-parcial-rechazado');
            
            const idDetalle = inputAceptado.getAttribute('data-id-detalle');
            const aceptados = parseInt(inputAceptado.value) || 0;
            const rechazados = parseInt(inputRechazado.value) || 0;
            
            if (aceptados > 0) productosAceptados.push({ id_detalle: idDetalle, cantidad: aceptados });
            if (rechazados > 0) productosRechazados.push({ id_detalle: idDetalle, cantidad: rechazados });
        });

        confirmarEntregaParcialBackend(idCarga, productosAceptados, productosRechazados);
    }
});

async function confirmarEntregaParcialBackend(idCarga, productosAceptados, productosRechazados) {
    const btnConfirmar = document.getElementById('btn-confirmar-entrega-parcial');
    const textoOriginal = btnConfirmar.innerHTML;
    
    try {
        btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        btnConfirmar.disabled = true;

        const response = await fetch(`/api/viajes/cargas/${idCarga}/entrega-parcial`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-profile': localStorage.getItem('user_id') || 1
            },
            body: JSON.stringify({
                productosAceptados,
                productosRechazados
            })
        });

        const data = await response.json();

        if (data.success) {
            if (data.viajeFinalizado) {
                Swal.fire('¡Viaje Finalizado!', 'Se han entregado y/o procesado todas las cargas. El viaje ha culminado exitosamente.', 'success');
                document.getElementById('modal-entrega-parcial').style.display = 'none';
                document.getElementById('modal-gestionar-entregas').style.display = 'none';
            } else {
                Swal.fire({
                    icon: 'success',
                    title: 'Entrega Parcial Registrada',
                    text: data.message
                });
                document.getElementById('modal-entrega-parcial').style.display = 'none';
                document.getElementById('modal-gestionar-entregas').style.display = 'none';
            }
            // Recargar datos
            cargarViajesRecepcion();
        } else {
            Swal.fire('Error', data.message || 'Error al registrar entrega parcial', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'Hubo un problema de conexión al procesar la entrega parcial.', 'error');
    } finally {
        btnConfirmar.innerHTML = textoOriginal;
        btnConfirmar.disabled = false;
    }
}

document.addEventListener('input', (e) => {
    if (e.target.classList.contains('input-parcial-aceptado')) {
        const input = e.target;
        let aceptados = parseInt(input.value) || 0;
        const total = parseInt(input.getAttribute('data-total'));
        
        if (aceptados > total) { aceptados = total; input.value = total; }
        if (aceptados < 0) { aceptados = 0; input.value = 0; }
        
        const rechazados = total - aceptados;
        const row = input.closest('div').parentElement;
        row.querySelector('.input-parcial-rechazado').value = rechazados;
    }
    
    if (e.target.classList.contains('input-parcial-rechazado')) {
        const input = e.target;
        let rechazados = parseInt(input.value) || 0;
        const total = parseInt(input.getAttribute('data-total'));
        
        if (rechazados > total) { rechazados = total; input.value = total; }
        if (rechazados < 0) { rechazados = 0; input.value = 0; }
        
        const aceptados = total - rechazados;
        const row = input.closest('div').parentElement;
        row.querySelector('.input-parcial-aceptado').value = aceptados;
    }
});

// Hacer disponible globalmente
window.init_recepcion_entregas = init_recepcion_entregas;
