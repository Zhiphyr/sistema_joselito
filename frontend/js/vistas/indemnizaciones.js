// Variables globales para la vista
let deudasGlobales = [];
let cargaSeleccionadaPago = null;
let cuentasIndem = [];
let billeterasIndem = [];
let carritoPagosIndem = [];
// Snapshot de saldos (fresco al abrir el modal de pago) usado solo para mostrar
// "Saldo disponible" en vivo y para el chequeo previo al envío; la validación real
// e infalible sigue siendo la del backend (registrarPago / calcularSaldoDisponible).
let resumenCuentasIndemActual = null;

// Inicialización de la vista
window.init_indemnizaciones = async function() {
    await cargarCuentasYBilleterasIndem();
    await cargarDeudasPendientes();
}

async function cargarCuentasYBilleterasIndem() {
    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch('/api/cuentas-bancarias', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();
        if (result.success) {
            cuentasIndem = result.data.cuentas || [];
            billeterasIndem = result.data.billeteras || [];
        }
    } catch (error) {
        console.error('Error cargando cuentas y billeteras:', error);
    }
}

// Trae fresco (nunca cacheado) el saldo de cada cuenta/billetera/caja física, igual
// que dashboard_financiero.js y liquidacion.js, para no confiar en un saldo cacheado
// que pudo cambiar por otros movimientos mientras el modal de pago estaba abierto.
async function obtenerResumenCuentasIndem() {
    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch('/api/dashboard-financiero/cuentas-resumen', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('Error al obtener el resumen de cuentas:', error);
        return null;
    }
}

// Misma resolución que dashboard_financiero.js/resolverSaldoDisponibleFinanciero: Efectivo
// y Depósito comparten la Caja Física (igual que resolverOrigenPagoIndemnizacion en el
// backend); una billetera arrastra el saldo combinado de su cuenta vinculada si tiene una.
function resolverSaldoDisponibleIndem(resumenCuentas, metodo, idCuenta, idBilletera) {
    if (!resumenCuentas) return null;

    if (metodo === 'Efectivo' || metodo === 'Depósito') {
        return resumenCuentas.caja_fisica ? Number(resumenCuentas.caja_fisica.saldo) : 0;
    }
    if (metodo === 'Billetera Digital') {
        const cuentaVinculada = resumenCuentas.cuentas_bancarias.find(c =>
            c.billetera_vinculada && String(c.billetera_vinculada.id_billetera) === String(idBilletera)
        );
        if (cuentaVinculada) return Number(cuentaVinculada.saldo);

        const billeteraIndependiente = resumenCuentas.billeteras_independientes.find(b =>
            String(b.id_billetera) === String(idBilletera)
        );
        return billeteraIndependiente ? Number(billeteraIndependiente.saldo) : 0;
    }
    // Transferencia -> cuenta bancaria seleccionada
    const cuenta = resumenCuentas.cuentas_bancarias.find(c => String(c.id_cuenta) === String(idCuenta));
    return cuenta ? Number(cuenta.saldo) : 0;
}

function cambiarTabIndemnizaciones(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });

    document.getElementById(`tab-${tabId}`).classList.add('active');
    document.getElementById(`content-${tabId}`).classList.add('active');
    document.getElementById(`content-${tabId}`).style.display = 'block';

    if (tabId === 'pendientes') {
        cargarDeudasPendientes();
    } else if (tabId === 'historial') {
        cargarHistorialPagos();
    }
}

async function cargarDeudasPendientes() {
    const contenedor = document.getElementById('contenedorDeudas');
    contenedor.innerHTML = '<div style="text-align: center; padding: 30px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Cargando deudas...</p></div>';

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch('/api/indemnizaciones/pendientes', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();

        if (result.success) {
            deudasGlobales = result.data;
            renderizarDeudasPendientes(deudasGlobales);
        } else {
            contenedor.innerHTML = `<div class="alert-error">${result.message}</div>`;
        }
    } catch (error) {
        console.error('Error:', error);
        contenedor.innerHTML = '<div class="alert-error">Error al cargar las deudas pendientes.</div>';
    }
}

function renderizarDeudasPendientes(viajes) {
    const contenedor = document.getElementById('contenedorDeudas');

    if (viajes.length === 0) {
        contenedor.innerHTML = '<div style="text-align: center; padding: 30px; color: #64748b;">No hay indemnizaciones pendientes por pagar.</div>';
        return;
    }

    let html = '';
    viajes.forEach(viaje => {
        let cargasHtml = '';
        let totalAdeudadoViaje = 0;
        let numeroCargasAfectadas = viaje.cargas.length;

        viaje.cargas.forEach(carga => {
            totalAdeudadoViaje += carga.total_deuda_carga;
            let detallesHtml = `
                <table class="tabla-modulo" style="margin-top: 12px;">
                    <thead>
                        <tr>
                            <th class="tabla-th" style="width: 40px; text-align: center;">
                                <input type="checkbox" onchange="toggleSelectAllDetalles(this, ${viaje.id_viaje}, ${carga.id_carga})">
                            </th>
                            <th class="tabla-th">Producto</th>
                            <th class="tabla-th">Siniestro</th>
                            <th class="tabla-th">Cant/Peso</th>
                            <th class="tabla-th" style="text-align: right;">S/ Acordado</th>
                            <th class="tabla-th" style="text-align: right;">Subtotal (S/)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            carga.detalles.forEach(det => {
                detallesHtml += `
                    <tr class="tabla-tr">
                        <td class="tabla-td" style="text-align: center;">
                            <input type="checkbox" class="chk-detalle-${viaje.id_viaje}-${carga.id_carga}" value='${JSON.stringify(det)}' onchange="calcularTotalPagoCarga(${viaje.id_viaje}, ${carga.id_carga})">
                        </td>
                        <td class="tabla-td">${det.producto_nombre}</td>
                        <td class="tabla-td"><span class="badge ${det.tipo_incidencia === 'Rechazo' ? 'badge-warning' : 'badge-danger'}">${det.tipo_incidencia}</span></td>
                        <td class="tabla-td">${det.cantidad_sacos > 0 ? det.cantidad_sacos + ' sacos' : det.peso_total + ' kg'}</td>
                        <td class="tabla-td" style="text-align: right;">${formatMoneda(det.precio_unitario_acordado)}</td>
                        <td class="tabla-td" style="text-align: right; font-weight: bold;">${formatMoneda(det.subtotal_indemnizar)}</td>
                    </tr>
                `;
            });

            detallesHtml += `</tbody></table>`;

            cargasHtml += `
                <div class="carga-card">
                    <div class="carga-card-header">
                        <div>
                            <h4>Carga ${carga.carga_correlativo || carga.id_carga}</h4>
                            <p>
                                <strong>Remitente:</strong> ${carga.remitente_nombre} <i class="fas fa-arrow-right" style="margin: 0 5px; color:#cbd5e1;"></i>
                                <strong>Destinatario:</strong> ${carga.destinatario_nombre}
                            </p>
                        </div>
                        <div class="carga-card-total">
                            <span>Siniestros de Carga</span>
                            <strong>${formatMoneda(carga.total_deuda_carga)}</strong>
                        </div>
                    </div>

                    ${detallesHtml}

                    <div class="carga-card-footer">
                        <div>
                            <span class="seleccionado-label">Seleccionado:</span>
                            <span id="total-seleccionado-${viaje.id_viaje}-${carga.id_carga}" class="seleccionado-monto">S/ 0.00</span>
                        </div>
                        <button class="btn-primary" onclick="abrirModalPago(${viaje.id_viaje}, ${carga.id_carga})" id="btn-pagar-${viaje.id_viaje}-${carga.id_carga}" disabled style="padding: 8px 16px; font-size: 13px;">
                            <i class="fas fa-handshake"></i> Pagar a Cliente
                        </button>
                    </div>
                </div>
            `;
        });

        const rutaTexto = (viaje.ruta_origen && viaje.ruta_destino) ? `${viaje.ruta_origen} - ${viaje.ruta_destino}` : 'Sin ruta especificada';

        html += `
            <div class="viaje-card" style="border-left: 4px solid var(--brand-blue);">
                <div class="viaje-card-header" onclick="toggleDetallesViaje(${viaje.id_viaje})" style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 15px; align-items: center; width: 100%;">
                    
                    <!-- Columna Izquierda: Identidad -->
                    <div style="min-width: 0;">
                        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 6px;"><i class="fas fa-truck" style="color: var(--brand-blue); margin-right: 8px;"></i>Viaje ${viaje.viaje_correlativo || '#' + viaje.id_viaje}</h3>
                        <p style="margin: 0; font-size: 13px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            <i class="far fa-calendar-alt" style="margin-right: 4px;"></i>${new Date(viaje.viaje_fecha).toLocaleDateString()} &nbsp;|&nbsp; 
                            <i class="fas fa-map-marker-alt" style="margin-right: 4px;"></i>${rutaTexto}
                        </p>
                    </div>

                    <!-- Columna Centro: Contexto -->
                    <div style="text-align: center;">
                        <span class="badge" style="font-size: 12px; padding: 6px 12px; background-color: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;">
                            <i class="fas fa-exclamation-triangle" style="margin-right: 5px;"></i>${numeroCargasAfectadas} Cargas afectadas
                        </span>
                    </div>

                    <!-- Columna Derecha: Impacto y Acción -->
                    <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
                        <span style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Total Adeudado</span>
                        <div style="display: flex; align-items: center; gap: 16px; margin-top: 2px;">
                            <strong style="color: #ef4444; font-size: 18px;">${formatMoneda(totalAdeudadoViaje)}</strong>
                            <div style="display: flex; align-items: center; gap: 6px; color: var(--brand-blue); font-size: 13px; font-weight: 600; padding: 4px 8px; background-color: #f0f9ff; border-radius: 6px;">
                                Revisar <i class="fas fa-chevron-down chevron" id="icon-toggle-${viaje.id_viaje}" style="transition: transform 0.3s ease;"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="detalles-viaje-${viaje.id_viaje}" class="viaje-card-body" style="display: none; border-top: 1px solid var(--border-light);">
                    ${cargasHtml}
                </div>
            </div>
        `;
    });

    contenedor.innerHTML = html;
}

function toggleDetallesViaje(idViaje) {
    const div = document.getElementById(`detalles-viaje-${idViaje}`);
    const icon = document.getElementById(`icon-toggle-${idViaje}`);

    if (div.style.display === 'none') {
        div.style.display = 'flex';
        icon.classList.add('rotated');
    } else {
        div.style.display = 'none';
        icon.classList.remove('rotated');
    }
}

function toggleSelectAllDetalles(checkbox, idViaje, idCarga) {
    const checkboxes = document.querySelectorAll(`.chk-detalle-${idViaje}-${idCarga}`);
    checkboxes.forEach(chk => chk.checked = checkbox.checked);
    calcularTotalPagoCarga(idViaje, idCarga);
}

function calcularTotalPagoCarga(idViaje, idCarga) {
    const checkboxes = document.querySelectorAll(`.chk-detalle-${idViaje}-${idCarga}:checked`);
    let total = 0;
    checkboxes.forEach(chk => {
        const det = JSON.parse(chk.value);
        total += parseFloat(det.subtotal_indemnizar);
    });

    document.getElementById(`total-seleccionado-${idViaje}-${idCarga}`).textContent = formatMoneda(total);
    const btnPagar = document.getElementById(`btn-pagar-${idViaje}-${idCarga}`);
    btnPagar.disabled = checkboxes.length === 0;
}

function abrirModalPago(idViaje, idCarga) {
    const viaje = deudasGlobales.find(v => v.id_viaje === idViaje);
    if (!viaje) return;
    const carga = viaje.cargas.find(c => c.id_carga === idCarga);
    if (!carga) return;
    
    cargaSeleccionadaPago = carga;

    const checkboxes = document.querySelectorAll(`.chk-detalle-${idViaje}-${idCarga}:checked`);
    const detallesAPagar = [];
    let total = 0;

    checkboxes.forEach(chk => {
        const det = JSON.parse(chk.value);
        detallesAPagar.push(det);
        total += parseFloat(det.subtotal_indemnizar);
    });

    // Resetear formulario antes de rellenarlo, para no perder los valores que se setean abajo
    document.getElementById('formPagarIndemnizacion').reset();

    // Llenar info modal
    document.getElementById('infoClientePago').innerHTML = `
        <strong>Viaje:</strong> ${viaje.viaje_correlativo || '#' + viaje.id_viaje} &nbsp;|&nbsp; <strong>Carga:</strong> ${carga.carga_correlativo || carga.id_carga}<br>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #cbd5e1;">
            <p style="margin: 0; font-size: 13px;"><strong>Remitente:</strong> ${carga.remitente_nombre}</p>
            <p style="margin: 4px 0 0; font-size: 13px;"><strong>Destinatario:</strong> ${carga.destinatario_nombre}</p>
        </div>
    `;

    document.getElementById('pagoMontoTotal').value = total.toFixed(2);
    document.getElementById('pagoMontoTotalDisplay').textContent = formatMoneda(total);

    // Configurar beneficiario
    const selectBeneficiario = document.getElementById('pagoIdCliente');
    selectBeneficiario.innerHTML = `
        <option value="">Seleccione...</option>
        <option value="${carga.remitente_id}">Remitente: ${carga.remitente_nombre}</option>
        <option value="${carga.destinatario_id}">Destinatario: ${carga.destinatario_nombre}</option>
    `;

    // Llenar resumen de productos
    let listaHtml = '<ul style="padding-left: 20px; font-size: 13px;">';
    detallesAPagar.forEach(det => {
        listaHtml += `<li>${det.producto_nombre}: <strong>${formatMoneda(det.subtotal_indemnizar)}</strong></li>`;
    });
    listaHtml += '</ul>';
    document.getElementById('listaProductosPagar').innerHTML = listaHtml;

    // Store detalles to send them later easily without recalculating
    window.detallesParaPagar = detallesAPagar;

    // Reiniciar el carrito de métodos de pago con una primera línea en Efectivo
    carritoPagosIndem = [{
        metodo_pago: 'Efectivo',
        id_cuenta: null,
        id_billetera: null,
        monto_pagado: total,
        numero_operacion: '',
        numOpEstado: null,
        evidencia_file: null
    }];
    resumenCuentasIndemActual = null;
    renderizarCarritoPagosIndem();

    document.getElementById('modalPagarIndemnizacion').style.display = 'flex';

    // El saldo se trae fresco al abrir el modal (no basta el caché de init) y se
    // vuelve a renderizar el carrito para mostrar "Saldo disponible" por línea.
    obtenerResumenCuentasIndem().then(resumen => {
        resumenCuentasIndemActual = resumen;
        renderizarCarritoPagosIndem();
    });
}

function cerrarModalPago() {
    document.getElementById('modalPagarIndemnizacion').style.display = 'none';
    cargaSeleccionadaPago = null;
    window.detallesParaPagar = [];
    carritoPagosIndem = [];
}

function obtenerMontoTotalIndem() {
    return parseFloat(document.getElementById('pagoMontoTotal').value) || 0;
}

// Verdadero solo si TODO lo obligatorio del formulario está completo y correcto:
// beneficiario elegido, al menos una línea de pago, cada línea con sus campos
// requeridos según su método (cuenta/billetera/N° operación válido y ya verificado
// contra el historial), montos > 0, y la suma exactamente igual al Monto Total a Pagar.
function formularioPagoIndemEsValido(diferencia) {
    const idClienteSeleccionado = !!(document.getElementById('pagoIdCliente') || {}).value;
    if (!idClienteSeleccionado) return false;
    if (carritoPagosIndem.length === 0) return false;
    if (Math.abs(diferencia) > 0.009) return false;

    const numerosVistos = new Set();
    for (const pago of carritoPagosIndem) {
        if ((Number(pago.monto_pagado) || 0) <= 0) return false;
        if (pago.metodo_pago === 'Transferencia' && !pago.id_cuenta) return false;
        if (pago.metodo_pago === 'Billetera Digital' && !pago.id_billetera) return false;

        if (pago.metodo_pago !== 'Efectivo') {
            if (!/^\d{6,8}$/.test(pago.numero_operacion || '')) return false;
            if (numerosVistos.has(pago.numero_operacion)) return false;
            numerosVistos.add(pago.numero_operacion);
            if (pago.numOpEstado !== 'valido') return false;
        }
    }

    return true;
}

function actualizarFaltaPagarIndem() {
    const montoTotal = obtenerMontoTotalIndem();
    const sumaPagos = carritoPagosIndem.reduce((acc, p) => acc + (Number(p.monto_pagado) || 0), 0);
    // diferencia > 0: falta pagar; diferencia < 0: se excedió del monto total
    const diferencia = Math.round((montoTotal - sumaPagos) * 100) / 100;

    const badge = document.getElementById('indemFaltaPagar');
    if (badge) {
        if (Math.abs(diferencia) <= 0.009) {
            badge.textContent = 'Pago Completo';
            badge.style.color = '#166534';
            badge.style.background = '#dcfce7';
        } else if (diferencia > 0) {
            badge.textContent = `Falta Pagar: S/ ${diferencia.toFixed(2)}`;
            badge.style.color = '#ef4444';
            badge.style.background = '#fee2e2';
        } else {
            badge.textContent = `Excede por: S/ ${Math.abs(diferencia).toFixed(2)}`;
            badge.style.color = '#ef4444';
            badge.style.background = '#fee2e2';
        }
    }

    const btnGuardar = document.getElementById('btnGuardarPago');
    if (btnGuardar) {
        btnGuardar.disabled = !formularioPagoIndemEsValido(diferencia);
    }

    const btnAgregar = document.getElementById('btnAgregarPagoIndem');
    if (btnAgregar) {
        btnAgregar.style.display = diferencia <= 0.009 ? 'none' : 'flex';
    }

    // Por cada línea: calcular en tiempo real cuál es el máximo que podría tener sin que
    // la suma total exceda el Monto Total a Pagar, y marcar en rojo la que ya lo excede.
    carritoPagosIndem.forEach((pago, index) => {
        const montoLinea = Number(pago.monto_pagado) || 0;
        const sumaOtrasLineas = sumaPagos - montoLinea;
        const maxLinea = Math.max(0, Math.round((montoTotal - sumaOtrasLineas) * 100) / 100);
        const excedeLinea = montoLinea > maxLinea + 0.009;

        const input = document.getElementById(`montoInputIndem_${index}`);
        if (input) {
            input.style.borderColor = excedeLinea ? '#ef4444' : '';
            input.style.background = excedeLinea ? '#fff5f5' : '';
        }

        const hint = document.getElementById(`montoHintIndem_${index}`);
        if (hint) {
            hint.classList.toggle('excede', excedeLinea);
            hint.innerHTML = excedeLinea
                ? `<i class="fas fa-exclamation-circle"></i> Excede el máximo disponible (S/ ${maxLinea.toFixed(2)})`
                : `Máximo disponible: S/ ${maxLinea.toFixed(2)}`;
        }
    });
}

function renderizarCarritoPagosIndem() {
    const contenedor = document.getElementById('contenedorListaPagosIndem');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (carritoPagosIndem.length === 0) {
        contenedor.innerHTML = `
            <div style="text-align: center; padding: 16px; color: var(--text-muted); font-size: 13px;">
                <i class="fas fa-info-circle" style="margin-right: 6px;"></i>
                Agrega al menos un método de pago
            </div>`;
        actualizarFaltaPagarIndem();
        return;
    }

    carritoPagosIndem.forEach((pago, index) => {
        const cuentasFiltradas = cuentasIndem.filter(c => (!c.es_sistema || c.es_sistema === 0) && c.estado === 1);
        const opcionesCuentas = cuentasFiltradas.map(c =>
            `<option value="${c.id_cuenta}" ${pago.id_cuenta == c.id_cuenta ? 'selected' : ''}>${c.entidad_financiera} - ${c.tipo_cuenta} (${c.nro_cuenta})</option>`
        ).join('');

        const billeterasFiltradas = billeterasIndem.filter(b => b.estado === 1);
        const opcionesBilleteras = billeterasFiltradas.map(b =>
            `<option value="${b.id_billetera}" ${pago.id_billetera == b.id_billetera ? 'selected' : ''}>${b.tipo_billetera} - ${b.numero_celular} (${b.titular})</option>`
        ).join('');

        const metodo = pago.metodo_pago || 'Efectivo';
        const mostrarCuenta = metodo === 'Transferencia';
        const mostrarBilletera = metodo === 'Billetera Digital';
        const mostrarNumOp = metodo !== 'Efectivo';
        const mostrarEvidencia = metodo !== 'Efectivo';
        const nombreArchivo = pago.evidencia_file ? pago.evidencia_file.name : '';

        const saldoLinea = resolverSaldoDisponibleIndem(resumenCuentasIndemActual, metodo, pago.id_cuenta, pago.id_billetera);
        const requiereSeleccion = (metodo === 'Transferencia' && !pago.id_cuenta) || (metodo === 'Billetera Digital' && !pago.id_billetera);
        let saldoHintTexto = '';
        if (!resumenCuentasIndemActual) {
            saldoHintTexto = 'Consultando saldo...';
        } else if (!requiereSeleccion) {
            saldoHintTexto = `Saldo disponible: S/ ${Number(saldoLinea || 0).toFixed(2)}`;
        }

        const bloque = document.createElement('div');
        bloque.className = 'pago-linea-indem';
        bloque.innerHTML = `
            <button type="button" onclick="eliminarPagoIndem(${index})" class="pago-linea-eliminar" title="Eliminar pago">
                <i class="fas fa-trash-alt"></i>
            </button>

            <div class="pago-linea-row">
                <div class="pago-linea-campo">
                    <label>Método de Pago</label>
                    <select onchange="actualizarPagoIndem(${index}, 'metodo_pago', this.value)" class="form-control">
                        <option value="Efectivo" ${metodo === 'Efectivo' ? 'selected' : ''}>Efectivo</option>
                        <option value="Transferencia" ${metodo === 'Transferencia' ? 'selected' : ''}>Transferencia</option>
                        <option value="Depósito" ${metodo === 'Depósito' ? 'selected' : ''}>Depósito</option>
                        <option value="Billetera Digital" ${metodo === 'Billetera Digital' ? 'selected' : ''}>Billetera Digital</option>
                    </select>
                </div>
                <div class="pago-linea-campo">
                    <label>Monto (S/)</label>
                    <input type="text" inputmode="decimal" id="montoInputIndem_${index}" value="${pago.monto_pagado || ''}" oninput="validarMontoIndem(${index}, this)" onblur="formatearMontoIndem(${index}, this)" placeholder="0.00" class="form-control">
                    <div id="montoHintIndem_${index}" class="pago-monto-hint"></div>
                </div>
            </div>

            <div class="pago-linea-campo" style="display: ${mostrarCuenta ? 'block' : 'none'};">
                <label>Cuenta Bancaria</label>
                <select onchange="actualizarPagoIndem(${index}, 'id_cuenta', this.value)" class="form-control">
                    <option value="">Seleccione cuenta...</option>
                    ${opcionesCuentas}
                </select>
            </div>

            <div class="pago-linea-campo" style="display: ${mostrarBilletera ? 'block' : 'none'};">
                <label>Billetera Digital</label>
                <select onchange="actualizarPagoIndem(${index}, 'id_billetera', this.value)" class="form-control">
                    <option value="">Seleccione billetera...</option>
                    ${opcionesBilleteras}
                </select>
            </div>

            <div id="saldoHintIndem_${index}" class="pago-monto-hint" style="color: var(--text-muted);">${saldoHintTexto}</div>

            <div class="pago-linea-campo" style="display: ${mostrarNumOp ? 'block' : 'none'};">
                <label>N° Operación *</label>
                <input type="text" inputmode="numeric" value="${pago.numero_operacion || ''}" oninput="validarNumeroOperacionIndem(${index}, this)" placeholder="Ej: 00012345" class="form-control">
                <div id="numOpHintIndem_${index}" class="pago-monto-hint"></div>
            </div>

            <div style="display: ${mostrarEvidencia ? 'block' : 'none'};">
                <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Evidencia (opcional)</label>
                <div id="dropzone-indem-${index}" onclick="document.getElementById('inputEvidIndem_${index}').click()" class="pago-dropzone"
                     ondragover="event.preventDefault(); this.classList.add('dragover');"
                     ondragleave="this.classList.remove('dragover');"
                     ondrop="event.preventDefault(); this.classList.remove('dragover'); validarYSubirEvidenciaIndem(${index}, event.dataTransfer.files);">
                    <input type="file" id="inputEvidIndem_${index}" accept="image/png,image/jpeg,image/webp" onchange="validarYSubirEvidenciaIndem(${index}, this.files)" style="display: none;">
                    <div id="previewEvidIndem_${index}" style="${nombreArchivo ? '' : 'display:none;'} margin-bottom: 8px;"></div>
                    <div id="placeholderEvidIndem_${index}" style="${nombreArchivo ? 'display:none;' : ''}">
                        <i class="fas fa-cloud-upload-alt" style="font-size: 20px; color: var(--text-muted); margin-bottom: 6px;"></i>
                        <p style="margin: 0; font-size: 12px; color: var(--text-muted);">Arrastra o haz clic para subir</p>
                        <p style="margin: 2px 0 0 0; font-size: 10px; color: var(--text-muted);">PNG, JPG, WEBP · máx 5MB</p>
                    </div>
                    <div id="filenameEvidIndem_${index}" style="${nombreArchivo ? '' : 'display:none;'} font-size: 11px; color: var(--text-secondary); margin-top: 4px; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <i class="fas fa-image" style="color: #10b981;"></i>
                        <span>${nombreArchivo}</span>
                        <button type="button" onclick="event.stopPropagation(); eliminarEvidenciaIndem(${index})" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 12px; padding: 2px;" title="Quitar imagen">
                            <i class="fas fa-times-circle"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        contenedor.appendChild(bloque);
    });

    actualizarFaltaPagarIndem();
}

function agregarNuevoPagoIndem() {
    const montoTotal = obtenerMontoTotalIndem();
    const sumaPagos = carritoPagosIndem.reduce((acc, p) => acc + (Number(p.monto_pagado) || 0), 0);
    const restante = Math.max(0, Math.round((montoTotal - sumaPagos) * 100) / 100);

    carritoPagosIndem.push({
        metodo_pago: 'Efectivo',
        id_cuenta: null,
        id_billetera: null,
        monto_pagado: restante,
        numero_operacion: '',
        numOpEstado: null,
        evidencia_file: null
    });
    renderizarCarritoPagosIndem();
}

function eliminarPagoIndem(index) {
    carritoPagosIndem.splice(index, 1);
    renderizarCarritoPagosIndem();
}

function actualizarPagoIndem(index, campo, valor) {
    if (!carritoPagosIndem[index]) return;

    carritoPagosIndem[index][campo] = valor;

    if (campo === 'metodo_pago') {
        carritoPagosIndem[index].id_cuenta = null;
        carritoPagosIndem[index].id_billetera = null;
        carritoPagosIndem[index].numero_operacion = '';
        carritoPagosIndem[index].numOpEstado = null;
        carritoPagosIndem[index].evidencia_file = null;
        renderizarCarritoPagosIndem();
        return;
    }

    if (campo === 'monto_pagado') {
        carritoPagosIndem[index].monto_pagado = Number(valor) || 0;
    }

    if (campo === 'id_cuenta' || campo === 'id_billetera') {
        actualizarSaldoHintIndem(index);
    }

    // También cubre id_cuenta/id_billetera: cambian si la línea cumple sus requisitos
    actualizarFaltaPagarIndem();
}

// Refresca solo el hint de saldo de una línea (sin re-renderizar todo el bloque, para
// no perder el foco del select mientras el usuario interactúa con él).
function actualizarSaldoHintIndem(index) {
    const pago = carritoPagosIndem[index];
    const hint = document.getElementById(`saldoHintIndem_${index}`);
    if (!pago || !hint) return;

    const metodo = pago.metodo_pago || 'Efectivo';
    const requiereSeleccion = (metodo === 'Transferencia' && !pago.id_cuenta) || (metodo === 'Billetera Digital' && !pago.id_billetera);

    if (!resumenCuentasIndemActual) {
        hint.textContent = 'Consultando saldo...';
        return;
    }
    if (requiereSeleccion) {
        hint.textContent = '';
        return;
    }

    const saldo = resolverSaldoDisponibleIndem(resumenCuentasIndemActual, metodo, pago.id_cuenta, pago.id_billetera);
    hint.textContent = `Saldo disponible: S/ ${Number(saldo || 0).toFixed(2)}`;
}

function validarMontoIndem(index, input) {
    // Solo dígitos y un punto decimal, tope decimal(10,2): 8 enteros + 2 decimales
    let valor = input.value.replace(/[^0-9.]/g, '');
    const partes = valor.split('.');
    if (partes.length > 2) {
        valor = partes[0] + '.' + partes.slice(1).join('');
    }
    if (partes[0] && partes[0].length > 8) {
        partes[0] = partes[0].substring(0, 8);
        valor = partes.length > 1 ? partes[0] + '.' + partes[1] : partes[0];
    }
    if (partes.length === 2 && partes[1].length > 2) {
        valor = partes[0] + '.' + partes[1].substring(0, 2);
    }

    input.value = valor;
    carritoPagosIndem[index].monto_pagado = Number(valor) || 0;
    actualizarFaltaPagarIndem();
}

function formatearMontoIndem(index, input) {
    let val = parseFloat(input.value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 99999999.99) val = 99999999.99;
    input.value = val.toFixed(2);
    carritoPagosIndem[index].monto_pagado = val;
    actualizarFaltaPagarIndem();
}

function validarNumeroOperacionIndem(index, input) {
    const valor = input.value.replace(/[^0-9]/g, '').substring(0, 8);
    input.value = valor;
    if (!carritoPagosIndem[index]) return;
    carritoPagosIndem[index].numero_operacion = valor;

    const hint = document.getElementById(`numOpHintIndem_${index}`);

    if (valor.length === 0) {
        carritoPagosIndem[index].numOpEstado = null;
        if (hint) { hint.classList.remove('excede'); hint.textContent = ''; }
        actualizarFaltaPagarIndem();
        return;
    }
    if (valor.length < 6) {
        carritoPagosIndem[index].numOpEstado = 'invalido';
        if (hint) { hint.classList.add('excede'); hint.innerHTML = `<i class="fas fa-exclamation-circle"></i> Debe tener mínimo 6 dígitos (van ${valor.length})`; }
        actualizarFaltaPagarIndem();
        return;
    }

    const duplicadoLocal = carritoPagosIndem.some((p, i) => i !== index && p.metodo_pago !== 'Efectivo' && p.numero_operacion === valor);
    if (duplicadoLocal) {
        carritoPagosIndem[index].numOpEstado = 'duplicado';
        if (hint) { hint.classList.add('excede'); hint.innerHTML = `<i class="fas fa-exclamation-circle"></i> Ya usaste este número en otro método de pago de este formulario.`; }
        actualizarFaltaPagarIndem();
        return;
    }

    carritoPagosIndem[index].numOpEstado = 'verificando';
    if (hint) { hint.classList.remove('excede'); hint.textContent = 'Verificando...'; }
    actualizarFaltaPagarIndem();

    clearTimeout(window[`numOpTimerIndem_${index}`]);
    window[`numOpTimerIndem_${index}`] = setTimeout(() => verificarNumeroOperacionIndem(index, valor), 500);
}

async function verificarNumeroOperacionIndem(index, valor) {
    // Si el valor cambió mientras esperábamos la respuesta, no pisar el hint actual
    if (!carritoPagosIndem[index] || carritoPagosIndem[index].numero_operacion !== valor) return;

    const hint = document.getElementById(`numOpHintIndem_${index}`);
    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch(`/api/indemnizaciones/verificar-operacion?numero_operacion=${encodeURIComponent(valor)}`, {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();

        if (!carritoPagosIndem[index] || carritoPagosIndem[index].numero_operacion !== valor) return;

        if (result.success && result.existe) {
            carritoPagosIndem[index].numOpEstado = 'duplicado';
            if (hint) { hint.classList.add('excede'); hint.innerHTML = `<i class="fas fa-exclamation-circle"></i> Este número de operación ya fue registrado en otro pago.`; }
        } else {
            carritoPagosIndem[index].numOpEstado = 'valido';
            if (hint) { hint.classList.remove('excede'); hint.textContent = ''; }
        }
    } catch (error) {
        console.error('Error verificando número de operación:', error);
        // Ante un error de red no bloqueamos el formulario: procesarPago() revalida al enviar.
        carritoPagosIndem[index].numOpEstado = 'valido';
    } finally {
        actualizarFaltaPagarIndem();
    }
}

function validarYSubirEvidenciaIndem(index, files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    const tiposPermitidos = ['image/png', 'image/jpeg', 'image/webp'];
    if (!tiposPermitidos.includes(file.type)) {
        Swal.fire({ icon: 'warning', title: 'Formato no válido', text: 'Solo se permiten imágenes PNG, JPG o WEBP.' });
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        Swal.fire({ icon: 'warning', title: 'Archivo muy grande', text: 'La imagen no debe superar los 5MB.' });
        return;
    }

    carritoPagosIndem[index].evidencia_file = file;

    const preview = document.getElementById(`previewEvidIndem_${index}`);
    const placeholder = document.getElementById(`placeholderEvidIndem_${index}`);
    const filename = document.getElementById(`filenameEvidIndem_${index}`);

    if (preview && placeholder && filename) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 120px; border-radius: 6px; object-fit: contain;">`;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
            filename.style.display = 'flex';
            filename.querySelector('span').textContent = file.name;
        };
        reader.readAsDataURL(file);
    }
}

function eliminarEvidenciaIndem(index) {
    carritoPagosIndem[index].evidencia_file = null;
    const input = document.getElementById(`inputEvidIndem_${index}`);
    if (input) input.value = '';

    const preview = document.getElementById(`previewEvidIndem_${index}`);
    const placeholder = document.getElementById(`placeholderEvidIndem_${index}`);
    const filename = document.getElementById(`filenameEvidIndem_${index}`);

    if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }
    if (placeholder) placeholder.style.display = 'block';
    if (filename) filename.style.display = 'none';
}

async function procesarPago() {
    const idCliente = document.getElementById('pagoIdCliente').value;
    const observaciones = document.getElementById('pagoObservaciones').value;
    const monto = document.getElementById('pagoMontoTotal').value;

    if (!idCliente) {
        Swal.fire({ icon: 'warning', title: 'Falta beneficiario', text: 'Seleccione el beneficiario del pago.' });
        return;
    }

    if (carritoPagosIndem.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Sin pagos', text: 'Debe agregar al menos un método de pago.' });
        return;
    }

    const numerosVistos = new Set();
    for (let i = 0; i < carritoPagosIndem.length; i++) {
        const p = carritoPagosIndem[i];
        if (p.metodo_pago === 'Transferencia' && !p.id_cuenta) {
            Swal.fire({ icon: 'warning', title: 'Falta cuenta', text: `Seleccione la cuenta bancaria para el pago #${i + 1}.` });
            return;
        }
        if (p.metodo_pago === 'Billetera Digital' && !p.id_billetera) {
            Swal.fire({ icon: 'warning', title: 'Falta billetera', text: `Seleccione la billetera digital para el pago #${i + 1}.` });
            return;
        }
        if (p.metodo_pago === 'Efectivo') continue;

        if (!/^\d{6,8}$/.test(p.numero_operacion || '')) {
            Swal.fire({ icon: 'warning', title: 'N° de Operación inválido', text: `El pago #${i + 1} (${p.metodo_pago}) debe tener un N° de Operación de solo números, entre 6 y 8 dígitos.` });
            return;
        }
        if (numerosVistos.has(p.numero_operacion)) {
            Swal.fire({ icon: 'warning', title: 'N° de Operación repetido', text: `El N° de Operación "${p.numero_operacion}" está repetido entre los métodos de pago.` });
            return;
        }
        numerosVistos.add(p.numero_operacion);
    }

    const sumaPagos = carritoPagosIndem.reduce((acc, p) => acc + (Number(p.monto_pagado) || 0), 0);
    if (Math.abs(sumaPagos - parseFloat(monto)) >= 0.01) {
        Swal.fire({ icon: 'error', title: 'Montos no coinciden', text: 'La suma de los métodos de pago debe ser igual al Monto Total a Pagar.' });
        return;
    }

    // Revalidar unicidad contra el historial justo antes de enviar (el hint en vivo puede
    // haber quedado desactualizado si el usuario escribió y envió muy rápido).
    const sessionDataCheck = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    for (let i = 0; i < carritoPagosIndem.length; i++) {
        const p = carritoPagosIndem[i];
        if (p.metodo_pago === 'Efectivo') continue;
        try {
            const resp = await fetch(`/api/indemnizaciones/verificar-operacion?numero_operacion=${encodeURIComponent(p.numero_operacion)}`, {
                headers: { 'x-user-profile': sessionDataCheck.id_perfil }
            });
            const json = await resp.json();
            if (json.success && json.existe) {
                Swal.fire({ icon: 'error', title: 'N° de Operación ya registrado', text: `El N° de Operación "${p.numero_operacion}" del pago #${i + 1} ya fue usado en otro pago.` });
                return;
            }
        } catch (error) {
            console.error('Error verificando número de operación:', error);
        }
    }

    // Chequeo de fondos con datos frescos (por si otro movimiento consumió el saldo
    // mientras el modal estaba abierto). No reemplaza la validación real del backend
    // (registrarPago), que es la que de verdad no se puede saltar.
    const resumenFrescoIndem = await obtenerResumenCuentasIndem();
    const saldosReservadosIndem = new Map();
    for (let i = 0; i < carritoPagosIndem.length; i++) {
        const p = carritoPagosIndem[i];
        const montoLinea = Number(p.monto_pagado) || 0;
        if (montoLinea <= 0) continue;

        const claveSaldo = p.metodo_pago === 'Billetera Digital' ? `billetera:${p.id_billetera}` :
            (p.metodo_pago === 'Transferencia' ? `cuenta:${p.id_cuenta}` : 'caja_fisica');

        const saldoBase = resolverSaldoDisponibleIndem(resumenFrescoIndem, p.metodo_pago, p.id_cuenta, p.id_billetera);
        if (saldoBase === null) continue;

        const yaReservado = saldosReservadosIndem.get(claveSaldo) || 0;
        const saldoRestante = Math.round((saldoBase - yaReservado) * 100) / 100;

        if (saldoRestante < montoLinea) {
            Swal.fire({
                icon: 'error',
                title: 'Fondos Insuficientes',
                text: `El método de pago "${p.metodo_pago}" del pago #${i + 1} solo tiene S/ ${saldoRestante.toFixed(2)} disponible.`
            });
            return;
        }
        saldosReservadosIndem.set(claveSaldo, yaReservado + montoLinea);
    }

    const detalles = window.detallesParaPagar.map(det => ({
        id_incidencia: det.id_incidencia,
        id_detalle: det.id_detalle,
        monto_pagado: det.subtotal_indemnizar
    }));

    try {
        const btn = document.getElementById('btnGuardarPago');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

        const formData = new FormData();
        formData.append('id_cliente', idCliente);
        formData.append('monto_total', monto);
        formData.append('observaciones', observaciones);
        formData.append('detalles', JSON.stringify(detalles));

        const pagosPayload = carritoPagosIndem.map((p, index) => {
            if (p.evidencia_file) {
                formData.append('evidencia_' + index, p.evidencia_file);
            }
            return {
                metodo_pago: p.metodo_pago,
                id_cuenta: p.id_cuenta,
                id_billetera: p.id_billetera,
                monto_pagado: p.monto_pagado,
                numero_operacion: p.numero_operacion
            };
        });
        formData.append('pagos', JSON.stringify(pagosPayload));

        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch('/api/indemnizaciones/pagar', {
            method: 'POST',
            headers: {
                'x-user-profile': sessionData.id_perfil,
                'x-user-id': sessionData.id_usuario
            },
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            Swal.fire({ icon: 'success', title: 'Pago Registrado', text: 'El pago se registró correctamente.' });
            cerrarModalPago();
            cargarDeudasPendientes(); // Recargar deudas
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message || 'Error al procesar el pago' });
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'No se pudo procesar el pago. Revisa la consola.' });
    } finally {
        const btn = document.getElementById('btnGuardarPago');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Confirmar Pago';
    }
}

// Historial
let historialGlobal = [];

async function cargarHistorialPagos() {
    const tbody = document.getElementById('tbodyHistorialPagos');

    if ($.fn.DataTable.isDataTable('#tabla-historial-pagos')) {
        $('#tabla-historial-pagos').DataTable().destroy();
    }
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Cargando historial...</td></tr>';

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch('/api/indemnizaciones/historial', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();

        if (result.success) {
            historialGlobal = result.data;
            renderizarHistorial(historialGlobal);
        } else {
            tbody.innerHTML = `<tr><td colspan="9" class="alert-error">${result.message}</td></tr>`;
        }
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="9" class="alert-error">Error al cargar historial.</td></tr>';
    }
}

function renderizarHistorial(pagos) {
    const tbody = document.getElementById('tbodyHistorialPagos');

    if (pagos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #64748b;">No hay pagos registrados.</td></tr>';
        return;
    }

    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const puedeAnular = sessionData.id_perfil === 1 || sessionData.id_perfil === 2;

    let html = '';
    pagos.forEach(p => {
        const badgeEstado = p.estado === 1
            ? '<span class="badge-pill-success"><i class="fas fa-check-circle"></i> Completado</span>'
            : '<span class="badge-pill-danger"><i class="fas fa-undo-alt"></i> Anulado</span>';

        const metodos = p.metodos_pago || [];
        let metodoTexto = '';
        if (metodos.length === 1) {
            metodoTexto = metodos[0].metodo_pago;
        } else if (metodos.length > 1) {
            const metodosNombres = metodos.map(m => m.metodo_pago);
            const resumen = metodosNombres.slice(0, 2).join(' + ') + (metodos.length > 2 ? ` (+${metodos.length - 2})` : '');
            metodoTexto = `
                <div style="display: flex; flex-direction: column; gap: 4px; align-items: center;">
                    <span class="badge-pill-mixed">Mixto (${metodos.length})</span>
                    <span style="font-size: 11px; color: var(--text-muted);">${resumen}</span>
                </div>
            `;
        } else {
            metodoTexto = '-';
        }

        const numOpTexto = metodos.length === 1 ? (metodos[0].numero_operacion || '-') : '<span style="color: var(--text-muted); font-size: 12px;">Varios</span>';

        const fechaObj = new Date(p.fecha_pago);
        const fechaDia = fechaObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        const fechaHora = fechaObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });

        html += `
            <tr>
                <td>#PAG-${String(p.id_pago).padStart(5, '0')}</td>
                <td style="text-align: left;"><strong>${p.cliente_nombre}</strong></td>
                <td data-sort="${fechaObj.getTime()}">
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <span style="font-weight: 500;">${fechaDia}</span>
                        <span style="font-size: 11px; color: var(--text-muted);">${fechaHora}</span>
                    </div>
                </td>
                <td style="font-weight: 700; color: #1e293b; font-size: 14px;">${formatMoneda(p.monto_total)}</td>
                <td>${metodoTexto}</td>
                <td>${numOpTexto}</td>
                <td style="text-align: left;">${p.usuario_nombre}</td>
                <td>${badgeEstado}</td>
                <td style="text-align: center;">
                    <button class="btn-icon text-primary" title="Ver Detalles" onclick="verDetallesPago(${p.id_pago})">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${p.estado === 1 && puedeAnular ? `
                    <button class="btn-icon text-danger" style="color: #64748b;" title="Anular Pago" onclick="confirmarAnularPago(${p.id_pago})" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#64748b'">
                        <i class="fas fa-undo-alt"></i>
                    </button>
                    ` : ''}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    // Configurar filtro de fechas personalizado si no existe
    if (!$.fn.dataTable.ext.search.includes(filtroRangoFechasPagos)) {
        $.fn.dataTable.ext.search.push(filtroRangoFechasPagos);
    }

    // Event listeners para los inputs de fecha
    $('#filtro-fecha-desde, #filtro-fecha-hasta').off('change').on('change', function() {
        if ($.fn.DataTable.isDataTable('#tabla-historial-pagos')) {
            $('#tabla-historial-pagos').DataTable().draw();
        }
    });

    const tablaHistorial = $('#tabla-historial-pagos').DataTable({
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
        },
        order: [[0, 'desc']],
        pageLength: 15,
        lengthMenu: [[15, 25, 50, -1], [15, 25, 50, "Todos"]],
        dom: 'rt<"bottom-controls"ilp>',
        columnDefs: [
            { orderable: false, targets: 8 },
            { className: "dt-right", targets: 3 }, // Monto a la derecha
            { className: "dt-center", targets: [0, 2, 4, 5, 7, 8] } // Centrar otros
        ]
    });

    // Buscador propio (no el `f` de DataTables): así no depende de reparentar DOM entre
    // pestañas, que es lo que dejaba el buscador roto al volver a esta pestaña.
    $('#buscador-historial-pagos').off('keyup change').on('keyup change', function() {
        tablaHistorial.search(this.value).draw();
    });
}

function filtroRangoFechasPagos(settings, data, dataIndex) {
    if (settings.nTable.id !== 'tabla-historial-pagos') return true;
    
    const minDateStr = $('#filtro-fecha-desde').val();
    const maxDateStr = $('#filtro-fecha-hasta').val();
    
    if (!minDateStr && !maxDateStr) return true;

    const rowData = historialGlobal[dataIndex];
    if (!rowData) return true;
    
    const rowDate = new Date(rowData.fecha_pago);
    rowDate.setHours(0,0,0,0);
    
    if (minDateStr) {
        const minDate = new Date(minDateStr + 'T00:00:00');
        if (rowDate < minDate) return false;
    }
    if (maxDateStr) {
        const maxDate = new Date(maxDateStr + 'T23:59:59');
        if (rowDate > maxDate) return false;
    }
    return true;
}

function limpiarFiltroFechas() {
    $('#filtro-fecha-desde').val('');
    $('#filtro-fecha-hasta').val('');
    if ($.fn.DataTable.isDataTable('#tabla-historial-pagos')) {
        $('#tabla-historial-pagos').DataTable().draw();
    }
}

function verDetallesPago(idPago) {
    const pago = historialGlobal.find(p => p.id_pago === idPago);
    if (!pago) return;

    const fechaObj = new Date(pago.fecha_pago);
    const fechaFormat = fechaObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) + ' - ' + fechaObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });

    let badgeEstado = pago.estado === 1 
        ? '<span class="badge-pill-success" style="font-size: 13px; padding: 4px 12px;"><i class="fas fa-check-circle"></i> Completado</span>' 
        : '<span class="badge-pill-danger" style="font-size: 13px; padding: 4px 12px;"><i class="fas fa-undo-alt"></i> Anulado</span>';

    // Generar bloque Observaciones
    let obsHtml = '';
    if (!pago.observaciones || pago.observaciones.trim() === '' || pago.observaciones.toLowerCase() === 'ninguna') {
        obsHtml = `<div style="color: var(--text-muted); font-style: italic; font-size: 13px; margin-top: 12px;"><i class="fas fa-info-circle"></i> Sin observaciones registradas.</div>`;
    } else {
        obsHtml = `<div style="background-color: #fffbeb; color: #92400e; border: 1px solid #fde68a; padding: 12px; border-radius: 8px; font-size: 13px; margin-top: 16px;"><i class="fas fa-exclamation-triangle" style="margin-right: 6px;"></i> <strong>Observaciones:</strong> ${pago.observaciones}</div>`;
    }

    let html = `
        <!-- HEADER VOUCHER -->
        <div style="background: #f8fafc; border: 1px solid var(--border-light); border-radius: 12px; padding: 20px; margin-bottom: 24px; position: relative;">
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
                <div style="flex: 1; min-width: 200px;">
                    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 16px;">
                        <span style="font-weight: 700; color: var(--text-primary); font-size: 16px;">#PAG-${String(pago.id_pago).padStart(5, '0')}</span>
                        ${badgeEstado}
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div>
                            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 2px;">Beneficiario</div>
                            <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); line-height: 1.3;">${pago.cliente_nombre}</div>
                        </div>
                        <div style="display: flex; gap: 24px; flex-wrap: wrap;">
                            <div>
                                <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 2px;">Fecha</div>
                                <div style="font-size: 14px; color: var(--text-secondary);">${fechaFormat}</div>
                            </div>
                            <div>
                                <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 2px;">Registrado por</div>
                                <div style="font-size: 14px; color: var(--text-secondary);">${pago.usuario_nombre}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="text-align: right; background: white; padding: 12px 16px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Total Pagado</div>
                    <div style="font-size: 22px; font-weight: 800; color: #1e293b; letter-spacing: -0.5px;">${formatMoneda(pago.monto_total)}</div>
                </div>
            </div>
            ${obsHtml}
        </div>
    `;

    // MÉTODOS DE PAGO
    html += `<h4 style="margin-bottom: 16px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;"><i class="fas fa-wallet" style="color: var(--brand-blue);"></i> Métodos de Pago Aplicados</h4>`;
    html += `<div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 28px;">`;

    (pago.metodos_pago || []).forEach(m => {
        let iconHtml = '';
        if (m.metodo_pago === 'Efectivo') iconHtml = '<i class="fas fa-money-bill-wave" style="color: #10b981;"></i>';
        else if (m.metodo_pago === 'Transferencia') iconHtml = '<i class="fas fa-university" style="color: #3b82f6;"></i>';
        else iconHtml = '<i class="fas fa-mobile-alt" style="color: #8b5cf6;"></i>'; // Billetera Digital

        let detalleMedio = m.cuenta_titular ? `${m.cuenta_entidad || ''} - ${m.cuenta_titular}` : (m.billetera_titular ? `${m.billetera_proveedor || ''} - ${m.billetera_titular}` : 'Pago directo en caja');
        let nOperacionHtml = m.numero_operacion ? `<span style="font-size: 12px; color: var(--text-muted); background: #f1f5f9; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">Op: ${m.numero_operacion}</span>` : '';
        let evidenciaHtml = m.evidencia_url ? `<a href="${m.evidencia_url}" target="_blank" style="font-size: 12px; color: #3b82f6; text-decoration: none; font-weight: 600; display: flex; align-items: center; gap: 4px;"><i class="fas fa-paperclip"></i> Ver Comprobante</a>` : '';

        html += `
            <div style="display: flex; align-items: center; justify-content: space-between; background: white; border: 1px solid var(--border-light); border-radius: 10px; padding: 16px; transition: border-color 0.2s;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div style="width: 42px; height: 42px; border-radius: 50%; background: #f8fafc; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                        ${iconHtml}
                    </div>
                    <div>
                        <div style="font-weight: 700; color: var(--text-primary); font-size: 14px; margin-bottom: 2px;">${m.metodo_pago}</div>
                        <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">${detalleMedio}</div>
                        <div style="display: flex; gap: 12px; align-items: center;">
                            ${nOperacionHtml}
                            ${evidenciaHtml}
                        </div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Monto Asignado</div>
                    <div style="font-size: 18px; font-weight: 800; color: #1e293b;">${formatMoneda(m.monto_pagado)}</div>
                </div>
            </div>
        `;
    });
    html += `</div>`;

    // DIVIDER
    html += `<div style="border-bottom: 1px dashed #cbd5e1; margin-bottom: 24px;"></div>`;

    // PRODUCTOS PAGADOS
    html += `<h4 style="margin-bottom: 16px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;"><i class="fas fa-box-open" style="color: var(--brand-blue);"></i> Productos Cubiertos</h4>`;
    html += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px;">`;

    pago.detalles.forEach(d => {
        let badgeIncidencia = d.tipo_incidencia === 'Accidente' ? '<span class="badge-pill-danger" style="font-size: 10px; padding: 2px 8px;">Accidente</span>' : (d.tipo_incidencia === 'Rechazo' ? '<span class="badge-pill-mixed" style="font-size: 10px; padding: 2px 8px; background: #fff7ed; color: #c2410c; border-color: #ffedd5;">Rechazo</span>' : '<span class="badge-pill-mixed" style="font-size: 10px; padding: 2px 8px;">Siniestro</span>');

        html += `
            <div style="background: white; border: 1px solid var(--border-light); border-radius: 10px; padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div>
                        <div style="font-size: 12px; font-weight: 700; color: var(--brand-blue); margin-bottom: 2px;">Viaje ${d.viaje_correlativo}</div>
                        <div style="font-weight: 700; color: var(--text-primary); font-size: 14px; padding-right: 8px;">${d.producto_nombre}</div>
                    </div>
                    <div>${badgeIncidencia}</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #f1f5f9; padding-top: 12px;">
                    <span style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Subtotal Pagado</span>
                    <span style="font-size: 16px; font-weight: 800; color: #1e293b;">${formatMoneda(d.monto_pagado)}</span>
                </div>
            </div>
        `;
    });

    html += `</div>`;

    document.getElementById('contenidoDetallesPago').innerHTML = html;
    document.getElementById('modalDetallesPago').style.display = 'flex';
}

function cerrarModalDetallesPago() {
    document.getElementById('modalDetallesPago').style.display = 'none';
}

async function confirmarAnularPago(idPago) {
    const pago = historialGlobal.find(p => p.id_pago === idPago);
    if (!pago) return;

    await Swal.fire({
        title: '¿Anular este pago?',
        icon: 'warning',
        reverseButtons: true,
        html: `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; text-align: left;">
                <div style="font-size: 13px; font-weight: 700; color: #1e293b;">Pago #PAG-${String(pago.id_pago).padStart(5, '0')} &bull; ${formatMoneda(pago.monto_total)}</div>
                <div style="font-size: 12px; color: #64748b;">${pago.cliente_nombre}</div>
            </div>
            <p style="text-align:left; font-size:13px; color:#64748b; margin-bottom:12px;">
                Esta acción revertirá los productos dañados a estado pendiente y los movimientos de caja asociados.
            </p>
            <label style="display:block; text-align:left; font-size:13px; font-weight:600; margin-bottom:4px;">Motivo de la anulación *</label>
            <textarea id="swal-motivo-anulacion" class="swal2-textarea custom-swal-textarea" style="width:100%; margin:0 0 4px; box-sizing:border-box; font-size: 14px;"
                placeholder="Ej: Se registró el pago con el monto incorrecto, se corrige y se vuelve a registrar."
                oninput="window.validarFormAnulacionIndem()"></textarea>
            <div id="error-motivo" style="display:none; color:#dc2626; font-size:12px; text-align:left; margin-bottom:12px;">El motivo debe tener al menos 10 caracteres.</div>

            <label style="display:block; text-align:left; font-size:13px; font-weight:600; margin-bottom:4px; margin-top:8px;">PIN de autorización *</label>
            <input type="password" id="swal-pin-anulacion" class="swal2-input custom-swal-input" style="width:100%; margin:0 0 4px; box-sizing:border-box; font-size: 14px;"
                inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="4 dígitos"
                oninput="this.value = this.value.replace(/[^0-9]/g, '').substring(0, 4); window.validarFormAnulacionIndem()">
            <div id="error-pin" style="display:none; color:#dc2626; font-size:12px; text-align:left; margin-bottom:12px;">PIN de autorización incorrecto.</div>

            <style>
                .custom-swal-textarea::placeholder { color: #94a3b8 !important; font-size: 14px !important; }
                .custom-swal-input::placeholder { color: #94a3b8 !important; font-size: 14px !important; }
            </style>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, anular',
        cancelButtonText: 'Cancelar',
        showLoaderOnConfirm: true,
        allowOutsideClick: () => !Swal.isLoading(),
        didOpen: () => {
            Swal.getConfirmButton().disabled = true;
            window.validarFormAnulacionIndem = function() {
                const motivo = document.getElementById('swal-motivo-anulacion').value.trim();
                const pin = document.getElementById('swal-pin-anulacion').value.trim();
                const motivoValido = motivo.length >= 10 && /^[a-zA-Z0-9À-ÿ\s.,\-¿?¡!:;'"()/#]+$/.test(motivo);
                const pinValido = /^[0-9]{4}$/.test(pin);
                Swal.getConfirmButton().disabled = !(motivoValido && pinValido);
            };
        },
        willClose: () => {
            delete window.validarFormAnulacionIndem;
        },
        preConfirm: () => {
            const motivoInput = document.getElementById('swal-motivo-anulacion');
            const pinInput = document.getElementById('swal-pin-anulacion');
            const errorMotivo = document.getElementById('error-motivo');
            const errorPin = document.getElementById('error-pin');
            
            const motivo = motivoInput.value.trim();
            const pin = pinInput.value.trim();
            
            // Reset errors
            motivoInput.style.borderColor = '';
            pinInput.style.borderColor = '';
            errorMotivo.style.display = 'none';
            errorPin.style.display = 'none';

            let isValid = true;
            if (motivo.length < 10) {
                motivoInput.style.borderColor = '#dc2626';
                errorMotivo.innerText = 'El motivo debe tener al menos 10 caracteres.';
                errorMotivo.style.display = 'block';
                isValid = false;
            } else if (!/^[a-zA-Z0-9À-ÿ\s.,\-¿?¡!:;'"()/#]+$/.test(motivo)) {
                motivoInput.style.borderColor = '#dc2626';
                errorMotivo.innerText = 'El motivo tiene caracteres no permitidos.';
                errorMotivo.style.display = 'block';
                isValid = false;
            }

            if (!/^[0-9]{4}$/.test(pin)) {
                pinInput.style.borderColor = '#dc2626';
                errorPin.innerText = 'El PIN debe tener exactamente 4 dígitos numéricos.';
                errorPin.style.display = 'block';
                isValid = false;
            }

            if (!isValid) return false;

            const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
            
            return fetch(`/api/indemnizaciones/anular/${idPago}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-profile': sessionData.id_perfil,
                    'x-user-id': sessionData.id_usuario
                },
                body: JSON.stringify({ motivo, pin })
            })
            .then(response => {
                if (!response.ok && response.status !== 400 && response.status !== 401 && response.status !== 403) {
                    throw new Error(response.statusText);
                }
                return response.json();
            })
            .then(result => {
                if (!result.success) {
                    // Mostrar error inline para pin si es posible, o genérico.
                    pinInput.value = ''; // Resetear PIN para que lo vuelva a ingresar
                    pinInput.style.borderColor = '#dc2626';
                    errorPin.innerText = result.message || 'Error al autorizar anulación.';
                    errorPin.style.display = 'block';
                    return false; // Evita cerrar el modal
                }
                return result;
            })
            .catch(error => {
                Swal.showValidationMessage(`Error de conexión: ${error}`);
                return false;
            });
        }
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            Swal.fire({ icon: 'success', title: 'Pago Anulado', text: 'El pago se anuló correctamente.' });
            cargarHistorialPagos(); // Recargar historial
        }
    });
}

// Utilidad
function formatMoneda(monto) {
    return 'S/ ' + parseFloat(monto).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Inicializar cuando se cargue el script si estamos en la vista
if (document.getElementById('contenedorDeudas') && typeof init_indemnizaciones === 'function') {
    init_indemnizaciones();
}
