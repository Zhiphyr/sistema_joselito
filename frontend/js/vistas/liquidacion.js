// frontend/js/vistas/liquidacion.js

let liquidacionesPendientes = [];

async function init_liquidacion() {
    asignarEventosTab();
    asignarEventoBusqueda();
    asignarEventosEvidencia();
    await cargarLiquidacionesDesdeServidor();
}

async function cargarLiquidacionesDesdeServidor() {
    try {
        const res = await fetch('/api/viajes/liquidaciones/pendientes');
        const json = await res.json();
        
        if (json.success) {
            liquidacionesPendientes = json.data;
            renderKpis(json.pagadoMes);
            renderListaPendientes();
        } else {
            console.error('Error al cargar liquidaciones:', json.message);
        }
    } catch (error) {
        console.error('Error de red al cargar liquidaciones:', error);
    }
}

function renderKpis(pagadoMes = 0.00) {
    // Calculamos totales desde la data
    let totalPagar = 0;
    liquidacionesPendientes.forEach(liq => {
        totalPagar += liq.neto_pagar;
    });
    
    const countPendientes = liquidacionesPendientes.length;

    const elPendientes = document.getElementById('kpi-pendientes');
    const elTotalPagar = document.getElementById('kpi-total-pagar');
    const elPagadoMes = document.getElementById('kpi-pagado-mes');
    const elBadge = document.getElementById('badge-pendientes');

    if (elPendientes) elPendientes.textContent = countPendientes;
    if (elBadge) elBadge.textContent = countPendientes;
    
    if (elTotalPagar) elTotalPagar.textContent = `S/ ${formatearNumero(totalPagar)}`;
    if (elPagadoMes) elPagadoMes.textContent = `S/ ${formatearNumero(pagadoMes)}`;
}

function formatearNumero(num) {
    return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderListaPendientes(query = '') {
    const listaEl = document.getElementById('listaLiquidaciones');
    if (!listaEl) return;

    listaEl.innerHTML = '';

    let filtrados = liquidacionesPendientes.filter(liq => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (
            (liq.chofer_nombre && liq.chofer_nombre.toLowerCase().includes(q)) ||
            (liq.camion_placa && liq.camion_placa.toLowerCase().includes(q)) ||
            (liq.viaje_num && liq.viaje_num.toString().includes(q))
        );
    });

    const sortOrder = document.getElementById('selectOrdenarLiquidacion')?.value || 'asc';
    filtrados.sort((a, b) => {
        if (sortOrder === 'asc') return a.viaje_num - b.viaje_num;
        return b.viaje_num - a.viaje_num;
    });

    if (filtrados.length === 0) {
        listaEl.innerHTML = `
            <div style="padding: 40px; text-align: center; color: var(--text-muted);">
                <i class="far fa-check-circle" style="font-size: 32px; margin-bottom: 16px; color: #10b981;"></i>
                <p>${query ? 'No hay resultados para la búsqueda.' : '¡Todo al día! No hay liquidaciones pendientes.'}</p>
            </div>
        `;
        return;
    }

    filtrados.forEach(liq => {
        
        let penalidadesHtml = '';
        if (liq.penalidades > 0) {
            penalidadesHtml = `
                <div style="display: flex; flex-direction: column; align-items: flex-end; min-width: 80px;">
                    <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Penalidades</span>
                    <span style="font-size: 14px; font-weight: 600; color: #ef4444;">-S/ ${formatearNumero(liq.penalidades)}</span>
                </div>
            `;
        } else {
            penalidadesHtml = `<div style="min-width: 80px;"></div>`;
        }

        const filaHtml = `
            <div class="fila-liquidacion">
                <!-- Info Izquierda -->
                <div style="display: flex; gap: 16px; align-items: flex-start; flex: 1;">
                    
                    <!-- Avatar -->
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: #e0f2fe; color: var(--brand-blue); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; margin-top: 2px;">
                        <i class="far fa-user"></i>
                    </div>

                    <!-- Datos -->
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <div style="display: flex; align-items: baseline; gap: 12px;">
                            <span style="font-size: 15px; font-weight: 600; color: var(--text-primary);">${liq.chofer_nombre}</span>
                            <span style="font-size: 11px; color: var(--text-muted);">DNI: ${liq.chofer_dni}</span>
                        </div>
                        <div style="font-size: 13px; color: var(--text-secondary); display: flex; gap: 8px; align-items: center;">
                            <i class="fas fa-truck" style="font-size: 11px; color: var(--text-muted);"></i>
                            <span>${liq.camion_placa} &middot; ${liq.camion_modelo}</span>
                            <span style="color: var(--border-light);">|</span>
                            <span>Viaje #${liq.viaje_num}</span>
                            <span style="color: var(--border-light);">|</span>
                            <span>${liq.ruta}</span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-muted); display: flex; gap: 12px;">
                            <span>Salida: ${liq.salida}</span>
                            <span>Llegada: ${liq.llegada}</span>
                        </div>
                    </div>
                </div>

                <!-- Info Derecha (Finanzas y Acciones) -->
                <div style="display: flex; align-items: center; gap: 32px;">
                    
                    <!-- Columnas de dinero -->
                    <div style="display: flex; gap: 24px;">
                        <div style="display: flex; flex-direction: column; align-items: flex-end; min-width: 80px;">
                            <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Bruto</span>
                            <span style="font-size: 14px; font-weight: 600; color: var(--text-secondary);">S/ ${formatearNumero(liq.monto_bruto)}</span>
                        </div>
                        
                        <div style="display: flex; flex-direction: column; align-items: flex-end; min-width: 80px;">
                            <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Adelanto</span>
                            <span style="font-size: 14px; font-weight: 600; color: #d97706;">-S/ ${formatearNumero(liq.adelanto)}</span>
                        </div>

                        ${penalidadesHtml}

                        <div style="display: flex; flex-direction: column; align-items: flex-end; min-width: 100px;">
                            <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Neto a Pagar</span>
                            <span style="font-size: 18px; font-weight: 700; color: #16a34a;">S/ ${formatearNumero(liq.neto_pagar)}</span>
                        </div>
                    </div>

                    <!-- Botones -->
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button class="btn-liquidar" onclick="abrirModalLiquidar(${liq.id})" style="padding: 8px 16px; border-radius: 6px; border: none; background: #047857; color: white; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.2s ease;">
                            <i class="fas fa-wallet"></i> Liquidar
                        </button>
                    </div>

                </div>
            </div>
        `;

        listaEl.insertAdjacentHTML('beforeend', filaHtml);
    });
}

function asignarEventosTab() {
    const tabs = document.querySelectorAll('.btn-tab-pill');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            const clicked = e.currentTarget;
            clicked.classList.add('active');
            
            // Simular cambio
            if (clicked.dataset.tab === 'historial') {
                cargarHistorialLiquidacionesDesdeServidor();
            } else {
                const query = document.getElementById('inputBuscarLiquidacion')?.value || '';
                renderListaPendientes(query);
            }
        });
    });
}

function asignarEventoBusqueda() {
    const inputBuscar = document.getElementById('inputBuscarLiquidacion');
    const selectSort = document.getElementById('selectOrdenarLiquidacion');

    const handleFilterChange = () => {
        const query = inputBuscar?.value.trim() || '';
        const tabActivo = document.querySelector('.btn-tab-pill.active')?.dataset.tab;
        
        if (tabActivo === 'historial') {
            cargarHistorialLiquidacionesDesdeServidor();
        } else {
            renderListaPendientes(query);
        }
    };

    inputBuscar?.addEventListener('input', handleFilterChange);
    selectSort?.addEventListener('change', handleFilterChange);
}

async function cargarHistorialLiquidacionesDesdeServidor() {
    const listaEl = document.getElementById('listaLiquidaciones');
    listaEl.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--text-muted);">
            <i class="fas fa-spinner fa-spin" style="font-size: 32px; margin-bottom: 16px; color: var(--border-light);"></i>
            <p>Cargando historial...</p>
        </div>
    `;

    try {
        const res = await fetch('/api/viajes/liquidaciones/historial');
        const json = await res.json();
        
        if (json.success) {
            renderTablaHistorial(json.data);
        } else {
            listaEl.innerHTML = `<div style="padding: 20px; color: #ef4444; text-align: center;">Error al cargar historial</div>`;
        }
    } catch (error) {
        console.error('Error de red al cargar historial:', error);
        listaEl.innerHTML = `<div style="padding: 20px; color: #ef4444; text-align: center;">Error de red al cargar historial</div>`;
    }
}

function renderTablaHistorial(datos) {
    const listaEl = document.getElementById('listaLiquidaciones');
    listaEl.innerHTML = ''; // Limpiar

    if (!datos || datos.length === 0) {
        listaEl.innerHTML = `
            <div style="padding: 40px; text-align: center; color: var(--text-muted);">
                <i class="fas fa-history" style="font-size: 32px; margin-bottom: 16px; color: var(--border-light);"></i>
                <p>No hay historial de liquidaciones para mostrar.</p>
            </div>
        `;
        return;
    }

    // Cabecera de la tabla
    const tablaHtml = `
        <div style="overflow-x: auto; border: 1px solid var(--border-light); border-radius: 8px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background: #f9fafb; border-bottom: 1px solid var(--border-light); color: var(--text-muted); text-align: left;">
                        <th style="padding: 12px 16px; font-weight: 600;">Liq. #</th>
                        <th style="padding: 12px 16px; font-weight: 600;">Chofer</th>
                        <th style="padding: 12px 16px; font-weight: 600;">Viaje / Ruta</th>
                        <th style="padding: 12px 16px; font-weight: 600; text-align: center;">Peso (Ton)</th>
                        <th style="padding: 12px 16px; font-weight: 600; text-align: right;">Bruto</th>
                        <th style="padding: 12px 16px; font-weight: 600; text-align: right;">Adelanto</th>
                        <th style="padding: 12px 16px; font-weight: 600; text-align: right;">Penalidades</th>
                        <th style="padding: 12px 16px; font-weight: 600; text-align: right;">Neto Pagado</th>
                        <th style="padding: 12px 16px; font-weight: 600;">Fecha</th>
                    </tr>
                </thead>
                <tbody id="tbodyHistorial">
                </tbody>
            </table>
        </div>
    `;
    
    listaEl.innerHTML = tablaHtml;
    const tbody = document.getElementById('tbodyHistorial');

    datos.forEach((liq, index) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-light)';
        
        const tienePenalidades = liq.total_penalidades > 0 && liq.detalle_penalidades && liq.detalle_penalidades.length > 0;
        
        let penalidadesHtml = `S/ 0.00`;
        if (tienePenalidades) {
            penalidadesHtml = `
                <div style="color: #ef4444; font-weight: 500; display: flex; align-items: center; justify-content: flex-end; gap: 6px; cursor: pointer;" onclick="togglePenalidadesAccordion(${liq.id_liquidacion})">
                    -S/ ${formatearNumero(liq.total_penalidades)}
                    <i class="fas fa-chevron-down" id="icon-acc-${liq.id_liquidacion}" style="font-size: 10px; transition: transform 0.2s;"></i>
                </div>
            `;
        }

        const pesoTon = liq.total_peso / 1000;

        tr.innerHTML = `
            <td style="padding: 16px;">
                <span style="background: #d1fae5; color: #047857; padding: 4px 8px; border-radius: 12px; font-weight: 600; font-size: 12px;">#${liq.id_liquidacion}</span>
            </td>
            <td style="padding: 16px;">
                <div style="font-weight: 600; color: var(--text-primary);">${liq.chofer_nombre}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${liq.camion_placa}</div>
            </td>
            <td style="padding: 16px;">
                <div style="font-weight: 500; color: var(--text-primary);">Viaje #${liq.id_viaje}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${liq.ruta}</div>
            </td>
            <td style="padding: 16px; text-align: center;">${formatearNumero(pesoTon)}</td>
            <td style="padding: 16px; text-align: right; font-weight: 500;">S/ ${formatearNumero(liq.monto_bruto)}</td>
            <td style="padding: 16px; text-align: right; color: #f59e0b;">-S/ ${formatearNumero(liq.total_adelantos)}</td>
            <td style="padding: 16px; text-align: right;">${penalidadesHtml}</td>
            <td style="padding: 16px; text-align: right; font-weight: 700; color: #047857;">S/ ${formatearNumero(liq.monto_neto_pagado)}</td>
            <td style="padding: 16px; color: var(--text-muted); font-size: 11px;">${liq.fecha}</td>
        `;
        
        tbody.appendChild(tr);

        // Si tiene penalidades, crear el row del acordeón oculto
        if (tienePenalidades) {
            const trAcc = document.createElement('tr');
            trAcc.id = `acc-${liq.id_liquidacion}`;
            trAcc.style.display = 'none';
            trAcc.style.background = '#fafafa';
            trAcc.style.borderBottom = '1px solid var(--border-light)';
            
            let detalleHtml = liq.detalle_penalidades.map(p => `
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #e5e7eb;">
                    <span><i class="fas fa-level-up-alt fa-rotate-90" style="color: #9ca3af; margin-right: 8px;"></i> Descuento por: ${p.incidencia}</span>
                    <span style="color: #ef4444; font-weight: 500;">-S/ ${formatearNumero(p.monto)}</span>
                </div>
            `).join('');

            trAcc.innerHTML = `
                <td colspan="9" style="padding: 0;">
                    <div style="padding: 12px 32px 12px 64px; border-left: 3px solid #ef4444;">
                        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px; font-weight: 600; text-transform: uppercase;">Desglose de Penalidades</div>
                        ${detalleHtml}
                    </div>
                </td>
            `;
            tbody.appendChild(trAcc);
        }
    });
}

window.togglePenalidadesAccordion = function(id) {
    const acc = document.getElementById(`acc-${id}`);
    const icon = document.getElementById(`icon-acc-${id}`);
    if (acc.style.display === 'none') {
        acc.style.display = 'table-row';
        icon.style.transform = 'rotate(180deg)';
    } else {
        acc.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
    }
}

let modalLiquidacionActual = null; // Para guardar la liquidación seleccionada temporalmente

async function abrirModalLiquidar(id) {
    const liq = liquidacionesPendientes.find(l => l.id === id);
    if (!liq) return;

    modalLiquidacionActual = liq;

    // Limpiar campos del modal al abrir
    document.getElementById('modalLiqMetodoPago').value = 'Efectivo';
    document.getElementById('modalLiqObservaciones').value = '';

    // Limpiar evidencia
    document.getElementById('contenedorEvidencia').style.display = 'none';
    document.getElementById('modalLiqNumOperacion').value = '';
    document.getElementById('modalLiqEvidencia').value = '';
    document.getElementById('nombreArchivoLiq').textContent = 'PNG, JPG hasta 5MB';

    // Llenar datos estáticos
    document.getElementById('modalLiqViajeTitle').textContent = `Viaje #${liq.viaje_num}`;
    document.getElementById('modalLiqNombre').textContent = liq.chofer_nombre;
    document.getElementById('modalLiqDni').textContent = liq.chofer_dni;
    document.getElementById('modalLiqVehiculo').textContent = `${liq.camion_placa} · ${liq.camion_modelo}`;
    document.getElementById('modalLiqRuta').textContent = liq.ruta;

    // Resumen de cálculo
    const pesoKg = liq.total_peso;
    const pesoTon = pesoKg / 1000;
    
    document.getElementById('modalLiqPeso').textContent = `${formatearNumero(pesoTon)} Ton (${formatearNumero(pesoKg)} kg)`;
    document.getElementById('modalLiqTarifa').textContent = `S/ ${formatearNumero(liq.tarifa_transportista)} / kg`;
    document.getElementById('modalLiqBruto').textContent = `S/ ${formatearNumero(liq.monto_bruto)}`;
    document.getElementById('modalLiqAdelanto').textContent = `-S/ ${formatearNumero(liq.adelanto)}`;

    // Manejo de Penalidades
    const contenedorPenalidades = document.getElementById('contenedorPenalidades');
    const chkDescontar = document.getElementById('chkDescontarPenalidades');
    const tablaContainer = document.getElementById('tablaPenalidadesContainer');
    const tbody = document.getElementById('tbodyPenalidades');
    
    chkDescontar.checked = false;
    tablaContainer.style.display = 'none';
    tbody.innerHTML = '';

    if (liq.penalidades > 0) {
        contenedorPenalidades.style.display = 'block';
        
        // Fetch incidencias
        try {
            const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
            const res = await fetch(`/api/camiones/${liq.id_camion || liq.id}/incidencias_pendientes`, {
                headers: { 'x-user-profile': sessionData.id_perfil }
            });
            const json = await res.json();
            
            if (json.success && json.data.length > 0) {
                json.data.forEach((inc, index) => {
                    const idCheck = `chkInc_${index}`;
                    const idInput = `inpInc_${index}`;
                    
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid var(--border-light)';
                    tr.innerHTML = `
                        <td style="padding: 10px 0;">
                            <input type="checkbox" id="${idCheck}" onchange="toggleIncidenciaDescuento('${idCheck}', '${idInput}', ${inc.saldo_deuda})" style="cursor: pointer; width: 16px; height: 16px; accent-color: #ef4444;">
                        </td>
                        <td style="padding: 10px 0; color: var(--text-primary); font-weight: 500;">
                            ${inc.tipo_incidencia} <span style="color: var(--text-muted); font-weight: 400;">(Viaje #${inc.id_viaje})</span>
                        </td>
                        <td style="padding: 10px 0; text-align: right; color: var(--text-secondary);">
                            S/ ${formatearNumero(inc.saldo_deuda)}
                        </td>
                        <td style="padding: 10px 0; text-align: right;">
                            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                                <span style="color: var(--text-muted);">S/</span>
                                <input type="number" id="${idInput}" data-id="${inc.id_incidencia}" class="input-descuento-penalidad" value="0.00" disabled oninput="validarDescuento(this, ${inc.saldo_deuda})" onblur="validarDescuentoBlur(this, ${inc.saldo_deuda})" style="width: 70px; padding: 4px 8px; border: 1px solid var(--border-light); border-radius: 4px; text-align: right; outline: none;">
                            </div>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                // Evento para el toggle general de la tabla
                chkDescontar.onchange = (e) => {
                    tablaContainer.style.display = e.target.checked ? 'block' : 'none';
                    // Si se desmarca, desmarcar todo adentro y resetear
                    if (!e.target.checked) {
                        const checks = tbody.querySelectorAll('input[type="checkbox"]');
                        checks.forEach(c => {
                            if (c.checked) c.click(); // Dispara el evento change
                        });
                    }
                    actualizarNetoModal();
                };

            } else {
                contenedorPenalidades.style.display = 'none'; // No hay incidencias reales con saldo
            }
        } catch (err) {
            console.error('Error fetching incidencias:', err);
            contenedorPenalidades.style.display = 'none';
        }
    } else {
        contenedorPenalidades.style.display = 'none';
    }

    actualizarNetoModal();

    // Mostrar modal
    const modal = document.getElementById('modalLiquidacion');
    modal.style.display = 'flex';
    // Forzar reflow para la transición
    modal.offsetHeight;
    modal.style.opacity = '1';
    modal.querySelector('.modal-content').style.transform = 'translateY(0)';
}

function cerrarModalLiquidacion() {
    const modal = document.getElementById('modalLiquidacion');
    modal.style.opacity = '0';
    modal.querySelector('.modal-content').style.transform = 'translateY(20px)';
    setTimeout(() => {
        modal.style.display = 'none';
        modalLiquidacionActual = null;
    }, 300);
}

// Lógica dinámica de la tabla de penalidades
window.toggleIncidenciaDescuento = function(checkId, inputId, saldoDeuda) {
    const check = document.getElementById(checkId);
    const input = document.getElementById(inputId);
    
    if (check.checked) {
        input.disabled = false;
        
        // Calcular neto disponible antes de aplicar esta penalidad
        const bruto = modalLiquidacionActual.monto_bruto;
        const adelanto = modalLiquidacionActual.adelanto;
        
        let totalOtrosDescuentos = 0;
        const inputs = document.querySelectorAll('.input-descuento-penalidad');
        inputs.forEach(inp => {
            if (!inp.disabled && inp.id !== inputId) {
                let v = parseFloat(inp.value);
                if (!isNaN(v)) totalOtrosDescuentos += v;
            }
        });
        
        const netoDisponible = bruto - adelanto - totalOtrosDescuentos;
        
        // El monto a sugerir no puede superar el saldoDeuda ni el netoDisponible
        let montoAAplicar = saldoDeuda;
        if (montoAAplicar > netoDisponible) {
            montoAAplicar = netoDisponible > 0 ? netoDisponible : 0;
        }

        input.value = montoAAplicar.toFixed(2);
        input.focus();
        input.select();
    } else {
        input.disabled = true;
        input.value = '0.00';
    }
    actualizarNetoModal();
};

window.validarDescuento = function(input, saldoDeuda) {
    let val = parseFloat(input.value);
    if (isNaN(val)) val = 0;
    
    // No puede ser negativo
    if (val < 0) {
        input.value = 0;
    }
    
    // No puede superar el saldo
    if (val > saldoDeuda) {
        input.value = saldoDeuda;
        input.style.borderColor = '#ef4444';
    } else {
        input.style.borderColor = 'var(--border-light)';
    }

    // Validar que el Neto a pagar no quede en negativo
    actualizarNetoModal(input);
};

window.validarDescuentoBlur = function(input, saldoDeuda) {
    let val = parseFloat(input.value);
    if (isNaN(val)) val = 0;
    input.value = val.toFixed(2);
    input.style.borderColor = 'var(--border-light)';
    actualizarNetoModal();
};

function actualizarNetoModal(inputActivo = null) {
    if (!modalLiquidacionActual) return;

    const bruto = modalLiquidacionActual.monto_bruto;
    const adelanto = modalLiquidacionActual.adelanto;
    
    // Sumar todos los inputs de descuento
    let totalDescuentoPenalidades = 0;
    const inputs = document.querySelectorAll('.input-descuento-penalidad');
    inputs.forEach(inp => {
        if (!inp.disabled) {
            let v = parseFloat(inp.value);
            if (!isNaN(v)) totalDescuentoPenalidades += v;
        }
    });

    let neto = bruto - adelanto - totalDescuentoPenalidades;

    // Si el neto es negativo, ajustamos el último input que causó el exceso
    if (neto < 0) {
        if (inputActivo) {
            const exceso = Math.abs(neto);
            let valActual = parseFloat(inputActivo.value);
            let valAjustado = valActual - exceso;
            if (valAjustado < 0) valAjustado = 0;
            
            inputActivo.value = valAjustado; // O .toFixed(2) al blur
            inputActivo.style.borderColor = '#ef4444';
            
            totalDescuentoPenalidades = 0;
            inputs.forEach(inp => {
                if (!inp.disabled) {
                    let v = parseFloat(inp.value);
                    if (!isNaN(v)) totalDescuentoPenalidades += v;
                }
            });
            neto = bruto - adelanto - totalDescuentoPenalidades;
        } else {
            neto = 0; // fallback safety
        }
    }

    document.getElementById('modalLiqNeto').textContent = `S/ ${formatearNumero(neto)}`;
}

window.procesarLiquidacion = async function() {
    if (!modalLiquidacionActual) return;

    const metodoPago = document.getElementById('modalLiqMetodoPago').value;
    if (!metodoPago) {
        Swal.fire({ icon: 'warning', title: 'Falta información', text: 'Por favor seleccione un método de pago.' });
        return;
    }

    const btn = document.getElementById('btnConfirmarLiquidacion');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    btn.disabled = true;

    // Recolectar datos
    const bruto = modalLiquidacionActual.monto_bruto;
    const adelanto = modalLiquidacionActual.adelanto;
    let total_penalidades = 0;
    
    // Recolectar deudas a cobrar
    const deudasCobrar = [];
    const inputs = document.querySelectorAll('.input-descuento-penalidad');
    inputs.forEach(inp => {
        if (!inp.disabled) {
            let val = parseFloat(inp.value);
            if (!isNaN(val) && val > 0) {
                total_penalidades += val;
                // Obtener ID incidencia asociado al input (asumiremos que guardamos id_incidencia en un atributo del input)
                const idIncidencia = inp.dataset.id; 
                deudasCobrar.push({
                    id_incidencia: idIncidencia,
                    monto_descontado: val
                });
            }
        }
    });

    const neto_pagado = bruto - adelanto - total_penalidades;
    const observaciones = document.getElementById('modalLiqObservaciones').value;
    
    const numOperacion = document.getElementById('modalLiqNumOperacion').value.trim();
    const inputFile = document.getElementById('modalLiqEvidencia');

    if (metodoPago !== 'Efectivo' && !numOperacion) {
        Swal.fire({ icon: 'warning', title: 'Falta información', text: 'Por favor ingrese el N° de Operación.' });
        btn.innerHTML = oldHtml;
        btn.disabled = false;
        return;
    }

    const formData = new FormData();
    formData.append('monto_bruto', bruto);
    formData.append('total_adelantos', adelanto);
    formData.append('total_penalidades', total_penalidades);
    formData.append('monto_neto_pagado', neto_pagado);
    formData.append('metodo_pago', metodoPago);
    formData.append('observaciones', observaciones);
    formData.append('penalidades_descontadas', JSON.stringify(deudasCobrar));

    if (metodoPago !== 'Efectivo') {
        formData.append('numero_operacion', numOperacion);
        if (inputFile.files.length > 0) {
            formData.append('evidencia', inputFile.files[0]);
        }
    }

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const res = await fetch(`/api/viajes/${modalLiquidacionActual.id}/liquidar`, {
            method: 'POST',
            headers: {
                'x-user-profile': sessionData.id_perfil
            },
            body: formData
        });
        const json = await res.json();

        if (json.success) {
            Swal.fire({ icon: 'success', title: 'Liquidación Registrada', text: 'El pago del viaje se ha registrado exitosamente.' });
            cerrarModalLiquidacion();
            await cargarLiquidacionesDesdeServidor();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: json.message || 'No se pudo registrar la liquidación.' });
        }
    } catch (err) {
        console.error('Error al liquidar:', err);
        Swal.fire({ icon: 'error', title: 'Error de Red', text: 'Ocurrió un problema de conexión al procesar el pago.' });
    } finally {
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
};

// Eventos de Formulario Evidencia
function asignarEventosEvidencia() {
    const cboPago = document.getElementById('modalLiqMetodoPago');
    const contEvidencia = document.getElementById('contenedorEvidencia');
    const inputEvidencia = document.getElementById('modalLiqEvidencia');
    const nombreArchivo = document.getElementById('nombreArchivoLiq');

    if (cboPago) {
        cboPago.addEventListener('change', (e) => {
            if (e.target.value === 'Efectivo' || e.target.value === '') {
                contEvidencia.style.display = 'none';
                document.getElementById('modalLiqNumOperacion').value = '';
                inputEvidencia.value = '';
                nombreArchivo.textContent = 'PNG, JPG hasta 5MB';
            } else {
                contEvidencia.style.display = 'block';
            }
        });
    }

    if (inputEvidencia) {
        inputEvidencia.addEventListener('change', function(e) {
            if (this.files && this.files[0]) {
                nombreArchivo.textContent = this.files[0].name;
                nombreArchivo.style.color = 'var(--text-primary)';
            } else {
                nombreArchivo.textContent = 'PNG, JPG hasta 5MB';
                nombreArchivo.style.color = 'var(--text-muted)';
            }
        });
    }
}

// Hacer globales
window.init_liquidacion = init_liquidacion;
window.abrirModalLiquidar = abrirModalLiquidar;
window.cerrarModalLiquidacion = cerrarModalLiquidacion;
