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
                const tipoAlerta = btn.getAttribute('data-tipo-alerta');
                abrirModalIncidencias(idViaje, tipoAlerta);
            }
            if (e.target.classList.contains('btn-menu-incidencia') || e.target.closest('.btn-menu-incidencia')) {
                const btn = e.target.classList.contains('btn-menu-incidencia') ? e.target : e.target.closest('.btn-menu-incidencia');
                const idViaje = btn.getAttribute('data-id');
                abrirMenuIncidencias(idViaje);
            }
            if (e.target.classList.contains('btn-ver-adelantos') || e.target.closest('.btn-ver-adelantos')) {
                const btn = e.target.classList.contains('btn-ver-adelantos') ? e.target : e.target.closest('.btn-ver-adelantos');
                const idViaje = btn.getAttribute('data-id');
                abrirModalAdelantos(idViaje);
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

    document.getElementById('btn-cerrar-modal-adelantos-x')?.addEventListener('click', cerrarModalAdelantosViaje);
    document.getElementById('btn-cerrar-modal-adelantos-btn')?.addEventListener('click', cerrarModalAdelantosViaje);
    document.getElementById('modal-adelantos-viaje')?.addEventListener('click', (e) => {
        if(e.target.id === 'modal-adelantos-viaje') cerrarModalAdelantosViaje();
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
        const indemnizarInput = document.getElementById('nueva-incidencia-indemnizar');
        const gastosInput = document.getElementById('nueva-incidencia-gastos');
        const descuentoInput = document.getElementById('nueva-incidencia-descuento');
        const empresaInput = document.getElementById('nueva-incidencia-empresa');
        const labelTotal = document.getElementById('nueva-incidencia-total-repartir');

        if (!perdidaInput || !gastosInput || !descuentoInput || !empresaInput || !labelTotal) return;

        const p = Number(perdidaInput.value) || 0;
        const i = indemnizarInput ? (Number(indemnizarInput.value) || 0) : 0;
        const g = Number(gastosInput.value) || 0;
        const adelantoInput = document.getElementById('nueva-incidencia-adelanto');
        const a = adelantoInput ? (Number(adelantoInput.getAttribute('value')) || Number(adelantoInput.value) || 0) : 0;
        const total = p + i + g + a;

        const enforceGlobalDecimal = (input) => {
            let val = input.value;
            if (!val) return;
            if (Number(val) > 99999999.99) {
                input.value = 99999999.99;
            }
        };

        if (targetId === 'nueva-incidencia-perdida' || targetId === 'nueva-incidencia-indemnizar' || targetId === 'nueva-incidencia-gastos') {
            if (gastosInput && targetId === 'nueva-incidencia-gastos') enforceGlobalDecimal(gastosInput);
            
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
            enforceGlobalDecimal(descuentoInput);
            let d = Number(descuentoInput.value) || 0;
            if (d > total) {
                d = total;
                descuentoInput.value = total;
            }
            empresaInput.value = (total - d).toFixed(2);
        } else if (targetId === 'nueva-incidencia-empresa') {
            enforceGlobalDecimal(empresaInput);
            let emp = Number(empresaInput.value) || 0;
            if (emp > total) {
                emp = total;
                empresaInput.value = total;
            }
            descuentoInput.value = (total - emp).toFixed(2);
        }
    });

    document.getElementById('modal-incidencias-body')?.addEventListener('change', (e) => {
        const targetId = e.target.id;
        if (!targetId || !targetId.startsWith('nueva-incidencia-')) return;
        if (e.target.type !== 'number') return;

        let val = Number(e.target.value);
        if (isNaN(val)) val = 0;
        if (val < 0) val = 0;

        if (targetId === 'nueva-incidencia-gastos') {
            if (val > 99999999.99) val = 99999999.99;
        }

        if (e.target.hasAttribute('max')) {
            const maxVal = Number(e.target.getAttribute('max'));
            if (val > maxVal) val = maxVal;
        }

        e.target.value = val.toFixed(2);
        
        // Forzar recalculo en caso de que el valor haya cambiado por el formato/límite
        e.target.dispatchEvent(new Event('input', { bubbles: true }));
    });
    
    await fetchViajes(false);
}

window.finalizarViaje = async function(idViaje) {
    const confirm = await Swal.fire({
        title: '¿Finalizar Viaje?',
        text: 'Al finalizar este viaje, se cerrará la auditoría y ya no podrás registrar nuevas incidencias ni adelantos. ¿Estás seguro?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, finalizar viaje',
        cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
        try {
            const response = await fetch(`/api/viajes/${idViaje}/finalizar`, {
                method: 'PUT'
            });
            const data = await response.json();
            if (data.success) {
                Swal.fire('¡Viaje Finalizado!', data.message, 'success');
                fetchViajes(false);
            } else {
                Swal.fire('Error', data.message || 'No se pudo finalizar el viaje', 'error');
            }
        } catch (error) {
            console.error('Error finalizando viaje:', error);
            Swal.fire('Error', 'Hubo un error de conexión', 'error');
        }
    }
};

function abrirModalDetallesViaje(idStr) {
    const idViaje = Number(idStr);
    const viaje = historialViajesTodos.find(v => v.id_viaje === idViaje);
    if (!viaje) return;

    // Header
    document.getElementById('modal-detalle-titulo').textContent = `Detalles del Viaje #${viaje.id_viaje}`;
    document.getElementById('modal-detalle-ruta').textContent = `${viaje.ciudad_origen || 'Origen'} - ${viaje.ciudad_destino || 'Destino'}`;

    // Estado
    const divEstado = document.getElementById('modal-detalle-estado');
    let colorEstado, bgEstado;
    if (viaje.estado_operativo === 'En Ruta') { colorEstado = 'var(--brand-blue)'; bgEstado = '#e0f2fe'; }
    else if (viaje.estado_operativo === 'Llegó a Destino') { colorEstado = '#16a34a'; bgEstado = '#dcfce7'; }
    else if (viaje.estado_operativo === 'Finalizado') { colorEstado = '#475569'; bgEstado = '#f1f5f9'; }
    else { colorEstado = '#dc2626'; bgEstado = '#fee2e2'; } // Incidencia

    let colorPago, bgPago;
    if (viaje.estado_pagos === 'Liquidado') { colorPago = '#16a34a'; bgPago = '#dcfce7'; }
    else if (viaje.estado_pagos === 'Anulado') { colorPago = '#dc2626'; bgPago = '#fee2e2'; }
    else { colorPago = '#d97706'; bgPago = '#fef3c7'; } // Pendiente o default

    divEstado.innerHTML = `
        <span style="background: ${bgEstado}; color: ${colorEstado}; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 4px;"><i class="fas fa-truck-moving"></i> ${viaje.estado_operativo}</span>
        <span style="background: ${bgPago}; color: ${colorPago}; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 4px;"><i class="fas fa-money-bill-wave"></i> ${viaje.estado_pagos || 'Pendiente'}</span>
    `;

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

function cerrarModalAdelantosViaje() {
    document.getElementById('modal-adelantos-viaje').style.display = 'none';
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
                else if (carga.estado_cobro === 'Parcial') { colorCobro = '#0369a1'; bgCobro = '#e0f2fe'; borderCobro = '#bae6fd'; }
                else if (carga.estado_cobro === 'Anulado') { colorCobro = '#dc2626'; bgCobro = '#fee2e2'; borderCobro = '#fecaca'; }
                else { colorCobro = '#b45309'; bgCobro = '#fef3c7'; borderCobro = '#fde68a'; } // Pendiente o default (amarillo pastel)

                let colorEntrega = '#64748b', bgEntrega = '#f1f5f9', borderEntrega = '#e2e8f0';
                if (carga.estado_entrega === 'Entregado') { colorEntrega = '#16a34a'; bgEntrega = '#dcfce7'; borderEntrega = '#bbf7d0'; }
                else if (carga.estado_entrega === 'En ruta') { colorEntrega = '#2563eb'; bgEntrega = '#dbeafe'; borderEntrega = '#bfdbfe'; }
                else if (carga.estado_entrega === 'Siniestrado' || carga.estado_entrega === 'Rechazado' || carga.estado_entrega === 'Rechazado Total') { colorEntrega = '#dc2626'; bgEntrega = '#fee2e2'; borderEntrega = '#fecaca'; }
                else if (carga.estado_entrega === 'Transbordado') { colorEntrega = '#475569'; bgEntrega = '#f1f5f9'; borderEntrega = '#e2e8f0'; }
                else if (carga.estado_entrega === 'Siniestrado Parcialmente') { colorEntrega = '#9a3412'; bgEntrega = '#ffedd5'; borderEntrega = '#fed7aa'; }
                else if (carga.estado_entrega === 'Entregado Parcialmente') { colorEntrega = '#0284c7'; bgEntrega = '#e0f2fe'; borderEntrega = '#bae6fd'; }
                else { colorEntrega = '#d97706'; bgEntrega = '#fef3c7'; borderEntrega = '#fde68a'; } // En Almacen...

                let isAnulado = carga.estado_cobro === 'Anulado';
                let headerCant = 'CANTIDAD';
                let headerFleteTot = 'SUBTOTAL';
                let footerText = isAnulado ? 'Totales de Carga' : 'Totales de Carga y Flete a Cobrar';
                let colorFleteTotal = isAnulado ? '#dc2626' : '#16a34a';

                let filasProductos = '';
                if (carga.detalles && carga.detalles.length > 0) {
                    carga.detalles.forEach(prod => {
                        let isTransbordado = prod.estado_operativo === 'Transbordado';
                        let isSiniestrado = prod.estado_operativo === 'Siniestrado';
                        let isRechazado = prod.estado_operativo === 'Rechazado';
                        let isEntregado = prod.estado_operativo === 'Entregado';

                        if (isAnulado || prod.estado_operativo === 'Entregado' || prod.estado_operativo === 'Normal') {
                            totalSacos += Number(prod.cantidad_sacos);
                            totalKilos += Number(prod.peso_total);
                            totalFlete += Number(prod.flete_subtotal);
                        }

                        let textColor = 'var(--text-primary)';
                        let secTextColor = 'var(--text-secondary)';
                        let weightColor = 'var(--text-primary)';
                        let fleteColor = 'var(--text-primary)';

                        if (isRechazado) {
                            textColor = '#dc2626';
                            secTextColor = '#f87171';
                            fleteColor = '#dc2626';
                        }

                        let extraBadge = '';
                        if (isTransbordado) {
                            extraBadge = '<br><span style="display: inline-block; margin-top: 4px; padding: 2px 6px; background: #f1f5f9; color: #64748b; border-radius: 4px; font-size: 9px; font-weight: 500;"><i class="fas fa-exchange-alt"></i> Transbordado</span>';
                        } else if (isSiniestrado) {
                            extraBadge = '<br><span style="display: inline-block; margin-top: 4px; padding: 2px 6px; background: #fee2e2; color: #dc2626; border-radius: 4px; font-size: 9px; font-weight: 500;"><i class="fas fa-exclamation-triangle"></i> Siniestro (Merma)</span>';
                        } else if (isRechazado) {
                            extraBadge = '<br><span style="display: inline-block; margin-top: 4px; padding: 2px 6px; background: #fee2e2; color: #dc2626; border-radius: 4px; font-size: 9px; font-weight: 500;"><i class="fas fa-ban"></i> Rechazado</span>';
                        } else if (isEntregado) {
                            extraBadge = '<br><span style="display: inline-block; margin-top: 4px; padding: 2px 6px; background: #dcfce7; color: #16a34a; border-radius: 4px; font-size: 9px; font-weight: 500;"><i class="fas fa-check-double"></i> Entregado</span>';
                        } else {
                            extraBadge = '<br><span style="display: inline-block; margin-top: 4px; padding: 2px 6px; background: #f0fdf4; color: #15803d; border-radius: 4px; font-size: 9px; font-weight: 500;"><i class="fas fa-check"></i> Normal</span>';
                        }

                        filasProductos += `
                            <tr>
                                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: ${textColor}; white-space: nowrap;">${prod.producto || '-'}${extraBadge}</td>
                                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: ${secTextColor};">
                                    <div title="${prod.marca_visual || 'Sin Marca'}" style="max-width: 160px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; white-space: normal;">
                                        ${prod.marca_visual || 'Sin Marca'}
                                    </div>
                                </td>
                                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: center; color: ${textColor}; white-space: nowrap;">${prod.cantidad_sacos}</td>
                                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: center; color: ${secTextColor}; white-space: nowrap;">${prod.peso_unitario} kg</td>
                                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: center; font-weight: 700; color: ${weightColor}; white-space: nowrap;">${Number(prod.peso_total).toFixed(2)} kg</td>
                                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: center; color: ${secTextColor}; white-space: nowrap;">S/ ${Number(prod.precio_peso).toFixed(2)}</td>
                                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700; color: ${fleteColor}; white-space: nowrap;">S/ ${Number(prod.flete_subtotal).toFixed(2)}</td>
                            </tr>
                        `;
                    });
                } else {
                    filasProductos = `<tr><td colspan="7" style="padding: 16px; text-align: center; color: var(--text-muted);">No hay productos registrados en esta carga.</td></tr>`;
                }

                const filaTotales = `
                    <tr style="background: #f8fafc;">
                        <td colspan="2" style="padding: 16px; font-weight: 700; color: var(--text-primary); white-space: nowrap;">${footerText}</td>
                        <td style="padding: 16px; text-align: center; font-weight: 700; color: var(--brand-blue); white-space: nowrap;">${totalSacos} und</td>
                        <td style="padding: 16px; text-align: center; white-space: nowrap;"></td>
                        <td style="padding: 16px; text-align: center; font-weight: 700; color: var(--brand-blue); white-space: nowrap;">${totalKilos.toFixed(2)} kg</td>
                        <td style="padding: 16px; text-align: center; white-space: nowrap;"></td>
                        <td style="padding: 16px; text-align: right; font-weight: 700; color: ${colorFleteTotal}; font-size: 15px; white-space: nowrap;">
                            ${isAnulado 
                                ? `<span style="text-decoration: line-through; opacity: 0.7;">S/ ${totalFlete.toFixed(2)}</span>` 
                                : `S/ ${totalFlete.toFixed(2)}`}
                        </td>
                    </tr>
                `;

                htmlContent += `
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 16px;">
                        <div style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 8px; background: #fafafa;">
                            
                            <!-- Fila 1 -->
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                                <span style="background: #e0f2fe; color: var(--brand-blue); font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 4px; white-space: nowrap;">Carga ${index + 1}</span>
                                
                                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                    <span style="background: ${bgEntrega}; color: ${colorEntrega}; border: 1px solid ${borderEntrega}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">
                                        <i class="fas fa-box"></i> ${carga.estado_entrega || 'En Almacen'}
                                    </span>
                                    <span style="background: ${bgCobro}; color: ${colorCobro}; border: 1px solid ${borderCobro}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">
                                        <i class="fas fa-hand-holding-usd"></i> Cobro: ${carga.estado_cobro || 'Pendiente'}
                                    </span>
                                </div>
                            </div>
                            
                            <!-- Fila 2 -->
                            <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 12px; padding-left: 2px;">
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <i class="fas fa-user" style="color: var(--text-muted); font-size: 13px;"></i>
                                    <span style="font-weight: 600; color: var(--text-primary); font-size: 12px;">${carga.remitente_nombre}</span>
                                </div>
                                <i class="fas fa-arrow-right" style="color: var(--brand-blue); font-size: 14px;"></i>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <i class="fas fa-user" style="color: var(--text-muted); font-size: 13px;"></i>
                                    <span style="font-weight: 600; color: var(--text-primary); font-size: 12px;">${carga.destinatario_nombre}</span>
                                </div>
                            </div>

                        </div>

                        <div style="overflow-x: auto; width: 100%;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 13px; min-width: 750px;">
                                <thead>
                                    <tr>
                                        <th style="text-align: left; padding: 12px 16px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">Producto</th>
                                        <th style="text-align: left; padding: 12px 16px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">Marca Visual</th>
                                        <th style="text-align: center; padding: 12px 16px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">${headerCant}</th>
                                        <th style="text-align: center; padding: 12px 16px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">Peso (U)</th>
                                        <th style="text-align: center; padding: 12px 16px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">Kilos Tot.</th>
                                        <th style="text-align: center; padding: 12px 16px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">Flete x Kg</th>
                                        <th style="text-align: right; padding: 12px 16px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">${headerFleteTot}</th>
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

function abrirMenuIncidencias(idStr) {
    const idViaje = Number(idStr);
    const viaje = historialViajesTodos.find(v => v.id_viaje === idViaje);
    if (!viaje) return;

    let htmlBotones = '';

    if (viaje.productos_siniestrados_sin_justificar > 0) {
        htmlBotones += `<button class="swal2-confirm swal2-styled" style="width: 100%; margin: 2px 0; background-color: #ff8484ff; border: 2px solid #dc2626; border-radius: 10px; color: white; font-weight: 700; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5); box-shadow: inset 5px 5px 10px rgba(0, 0, 0, 0.3); display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="Swal.close(); abrirModalIncidencias(${idViaje}, 'siniestrados');"><i class="fa-solid fa-box"></i>Productos Siniestrados</button>`;
    }
    if ((viaje.estado_operativo === 'Llegó a Destino' || viaje.estado_operativo === 'Finalizado') && viaje.productos_rechazados_sin_justificar > 0) {
        htmlBotones += `<button class="swal2-confirm swal2-styled" style="width: 100%; margin: 2px 0; background-color: #ffa86aff; border: 2px solid #f97316; border-radius: 10px; color: white; font-weight: 700; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5); box-shadow: inset 5px 5px 10px rgba(0, 0, 0, 0.3); display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="Swal.close(); abrirModalIncidencias(${idViaje}, 'rechazados');"><i class="fa-solid fa-box-open"></i>Productos Rechazados</button>`;
    }
    if (viaje.estado_operativo === 'Incidencia' && !viaje.tiene_incidencia_general) {
        htmlBotones += `<button class="swal2-confirm swal2-styled" style="width: 100%; margin: 2px 0; background-color: #ff8484ff; border: 2px solid #dc2626; border-radius: 10px; color: white; font-weight: 700; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5); box-shadow: inset 5px 5px 10px rgba(0, 0, 0, 0.3); display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="Swal.close(); abrirModalIncidencias(${idViaje}, 'reporte_general');"><i class="fa-solid fa-file-invoice-dollar"></i>Gastos del Viaje</button>`;
    }
    if (viaje.tiene_incidencia_reportada) {
        htmlBotones += `<button class="swal2-confirm swal2-styled" style="width: 100%; margin: 2px 0; background-color: #656a72ff; border: 2px solid #475569; border-radius: 10px; color: white; font-weight: 700; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5); box-shadow: inset 5px 5px 10px rgba(0, 0, 0, 0.3); display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="Swal.close(); abrirModalIncidencias(${idViaje}, 'ver');"><i class="fa-solid fa-eye"></i>Ver Incidencias Registradas</button>`;
    }

    Swal.fire({
        title: '¿Qué incidencia desea reportar?',
        html: `<div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">${htmlBotones}</div>`,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Cerrar',
        cancelButtonColor: '#94a3b8',
        width: '400px'
    });
}

async function abrirModalIncidencias(idStr, tipoAlerta = null) {
    const idViaje = Number(idStr);
    const modalIncidencias = document.getElementById('modal-incidencias-viaje');
    const modalBody = document.getElementById('modal-incidencias-body');
    
    // Validar estado de pago o viaje finalizado
    const viajeInfo = historialViajesTodos.find(v => v.id_viaje === idViaje);
    const estaLiquidado = viajeInfo && viajeInfo.estado_pagos === 'Liquidado';
    const estaCerrado = estaLiquidado || (viajeInfo && viajeInfo.estado_operativo === 'Finalizado');
    const esAnulado = viajeInfo && viajeInfo.estado_operativo === 'Incidencia' && viajeInfo.estado_pagos === 'Anulado';
    
    document.getElementById('modal-incidencias-titulo').textContent = `Incidencias del Viaje #${idViaje}`;
    document.getElementById('modal-incidencias-subtitulo').textContent = `Total de incidencias registradas: Cargando...`;
    modalBody.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    
    modalIncidencias.style.display = 'flex';
    modalIncidencias.setAttribute('data-id-viaje', idViaje);

    if (tipoAlerta === 'rechazados') {
        document.getElementById('modal-incidencias-subtitulo').textContent = `Registrar incidencia por cargas rechazadas`;
        return mostrarFormularioNuevaIncidencia(tipoAlerta);
    } else if (tipoAlerta === 'siniestrados') {
        document.getElementById('modal-incidencias-subtitulo').textContent = `Registrar incidencia por productos siniestrados`;
        return mostrarFormularioNuevaIncidencia(tipoAlerta);
    } else if (tipoAlerta === 'reporte_general') {
        document.getElementById('modal-incidencias-subtitulo').textContent = `Registrar reporte general del viaje`;
        return mostrarFormularioNuevaIncidencia(tipoAlerta);
    }

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
                document.getElementById('btn-nueva-incidencia').style.display = 'none';
                
                let btnNuevaEmptyHtml = '';
                if (!estaCerrado) {
                    btnNuevaEmptyHtml = `<button id="btn-nueva-incidencia-empty" style="background: #dc2626; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2); transition: all 0.2s;"><i class="fas fa-plus"></i> Nueva Incidencia</button>`;
                } else {
                    btnNuevaEmptyHtml = `<div style="background: #fef3c7; border: 1px solid #fde68a; color: #d97706; padding: 12px; border-radius: 8px; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;"><i class="fas fa-lock"></i> Este viaje está finalizado/liquidado. No se pueden registrar nuevas incidencias.</div>`;
                }

                modalBody.innerHTML = `
                    <div style="text-align: center; padding: 40px; margin: auto;">
                        <div style="width: 64px; height: 64px; border-radius: 50%; background: #f1f5f9; color: #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 16px;">
                            <i class="fas fa-exclamation"></i>
                        </div>
                        <h4 style="margin: 0 0 8px 0; font-size: 16px; color: var(--text-primary);">Sin incidencias</h4>
                        <p style="margin: 0 0 24px 0; font-size: 14px; color: var(--text-secondary);">Este viaje no tiene ninguna incidencia registrada.</p>
                        ${btnNuevaEmptyHtml}
                    </div>
                `;
                return;
            }

            const bloquearNuevas = estaCerrado;
            if (!bloquearNuevas) {
                document.getElementById('btn-nueva-incidencia').style.display = 'flex';
            } else {
                document.getElementById('btn-nueva-incidencia').style.display = 'none';
            }

            let filasIncidencias = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">';
            incidencias.forEach(inc => {
                // Asumiendo date extraido desde YYYY-MM-DD
                const fechaDate = new Date(inc.fecha_creacion);
                const fechaStr = fechaDate.toISOString().split('T')[0];

                // Badges dynamics
                let badgesHTML = '';
                if (Number(inc.valor_total_perdida) > 0) {
                    badgesHTML += `<span style="background: #fee2e2; color: #dc2626; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-box-open"></i> Pérdida de Carga</span>`;
                }
                if (Number(inc.gastos_adicionales) > 0) {
                    badgesHTML += `<span style="background: #ffedd5; color: #c2410c; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-exclamation-circle"></i> Penalidad / Gasto</span>`;
                }
                if (Number(inc.adelanto_recuperar) > 0) {
                    badgesHTML += `<span style="background: #dcfce7; color: #15803d; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-money-bill-wave"></i> Recuperación Adelanto</span>`;
                }

                if (!badgesHTML) {
                    badgesHTML = `<span style="background: #f1f5f9; color: #475569; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 700;"><i class="fas fa-info-circle"></i> General</span>`;
                }

                // Financial details
                let finHTML = '';
                if (Number(inc.valor_total_perdida) > 0) {
                    finHTML += `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-size: 12px; color: var(--text-secondary);">Pérdida de Productos:</span>
                            <span style="font-size: 13px; color: var(--text-primary); font-weight: 700;">S/ ${Number(inc.valor_total_perdida).toFixed(2)}</span>
                        </div>
                    `;
                }
                if (Number(inc.gastos_adicionales) > 0) {
                    finHTML += `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-size: 12px; color: var(--text-secondary);">Penalidades / Gastos:</span>
                            <span style="font-size: 13px; color: var(--text-primary); font-weight: 700;">S/ ${Number(inc.gastos_adicionales).toFixed(2)}</span>
                        </div>
                    `;
                }
                if (Number(inc.adelanto_recuperar) > 0) {
                    finHTML += `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-size: 12px; color: var(--text-secondary);">Adelanto a Recuperar:</span>
                            <span style="font-size: 13px; color: var(--text-primary); font-weight: 700;">S/ ${Number(inc.adelanto_recuperar).toFixed(2)}</span>
                        </div>
                    `;
                }

                // Asignacion de Montos
                let asignacionHTML = '';
                const mtoDesc = Number(inc.monto_descuento_chofer);
                const mtoEmp = Number(inc.monto_asumido_empresa);
                if (mtoDesc > 0 || mtoEmp > 0) {
                    asignacionHTML = `<div style="border-top: 1px dashed #e2e8f0; margin-top: 10px; padding-top: 10px;">`;
                    if (mtoDesc > 0) {
                        asignacionHTML += `
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <span style="font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px;"><i class="fas fa-user" style="color: #ea580c;"></i> Dcto. a Chofer:</span>
                                <span style="font-size: 13px; color: #ea580c; font-weight: 800;">S/ ${mtoDesc.toFixed(2)}</span>
                            </div>
                        `;
                    }
                    if (mtoEmp > 0) {
                        asignacionHTML += `
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px;"><i class="fas fa-building" style="color: #dc2626;"></i> Asumido por Emp.:</span>
                                <span style="font-size: 13px; color: #dc2626; font-weight: 800;">S/ ${mtoEmp.toFixed(2)}</span>
                            </div>
                        `;
                    }
                    asignacionHTML += `</div>`;
                }

                if (!finHTML && !asignacionHTML) {
                    finHTML = `<div style="font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 10px 0;">Sin impacto financiero registrado.</div>`;
                }

                filasIncidencias += `
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); overflow: hidden; display: flex; flex-direction: column; transition: all 0.3s ease; cursor: default;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 12px 20px -8px rgba(0,0,0,0.15)'; this.style.borderColor='#cbd5e1';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.02)'; this.style.borderColor='#e2e8f0';">
                        <div style="padding: 16px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; display: flex; flex-direction: column; gap: 12px;">
                            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                                ${badgesHTML}
                            </div>
                            <h4 style="margin: 0; font-size: 15px; font-weight: 800; color: var(--text-primary); display: flex; justify-content: space-between; align-items: center;">
                                ${inc.tipo_incidencia}
                                <span style="font-size: 12px; font-weight: 500; color: var(--text-muted);"><i class="far fa-calendar-alt"></i> ${fechaStr}</span>
                            </h4>
                        </div>
                        
                        <div style="padding: 16px; flex: 1; display: flex; flex-direction: column; gap: 16px;">
                            <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 13px; color: var(--text-secondary); line-height: 1.6; font-style: italic; max-height: 100px; overflow-y: auto; border-left: 3px solid #cbd5e1;">
                                "${inc.descripcion_detallada}"
                            </div>
                            
                            <div style="background: white; border: 1px solid #e2e8f0; padding: 16px; border-radius: 10px;">
                                <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); margin-bottom: 12px; letter-spacing: 0.5px; display: flex; align-items: center; gap: 4px;">
                                    <i class="fas fa-wallet"></i> Resumen Financiero
                                </div>
                                ${finHTML}
                                ${asignacionHTML}
                            </div>
                        </div>

                        <div style="padding: 12px 16px; border-top: 1px solid #f1f5f9; background: #fafafa; font-size: 11px; color: var(--text-muted); display: flex; justify-content: flex-end; align-items: center; gap: 6px;">
                            <i class="fas fa-user-edit"></i> Registrado por <strong>${inc.usuario_registro}</strong>
                        </div>
                    </div>
                `;
            });
            filasIncidencias += '</div>';

            modalBody.innerHTML = `
                <div style="padding: 10px 0;">
                    ${filasIncidencias}
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

async function mostrarFormularioNuevaIncidencia(tipoAlerta = null) {
    const modalBody = document.getElementById('modal-incidencias-body');
    const idViajeStr = document.getElementById('modal-incidencias-viaje').getAttribute('data-id-viaje');
    const idViaje = Number(idViajeStr);
    
    if (document.getElementById('form-nueva-incidencia-container')) return;
    
    // Ocultar botón de nueva incidencia del header mientras el form está activo
    document.getElementById('btn-nueva-incidencia').style.display = 'none';
    
    // Cambiamos el estilo del modal body para que pueda contener las dos columnas a full height
    modalBody.style.overflowY = 'hidden';
    modalBody.style.padding = '24px';
    
    modalBody.innerHTML = '<div style="text-align: center; width: 100%; padding: 40px; color: var(--text-muted);"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';

    let totalFleteViaje = 0;
    let perdidaTotal = 0;
    let htmlCargas = '';
    let perdidaYaRegistrada = 0;

    let totalAdelantos = 0;
    
    const viajeInfoGlobal = historialViajesTodos.find(v => v.id_viaje === idViaje);
    const esAnulado = viajeInfoGlobal && viajeInfoGlobal.estado_operativo === 'Incidencia' && viajeInfoGlobal.estado_pagos === 'Anulado' && tipoAlerta === 'reporte_general';

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');

        const reqs = [
            fetch(`/api/viajes/${idViaje}/cargas`, { headers: { 'x-user-profile': sessionData.id_perfil || 1 } }),
            fetch(`/api/viajes/${idViaje}/incidencias`, { headers: { 'x-user-profile': sessionData.id_perfil || 1 } })
        ];
        if (esAnulado) {
            reqs.push(fetch(`/api/viajes/${idViaje}/adelantos`, { headers: { 'x-user-profile': sessionData.id_perfil || 1 } }));
        }

        const responses = await Promise.all(reqs);
        const resCargasReq = responses[0];
        const resIncidenciasReq = responses[1];
        const resAdelantosReq = responses[2];

        const res = await resCargasReq.json();
        const resInc = await resIncidenciasReq.json();
        
        if (esAnulado && resAdelantosReq && resAdelantosReq.ok) {
            const resAdelantos = await resAdelantosReq.json();
            if (resAdelantos.success) {
                totalAdelantos = Number(resAdelantos.total_adelantos) || 0;
            }
        }
        
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
                    let colorEntrega = '#64748b', bgEntrega = '#f1f5f9', borderEntrega = '#e2e8f0';
                    if (carga.estado_entrega === 'Entregado') { colorEntrega = '#16a34a'; bgEntrega = '#dcfce7'; borderEntrega = '#bbf7d0'; }
                    else if (carga.estado_entrega === 'En ruta') { colorEntrega = '#2563eb'; bgEntrega = '#dbeafe'; borderEntrega = '#bfdbfe'; }
                    else if (carga.estado_entrega === 'Siniestrado' || carga.estado_entrega === 'Rechazado' || carga.estado_entrega === 'Rechazado Total') { colorEntrega = '#dc2626'; bgEntrega = '#fee2e2'; borderEntrega = '#fecaca'; }
                    else if (carga.estado_entrega === 'Transbordado') { colorEntrega = '#475569'; bgEntrega = '#f1f5f9'; borderEntrega = '#e2e8f0'; }
                    else if (carga.estado_entrega === 'Siniestrado Parcialmente') { colorEntrega = '#9a3412'; bgEntrega = '#ffedd5'; borderEntrega = '#fed7aa'; }
                    else if (carga.estado_entrega === 'Entregado Parcialmente') { colorEntrega = '#0284c7'; bgEntrega = '#e0f2fe'; borderEntrega = '#bae6fd'; }
                    else { colorEntrega = '#d97706'; bgEntrega = '#fef3c7'; borderEntrega = '#fde68a'; }

                    let colorCobro = '#d97706', bgCobro = '#fef3c7', borderCobro = '#fde68a', iconCobro = 'fa-clock';
                    if (carga.estado_cobro === 'Liquidado') { colorCobro = '#16a34a'; bgCobro = '#dcfce7'; borderCobro = '#bbf7d0'; iconCobro = 'fa-check-double'; }
                    else if (carga.estado_cobro === 'Anulado') { colorCobro = '#dc2626'; bgCobro = '#fee2e2'; borderCobro = '#fecaca'; iconCobro = 'fa-ban'; }

                    let htmlDetalles = '';
                    let totalCargaFlete = 0;

                    if (carga.detalles && carga.detalles.length > 0) {
                        carga.detalles.forEach(d => {
                            let subtotal = Number(d.flete_subtotal) || 0;
                            totalCargaFlete += subtotal;
                            totalFleteViaje += subtotal; // sumamos todo al flete total histórico
                            
                            if (d.estado_operativo === 'Rechazado' || d.estado_operativo === 'Siniestrado') {
                                perdidaTotal += subtotal;
                            }
                            
                            let colorDetalle = '#15803d', bgDetalle = '#f0fdf4';
                            if (d.estado_operativo === 'Siniestrado' || d.estado_operativo === 'Rechazado') { colorDetalle = '#dc2626'; bgDetalle = '#fee2e2'; }
                            else if (d.estado_operativo === 'Transbordado') { colorDetalle = '#475569'; bgDetalle = '#f1f5f9'; }
                            else if (d.estado_operativo === 'Entregado') { colorDetalle = '#16a34a'; bgDetalle = '#dcfce7'; }

                            let inputCheckbox = '';
                            let dynamicInput = '';
                            let isRechazados = tipoAlerta === 'rechazados';
                            let isSiniestrados = tipoAlerta === 'siniestrados';
                            
                            if ((isRechazados && d.estado_operativo === 'Rechazado' && d.incidencia_justificada === 1) || 
                                (isSiniestrados && d.estado_operativo === 'Siniestrado' && d.incidencia_justificada === 1)) {
                                inputCheckbox = `<input type="checkbox" class="chk-detalle-rechazado" data-id="${d.id_detalle}" data-carga="${carga.id_carga}" data-flete="${subtotal.toFixed(2)}" data-cantidad="${d.cantidad_sacos}" style="accent-color: #ea580c; width: 16px; height: 16px; cursor: pointer; margin-top: 2px;">`;
                                dynamicInput = `
                                    <div class="container-precio-unitario" id="container-precio-${d.id_detalle}" style="display: none; padding-left: 24px; margin-top: 6px; padding-bottom: 6px; border-bottom: 1px dashed #e2e8f0;">
                                        <div style="display: flex; align-items: center; justify-content: space-between; background: #fff7ed; padding: 6px 12px; border-radius: 6px; border: 1px solid #ffedd5;">
                                            <label style="font-size: 11px; font-weight: 700; color: #c2410c;">Precio Acordado por Unidad (S/)</label>
                                            <input type="number" min="0" step="0.01" class="input-precio-unitario" data-id="${d.id_detalle}" data-cantidad="${d.cantidad_sacos}" placeholder="0.00" style="width: 80px; padding: 4px 8px; border: 1px solid #fdba74; border-radius: 4px; font-size: 12px; text-align: right; outline: none; background: white;">
                                        </div>
                                    </div>
                                `;
                            }

                            htmlDetalles += `
                                <div style="display: grid; grid-template-columns: ${inputCheckbox ? 'auto ' : ''}3fr 1fr 1.5fr; gap: 8px; padding: 8px 0; ${dynamicInput ? '' : 'border-bottom: 1px dashed #e2e8f0;'} align-items: start;">
                                    ${inputCheckbox ? `<div>${inputCheckbox}</div>` : ''}
                                    <div style="display: flex; flex-direction: column; gap: 4px; overflow: hidden;">
                                        <div style="font-size: 11px; color: var(--text-primary); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${d.producto || 'Producto'}">${d.producto || 'Producto'}</div>
                                        <div>
                                            <span style="font-size: 9px; font-weight: 800; background: ${bgDetalle}; color: ${colorDetalle}; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; display: inline-block;">
                                                ${d.estado_operativo}
                                            </span>
                                            ${(d.estado_operativo === 'Rechazado' || d.estado_operativo === 'Siniestrado') && d.incidencia_justificada === 0 ? `
                                            <span style="font-size: 8px; font-weight: 800; background: #f1f5f9; color: #64748b; padding: 2px 4px; border-radius: 4px; text-transform: uppercase; display: inline-block; margin-left: 4px; border: 1px solid #cbd5e1;" title="Ya se registró una incidencia para este producto">
                                                <i class="fas fa-check-double" style="margin-right: 2px;"></i> REGISTRADA
                                            </span>
                                            ` : ''}
                                        </div>
                                    </div>
                                    <div style="font-size: 11px; color: var(--text-muted); font-weight: 600; text-align: center; margin-top: 1px;">${d.cantidad_sacos} ud.</div>
                                    <div style="font-size: 11px; font-weight: 800; color: var(--text-primary); text-align: right; margin-top: 1px;">S/ ${subtotal.toFixed(2)}</div>
                                </div>
                                ${dynamicInput}
                            `;
                        });
                    }

                    htmlCargas += `
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                <span style="font-size: 11px; color: var(--brand-blue); font-weight: 800; text-transform: uppercase;">CARGA ${index + 1}</span>
                                <div style="display: flex; gap: 4px;">
                                    <span style="background: ${bgEntrega}; color: ${colorEntrega}; border: 1px solid ${borderEntrega}; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase;">
                                        ${carga.estado_entrega}
                                    </span>
                                    <span style="background: ${bgCobro}; color: ${colorCobro}; border: 1px solid ${borderCobro}; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; display: flex; align-items: center; gap: 3px;">
                                        <i class="fas ${iconCobro}"></i> ${carga.estado_cobro || 'Pendiente'}
                                    </span>
                                </div>
                            </div>
                            
                            <div style="background: #f8fafc; padding: 8px; border-radius: 6px; margin-bottom: 8px;">
                                <div style="font-size: 11px; font-weight: 700; color: var(--text-primary); line-height: 1.3;">${carga.remitente_nombre}</div>
                                <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px; display: flex; align-items: flex-start; gap: 4px;">
                                    <i class="fas fa-arrow-down" style="margin-top: 2px;"></i> ${carga.destinatario_nombre}
                                </div>
                            </div>

                            <div style="padding-top: 4px;">
                                ${htmlDetalles || '<div style="font-size: 11px; color: var(--text-muted); text-align: center;">Sin detalles registrados.</div>'}
                            </div>
                            
                            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #e2e8f0; padding-top: 8px; margin-top: 8px;">
                                <div style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Total de la carga</div>
                                <div style="font-size: 12px; font-weight: 800; color: var(--text-primary);">S/ ${totalCargaFlete.toFixed(2)}</div>
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
    let totalRepartirInicialNum = remanente + (esAnulado ? totalAdelantos : 0);
    let totalRepartirInicial = totalRepartirInicialNum.toFixed(2);
    
    let isRechazados = tipoAlerta === 'rechazados';
    let isSiniestrados = tipoAlerta === 'siniestrados';
    let isReporteGeneral = tipoAlerta === 'reporte_general';

    if (isRechazados || isSiniestrados) {
        inputPerdidaHTML = `
            <input type="number" id="nueva-incidencia-perdida" value="0.00" readonly style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; outline: none; background-color: #f1f5f9; cursor: not-allowed; color: #dc2626; font-weight: 700;">
            <label style="display: block; font-size: 10px; font-weight: 600; color: var(--text-secondary); margin-bottom: 0px;">(Calculado automáticamente)</label>
        `;
        totalRepartirInicialNum = (esAnulado ? totalAdelantos : 0);
        totalRepartirInicial = totalRepartirInicialNum.toFixed(2);
    } else {
        // Formulario Neutral o Reporte General
        inputPerdidaHTML = `
            <input type="number" id="nueva-incidencia-perdida" value="0.00" readonly style="display:none;">
        `;
        totalRepartirInicialNum = (esAnulado ? totalAdelantos : 0);
        totalRepartirInicial = totalRepartirInicialNum.toFixed(2);
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

    let alertaAdelantos = '';
    let colAdelantoHTML = '';
    
    // Dynamic Grid Layout for Impacto Financiero
    let gridTemplateCols = '1fr';
    if (isRechazados || isSiniestrados) {
        gridTemplateCols = '1fr 1fr';
    } else if (esAnulado) {
        gridTemplateCols = '1fr 1fr';
    }

    if (esAnulado) {
        if (totalAdelantos > 0) {
            alertaAdelantos = `
                <div style="background: #fef08a; color: #854d0e; padding: 12px 16px; border-radius: 6px; border: 1px solid #fde047; font-size: 13px; margin-bottom: 20px; display: flex; gap: 10px; align-items: flex-start;">
                    <i class="fas fa-exclamation-triangle" style="margin-top: 2px;"></i>
                    <div>Este viaje anulado tiene <strong>S/ ${totalAdelantos.toFixed(2)}</strong> en adelantos entregados al chofer. Asegúrate de cuadrar la recuperación de este dinero.</div>
                </div>
            `;
        }
        colAdelantoHTML = `
            <div>
                <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Adelanto<br>Recuperar (S/)</label>
                <input type="number" id="nueva-incidencia-adelanto" value="${totalAdelantos.toFixed(2)}" readonly style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; outline: none; background-color: #f1f5f9; cursor: not-allowed; color: #ca8a04; font-weight: 700;">
            </div>
        `;
    }

    modalBody.innerHTML = `
        <div id="form-nueva-incidencia-container" style="display: grid; grid-template-columns: 1fr 380px; gap: 24px; align-items: stretch; height: 100%; min-height: 0;">
            
            <!-- FORMULARIO IZQUIERDA -->
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; overflow-y: auto;">
                <h4 style="margin: 0 0 20px 0; font-size: 16px; color: var(--text-primary); font-weight: 700;">Nueva Incidencia de Viaje</h4>
                ${alertaRemanenteCero}
                ${alertaAdelantos}
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Tipo de Incidencia *</label>
                    <select id="nueva-incidencia-tipo" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; color: var(--text-primary); outline: none;">
                        <option value="Retraso en Ruta">Retraso en Ruta</option>
                        <option value="Daño / Mala Estiba"${isRechazados ? ' selected' : ''}>Daño / Mala Estiba</option>
                        <option value="Faltante / Pérdida / Robo">Faltante / Pérdida / Robo</option>
                        <option value="Accidente"${isSiniestrados || isReporteGeneral ? ' selected' : ''}>Accidente</option>
                        <option value="Falla Mecánica">Falla Mecánica</option>
                        <option value="Queja de Cliente / Administrativo">Queja de Cliente / Administrativo</option>
                        <option value="Otro">Otro</option>
                    </select>
                </div>
                
                ${(isRechazados || isSiniestrados) ? `
                <div style="margin-bottom: 16px; padding: 12px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px;">
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #c2410c; cursor: not-allowed;">
                        <input type="checkbox" id="chk-vincular-rechazados" checked onclick="return false;" style="accent-color: #ea580c; width: 16px; height: 16px; cursor: not-allowed;">
                        Vincular Productos ${isRechazados ? 'Rechazados' : 'Siniestrados'}
                    </label>
                    <p style="margin: 4px 0 0 24px; font-size: 11px; color: #ea580c;">Seleccione las cargas en el panel lateral. La pérdida se calculará automáticamente.</p>
                </div>
                ` : ''}

                <div style="margin-bottom: 24px;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Descripción Detallada *</label>
                    <textarea id="nueva-incidencia-descripcion" rows="4" placeholder="Describe detalladamente qué ocurrió..." style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; color: var(--text-primary); outline: none; resize: vertical; box-sizing: border-box;"></textarea>
                </div>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                    <p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-dollar-sign" style="color: var(--text-muted);"></i> Impacto Financiero
                    </p>
                    
                    <div style="display: grid; grid-template-columns: ${gridTemplateCols}; gap: 16px; margin-bottom: 16px;">
                        ${(isRechazados || isSiniestrados) ? `
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Flete Perdido (S/)${(esAnulado && totalAdelantos > 0) ? '<br>&nbsp;' : ''}</label>
                            ${inputPerdidaHTML}
                        </div>
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Indemnización Cliente (S/)${(esAnulado && totalAdelantos > 0) ? '<br>&nbsp;' : ''}</label>
                            <input type="number" min="0" step="0.01" id="nueva-incidencia-indemnizar" value="0.00" readonly style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; outline: none; background-color: #f1f5f9; cursor: not-allowed; color: #c2410c; font-weight: 700;">
                            <label style="display: block; font-size: 10px; font-weight: 600; color: var(--text-secondary); margin-bottom: 0px;">(Calculado automáticamente)</label>
                            <input type="hidden" id="nueva-incidencia-gastos" value="0">
                        </div>
                        ` : `
                        <div>
                            ${inputPerdidaHTML}
                            <input type="hidden" id="nueva-incidencia-indemnizar" value="0">
                            <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Penalidad / Otros Cargos (S/)${(esAnulado && totalAdelantos > 0) ? '&nbsp;' : ''}</label>
                            <input type="number" min="0" step="0.01" id="nueva-incidencia-gastos" placeholder="0" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; outline: none;">
                        </div>
                        `}
                        ${colAdelantoHTML}
                    </div>

                    <div style="background: #fee2e2; color: #dc2626; padding: 12px 16px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border: 1px solid #fecaca;">
                        <span style="font-size: 13px; font-weight: 600;">Total a repartir:</span>
                        <span style="font-size: 14px; font-weight: 800;" id="nueva-incidencia-total-repartir">S/ ${totalRepartirInicial}</span>
                    </div>

                    <h6 style="margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 0.5px;">Asignación de Montos</h6>
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
                ${(isRechazados || isSiniestrados) ? `
                <div style="background: white; border-top: 1px solid #e2e8f0; padding: 16px; flex-shrink: 0; box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <h6 style="margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 0.5px;">Resumen Financiero</h6>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 13px; color: var(--text-secondary); font-weight: 600;">Seleccione los productos para calcular la pérdida.</span>
                    </div>
                </div>
                ` : ''}

            </div>
        </div>
    `;

    setTimeout(() => {
        if (!(isRechazados || isSiniestrados) && remanente === 0) {
            const el = document.getElementById('nueva-incidencia-gastos');
            if (el) el.focus();
        }

        if (isRechazados || isSiniestrados) {
            const checkboxes = document.querySelectorAll('.chk-detalle-rechazado');
            
            // Función para formatear a DECIMAL(10,2)
            const enforceDecimal10_2 = (input) => {
                let val = input.value;
                if (!val) return;
                
                // Si el número es extremadamente grande, cortarlo
                if (Number(val) > 99999999.99) {
                    input.value = 99999999.99;
                }
            };
            
            // Función para recalcular la indemnización total
            const recalcularIndemnizacion = () => {
                let totalI = 0;
                document.querySelectorAll('.chk-detalle-rechazado:checked').forEach(c => {
                    const id = c.getAttribute('data-id');
                    const qty = Number(c.getAttribute('data-cantidad')) || 0;
                    const inputPrecio = document.querySelector(`.input-precio-unitario[data-id="${id}"]`);
                    if (inputPrecio) {
                        const precio = Number(inputPrecio.value) || 0;
                        totalI += (precio * qty);
                    }
                });
                document.getElementById('nueva-incidencia-indemnizar').value = totalI.toFixed(2);
                const event = new Event('input', { bubbles: true });
                document.getElementById('nueva-incidencia-indemnizar').dispatchEvent(event);
            };

            // Escuchar cambios en los inputs de precios unitarios
            document.querySelectorAll('.input-precio-unitario').forEach(input => {
                input.addEventListener('input', (e) => {
                    enforceDecimal10_2(e.target);
                    e.target.style.borderColor = '#fdba74'; // Quitar rojo al escribir
                    recalcularIndemnizacion();
                });
                input.addEventListener('blur', (e) => {
                    if(e.target.value !== '') e.target.value = Number(e.target.value).toFixed(2);
                });
            });

            checkboxes.forEach(chk => {
                chk.addEventListener('change', (e) => {
                    let totalP = 0;
                    let checkedCarga = null;
                    
                    const idDetalle = e.target.getAttribute('data-id');
                    const containerPrecio = document.getElementById(`container-precio-${idDetalle}`);
                    if (containerPrecio) {
                        containerPrecio.style.display = e.target.checked ? 'block' : 'none';
                        if (!e.target.checked) {
                            // Limpiar valor si se deselecciona
                            const inputPrecio = containerPrecio.querySelector('.input-precio-unitario');
                            if (inputPrecio) inputPrecio.value = '';
                        }
                    }
                    
                    document.querySelectorAll('.chk-detalle-rechazado:checked').forEach(c => {
                        totalP += Number(c.getAttribute('data-flete')) || 0;
                        checkedCarga = c.getAttribute('data-carga');
                    });
                    
                    // Bloquear checkboxes de otras cargas
                    checkboxes.forEach(c => {
                        if (checkedCarga && c.getAttribute('data-carga') !== checkedCarga) {
                            c.disabled = true;
                            c.parentElement.style.opacity = '0.5';
                        } else {
                            c.disabled = false;
                            c.parentElement.style.opacity = '1';
                        }
                    });

                    document.getElementById('nueva-incidencia-perdida').value = totalP.toFixed(2);
                    
                    recalcularIndemnizacion();
                    
                    // Disparar evento input para que el listener global actualice los cálculos
                    const event = new Event('input', { bubbles: true });
                    document.getElementById('nueva-incidencia-perdida').dispatchEvent(event);
                });
            });
        }

    }, 100);
}

async function guardarIncidencia() {
    const idViaje = document.getElementById('modal-incidencias-viaje').getAttribute('data-id-viaje');
    if (!idViaje) return;

    const tipo = document.getElementById('nueva-incidencia-tipo').value;
    const descripcionElem = document.getElementById('nueva-incidencia-descripcion');
    let descripcion = descripcionElem.value.trim();
    
    if (!descripcion) {
        descripcionElem.style.borderColor = 'red';
        Swal.fire({
            title: 'Faltan datos',
            text: 'Por favor ingresa una descripción detallada.',
            icon: 'warning',
            confirmButtonColor: '#dc2626'
        });
        return;
    } else {
        descripcionElem.style.borderColor = '#cbd5e1'; // Reset
    }

    // Sanitización básica para prevenir XSS/inyecciones en frontend
    descripcion = descripcion.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const chkVincular = document.getElementById('chk-vincular-rechazados');
    const detalles_rechazados = [];
    let id_carga = null;
    let hasError = false;
    
    if (chkVincular && chkVincular.checked) {
        document.querySelectorAll('.chk-detalle-rechazado:checked').forEach(chk => {
            const id_det = Number(chk.getAttribute('data-id'));
            const qty = Number(chk.getAttribute('data-cantidad')) || 0;
            const inputPrecio = document.querySelector(`.input-precio-unitario[data-id="${id_det}"]`);
            let precio = 0;
            if (inputPrecio) {
                if (inputPrecio.value === '') {
                    inputPrecio.style.borderColor = 'red';
                    hasError = true;
                } else {
                    inputPrecio.style.borderColor = '#fdba74'; // Reset
                    precio = Number(inputPrecio.value) || 0;
                }
            }
            detalles_rechazados.push({
                id_detalle: id_det,
                precio_unitario: precio,
                subtotal: precio * qty
            });
            if (!id_carga) id_carga = Number(chk.getAttribute('data-carga'));
        });
        
        if (hasError) {
            Swal.fire({
                title: 'Precios Pendientes',
                text: 'Por favor ingresa el Precio Acordado por Unidad para todos los productos seleccionados',
                icon: 'warning',
                confirmButtonColor: '#dc2626'
            });
            return;
        }

        if (detalles_rechazados.length === 0) {
            Swal.fire({
                title: 'Faltan datos',
                text: 'Debe seleccionar al menos un producto rechazado a vincular para calcular la pérdida a reportar.',
                icon: 'warning',
                confirmButtonColor: '#dc2626'
            });
            return;
        }
    }

    const perdida = Number(document.getElementById('nueva-incidencia-perdida').value) || 0;
    const indemnizarElem = document.getElementById('nueva-incidencia-indemnizar');
    const indemnizar = indemnizarElem ? (Number(indemnizarElem.value) || 0) : 0;
    const gastos = Number(document.getElementById('nueva-incidencia-gastos').value) || 0;
    const adelantoElem = document.getElementById('nueva-incidencia-adelanto');
    const adelanto = adelantoElem ? (Number(adelantoElem.getAttribute('value')) || Number(adelantoElem.value) || 0) : 0;
    
    const descChoferVal = document.getElementById('nueva-incidencia-descuento').value.trim();
    const asuEmpresaVal = document.getElementById('nueva-incidencia-empresa').value.trim();

    const descuento = descChoferVal !== '' ? Number(descChoferVal) : 0;
    const empresa = asuEmpresaVal !== '' ? Number(asuEmpresaVal) : 0;

    const totalRepartir = perdida + indemnizar + gastos + adelanto;
    if (Math.abs(totalRepartir - (descuento + empresa)) > 0.01) {
        Swal.fire({
            title: 'Descuadre en Repartición',
            text: 'Los montos de descuento a chofer y asunción por empresa deben cubrir exactamente el 100% del costo del incidente (flete perdido + indemnización + multas/cargos) y adelantos.',
            icon: 'warning',
            confirmButtonColor: '#dc2626'
        });
        return;
    }

    const result = await Swal.fire({
        title: '¿Guardar Incidencia?',
        text: '¿Estás seguro de registrar esta incidencia? Esta acción no se podrá modificar luego.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) {
        return;
    }

    const btnGuardar = document.getElementById('btn-guardar-incidencia');
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const payload = {
            tipo_incidencia: tipo,
            descripcion_detallada: descripcion,
            valor_total_perdida: perdida,
            valor_indemnizar: indemnizar,
            id_carga: id_carga,
            gastos_adicionales: gastos,
            adelanto_recuperar: adelanto,
            monto_descuento_chofer: descuento,
            monto_asumido_empresa: empresa,
            detalles_rechazados: detalles_rechazados
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
            fetchViajes(false);
            Swal.fire('¡Guardado!', 'La incidencia se registró correctamente.', 'success');
        } else {
            Swal.fire('Error', res.message || 'Error al guardar la incidencia.', 'error');
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = '<i class="far fa-check-circle"></i> Guardar Incidencia';
        }
    } catch (error) {
        console.error('Error al guardar incidencia:', error);
        Swal.fire('Error', 'Error de conexión al guardar.', 'error');
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
        let esSiniestroFinalizado = false;
        
        if (viaje.estado_operativo === 'En Ruta') { colorEstado = 'var(--brand-blue)'; bgEstado = '#e0f2fe'; }
        else if (viaje.estado_operativo === 'Llegó a Destino') { colorEstado = '#16a34a'; bgEstado = '#dcfce7'; }
        else if (viaje.estado_operativo === 'Descargado') { colorEstado = '#8b5cf6'; bgEstado = '#ede9fe'; }
        else if (viaje.estado_operativo === 'Finalizado') { 
            if (!viaje.fecha_llegada) {
                esSiniestroFinalizado = true;
                colorEstado = '#dc2626'; 
                bgEstado = '#fee2e2'; 
            } else {
                colorEstado = '#475569'; 
                bgEstado = '#f1f5f9'; 
            }
        }
        else { colorEstado = '#dc2626'; bgEstado = '#fee2e2'; } // Incidencia

        let colorPago, bgPago;
        if (viaje.estado_pagos === 'Liquidado') { colorPago = '#16a34a'; bgPago = '#dcfce7'; }
        else if (viaje.estado_pagos === 'Anulado') { colorPago = '#dc2626'; bgPago = '#fee2e2'; }
        else { colorPago = '#d97706'; bgPago = '#fef3c7'; } // Pendiente o default

        const tarjetaHtml = `
            <div class="card-viaje" style="background: #ffffff; border: 1px solid var(--border-light); ${esSiniestroFinalizado ? 'border-left: 4px solid #dc2626;' : ''} border-radius: var(--radius-lg); padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); display: flex; gap: 24px;">
                <div style="display: flex; flex-direction: column; justify-content: space-between; width: 240px; flex-shrink: 0;">
                    <div style="display: flex; gap: 16px;">
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: #e0f2fe; color: var(--brand-blue); display: flex; justify-content: center; align-items: center; font-size: 20px; flex-shrink: 0;">
                            <i class="fas fa-truck"></i>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-start;">
                            <h3 style="margin: 0 0 4px 0; font-size: 16px; color: var(--text-primary); font-weight: 700;">
                                Viaje #${viaje.id_viaje}
                                <i class="fa-solid fa-circle-info" style="cursor: pointer; margin-left: 8px; color: var(--brand-blue); font-size: 14px;" title="Ver detalles" onclick="abrirModalDetallesViaje(${viaje.id_viaje})"></i>
                            </h3>
                            <p style="margin: 0; font-size: 13px; color: var(--text-secondary);">${viaje.ciudad_origen || 'Origen'} - ${viaje.ciudad_destino || 'Destino'}</p>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px; align-items: flex-start;">
                        <div style="display: flex; gap: 8px; margin-bottom: 4px;">
                            <span style="background: ${bgEstado}; color: ${colorEstado}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px;"><i class="fas fa-truck-moving"></i> ${esSiniestroFinalizado ? 'Finalizado (Siniestro)' : viaje.estado_operativo}</span>
                            <span style="background: ${bgPago}; color: ${colorPago}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px;"><i class="fas fa-money-bill-wave"></i> ${viaje.estado_pagos || 'Pendiente'}</span>
                        </div>
                        ${viaje.productos_siniestrados_sin_justificar > 0
                            ? `<span class="badge-pulsing-red" style="background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-exclamation-triangle"></i> Reporte: (${viaje.productos_siniestrados_sin_justificar} Producto${viaje.productos_siniestrados_sin_justificar > 1 ? 's' : ''} Siniestrado${viaje.productos_siniestrados_sin_justificar > 1 ? 's' : ''})</span>`
                            : ''}
                        ${viaje.estado_operativo === 'Incidencia' && !viaje.tiene_incidencia_general 
                            ? `<span class="badge-pulsing-red" style="background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-exclamation-circle"></i> Siniestro: Requiere Reporte</span>` 
                            : ''}
                        ${(viaje.estado_operativo === 'Llegó a Destino' || viaje.estado_operativo === 'Descargado' || viaje.estado_operativo === 'Finalizado') && viaje.productos_rechazados_sin_justificar > 0
                            ? `<span class="badge-pulsing-orange" style="background: #f97316; color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-exclamation-triangle"></i> Reporte: (${viaje.productos_rechazados_sin_justificar} Producto${viaje.productos_rechazados_sin_justificar > 1 ? 's' : ''} Rechazado${viaje.productos_rechazados_sin_justificar > 1 ? 's' : ''})</span>`
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
                            ${(viaje.estado_operativo === 'Llegó a Destino' || viaje.estado_operativo === 'Descargado' || viaje.estado_operativo === 'Finalizado') && viaje.fecha_llegada ? formatFechaCompleta(viaje.fecha_llegada) : `<span style="color: ${colorEstado}; font-weight: 600;">${esSiniestroFinalizado ? 'No llegó a destino' : viaje.estado_operativo}</span>`}
                        </p>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 12px; min-width: 140px; border-left: 1px solid var(--border-light); padding-left: 24px;">
                    <div style="display: flex; flex-direction: column; gap: 8px; width: 100%; margin-top: auto;">
                        <button class="btn-viaje btn-ver-cargas" data-id="${viaje.id_viaje}">Ver cargas</button>
                        <button class="btn-viaje btn-ver-adelantos" data-id="${viaje.id_viaje}">Ver adelantos</button>
                        ${(() => {
                            let btnHtml = '';
                            const hasSiniestro = viaje.productos_siniestrados_sin_justificar > 0 || (viaje.estado_operativo === 'Incidencia' && !viaje.tiene_incidencia_general);
                            const hasRechazo = (viaje.estado_operativo === 'Llegó a Destino' || viaje.estado_operativo === 'Descargado' || viaje.estado_operativo === 'Finalizado') && viaje.productos_rechazados_sin_justificar > 0;
                            
                            if (hasSiniestro || hasRechazo) {
                                const btnClass = hasSiniestro ? 'btn-pulsing-red' : 'btn-pulsing-orange';
                                btnHtml += `<button class="btn-viaje btn-menu-incidencia ${btnClass}" data-id="${viaje.id_viaje}"><i class="fas fa-exclamation-triangle"></i>Reportar</button>`;
                            } else {
                                btnHtml += `<button class="btn-viaje btn-incidencia" data-id="${viaje.id_viaje}" data-tipo-alerta="ver" ${viaje.estado_operativo === 'Incidencia' ? 'style="color: #dc2626; background: #fee2e2;"' : ''}>Ver incidencias</button>`;
                            }

                            if (viaje.estado_operativo === 'Descargado' || viaje.estado_operativo === 'Incidencia') {
                                btnHtml += `<button class="btn-viaje" style="background-color: #f1f5f9; color: #475569; font-weight: 600; border: none; padding: 8px; border-radius: 6px; cursor: pointer;" onclick="finalizarViaje(${viaje.id_viaje})">Finalizar Viaje</button>`;
                            }
                            return btnHtml;
                        })()}
                    </div>
                </div>
            </div>
        `;
        
        contenedor.insertAdjacentHTML('beforeend', tarjetaHtml);
    });
}

async function abrirModalAdelantos(idStr) {
    const idViaje = Number(idStr);
    const viaje = historialViajesTodos.find(v => v.id_viaje === idViaje);
    if (!viaje) return;

    const modal = document.getElementById('modal-adelantos-viaje');
    const modalBody = document.getElementById('modal-adelantos-body');
    const btnNuevo = document.getElementById('btn-nuevo-adelanto');
    const subtitulo = document.getElementById('modal-adelantos-subtitulo');
    
    document.getElementById('modal-adelantos-titulo').textContent = `Adelantos del Viaje #${idViaje}`;
    subtitulo.textContent = 'Cargando...';
    btnNuevo.style.display = 'none';
    modalBody.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    
    modal.style.display = 'flex';

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch(`/api/viajes/${idViaje}/adelantos`, {
            headers: { 'x-user-profile': sessionData.id_perfil || 1 }
        });
        const res = await response.json();

        if (response.ok && res.success) {
            // Evaluamos la lógica de negocio para ver si el botón "Nuevo Adelanto" es visible
            let canAdd = false;
            const op = viaje.estado_operativo;
            const pag = viaje.estado_pagos;

            if (op === 'Finalizado' || pag === 'Liquidado' || (op === 'Incidencia' && pag === 'Anulado')) {
                canAdd = false;
            } else {
                canAdd = true;
            }

            const adelantosList = res.data || [];
            subtitulo.textContent = `Total de adelantos: ${adelantosList.length}`;

            if (adelantosList.length === 0) {
                if (canAdd) {
                    modalBody.innerHTML = `
                        <div style="text-align: center; padding: 40px; background: #fffbeb; border: 1px dashed #fcd34d; border-radius: 8px;">
                            <i class="fas fa-hand-holding-usd" style="font-size: 32px; color: #f59e0b; margin-bottom: 12px;"></i>
                            <h4 style="margin: 0 0 8px 0; font-size: 16px; color: var(--text-primary);">Aún no hay adelantos</h4>
                            <p style="margin: 0 0 20px 0; font-size: 13px; color: var(--text-secondary);">Este viaje no tiene ningún adelanto registrado al chofer.</p>
                            <button onclick="mostrarFormularioNuevoAdelanto(${idViaje})" style="background: #d97706; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(217, 119, 6, 0.2); transition: all 0.2s;">
                                <i class="fas fa-plus"></i> Registrar Primer Adelanto
                            </button>
                        </div>
                    `;
                } else {
                    modalBody.innerHTML = `
                        <div style="text-align: center; padding: 40px; margin: auto;">
                            <div style="width: 64px; height: 64px; border-radius: 50%; background: #f1f5f9; color: #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 16px;">
                                <i class="fas fa-hand-holding-usd"></i>
                            </div>
                            <h4 style="margin: 0 0 8px 0; font-size: 16px; color: var(--text-primary);">Sin adelantos</h4>
                            <p style="margin: 0 0 24px 0; font-size: 14px; color: var(--text-secondary);">Este viaje no tiene ningún adelanto registrado al chofer.</p>
                            <div style="background: #fef3c7; border: 1px solid #fde68a; color: #d97706; padding: 12px; border-radius: 8px; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;"><i class="fas fa-lock"></i> Este viaje está finalizado/liquidado. No se pueden registrar nuevos adelantos.</div>
                        </div>
                    `;
                }
            } else {
                if (canAdd) {
                    btnNuevo.style.display = 'flex';
                    // Reasignar onclick del botón de la cabecera
                    btnNuevo.onclick = () => mostrarFormularioNuevoAdelanto(idViaje);
                }
                
                // Mostrar lista en formato de tabla
                let listaHtml = `
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; width: 100%;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left;">
                            <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                <tr>
                                    <th style="padding: 12px 16px; font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Monto</th>
                                    <th style="padding: 12px 16px; font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Método de Entrega</th>
                                    <th style="padding: 12px 16px; font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Nro Operación</th>
                                    <th style="padding: 12px 16px; font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Evidencia</th>
                                    <th style="padding: 12px 16px; font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; width: 200px;">Motivo</th>
                                    <th style="padding: 12px 16px; font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Fecha de Registro</th>
                                    <th style="padding: 12px 16px; font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Registrado Por</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                adelantosList.forEach(a => {
                    const fechaObj = new Date(a.fecha_adelanto);
                    const fechaStr = fechaObj.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    const horaStr = fechaObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });

                    listaHtml += `
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 12px 16px; font-size: 14px; font-weight: 700; color: #16a34a; white-space: nowrap;">S/ ${Number(a.monto).toFixed(2)}</td>
                                    <td style="padding: 12px 16px; font-size: 13px; color: var(--text-primary);">${a.metodo_entrega || '-'}</td>
                                    <td style="padding: 12px 16px; font-size: 13px; color: var(--text-primary);">${a.numero_operacion || '-'}</td>
                                    <td style="padding: 12px 16px; font-size: 13px; text-align: center;">
                                        ${a.evidencia_url ? `<a href="${a.evidencia_url}" target="_blank" style="color: var(--brand-blue); text-decoration: none;" title="Ver evidencia"><i class="fas fa-file-image fa-lg"></i></a>` : '-'}
                                    </td>
                                    <td style="padding: 12px 16px; font-size: 13px; color: var(--text-secondary); max-width: 200px;" title="${a.motivo_referencial ? a.motivo_referencial.replace(/"/g, '&quot;') : ''}">
                                        <div style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; white-space: normal;">
                                            ${a.motivo_referencial || '-'}
                                        </div>
                                    </td>
                                    <td style="padding: 12px 16px; font-size: 13px; color: var(--text-primary); white-space: nowrap;">
                                        <div style="display: flex; flex-direction: column;">
                                            <span>${fechaStr}</span>
                                            <span style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${horaStr}</span>
                                        </div>
                                    </td>
                                    <td style="padding: 12px 16px; font-size: 13px; color: var(--text-secondary);">${a.usuario_creador || 'Desconocido'}</td>
                                </tr>
                    `;
                });
                
                listaHtml += `
                            </tbody>
                        </table>
                    </div>
                `;
                modalBody.innerHTML = listaHtml;
            }
        } else {
            modalBody.innerHTML = '<div style="text-align: center; padding: 40px; color: #dc2626;">Error al cargar los adelantos.</div>';
        }
    } catch (error) {
        console.error('Error al cargar adelantos:', error);
        modalBody.innerHTML = '<div style="text-align: center; padding: 40px; color: #dc2626;">Error de conexión.</div>';
    }
}

// Hacer disponible globalmente
window.init_historial_viajes = init_historial_viajes;
window.mostrarFormularioNuevoAdelanto = mostrarFormularioNuevoAdelanto;
window.mostrarNombreArchivoEvidencia = mostrarNombreArchivoEvidencia;

function mostrarFormularioNuevoAdelanto(idViaje) {
    const modalBody = document.getElementById('modal-adelantos-body');
    const btnNuevo = document.getElementById('btn-nuevo-adelanto');
    
    // Ocultar botón "Nuevo Adelanto" de la cabecera mientras mostramos el form
    btnNuevo.style.display = 'none';

    modalBody.innerHTML = `
        <div id="form-nuevo-adelanto-container" style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; max-width: 700px; margin: 0 auto;">
            <h4 style="margin: 0 0 24px 0; font-size: 18px; color: var(--text-primary); font-weight: 700;">Registrar Nuevo Adelanto</h4>
            
            <!-- Primera Fila (Monto y Método) -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Monto (S/) *</label>
                    <input type="number" id="nuevo-adelanto-monto" step="0.01" min="0.01" placeholder="Ej: 500.00" style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; outline: none; transition: border-color 0.2s;">
                </div>

                <div>
                    <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Método de Entrega *</label>
                    <select id="nuevo-adelanto-metodo" onchange="toggleAdelantoOperacion()" style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; color: var(--text-primary); outline: none; background: white; transition: border-color 0.2s;">
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Billetera Digital">Billetera Digital (Yape/Plin)</option>
                        <option value="Depósito">Depósito</option>
                    </select>
                </div>
            </div>

            <!-- Segunda Fila (Operación y Evidencia) - Inicialmente oculta porque por defecto es Efectivo -->
            <div id="container-adelanto-operacion-evidencia" style="display: none; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Nro. de Operación *</label>
                    <input type="text" id="nuevo-adelanto-operacion" placeholder="Ej: 123456789" style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; outline: none; transition: border-color 0.2s;">
                </div>

                <div>
                    <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Evidencia (Opcional)</label>
                    <label for="nuevo-adelanto-evidencia" style="cursor: pointer; border: 2px dashed #cbd5e1; padding: 14px; text-align: center; border-radius: 8px; display: block; background: #f8fafc; transition: all 0.2s; min-height: 24px;">
                        <i class="fas fa-cloud-upload-alt fa-lg" style="color: #64748b; margin-bottom: 8px; display: block;"></i>
                        <div style="font-size: 13px; color: #475569; font-weight: 600;">Seleccionar comprobante</div>
                        <div id="nombre-archivo-evidencia" style="font-size: 12px; color: #16a34a; margin-top: 6px; font-weight: 700;"></div>
                    </label>
                    <input type="file" id="nuevo-adelanto-evidencia" accept="image/*,.pdf" style="display: none;" onchange="mostrarNombreArchivoEvidencia()">
                </div>
            </div>

            <!-- Tercera Fila (Motivo) -->
            <div style="margin-bottom: 28px;">
                <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Motivo o Descripción</label>
                <input type="text" id="nuevo-adelanto-motivo" placeholder="Ej: Viáticos, Peajes..." style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; outline: none; transition: border-color 0.2s;">
            </div>

            <!-- Botones -->
            <div style="display: flex; justify-content: flex-end; gap: 12px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <button type="button" onclick="abrirModalAdelantos(${idViaje})" style="padding: 12px 24px; border: 1px solid #cbd5e1; background: white; color: var(--text-secondary); border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s;">Cancelar</button>
                <button type="button" id="btn-guardar-adelanto" onclick="guardarAdelantoViaje(${idViaje})" style="padding: 12px 28px; background: #d97706; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.2s; box-shadow: 0 4px 6px -1px rgba(217, 119, 6, 0.2);">
                    <i class="fas fa-save"></i> Guardar Adelanto
                </button>
            </div>
        </div>
    `;
}

function mostrarNombreArchivoEvidencia() {
    const input = document.getElementById('nuevo-adelanto-evidencia');
    const label = document.getElementById('nombre-archivo-evidencia');
    if (input.files && input.files.length > 0) {
        label.textContent = input.files[0].name;
    } else {
        label.textContent = '';
    }
}

function toggleAdelantoOperacion() {
    const metodo = document.getElementById('nuevo-adelanto-metodo').value;
    const container = document.getElementById('container-adelanto-operacion-evidencia');
    if (metodo !== 'Efectivo') {
        container.style.display = 'grid';
    } else {
        container.style.display = 'none';
        document.getElementById('nuevo-adelanto-operacion').value = '';
        document.getElementById('nuevo-adelanto-evidencia').value = ''; // Reset file input
        document.getElementById('nombre-archivo-evidencia').textContent = ''; // Reset label
    }
}

async function guardarAdelantoViaje(idViaje) {
    const monto = Number(document.getElementById('nuevo-adelanto-monto').value);
    const metodo = document.getElementById('nuevo-adelanto-metodo').value;
    const motivo = document.getElementById('nuevo-adelanto-motivo').value.trim();
    const operacion = document.getElementById('nuevo-adelanto-operacion').value.trim();
    const evidenciaInput = document.getElementById('nuevo-adelanto-evidencia');

    if (!monto || monto <= 0) {
        alert('Por favor ingresa un monto válido mayor a 0.');
        return;
    }

    if (metodo !== 'Efectivo' && !operacion) {
        alert('El número de operación es obligatorio para el método de entrega seleccionado.');
        return;
    }

    const result = await Swal.fire({
        title: '¿Registrar Adelanto?',
        text: '¿Estás seguro de registrar este adelanto por S/ ' + monto.toFixed(2) + '?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#d97706',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    const btnGuardar = document.getElementById('btn-guardar-adelanto');
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        
        const formData = new FormData();
        formData.append('monto', monto);
        formData.append('metodo_entrega', metodo);
        formData.append('motivo_referencial', motivo);
        if (metodo !== 'Efectivo') {
            formData.append('numero_operacion', operacion);
        }
        
        if (evidenciaInput.files.length > 0) {
            formData.append('evidencia', evidenciaInput.files[0]);
        }

        const response = await fetch(`/api/viajes/${idViaje}/adelantos`, {
            method: 'POST',
            headers: {
                'x-user-id': sessionData.id_usuario || 1
            },
            body: formData
        });

        const res = await response.json();
        if (response.ok && res.success) {
            Swal.fire('¡Guardado!', 'El adelanto se registró correctamente.', 'success');
            // Recargar la lista de adelantos (vuelve a la vista de tabla)
            abrirModalAdelantos(idViaje);
            // Refrescar tarjetas de historial
            fetchViajes(false);
        } else {
            throw new Error(res.message || 'Error al guardar el adelanto');
        }
    } catch (error) {
        console.error('Error al guardar adelanto:', error);
        Swal.fire('Error', error.message || 'Falla de conexión al guardar el adelanto', 'error');
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar Adelanto';
    }
}
