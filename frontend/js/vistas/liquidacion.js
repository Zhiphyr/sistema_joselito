// Inicializar variables de estado del módulo
window.liqState = {
    pendientes: [],
    historial: [],
    filtro: "",
    seleccionado: null,
    kpis: null
};

// Función principal de inicialización que invoca el Router SPA
window.init_liquidacion = function () {
    inicializarEventos();
    cargarDatos();
};

// Función Helper para dar formato a fechas (YYYY-MM-DD HH:MM)
function formatearFecha(fechaStr) {
    if (!fechaStr) return '—';
    const date = new Date(fechaStr);
    if (isNaN(date.getTime())) return fechaStr;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

async function cargarDatos() {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const headers = { 'x-user-profile': sessionData.id_perfil || 1 };

    // Mostrar spinner en contenedores mientras carga
    const container = document.getElementById("tab-content-pendientes");
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 48px; color: var(--text-muted);">
                <i class="fas fa-spinner fa-spin fa-3x" style="margin-bottom: 16px;"></i>
                <p style="font-size: 14px;">Cargando viajes pendientes...</p>
            </div>
        `;
    }

    const tbody = document.getElementById("tbody-historial");
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 32px; color: var(--text-muted);">
                    <i class="fas fa-spinner fa-spin"></i> Cargando historial...
                </td>
            </tr>
        `;
    }

    try {
        // Fetch KPIs, viajes-pendientes, and historial en paralelo
        const [resKPIs, resPendientes, resHistorial] = await Promise.all([
            fetch('/api/liquidacion/kpis', { headers }),
            fetch('/api/liquidacion/viajes-pendientes', { headers }),
            fetch('/api/liquidacion/historial', { headers })
        ]);

        const dataKPIs = await resKPIs.json();
        const dataPendientes = await resPendientes.json();
        const dataHistorial = await resHistorial.json();

        if (dataKPIs.success && dataKPIs.data) {
            window.liqState.kpis = dataKPIs.data;
        } else {
            window.liqState.kpis = null;
        }

        if (dataPendientes.success && dataPendientes.data) {
            window.liqState.pendientes = dataPendientes.data.map(v => ({
                id: v.id_viaje,
                nombre: v.chofer_nombre || 'Desconocido',
                dni: v.chofer_dni || '—',
                vehiculo: `${v.vehiculo_placa || '—'} · ${v.vehiculo_nombre || '—'}`,
                viaje: `Viaje #${v.id_viaje}`,
                ruta: `${v.ciudad_origen || '—'} - ${v.ciudad_destino || '—'}`,
                salida: v.fecha_salida ? formatearFecha(v.fecha_salida) : '—',
                llegada: v.fecha_llegada ? formatearFecha(v.fecha_llegada) : '—',
                peso: Number(v.peso_total_kg || 0) / 1000, // Mostrar en Toneladas
                pesoRaw: Number(v.peso_total_kg || 0), // Conservar en Kg para el backend
                tarifa: Number(v.tarifa_transportista || 0),
                bruto: Number(v.monto_bruto || 0),
                adelanto: Number(v.monto_adelanto || 0),
                penalidades: Number(v.penalidades || 0),
                observaciones: ''
            }));
        } else {
            window.liqState.pendientes = [];
        }

        if (dataHistorial.success && dataHistorial.data) {
            window.liqState.historial = dataHistorial.data.map(h => ({
                liqNum: h.id_liqui_chofer,
                nombre: h.chofer_nombre || 'Desconocido',
                dni: h.chofer_dni || '—',
                viaje: `Viaje #${h.id_viaje}`,
                ruta: `${h.ciudad_origen || '—'} - ${h.ciudad_destino || '—'}`,
                peso: Number(h.peso_total_viaje || 0) / 1000,
                bruto: Number(h.monto_bruto || 0),
                adelanto: Number(h.descuento_adelanto || 0),
                penalidades: Number(h.descuento_incidencias || 0),
                reduccion: Number(h.reduccion_penalidad || 0),
                neto: Number(h.monto_neto_pagado || 0),
                fecha: h.fecha_liquidacion ? formatearFecha(h.fecha_liquidacion) : '—'
            }));
        } else {
            window.liqState.historial = [];
        }

        renderAll();
    } catch (error) {
        console.error("Error al cargar datos de liquidación:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'No se pudo obtener información del servidor para el módulo de liquidaciones.'
        });
    }
}

function inicializarEventos() {
    // 1. Buscador
    const searchInput = document.getElementById("liq-search-input");
    if (searchInput) {
        searchInput.value = window.liqState.filtro;
        // Quitar listeners anteriores
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);
        newSearchInput.addEventListener("input", (e) => {
            window.liqState.filtro = e.target.value.toLowerCase().trim();
            renderPendientes();
            renderHistorial();
        });
    }

    // 2. Control de Pestañas
    const tabPendientes = document.getElementById("tab-btn-pendientes");
    const tabHistorial = document.getElementById("tab-btn-historial");
    const contentPendientes = document.getElementById("tab-content-pendientes");
    const contentHistorial = document.getElementById("tab-content-historial");

    if (tabPendientes && tabHistorial) {
        const newTabPendientes = tabPendientes.cloneNode(true);
        const newTabHistorial = tabHistorial.cloneNode(true);
        tabPendientes.parentNode.replaceChild(newTabPendientes, tabPendientes);
        tabHistorial.parentNode.replaceChild(newTabHistorial, tabHistorial);

        newTabPendientes.addEventListener("click", () => {
            newTabPendientes.classList.add("active");
            newTabHistorial.classList.remove("active");
            contentPendientes.style.display = "block";
            contentHistorial.style.display = "none";
        });

        newTabHistorial.addEventListener("click", () => {
            newTabHistorial.classList.add("active");
            newTabPendientes.classList.remove("active");
            contentPendientes.style.display = "none";
            contentHistorial.style.display = "block";
        });
    }

    // 3. Cerrar Modal (Botón X y Botón Cancelar)
    const modalOverlay = document.getElementById("liqModalOverlay");
    const btnCloseX = document.getElementById("modal-btn-close-x");
    const btnCancel = document.getElementById("modal-btn-cancelar");

    const cerrarModal = () => {
        if (modalOverlay) {
            modalOverlay.classList.remove("active");
        }
        window.liqState.seleccionado = null;
    };

    if (btnCloseX) {
        const newBtnCloseX = btnCloseX.cloneNode(true);
        btnCloseX.parentNode.replaceChild(newBtnCloseX, btnCloseX);
        newBtnCloseX.addEventListener("click", cerrarModal);
    }
    if (btnCancel) {
        const newBtnCancel = btnCancel.cloneNode(true);
        btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
        newBtnCancel.addEventListener("click", cerrarModal);
    }

    // 4. Listeners en tiempo real para el input de adelanto
    const inputAdelanto = document.getElementById("modal-input-adelanto");
    if (inputAdelanto) {
        const newInputAdelanto = inputAdelanto.cloneNode(true);
        inputAdelanto.parentNode.replaceChild(newInputAdelanto, inputAdelanto);
        newInputAdelanto.addEventListener("input", () => {
            let val = parseFloat(newInputAdelanto.value);
            if (isNaN(val) || val < 0) {
                newInputAdelanto.value = 0;
            }
            recalcularNetoModal();
        });
    }

    // 5. Confirmar y Registrar Liquidación
    const btnConfirmar = document.getElementById("modal-btn-confirmar");
    if (btnConfirmar) {
        const newBtnConfirmar = btnConfirmar.cloneNode(true);
        btnConfirmar.parentNode.replaceChild(newBtnConfirmar, btnConfirmar);
        newBtnConfirmar.addEventListener("click", () => {
            const chofer = window.liqState.seleccionado;
            if (!chofer) return;

            const inputAdelantoVal = parseFloat(document.getElementById("modal-input-adelanto").value) || 0;
            const observacionesVal = document.getElementById("modal-input-observaciones").value.trim();

            // Recopilar incidencias seleccionadas
            const incidencias_descuentos = [];
            let totalPenalidadDescontada = 0;
            let validacionCorrecta = true;

            document.querySelectorAll("#tbody-modal-incidencias tr").forEach(row => {
                const checkbox = row.querySelector(".incidencia-check");
                if (checkbox && checkbox.checked) {
                    const id = Number(checkbox.dataset.id);
                    const maxSaldo = Number(checkbox.dataset.saldo);
                    const inputDescuento = row.querySelector(".incidencia-monto-input");
                    const montoADescontar = parseFloat(inputDescuento.value) || 0;

                    if (montoADescontar <= 0) {
                        return; // Omitir si es 0
                    }

                    if (montoADescontar > maxSaldo) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Monto inválido',
                            text: `El monto a descontar no puede superar el saldo pendiente (S/ ${maxSaldo.toFixed(2)}) en la incidencia seleccionada.`,
                            confirmButtonColor: '#008f5d'
                        });
                        validacionCorrecta = false;
                        return;
                    }

                    totalPenalidadDescontada += montoADescontar;
                    incidencias_descuentos.push({
                        id_incidencia: id,
                        monto_a_descontar: montoADescontar
                    });
                }
            });

            if (!validacionCorrecta) return;

            if (inputAdelantoVal > (chofer.bruto - totalPenalidadDescontada)) {
                Swal.fire({
                    icon: 'error',
                    title: 'Adelanto inválido',
                    text: `El adelanto no puede superar el monto neto a pagar (S/ ${(chofer.bruto - totalPenalidadDescontada).toFixed(2)}).`,
                    confirmButtonColor: '#008f5d'
                });
                return;
            }

            const netoFinal = chofer.bruto - inputAdelantoVal - totalPenalidadDescontada;

            // Confirmar transacción
            Swal.fire({
                title: "¿Confirmar Liquidación?",
                text: `Se registrará el pago neto de S/ ${netoFinal.toFixed(2)} para ${chofer.nombre}.`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#008f5d",
                cancelButtonColor: "#64748b",
                confirmButtonText: "Sí, Registrar",
                cancelButtonText: "Cancelar"
            }).then((result) => {
                if (result.isConfirmed) {
                    registrarLiquidacionAPI(chofer, inputAdelantoVal, observacionesVal, netoFinal, totalPenalidadDescontada, incidencias_descuentos);
                    cerrarModal();
                }
            });
        });
    }
}

async function registrarLiquidacionAPI(chofer, adelantoFinal, observaciones, netoFinal, totalPenalidadDescontada, incidencias_descuentos) {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const headers = { 
        'Content-Type': 'application/json',
        'x-user-profile': sessionData.id_perfil || 1 
    };

    const payload = {
        id_viaje: chofer.id,
        peso_total_viaje: chofer.pesoRaw,
        monto_bruto: chofer.bruto,
        descuento_adelanto: adelantoFinal,
        descuento_incidencias: totalPenalidadDescontada,
        monto_neto_pagado: netoFinal,
        incidencias_descuentos: incidencias_descuentos,
        observaciones: observaciones,
        id_usuario: sessionData.id_usuario || 1
    };

    try {
        const response = await fetch('/api/liquidacion/registrar', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            Swal.fire({
                title: "¡Liquidación Registrada!",
                text: "El pago se ha procesado y archivado de forma exitosa.",
                icon: "success",
                confirmButtonColor: "#008f5d"
            }).then(() => {
                cargarDatos();
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error al registrar',
                text: result.message || 'No se pudo procesar la liquidación en el servidor.'
            });
        }
    } catch (error) {
        console.error("Error al registrar liquidación:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error de red',
            text: 'Hubo un problema de conexión con el servidor al registrar la liquidación.'
        });
    }
}

function recalcularNetoModal() {
    const chofer = window.liqState.seleccionado;
    if (!chofer) return;

    const inputAdelanto = document.getElementById("modal-input-adelanto");
    const adelanto = parseFloat(inputAdelanto.value) || 0;

    let penalidadesTotal = 0;
    let validacionError = false;

    document.querySelectorAll("#tbody-modal-incidencias tr").forEach(row => {
        const checkbox = row.querySelector(".incidencia-check");
        const inputMonto = row.querySelector(".incidencia-monto-input");
        
        if (checkbox && checkbox.checked) {
            let val = parseFloat(inputMonto.value) || 0;
            const maxSaldo = parseFloat(checkbox.dataset.saldo);

            // Validar que no sea negativo y no supere el saldo
            if (val < 0) {
                val = 0;
                inputMonto.value = 0;
            }
            if (val > maxSaldo) {
                inputMonto.style.borderColor = "#e11d48";
                validacionError = true;
            } else {
                inputMonto.style.borderColor = "#cbd5e1";
            }

            penalidadesTotal += val;
        }
    });

    const maxAdelantoPermitido = chofer.bruto - penalidadesTotal;
    const errAdelanto = document.getElementById("modal-adelanto-error");
    const txtMaxAdelanto = document.getElementById("modal-err-max-adelanto");

    if (adelanto > maxAdelantoPermitido) {
        inputAdelanto.style.borderColor = "#e11d48";
        if (errAdelanto && txtMaxAdelanto) {
            txtMaxAdelanto.textContent = maxAdelantoPermitido.toFixed(2);
            errAdelanto.style.display = "block";
        }
        validacionError = true;
    } else {
        inputAdelanto.style.borderColor = "#cbd5e1";
        if (errAdelanto) {
            errAdelanto.style.display = "none";
        }
    }

    const neto = chofer.bruto - adelanto - penalidadesTotal;
    document.getElementById("modal-neto-pagar").textContent = formatMoneda(neto);

    const btnConfirmar = document.getElementById("modal-btn-confirmar");
    if (btnConfirmar) {
        btnConfirmar.disabled = validacionError;
    }
}

function renderAll() {
    renderKPIs();
    renderPendientes();
    renderHistorial();
}

function renderKPIs() {
    const kpis = window.liqState.kpis || {
        total_pendientes: window.liqState.pendientes.length,
        total_por_pagar: window.liqState.pendientes.reduce((acc, p) => acc + (p.bruto - p.penalidades), 0),
        pagado_mes: window.liqState.historial.reduce((acc, h) => acc + h.neto, 0)
    };

    // Escribir en DOM
    document.getElementById("kpi-viajes-pendientes").textContent = kpis.total_pendientes;
    document.getElementById("kpi-total-pagar").textContent = formatMoneda(kpis.total_por_pagar);
    document.getElementById("kpi-pagado-mes").textContent = formatMoneda(kpis.pagado_mes);
    
    // Badge de pestañas
    document.getElementById("badge-pendientes-count").textContent = window.liqState.pendientes.length;
}

function renderPendientes() {
    const container = document.getElementById("tab-content-pendientes");
    if (!container) return;

    container.innerHTML = "";

    const query = window.liqState.filtro;
    const itemsFiltrados = window.liqState.pendientes.filter(p => {
        return p.nombre.toLowerCase().includes(query) || 
               p.vehiculo.toLowerCase().includes(query) || 
               p.viaje.toLowerCase().includes(query) || 
               p.dni.toLowerCase().includes(query);
    });

    if (itemsFiltrados.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 48px; color: var(--text-muted);">
                <i class="fa-solid fa-folder-open fa-3x" style="margin-bottom: 16px; opacity: 0.5;"></i>
                <p style="font-size: 14px;">No se encontraron viajes pendientes de liquidación.</p>
            </div>
        `;
        return;
    }

    itemsFiltrados.forEach(chofer => {
        // El neto mostrado en la tarjeta pendiente NO resta adelanto, sólo penalidades acumuladas
        const neto = chofer.bruto - chofer.penalidades;

        const card = document.createElement("div");
        card.className = "liq-driver-card";
        card.id = `driver-card-${chofer.id}`;

        card.innerHTML = `
            <div class="liq-card-main-row">
                <!-- Bloque Info Chofer -->
                <div class="liq-driver-info-block">
                    <div class="liq-avatar-circle">
                        <i class="fa-regular fa-user"></i>
                    </div>
                    <div class="liq-driver-meta">
                        <div class="liq-driver-name-row">
                            <span class="liq-driver-name">${chofer.nombre}</span>
                            <span class="liq-driver-dni">DNI: ${chofer.dni}</span>
                        </div>
                        <div class="liq-trip-subrow">
                            <span><i class="fa-solid fa-truck"></i> ${chofer.vehiculo}</span>
                            <span><i class="fa-solid fa-tag"></i> ${chofer.viaje}</span>
                            <span><i class="fa-solid fa-route"></i> ${chofer.ruta}</span>
                        </div>
                        <div class="liq-dates-subrow">
                            Salida: ${chofer.salida} &nbsp;·&nbsp; Llegada: ${chofer.llegada}
                        </div>
                    </div>
                </div>

                <!-- Bloque Montos -->
                <div class="liq-amounts-grid">
                    <div class="liq-amount-col">
                        <span class="liq-amount-label">Bruto</span>
                        <span class="liq-amount-val-bruto">${formatMoneda(chofer.bruto)}</span>
                    </div>
                    ${chofer.penalidades > 0 ? `
                    <div class="liq-amount-col">
                        <span class="liq-amount-label">Penalidades Chofer</span>
                        <span class="liq-amount-val-penalidades" style="color: #e11d48; font-weight: 700;">-${formatMoneda(chofer.penalidades)}</span>
                    </div>
                    ` : ''}
                    <div class="liq-amount-col">
                        <span class="liq-amount-label">Neto Estimado</span>
                        <span class="liq-amount-val-neto">${formatMoneda(neto)}</span>
                    </div>
                </div>

                <!-- Bloque Acciones -->
                <div class="liq-actions-block">
                    <button class="liq-toggle-details-btn" title="Ver detalles del viaje" data-id="${chofer.id}">
                        <i class="fa-solid fa-chevron-down"></i>
                    </button>
                    <button class="liq-btn-liquidar" data-id="${chofer.id}">
                        <i class="fa-solid fa-wallet"></i>
                        Liquidar
                    </button>
                </div>
            </div>

            <!-- Panel de detalles desplegable (No muestra adelantos de forma pendiente) -->
            <div class="liq-details-panel" id="details-panel-${chofer.id}">
                <div class="liq-details-grid">
                    <div class="liq-detail-box">
                        <span class="liq-detail-label">Peso Total</span>
                        <span class="liq-detail-value">${chofer.peso.toFixed(2)} Ton</span>
                        <span class="liq-detail-subtext">${chofer.pesoRaw.toLocaleString('es-PE')} kg</span>
                    </div>
                    <div class="liq-detail-box">
                        <span class="liq-detail-label">Tarifa Chofer</span>
                        <span class="liq-detail-value">S/ ${chofer.tarifa.toFixed(2)} / kg</span>
                    </div>
                    <div class="liq-detail-box ${chofer.penalidades > 0 ? 'box-danger' : ''}">
                        <span class="liq-detail-label">Penalidades Acumuladas</span>
                        <span class="liq-detail-value ${chofer.penalidades > 0 ? 'val-red' : 'txt-muted'}">
                            ${chofer.penalidades > 0 ? `-${formatMoneda(chofer.penalidades)}` : 'Sin penalidades pendientes'}
                        </span>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(card);
    });

    // Agregar Listeners a las tarjetas creadas
    // 1. Toggles de detalles
    container.querySelectorAll(".liq-toggle-details-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            const panel = document.getElementById(`details-panel-${id}`);
            if (panel) {
                const isHidden = window.getComputedStyle(panel).display === "none";
                if (isHidden) {
                    panel.style.display = "block";
                    btn.classList.add("expanded");
                } else {
                    panel.style.display = "none";
                    btn.classList.remove("expanded");
                }
            }
        });
    });

    // 2. Botón Liquidar (abrir modal)
    container.querySelectorAll(".liq-btn-liquidar").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            const chofer = window.liqState.pendientes.find(p => p.id === id);
            if (chofer) {
                abrirModalLiquidacion(chofer);
            }
        });
    });
}

function renderHistorial() {
    const tbody = document.getElementById("tbody-historial");
    if (!tbody) return;

    tbody.innerHTML = "";

    const query = window.liqState.filtro;
    const itemsFiltrados = window.liqState.historial.filter(h => {
        return h.nombre.toLowerCase().includes(query) || 
               h.viaje.toLowerCase().includes(query) || 
               h.ruta.toLowerCase().includes(query) || 
               h.dni.toLowerCase().includes(query);
    });

    if (itemsFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 32px; color: var(--text-muted);">
                    No se encontraron liquidaciones en el historial.
                </td>
            </tr>
        `;
        return;
    }

    itemsFiltrados.forEach(liq => {
        const tr = document.createElement("tr");
        tr.className = "tabla-tr";

        tr.innerHTML = `
            <td class="tabla-td" style="text-align: center;"><span class="tabla-mono">#${liq.liqNum}</span></td>
            <td class="tabla-td">
                <div class="tabla-nombre">${liq.nombre}</div>
                <div class="tabla-secundario" style="font-size: 11px;">DNI: ${liq.dni}</div>
            </td>
            <td class="tabla-td">
                <div class="tabla-nombre">${liq.viaje}</div>
                <div class="tabla-secundario" style="font-size: 11px;">${liq.ruta}</div>
            </td>
            <td class="tabla-td" style="text-align: right; font-weight: 500;">${liq.peso.toFixed(2)}</td>
            <td class="tabla-td" style="text-align: right;">${formatMoneda(liq.bruto)}</td>
            <td class="tabla-td" style="text-align: right; color: #d97706; font-weight: 500;">-${formatMoneda(liq.adelanto)}</td>
            <td class="tabla-td" style="text-align: right; color: ${liq.penalidades > 0 ? '#e11d48' : 'var(--text-muted)'}; font-weight: 500;">
                ${liq.penalidades > 0 ? `-${formatMoneda(liq.penalidades)}` : '—'}
            </td>
            <td class="tabla-td" style="text-align: right; color: #008f5d; font-weight: 700; font-size: 14px;">${formatMoneda(liq.neto)}</td>
            <td class="tabla-td" style="text-align: center; color: var(--text-muted); font-size: 12px;">${liq.fecha}</td>
        `;

        tbody.appendChild(tr);
    });
}

async function abrirModalLiquidacion(chofer) {
    window.liqState.seleccionado = chofer;

    // Cargar información del chofer en modal
    document.getElementById("modal-viaje-id").textContent = chofer.viaje.replace("Viaje #", "");
    document.getElementById("modal-chofer-nombre").textContent = chofer.nombre;
    document.getElementById("modal-chofer-dni").textContent = chofer.dni;
    document.getElementById("modal-chofer-vehiculo").textContent = chofer.vehiculo;
    document.getElementById("modal-chofer-ruta").textContent = chofer.ruta;

    // Cargar resumen de cálculos
    document.getElementById("modal-resumen-peso").textContent = `${chofer.peso.toFixed(2)} Ton (${chofer.pesoRaw.toLocaleString('es-PE')} kg)`;
    document.getElementById("modal-resumen-tarifa").textContent = `S/ ${chofer.tarifa.toFixed(2)} / kg`;
    document.getElementById("modal-resumen-bruto").textContent = formatMoneda(chofer.bruto);

    // Cargar input de adelanto editable, por defecto con el adelanto del viaje
    const inputAdelanto = document.getElementById("modal-input-adelanto");
    if (inputAdelanto) {
        inputAdelanto.value = chofer.adelanto || 0;
    }

    document.getElementById("modal-input-observaciones").value = "";

    // Obtener incidencias pendientes del chofer desde el backend
    const tableWrapper = document.getElementById("modal-incidencias-table-wrapper");
    const emptyMsg = document.getElementById("modal-incidencias-empty");
    const tbodyInc = document.getElementById("tbody-modal-incidencias");
    tbodyInc.innerHTML = "";

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const headers = { 'x-user-profile': sessionData.id_perfil || 1 };
        
        const response = await fetch(`/api/liquidacion/incidencias-pendientes/${chofer.dni}`, { headers });
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            emptyMsg.style.display = "none";
            tableWrapper.style.display = "block";

            result.data.forEach(inc => {
                const tr = document.createElement("tr");
                tr.style.borderBottom = "1px solid #e2e8f0";

                tr.innerHTML = `
                    <td style="padding: 8px 4px; vertical-align: middle; text-align: center;">
                        <input type="checkbox" class="incidencia-check" data-id="${inc.id_incidencia}" data-saldo="${inc.saldo_pendiente}" style="width: 16px; height: 16px; cursor: pointer;">
                    </td>
                    <td style="padding: 8px 4px;">
                        <div style="font-weight: 600; color: var(--text-primary);">${inc.tipo_incidencia}</div>
                        <div style="color: var(--text-muted); font-size: 11px;">Viaje #${inc.id_viaje} &nbsp;·&nbsp; ${formatearFecha(inc.fecha_creacion)}</div>
                        ${inc.descripcion_detallada ? `<div style="font-style: italic; font-size: 11px; margin-top: 2px;">"${inc.descripcion_detallada}"</div>` : ''}
                    </td>
                    <td style="padding: 8px 4px; text-align: right; font-weight: 600; color: #dc2626; vertical-align: middle;">
                        S/ ${Number(inc.saldo_pendiente).toFixed(2)}
                    </td>
                    <td style="padding: 8px 4px; text-align: center; vertical-align: middle;">
                        <div style="display: flex; align-items: center; justify-content: center; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 6px; max-width: 100px; margin: 0 auto;">
                            <span style="font-size: 11px; color: var(--text-secondary); margin-right: 2px;">S/</span>
                            <input type="number" class="incidencia-monto-input" data-id="${inc.id_incidencia}" data-max="${inc.saldo_pendiente}" value="${Number(inc.saldo_pendiente).toFixed(2)}" step="10" min="0" disabled style="border: none; outline: none; background: transparent; font-weight: 700; text-align: right; width: 100%; font-size: 11px;">
                        </div>
                    </td>
                `;

                tbodyInc.appendChild(tr);
            });

            // Registrar listeners para la tabla de incidencias
            tbodyInc.querySelectorAll(".incidencia-check").forEach(chk => {
                chk.addEventListener("change", (e) => {
                    const row = e.target.closest("tr");
                    const inputVal = row.querySelector(".incidencia-monto-input");
                    if (e.target.checked) {
                        inputVal.disabled = false;
                        inputVal.style.background = "#ffffff";
                    } else {
                        inputVal.disabled = true;
                        inputVal.style.background = "transparent";
                        inputVal.value = Number(e.target.dataset.saldo).toFixed(2);
                    }
                    recalcularNetoModal();
                });
            });

            tbodyInc.querySelectorAll(".incidencia-monto-input").forEach(inp => {
                inp.addEventListener("input", () => {
                    let val = parseFloat(inp.value);
                    const max = parseFloat(inp.dataset.max);
                    if (isNaN(val) || val < 0) {
                        inp.value = 0;
                    }
                    if (val > max) {
                        inp.value = max;
                    }
                    recalcularNetoModal();
                });
            });

        } else {
            emptyMsg.style.display = "block";
            tableWrapper.style.display = "none";
        }
    } catch (err) {
        console.error("Error al cargar incidencias del chofer:", err);
        emptyMsg.style.display = "block";
        tableWrapper.style.display = "none";
    }

    // Calcular neto inicial
    recalcularNetoModal();

    // Mostrar overlay
    const modalOverlay = document.getElementById("liqModalOverlay");
    if (modalOverlay) {
        modalOverlay.classList.add("active");
    }
}

// Función Helper para dar formato a moneda peruana (S/)
function formatMoneda(valor) {
    return "S/ " + valor.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
