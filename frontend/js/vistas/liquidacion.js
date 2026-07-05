// frontend/js/vistas/liquidacion.js

let liquidacionesPendientes = [];

async function init_liquidacion() {
    asignarEventosTab();
    asignarEventoBusqueda();
    await cargarCuentasYBilleterasLiq();
    await cargarLiquidacionesDesdeServidor();
}

async function cargarCuentasYBilleterasLiq() {
    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const headers = { 'x-user-profile': sessionData.id_perfil };
        const res = await fetch('/api/cuentas-bancarias', { headers });
        const json = await res.json();
        if (json.success) {
            cuentasLiq = json.data.cuentas || [];
            billeterasLiq = json.data.billeteras || [];
        }
    } catch (e) { console.error('Error cargando cuentas:', e); }
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
        if (liq.penalidades_pendientes > 0) {
            penalidadesHtml = `
                <div style="display: flex; flex-direction: column; align-items: flex-end; min-width: 80px;">
                    <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Penalidades</span>
                    <span style="font-size: 14px; font-weight: 600; color: #ef4444;">-S/ ${formatearNumero(liq.penalidades_pendientes)}</span>
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
                        ${liq.bloquear_liquidacion ? `
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                            <button class="btn-liquidar" disabled title="Liquidación bloqueada: Existen cargas rechazadas pendientes de justificar." style="padding: 8px 16px; border-radius: 6px; border: none; background: #94a3b8; color: white; font-weight: 600; font-size: 13px; cursor: not-allowed; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-lock"></i> Liquidar
                            </button>
                            <span style="font-size: 10px; color: #ef4444; font-weight: 600;">Reportar incidencias</span>
                        </div>
                        ` : `
                        <button class="btn-liquidar" onclick="abrirModalLiquidar(${liq.id})" style="padding: 8px 16px; border-radius: 6px; border: none; background: #047857; color: white; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.2s ease;">
                            <i class="fas fa-wallet"></i> Liquidar
                        </button>
                        `}
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

let historialLiquidacionesGlobal = []; // Para buscar por id

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
            historialLiquidacionesGlobal = json.data;
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
                        <th style="padding: 12px 16px; font-weight: 600; text-align: center;">Acciones</th>
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
            <td style="padding: 16px; text-align: center;">
                <div style="display: flex; gap: 8px; justify-content: center;">
                    <button onclick="abrirModalDetalleLiquidacion(${liq.id_liquidacion})" title="Ver Detalle" style="background: #e0f2fe; color: var(--brand-blue); border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="procesarBoletaPDF(${liq.id_liquidacion})" title="Generar PDF" style="background: #fef2f2; color: #ef4444; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                </div>
            </td>
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

window.abrirModalDetalleLiquidacion = function(id) {
    const liq = historialLiquidacionesGlobal.find(l => l.id_liquidacion === id);
    if (!liq) return;

    document.getElementById('modalDetalleLiqViajeTitle').textContent = `Viaje #${liq.id_viaje} - ${liq.chofer_nombre}`;
    
    // Lista de Pagos
    const contenedorPagos = document.getElementById('modalDetalleListaPagos');
    contenedorPagos.innerHTML = '';
    
    if (liq.pagos && liq.pagos.length > 0) {
        liq.pagos.forEach(pago => {
            let infoOperacion = '';
            if (pago.numero_operacion) {
                infoOperacion = `
                    <div style="text-align: right;">
                        <div style="font-size: 11px; color: var(--text-secondary);">N° Operación</div>
                        <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${pago.numero_operacion}</div>
                    </div>
                `;
            }
            
            let infoEvidencia = '';
            if (pago.evidencia_url) {
                infoEvidencia = `
                    <div style="margin-top: 8px;">
                        <button onclick="abrirModalEvidenciaPreview('${pago.evidencia_url}')" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: #e0f2fe; color: var(--brand-blue); border: none; font-size: 12px; font-weight: 600; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-image"></i> Ver Comprobante
                        </button>
                    </div>
                `;
            }

            contenedorPagos.innerHTML += `
                <div style="padding: 12px; background: #f8fafc; border: 1px solid var(--border-light); border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 11px; color: var(--text-secondary);">Método</div>
                            <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${pago.metodo_pago}</div>
                        </div>
                        <div style="text-align: right; padding: 0 12px;">
                            <div style="font-size: 11px; color: var(--text-secondary);">Monto</div>
                            <div style="font-size: 14px; font-weight: 700; color: #16a34a;">S/ ${formatearNumero(pago.monto_pagado)}</div>
                        </div>
                        ${infoOperacion}
                    </div>
                    ${infoEvidencia}
                </div>
            `;
        });
    } else {
        contenedorPagos.innerHTML = '<div style="font-size: 13px; color: var(--text-muted);">No se registraron detalles de pagos mixtos para esta liquidación.</div>';
    }

    // Finanzas
    document.getElementById('modalDetalleBruto').textContent = `S/ ${formatearNumero(liq.monto_bruto)}`;
    document.getElementById('modalDetalleAdelantos').textContent = `-S/ ${formatearNumero(liq.total_adelantos)}`;
    document.getElementById('modalDetallePenalidades').textContent = `-S/ ${formatearNumero(liq.total_penalidades)}`;
    document.getElementById('modalDetalleNeto').textContent = `S/ ${formatearNumero(liq.monto_neto_pagado)}`;

    const modal = document.getElementById('modalDetalleLiquidacion');
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        modal.style.opacity = '1';
        modal.querySelector('.modal-content').style.transform = 'translateY(0)';
    });
};

window.cerrarModalDetalleLiquidacion = function() {
    const modal = document.getElementById('modalDetalleLiquidacion');
    modal.style.opacity = '0';
    modal.querySelector('.modal-content').style.transform = 'translateY(20px)';
    setTimeout(() => { modal.style.display = 'none'; }, 300);
};

window.abrirModalEvidenciaPreview = function(url) {
    document.getElementById('imgEvidenciaPreview').src = url;
    const modal = document.getElementById('modalEvidenciaPreview');
    modal.style.display = 'flex';
    requestAnimationFrame(() => { modal.style.opacity = '1'; });
};

window.cerrarModalEvidenciaPreview = function() {
    const modal = document.getElementById('modalEvidenciaPreview');
    modal.style.opacity = '0';
    setTimeout(() => { 
        modal.style.display = 'none'; 
        document.getElementById('imgEvidenciaPreview').src = '';
    }, 300);
};

// ==============================================================
// Lógica para PDF de Liquidación
// ==============================================================

window.procesarBoletaPDF = async function(id_liquidacion) {
    const liq = historialLiquidacionesGlobal.find(l => l.id_liquidacion === id_liquidacion);
    if (!liq) {
        Swal.fire('Error', 'No se encontraron los datos de la liquidación en el historial.', 'error');
        return;
    }

    try {
        Swal.fire({
            title: 'Generando documento...',
            text: 'Obteniendo estado de cuenta actualizado',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        // Obtener deudas pendientes actuales
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const res = await fetch(`/api/camiones/${liq.id_camion}/incidencias_pendientes`, {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const json = await res.json();
        
        let deudasActuales = [];
        if (json.success && json.data) {
            deudasActuales = json.data;
        }

        Swal.close();
        generarBoletaPDF(liq, deudasActuales);
    } catch (e) {
        console.error('Error generando PDF:', e);
        Swal.fire('Error', 'Ocurrió un problema al intentar generar el PDF.', 'error');
        document.body.style.overflow = '';
        document.body.style.pointerEvents = '';
    }
};

function generarBoletaPDF(liq, deudasActuales) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Config
    const marginX = 15;
    let cursorY = 20;

    // Colores
    const colMain = [33, 41, 54]; // Slate 800
    const colMuted = [100, 116, 139]; // Slate 500
    const colBrand = [37, 99, 235]; // Blue 600

    // Cargar Logo e iniciar
    const imgLogo = new Image();
    imgLogo.src = 'img/letras-negras.png';
    
    imgLogo.onload = () => {
        // --- CABECERA ---
        doc.addImage(imgLogo, 'PNG', marginX, cursorY, 52.5, 18);
        
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(colMain[0], colMain[1], colMain[2]);
        doc.text("Boleta de Liquidación", 200 - marginX, cursorY + 8, { align: "right" });
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(colMuted[0], colMuted[1], colMuted[2]);
        doc.text(`Fecha de Liquidación: ${liq.fecha}`, 200 - marginX, cursorY + 14, { align: "right" });

        cursorY += 25;
        doc.setDrawColor(226, 232, 240); // slate 200
        doc.line(marginX, cursorY, 200 - marginX, cursorY);
        cursorY += 8;

        // --- INFO VIAJE Y TRANSPORTISTA ---
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(colMain[0], colMain[1], colMain[2]);
        doc.text("DATOS DEL TRANSPORTISTA", marginX, cursorY);
        doc.text("DATOS DEL VIAJE", 110, cursorY);
        cursorY += 6;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        // Columna Izquierda
        doc.text(`Nombre: ${liq.chofer_nombre}`, marginX, cursorY);
        doc.text(`DNI: ${liq.chofer_dni}`, marginX, cursorY + 6);
        doc.text(`Camión: ${liq.camion_placa} · ${liq.camion_modelo}`, marginX, cursorY + 12);
        
        // Columna Derecha
        doc.text(`Viaje N°: ${liq.id_viaje}`, 110, cursorY);
        doc.text(`Ruta: ${liq.ruta}`, 110, cursorY + 6);
        const pesoTon = liq.total_peso ? (liq.total_peso / 1000).toFixed(2) : '0.00';
        doc.text(`Peso Total: ${pesoTon} Ton. (${liq.total_peso} kg)`, 110, cursorY + 12);
        const tarifaText = liq.tarifa_transportista ? `S/ ${formatearNumero(liq.tarifa_transportista)} / kg` : 'N/A';
        doc.text(`Tarifa: ${tarifaText}`, 110, cursorY + 18);
        
        cursorY += 28;
        doc.line(marginX, cursorY, 200 - marginX, cursorY);
        cursorY += 10;

        // --- RESUMEN FINANCIERO ---
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(colMain[0], colMain[1], colMain[2]);
        doc.text("RESUMEN FINANCIERO", marginX, cursorY);
        cursorY += 6;

        // Preparar array de finanzas para autotable (una tabla vertical)
        const finanzasData = [
            ["Monto Bruto", `S/ ${formatearNumero(liq.monto_bruto)}`],
            ["Descuento por Adelantos", `- S/ ${formatearNumero(liq.total_adelantos)}`]
        ];
        
        // Agregar penalidades específicas de este viaje (si hubo)
        if (liq.detalle_penalidades && liq.detalle_penalidades.length > 0) {
            liq.detalle_penalidades.forEach(p => {
                finanzasData.push([`Descuento: ${p.incidencia}`, `- S/ ${formatearNumero(p.monto)}`]);
            });
        } else if (liq.total_penalidades > 0) {
            // Fallback si no viniera el desglose
            finanzasData.push(["Descuento Penalidades", `- S/ ${formatearNumero(liq.total_penalidades)}`]);
        }

        // Agregar Total Neto a la tabla, pero se le da un estilo bold en el didParseCell
        finanzasData.push(["NETO PAGADO", `S/ ${formatearNumero(liq.monto_neto_pagado)}`]);

        doc.autoTable({
            startY: cursorY,
            margin: { left: marginX, right: marginX },
            theme: 'plain',
            body: finanzasData,
            styles: { fontSize: 10, cellPadding: 2, textColor: colMain },
            columnStyles: {
                0: { fontStyle: 'normal' },
                1: { fontStyle: 'normal', halign: 'right' }
            },
            didParseCell: function(data) {
                if (data.row.index === finanzasData.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fontSize = 11;
                    if (data.column.index === 1) {
                        data.cell.styles.textColor = colMain; // Green 600
                    }
                } else if (data.row.index > 0 && data.row.index < finanzasData.length - 1) {
                    if (data.column.index === 1) {
                        data.cell.styles.textColor = colMain; // Red 600 for discounts
                    }
                }
            }
        });
        cursorY = doc.lastAutoTable.finalY + 12;

        // --- DETALLE DE PAGOS ---
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(colMain[0], colMain[1], colMain[2]);
        doc.text("PAGOS REGISTRADOS", marginX, cursorY);
        cursorY += 4;

        if (liq.pagos && liq.pagos.length > 0) {
            const pagosData = liq.pagos.map(p => [
                p.metodo_pago, 
                p.numero_operacion || '-', 
                `S/ ${formatearNumero(p.monto_pagado)}`
            ]);
            doc.autoTable({
                startY: cursorY,
                margin: { left: marginX },
                tableWidth: 170, // 200 - marginX*2
                head: [['Método de Pago', 'N° Operación', 'Monto']],
                body: pagosData,
                theme: 'grid',
                headStyles: { fillColor: [248, 250, 252], textColor: colMuted, fontSize: 9, fontStyle: 'bold' },
                bodyStyles: { fontSize: 10, textColor: colMain },
                columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } }
            });
            cursorY = doc.lastAutoTable.finalY + 12;
        } else {
            doc.setFontSize(10);
            doc.setFont("helvetica", "italic");
            doc.text("No hay desglose de pagos disponible.", marginX, cursorY + 4);
            cursorY += 14;
        }

        // --- ESTADO DE CUENTA (Penalidades Pendientes) ---
        // Prevenir salto de página agresivo en las firmas
        if (cursorY > 210) { doc.addPage(); cursorY = 20; }
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(colMain[0], colMain[1], colMain[2]);
        doc.text("ESTADO DE CUENTA (PENALIDADES PENDIENTES A LA FECHA)", marginX, cursorY);
        cursorY += 4;

        if (deudasActuales && deudasActuales.length > 0) {
            const deudasData = deudasActuales.map(d => [
                d.tipo_incidencia,
                `S/ ${formatearNumero(d.monto_descuento_chofer)}`,
                `S/ ${formatearNumero(d.monto_cobrado)}`,
                `S/ ${formatearNumero(d.monto_descuento_chofer - d.monto_cobrado)}`
            ]);
            doc.autoTable({
                startY: cursorY,
                margin: { left: marginX },
                tableWidth: 170,
                head: [['Incidencia', 'Total Penalidad', 'Cobrado Hasta Ahora', 'Saldo Pendiente']],
                body: deudasData,
                theme: 'grid',
                headStyles: { fillColor: [248, 250, 252], textColor: colMuted, fontSize: 9, fontStyle: 'bold' },
                bodyStyles: { fontSize: 10, textColor: colMain },
                columnStyles: { 
                    1: { halign: 'right' }, 
                    2: { halign: 'right' }, 
                    3: { halign: 'right', fontStyle: 'bold', textColor: colMain } 
                }
            });
            cursorY = doc.lastAutoTable.finalY + 15;
        } else {
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(33, 41, 54); //Negro
            doc.text("El transportista no presenta deudas por penalidades.", marginX, cursorY + 4);
            cursorY += 15;
        }

        // --- FIRMAS ---
        if (cursorY > 240) { doc.addPage(); cursorY = 40; } else { cursorY += 20; }

        doc.setDrawColor(148, 163, 184); // Slate 400
        
        // Firma Transportista
        doc.line(30, cursorY, 80, cursorY);
        doc.setFontSize(9);
        doc.setTextColor(colMain[0], colMain[1], colMain[2]);
        doc.text("Firma del Transportista", 55, cursorY + 5, { align: "center" });
        doc.text(`DNI: ${liq.chofer_dni}`, 55, cursorY + 9, { align: "center" });
        
        // Firma Empresa
        doc.line(130, cursorY, 180, cursorY);
        doc.text("Firma o Sello", 155, cursorY + 9, { align: "center" });
        doc.text("Transporte Joselito", 155, cursorY + 5, { align: "center" });
        
        // --- SALIDA ---
        Swal.close();
        document.body.style.overflow = '';
        document.body.style.pointerEvents = '';
        // Remover overlays de SweetAlert que pudieron quedar
        document.querySelectorAll('.swal2-container').forEach(el => el.remove());

        const pdfBlob = doc.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        window.open(blobUrl, '_blank');
        // Liberar el blob URL después de que el navegador lo haya procesado
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

    };
    imgLogo.onerror = () => {
        Swal.fire('Error', 'No se pudo cargar el logo para el PDF.', 'error');
    };
}

let modalLiquidacionActual = null; // Para guardar la liquidación seleccionada temporalmente

async function abrirModalLiquidar(id) {
    const liq = liquidacionesPendientes.find(l => l.id === id);
    if (!liq) return;

    modalLiquidacionActual = liq;

    // Limpiar campos del modal al abrir
    
    document.getElementById('modalLiqObservaciones').value = '';
    carritoPagosLiq = [];
    renderizarCarritoPagosLiq();

    // Limpiar evidencia
    
    
    
    

    // Llenar datos estáticos
    document.getElementById('modalLiqViajeTitle').textContent = `Viaje #${liq.viaje_num}`;
    document.getElementById('modalLiqNombre').textContent = liq.chofer_nombre;
    document.getElementById('modalLiqDni').textContent = liq.chofer_dni;
    document.getElementById('modalLiqVehiculo').textContent = `${liq.camion_placa} · ${liq.camion_modelo}`;
    document.getElementById('modalLiqRuta').textContent = liq.ruta;

    // Resumen de cálculo
    const pesoKg = liq.peso_total;
    const pesoTon = pesoKg / 1000;
    
    document.getElementById('modalLiqPeso').textContent = `${formatearNumero(pesoTon)} Ton (${formatearNumero(pesoKg)} kg)`;
    document.getElementById('modalLiqTarifa').textContent = `S/ ${formatearNumero(liq.tarifa)} / kg`;
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

    if (liq.penalidades_pendientes > 0) {
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
            
            inputActivo.value = valAjustado;
            inputActivo.style.borderColor = '#ef4444';
            
            totalDescuentoPenalidades = 0;
            inputs.forEach(inp => {
                if (!inp.disabled) {
                    let v = parseFloat(inp.value);
                    if (!isNaN(v)) totalDescuentoPenalidades += v;
                }
            });
            neto = Math.max(0, bruto - adelanto - totalDescuentoPenalidades);
        } else {
            neto = 0; // fallback safety
        }
    }

    const modalLiqNeto = document.getElementById('modalLiqNeto');
    if (modalLiqNeto) modalLiqNeto.textContent = "S/ " + formatearNumero(neto);

    // Calcular Falta Pagar
    const sumaPagos = carritoPagosLiq.reduce((acc, p) => acc + (Number(p.monto_pagado) || 0), 0);
    const faltaPagar = Math.max(0, neto - sumaPagos);
    
    const divFaltaPagar = document.getElementById('modalLiqFaltaPagar');
    if (divFaltaPagar) {
        if (Math.abs(neto - sumaPagos) < 0.01 && neto > 0) {
            divFaltaPagar.style.background = '#dcfce7';
            divFaltaPagar.style.color = '#16a34a';
            divFaltaPagar.textContent = '¡Pago Cubierto!';
            const btn = document.getElementById('btnConfirmarLiquidacion');
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        } else if (sumaPagos > neto + 0.001) {
            divFaltaPagar.style.background = '#fef08a';
            divFaltaPagar.style.color = '#854d0e';
            divFaltaPagar.textContent = '¡Monto Superado!';
            const btn = document.getElementById('btnConfirmarLiquidacion');
            if (btn) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
        } else {
            divFaltaPagar.style.background = '#fee2e2';
            divFaltaPagar.style.color = '#ef4444';
            divFaltaPagar.textContent = "Falta Pagar: S/ " + formatearNumero(faltaPagar);
            const btn = document.getElementById('btnConfirmarLiquidacion');
            if (btn) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
        }
    }
}

// ── Carrito de Pagos: funciones dinámicas ──────────────────────────

// Calcula el monto neto actual considerando penalidades
function obtenerNetoActualLiq() {
    if (!modalLiquidacionActual) return 0;
    const bruto = modalLiquidacionActual.monto_bruto;
    const adelanto = modalLiquidacionActual.adelanto;
    let totalPenalidades = 0;
    const inputs = document.querySelectorAll('.input-descuento-penalidad');
    inputs.forEach(inp => {
        if (!inp.disabled) {
            let v = parseFloat(inp.value);
            if (!isNaN(v)) totalPenalidades += v;
        }
    });
    return Math.max(0, bruto - adelanto - totalPenalidades);
}

function renderizarCarritoPagosLiq() {
    const contenedor = document.getElementById('contenedorListaPagos');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    const netoActual = obtenerNetoActualLiq();
    const sumaPagos = carritoPagosLiq.reduce((acc, p) => acc + (Number(p.monto_pagado) || 0), 0);
    const pagoCubierto = sumaPagos >= netoActual && netoActual > 0;

    // Mostrar/ocultar botón de añadir según si el pago ya cubre el neto
    const btnAgregar = document.getElementById('btnAgregarPagoLiq');
    if (btnAgregar) {
        if (pagoCubierto) {
            btnAgregar.style.display = 'none';
        } else {
            btnAgregar.style.display = 'flex';
        }
    }

    if (carritoPagosLiq.length === 0) {
        contenedor.innerHTML = `
            <div style="text-align: center; padding: 16px; color: var(--text-muted); font-size: 13px;">
                <i class="fas fa-info-circle" style="margin-right: 6px;"></i>
                Agrega al menos un método de pago
            </div>`;
        return;
    }

    carritoPagosLiq.forEach((pago, index) => {
        // Filtrar cuentas del sistema (caja interna)
        const cuentasFiltradas = cuentasLiq.filter(c => (!c.es_sistema || c.es_sistema === 0) && c.estado === 1);
        const opcionesCuentas = cuentasFiltradas.map(c =>
            `<option value="${c.id_cuenta}" ${pago.id_cuenta == c.id_cuenta ? 'selected' : ''}>${c.entidad_financiera} - ${c.tipo_cuenta} (${c.nro_cuenta})</option>`
        ).join('');

        const billeterasFiltradas = billeterasLiq.filter(b => b.estado === 1);
        const opcionesBilleteras = billeterasFiltradas.map(b =>
            `<option value="${b.id_billetera}" ${pago.id_billetera == b.id_billetera ? 'selected' : ''}>${b.tipo_billetera} - ${b.numero_celular} (${b.titular})</option>`
        ).join('');

        const metodo = pago.metodo_pago || 'Efectivo';
        const mostrarCuenta = metodo === 'Transferencia';
        const mostrarBilletera = metodo === 'Billetera Digital';
        const mostrarNumOp = metodo !== 'Efectivo';
        const mostrarEvidencia = metodo !== 'Efectivo';
        const nombreArchivo = pago.evidencia_file ? pago.evidencia_file.name : '';

        const bloque = document.createElement('div');
        bloque.style.cssText = 'background: #f8fafc; border: 1px solid var(--border-light); border-radius: 10px; padding: 16px; position: relative;';
        bloque.innerHTML = `
            <button type="button" onclick="eliminarPagoLiq(${index})" style="position: absolute; top: 8px; right: 8px; background: none; border: none; color: #ef4444; cursor: pointer; font-size: 14px; padding: 4px;" title="Eliminar pago">
                <i class="fas fa-trash-alt"></i>
            </button>

            <div style="display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 140px;">
                    <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Método de Pago</label>
                    <select onchange="actualizarPagoLiq(${index}, 'metodo_pago', this.value)" style="width: 100%; padding: 8px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 13px; outline: none;">
                        <option value="Efectivo" ${metodo === 'Efectivo' ? 'selected' : ''}>Efectivo</option>
                        <option value="Transferencia" ${metodo === 'Transferencia' ? 'selected' : ''}>Transferencia</option>
                        <option value="Deposito" ${metodo === 'Deposito' || metodo === 'Depósito' ? 'selected' : ''}>Depósito</option>
                        <option value="Billetera Digital" ${metodo === 'Billetera Digital' ? 'selected' : ''}>Billetera Digital</option>
                    </select>
                </div>
                <div style="flex: 1; min-width: 120px;">
                    <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Monto (S/)</label>
                    <input type="text" inputmode="decimal" id="montoLiq_${index}" value="${pago.monto_pagado || ''}" oninput="validarMontoLiq(${index}, this)" onblur="formatearMontoLiq(${index}, this)" placeholder="0.00" style="width: 100%; padding: 8px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 13px; outline: none; box-sizing: border-box;">
                    <div id="errorMontoLiq_${index}" style="display: none; font-size: 11px; color: #ef4444; margin-top: 4px; align-items: center; gap: 4px;">
                        <i class="fas fa-exclamation-circle"></i>
                        <span>El monto supera lo que falta por pagar</span>
                    </div>
                </div>
            </div>

            <!-- Cuenta Bancaria (Transferencia / Depósito) -->
            <div style="margin-bottom: 12px; display: ${mostrarCuenta ? 'block' : 'none'};" class="campo-cuenta-${index}">
                <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Cuenta Bancaria</label>
                <select onchange="actualizarPagoLiq(${index}, 'id_cuenta', this.value)" style="width: 100%; padding: 8px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 13px; outline: none;">
                    <option value="">Seleccione cuenta...</option>
                    ${opcionesCuentas}
                </select>
            </div>

            <!-- Billetera Digital -->
            <div style="margin-bottom: 12px; display: ${mostrarBilletera ? 'block' : 'none'};" class="campo-billetera-${index}">
                <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Billetera Digital</label>
                <select onchange="actualizarPagoLiq(${index}, 'id_billetera', this.value)" style="width: 100%; padding: 8px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 13px; outline: none;">
                    <option value="">Seleccione billetera...</option>
                    ${opcionesBilleteras}
                </select>
            </div>

            <!-- Número de Operación -->
            <div style="margin-bottom: 12px; display: ${mostrarNumOp ? 'block' : 'none'};" class="campo-numop-${index}">
                <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">N° Operación</label>
                <input type="text" id="numOpLiq_${index}" value="${pago.numero_operacion || ''}" oninput="validarNumOperacionLiq(${index}, this)" placeholder="Ej: 00012345" style="width: 100%; padding: 8px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 13px; outline: none; box-sizing: border-box;">
                <div id="errorNumOp_${index}" style="display: none; font-size: 11px; color: #ef4444; margin-top: 4px; align-items: center; gap: 4px;">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Solo números, letras y guiones (sin espacios)</span>
                </div>
            </div>

            <!-- Evidencia -->
            <div style="display: ${mostrarEvidencia ? 'block' : 'none'};" class="campo-evidencia-${index}">
                <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Evidencia (opcional)</label>
                <div id="dropzone-liq-${index}" onclick="document.getElementById('inputEvidLiq_${index}').click()" style="border: 2px dashed var(--border-light); border-radius: 8px; padding: 16px; text-align: center; cursor: pointer; transition: all 0.2s ease; background: white;"
                     ondragover="event.preventDefault(); this.style.borderColor='var(--brand-blue)'; this.style.background='#eff6ff';"
                     ondragleave="this.style.borderColor='var(--border-light)'; this.style.background='white';"
                     ondrop="event.preventDefault(); this.style.borderColor='var(--border-light)'; this.style.background='white'; validarYSubirEvidenciaLiq(${index}, event.dataTransfer.files);">
                    <input type="file" id="inputEvidLiq_${index}" accept="image/png,image/jpeg,image/webp" onchange="validarYSubirEvidenciaLiq(${index}, this.files)" style="display: none;">
                    <div id="previewEvidLiq_${index}" style="${nombreArchivo ? '' : 'display:none;'} margin-bottom: 8px;"></div>
                    <div id="placeholderEvidLiq_${index}" style="${nombreArchivo ? 'display:none;' : ''}">
                        <i class="fas fa-cloud-upload-alt" style="font-size: 20px; color: var(--text-muted); margin-bottom: 6px;"></i>
                        <p style="margin: 0; font-size: 12px; color: var(--text-muted);">Arrastra o haz clic para subir</p>
                        <p style="margin: 2px 0 0 0; font-size: 10px; color: var(--border-light);">PNG, JPG, WEBP · máx 5MB</p>
                    </div>
                    <div id="filenameEvidLiq_${index}" style="${nombreArchivo ? '' : 'display:none;'} font-size: 11px; color: var(--text-secondary); margin-top: 4px; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <i class="fas fa-image" style="color: #10b981;"></i>
                        <span>${nombreArchivo}</span>
                        <button type="button" onclick="event.stopPropagation(); eliminarEvidenciaLiq(${index})" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 12px; padding: 2px;" title="Quitar imagen">
                            <i class="fas fa-times-circle"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        contenedor.appendChild(bloque);
    });

    actualizarNetoModal();
}

function agregarNuevoPagoLiq() {
    carritoPagosLiq.push({
        metodo_pago: 'Efectivo',
        id_cuenta: null,
        id_billetera: null,
        monto_pagado: 0,
        numero_operacion: '',
        evidencia_file: null
    });
    renderizarCarritoPagosLiq();
}

function eliminarPagoLiq(index) {
    carritoPagosLiq.splice(index, 1);
    renderizarCarritoPagosLiq();
}

function actualizarPagoLiq(index, campo, valor) {
    if (!carritoPagosLiq[index]) return;

    carritoPagosLiq[index][campo] = valor;

    // Si cambió el método de pago, limpiar campos dependientes y re-renderizar
    if (campo === 'metodo_pago') {
        carritoPagosLiq[index].id_cuenta = null;
        carritoPagosLiq[index].id_billetera = null;
        carritoPagosLiq[index].numero_operacion = '';
        carritoPagosLiq[index].evidencia_file = null;
        renderizarCarritoPagosLiq();
        return;
    }

    // Si cambió el monto, recalcular el neto
    if (campo === 'monto_pagado') {
        carritoPagosLiq[index].monto_pagado = Number(valor) || 0;
        actualizarNetoModal();
        // Re-evaluar visibilidad del botón añadir
        const netoActual = obtenerNetoActualLiq();
        const sumaPagos = carritoPagosLiq.reduce((acc, p) => acc + (Number(p.monto_pagado) || 0), 0);
        const btnAgregar = document.getElementById('btnAgregarPagoLiq');
        if (btnAgregar) {
            btnAgregar.style.display = (sumaPagos >= netoActual && netoActual > 0) ? 'none' : 'flex';
        }
    }
}

// Validación de monto: solo números y punto decimal, máximo decimal(10,2)
function validarMontoLiq(index, input) {
    // Permitir solo dígitos y un punto decimal
    let valor = input.value.replace(/[^0-9.]/g, '');
    
    // Solo un punto decimal
    const partes = valor.split('.');
    if (partes.length > 2) {
        valor = partes[0] + '.' + partes.slice(1).join('');
    }
    
    // Limitar parte entera a 8 dígitos (decimal 10,2 = 8 enteros + 2 decimales)
    if (partes[0] && partes[0].length > 8) {
        partes[0] = partes[0].substring(0, 8);
        valor = partes.length > 1 ? partes[0] + '.' + partes[1] : partes[0];
    }
    
    // Limitar decimales a 2
    if (partes.length === 2 && partes[1].length > 2) {
        valor = partes[0] + '.' + partes[1].substring(0, 2);
    }
    
    input.value = valor;
    carritoPagosLiq[index].monto_pagado = Number(valor) || 0;
    actualizarNetoModal();

    // Validar si supera el neto
    const netoActual = obtenerNetoActualLiq();
    const sumaPagos = carritoPagosLiq.reduce((acc, p) => acc + (Number(p.monto_pagado) || 0), 0);
    const errorDiv = document.getElementById(`errorMontoLiq_${index}`);
    if (sumaPagos > netoActual + 0.001) {
        input.style.borderColor = '#ef4444';
        input.style.background = '#fff5f5';
        if (errorDiv) errorDiv.style.display = 'flex';
    } else {
        input.style.borderColor = 'var(--border-light)';
        input.style.background = '';
        if (errorDiv) errorDiv.style.display = 'none';
    }

    // Re-evaluar botón añadir
    const btnAgregar = document.getElementById('btnAgregarPagoLiq');
    if (btnAgregar) {
        btnAgregar.style.display = (sumaPagos >= netoActual && netoActual > 0) ? 'none' : 'flex';
    }
}

// Formatear monto al salir del input (blur)
function formatearMontoLiq(index, input) {
    let val = parseFloat(input.value);
    if (isNaN(val) || val < 0) val = 0;
    
    // Limitar al máximo de decimal(10,2)
    if (val > 99999999.99) val = 99999999.99;
    
    input.value = val.toFixed(2);
    carritoPagosLiq[index].monto_pagado = val;
    actualizarNetoModal();

    // Validar si supera el neto
    const netoActual = obtenerNetoActualLiq();
    const sumaPagos = carritoPagosLiq.reduce((acc, p) => acc + (Number(p.monto_pagado) || 0), 0);
    const errorDiv = document.getElementById(`errorMontoLiq_${index}`);
    if (sumaPagos > netoActual + 0.001) {
        input.style.borderColor = '#ef4444';
        input.style.background = '#fff5f5';
        if (errorDiv) errorDiv.style.display = 'flex';
    } else {
        input.style.borderColor = 'var(--border-light)';
        input.style.background = '';
        if (errorDiv) errorDiv.style.display = 'none';
    }

    // Re-evaluar botón añadir
    const btnAgregar = document.getElementById('btnAgregarPagoLiq');
    if (btnAgregar) {
        btnAgregar.style.display = (sumaPagos >= netoActual && netoActual > 0) ? 'none' : 'flex';
    }
}

// Validación de N° Operación: solo alfanuméricos y guiones
function validarNumOperacionLiq(index, input) {
    const valor = input.value;
    const regex = /^[a-zA-Z0-9-]*$/;
    const errorDiv = document.getElementById(`errorNumOp_${index}`);
    
    if (valor && !regex.test(valor)) {
        // Limpiar caracteres no válidos
        input.value = valor.replace(/[^a-zA-Z0-9-]/g, '');
        input.style.borderColor = '#ef4444';
        if (errorDiv) errorDiv.style.display = 'flex';
    } else {
        input.style.borderColor = 'var(--border-light)';
        if (errorDiv) errorDiv.style.display = 'none';
    }
    
    carritoPagosLiq[index].numero_operacion = input.value;
}

window.renderizarCarritoPagosLiq = renderizarCarritoPagosLiq;
window.agregarNuevoPagoLiq = agregarNuevoPagoLiq;
window.eliminarPagoLiq = eliminarPagoLiq;
window.actualizarPagoLiq = actualizarPagoLiq;
window.validarMontoLiq = validarMontoLiq;
window.formatearMontoLiq = formatearMontoLiq;
window.validarNumOperacionLiq = validarNumOperacionLiq;

// Validar y manejar evidencia de imagen
window.validarYSubirEvidenciaLiq = function(index, files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Validar tipo
    const tiposPermitidos = ['image/png', 'image/jpeg', 'image/webp'];
    if (!tiposPermitidos.includes(file.type)) {
        Swal.fire({ icon: 'warning', title: 'Formato no válido', text: 'Solo se permiten imágenes PNG, JPG o WEBP.' });
        return;
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
        Swal.fire({ icon: 'warning', title: 'Archivo muy grande', text: 'La imagen no debe superar los 5MB.' });
        return;
    }

    carritoPagosLiq[index].evidencia_file = file;

    // Mostrar preview
    const preview = document.getElementById(`previewEvidLiq_${index}`);
    const placeholder = document.getElementById(`placeholderEvidLiq_${index}`);
    const filename = document.getElementById(`filenameEvidLiq_${index}`);

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
};

window.eliminarEvidenciaLiq = function(index) {
    carritoPagosLiq[index].evidencia_file = null;
    const input = document.getElementById(`inputEvidLiq_${index}`);
    if (input) input.value = '';

    const preview = document.getElementById(`previewEvidLiq_${index}`);
    const placeholder = document.getElementById(`placeholderEvidLiq_${index}`);
    const filename = document.getElementById(`filenameEvidLiq_${index}`);

    if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }
    if (placeholder) placeholder.style.display = 'block';
    if (filename) filename.style.display = 'none';
};

window.procesarLiquidacion = async function() {
    if (!modalLiquidacionActual) return;

    // Recolectar datos
    const bruto = modalLiquidacionActual.monto_bruto;
    const adelanto = modalLiquidacionActual.adelanto;
    let total_penalidades = 0;
    
    const penalidadesData = [];
    const inputs = document.querySelectorAll('.input-descuento-penalidad');
    inputs.forEach(input => {
        if (!input.disabled) {
            const val = Number(input.value) || 0;
            if (val > 0) {
                total_penalidades += val;
                penalidadesData.push({
                    id_incidencia: input.dataset.id,
                    monto_descontado: val
                });
            }
        }
    });

    const neto_pagado = bruto - adelanto - total_penalidades;
    const observaciones = document.getElementById('modalLiqObservaciones').value;

    // Validar que no haya pagos sin monto
    if (carritoPagosLiq.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Sin pagos', text: 'Debes agregar al menos un método de pago.' });
        return;
    }

    // Validar N° Operación en pagos que no son efectivo
    for (let i = 0; i < carritoPagosLiq.length; i++) {
        const p = carritoPagosLiq[i];
        if (p.numero_operacion && !/^[a-zA-Z0-9-]*$/.test(p.numero_operacion)) {
            Swal.fire({ icon: 'warning', title: 'N° Operación inválido', text: `El pago #${i + 1} tiene caracteres no permitidos en el número de operación.` });
            return;
        }
    }

    let sumaPagos = carritoPagosLiq.reduce((acc, p) => acc + (Number(p.monto_pagado) || 0), 0);
    
    // Si la suma excede el neto, ajustar el último pago automáticamente
    if (sumaPagos > neto_pagado + 0.01) {
        const exceso = sumaPagos - neto_pagado;
        const ultimoPago = carritoPagosLiq[carritoPagosLiq.length - 1];
        const montoAjustado = Math.max(0, (Number(ultimoPago.monto_pagado) || 0) - exceso);
        ultimoPago.monto_pagado = Math.round(montoAjustado * 100) / 100;
        sumaPagos = carritoPagosLiq.reduce((acc, p) => acc + (Number(p.monto_pagado) || 0), 0);
        renderizarCarritoPagosLiq();
    }

    if (Math.abs(neto_pagado - sumaPagos) >= 0.01) {
        Swal.fire({ icon: 'error', title: 'Montos no coinciden', text: 'La suma de los pagos debe ser igual al Monto Neto a Pagar.' });
        return;
    }

    // Validar carrito
    for (let p of carritoPagosLiq) {
        if (p.metodo_pago === 'Transferencia' && !p.id_cuenta) {
            Swal.fire({ icon: 'warning', title: 'Falta cuenta', text: 'Seleccione la cuenta bancaria para la transferencia.' });
            return;
        }
        if (p.metodo_pago === 'Billetera Digital' && !p.id_billetera) {
            Swal.fire({ icon: 'warning', title: 'Falta billetera', text: 'Seleccione la billetera digital.' });
            return;
        }
        if (p.metodo_pago === 'Deposito') p.metodo_pago = 'Depósito';
    }

    // Mostrar loader
    const btnConfirmar = document.getElementById('btnConfirmarLiquidacion');
    const originalText = btnConfirmar.innerHTML;
    btnConfirmar.disabled = true;
    btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

    try {
        const formData = new FormData();
        formData.append('monto_bruto', bruto);
        formData.append('total_adelantos', adelanto);
        formData.append('total_penalidades', total_penalidades);
        formData.append('monto_neto_pagado', neto_pagado);
        formData.append('observaciones', observaciones);
        formData.append('penalidades_descontadas', JSON.stringify(penalidadesData));
        
        // Adjuntar archivos de evidencia y mapear el carrito para que no intente enviar File objects en JSON
        const pagosPayload = carritoPagosLiq.map((p, index) => {
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

        formData.append('carrito_pagos', JSON.stringify(pagosPayload));

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
            Swal.fire({ icon: 'error', title: 'Error', text: json.message });
        }

    } catch (error) {
        console.error('Error al procesar:', error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo registrar la liquidación. Revisa la consola.' });
    } finally {
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = originalText;
    }
}


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

let cuentasLiq = [];
let billeterasLiq = [];
let carritoPagosLiq = [];
