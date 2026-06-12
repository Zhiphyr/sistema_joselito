// Inicializar variables de estado del módulo
window.liqState = {
    pendientes: [
        {
            id: 1,
            nombre: "Pedro Ramírez",
            dni: "44556677",
            vehiculo: "XYZ-999 · Fuso Blanco",
            viaje: "Viaje #163",
            ruta: "Piura - Lima",
            salida: "2026-05-18 05:00",
            llegada: "2026-05-19 12:00",
            peso: 12.50,
            tarifa: 0.60,
            bruto: 7500.00,
            adelanto: 1500.00,
            penalidades: 0.00,
            observaciones: ""
        },
        {
            id: 2,
            nombre: "Miguel Ángel Díaz",
            dni: "87654321",
            vehiculo: "T3X-789 · Scania Verde",
            viaje: "Viaje #155",
            ruta: "Chiclayo - Lima",
            salida: "2026-05-14 22:00",
            llegada: "2026-05-15 10:30",
            peso: 10.45,
            tarifa: 0.50,
            bruto: 5225.00,
            adelanto: 800.00,
            penalidades: 150.00,
            observaciones: ""
        },
        {
            id: 3,
            nombre: "Juan Pérez Sánchez",
            dni: "45678912",
            vehiculo: "AHQ-845 · Scania Azul",
            viaje: "Viaje #149",
            ruta: "Chiclayo - Lima",
            salida: "2026-05-10 06:00",
            llegada: "2026-05-11 09:45",
            peso: 8.20,
            tarifa: 0.50,
            bruto: 4100.00,
            adelanto: 600.00,
            penalidades: 50.00,
            observaciones: ""
        }
    ],
    historial: [
        {
            liqNum: 1,
            nombre: "Carlos Mendoza Torres",
            dni: "B7Y-456",
            viaje: "Viaje #140",
            ruta: "Chiclayo - Lima",
            peso: 28.50,
            bruto: 12825.00,
            adelanto: 2000.00,
            penalidades: 300.00,
            neto: 10525.00,
            fecha: "2026-05-12 15:30:00"
        },
        {
            liqNum: 2,
            nombre: "Roberto Silva Vargas",
            dni: "D2M-987",
            viaje: "Viaje #138",
            ruta: "Chiclayo - Lima",
            peso: 5.40,
            bruto: 3510.00,
            adelanto: 500.00,
            penalidades: 0.00,
            neto: 3010.00,
            fecha: "2026-05-08 11:00:00"
        }
    ],
    filtro: "",
    seleccionado: null
};

// Función principal de inicialización que invoca el Router SPA
window.init_liquidacion = function () {
    inicializarEventos();
    renderAll();
};

function inicializarEventos() {
    // 1. Buscador
    const searchInput = document.getElementById("liq-search-input");
    if (searchInput) {
        searchInput.value = window.liqState.filtro;
        searchInput.addEventListener("input", (e) => {
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
        tabPendientes.addEventListener("click", () => {
            tabPendientes.classList.add("active");
            tabHistorial.classList.remove("active");
            contentPendientes.style.display = "block";
            contentHistorial.style.display = "none";
        });

        tabHistorial.addEventListener("click", () => {
            tabHistorial.classList.add("active");
            tabPendientes.classList.remove("active");
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

    if (btnCloseX) btnCloseX.addEventListener("click", cerrarModal);
    if (btnCancel) btnCancel.addEventListener("click", cerrarModal);

    // 4. Modificación en Tiempo Real de Monto de Adelanto
    const inputAdelanto = document.getElementById("modal-input-adelanto");
    if (inputAdelanto) {
        inputAdelanto.addEventListener("input", () => {
            const chofer = window.liqState.seleccionado;
            if (!chofer) return;

            let nuevoAdelanto = parseFloat(inputAdelanto.value);
            if (isNaN(nuevoAdelanto) || nuevoAdelanto < 0) nuevoAdelanto = 0;

            const nuevoNeto = chofer.bruto - nuevoAdelanto - chofer.penalidades;
            document.getElementById("modal-neto-pagar").textContent = formatMoneda(nuevoNeto);
        });
    }

    // 5. Confirmar y Registrar Liquidación
    const btnConfirmar = document.getElementById("modal-btn-confirmar");
    if (btnConfirmar) {
        btnConfirmar.addEventListener("click", () => {
            const chofer = window.liqState.seleccionado;
            if (!chofer) return;

            const inputAdelantoVal = parseFloat(document.getElementById("modal-input-adelanto").value) || 0;
            const observacionesVal = document.getElementById("modal-input-observaciones").value.trim();
            const netoFinal = chofer.bruto - inputAdelantoVal - chofer.penalidades;

            // Alerta SweetAlert2
            if (typeof Swal !== "undefined") {
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
                        // Simular movimiento a historial
                        registrarLiquidacionLocal(chofer, inputAdelantoVal, observacionesVal, netoFinal);
                        cerrarModal();

                        Swal.fire({
                            title: "¡Liquidación Registrada!",
                            text: "El pago se ha procesado y archivado de forma exitosa.",
                            icon: "success",
                            confirmButtonColor: "#008f5d"
                        });
                    }
                });
            } else {
                // Fallback si no está cargado Swal
                if (confirm(`¿Confirmar registro de liquidación por S/ ${netoFinal.toFixed(2)}?`)) {
                    registrarLiquidacionLocal(chofer, inputAdelantoVal, observacionesVal, netoFinal);
                    cerrarModal();
                }
            }
        });
    }
}

function registrarLiquidacionLocal(chofer, adelantoFinal, observaciones, netoFinal) {
    // 1. Remover de pendientes
    window.liqState.pendientes = window.liqState.pendientes.filter(p => p.id !== chofer.id);

    // 2. Agregar a historial
    const nuevaLiqNum = window.liqState.historial.length > 0 
        ? Math.max(...window.liqState.historial.map(h => h.liqNum)) + 1 
        : 1;

    // Obtener fecha actual en formato YYYY-MM-DD HH:MM:SS
    const ahora = new Date();
    const fechaStr = ahora.getFullYear() + "-" + 
        String(ahora.getMonth() + 1).padStart(2, '0') + "-" + 
        String(ahora.getDate()).padStart(2, '0') + " " + 
        String(ahora.getHours()).padStart(2, '0') + ":" + 
        String(ahora.getMinutes()).padStart(2, '0') + ":" + 
        String(ahora.getSeconds()).padStart(2, '0');

    window.liqState.historial.unshift({
        liqNum: nuevaLiqNum,
        nombre: chofer.nombre,
        dni: chofer.dni.split(" ")[0] || chofer.dni, // Limpiar el formato si es necesario
        viaje: chofer.viaje,
        ruta: chofer.ruta,
        peso: chofer.peso,
        bruto: chofer.bruto,
        adelanto: adelantoFinal,
        penalidades: chofer.penalidades,
        neto: netoFinal,
        fecha: fechaStr
    });

    // 3. Actualizar la vista
    renderAll();
}

function renderAll() {
    renderKPIs();
    renderPendientes();
    renderHistorial();
}

function renderKPIs() {
    const viajesPendientesCount = window.liqState.pendientes.length;
    
    // Total por pagar: Sumatoria neto de los pendientes
    const totalPorPagar = window.liqState.pendientes.reduce((acc, p) => acc + (p.bruto - p.adelanto - p.penalidades), 0);
    
    // Pagado este mes: Sumatoria neto del historial
    const totalPagado = window.liqState.historial.reduce((acc, h) => acc + h.neto, 0);

    // Escribir en DOM
    document.getElementById("kpi-viajes-pendientes").textContent = viajesPendientesCount;
    document.getElementById("kpi-total-pagar").textContent = formatMoneda(totalPorPagar);
    document.getElementById("kpi-pagado-mes").textContent = formatMoneda(totalPagado);
    
    // Badge de pestañas
    document.getElementById("badge-pendientes-count").textContent = viajesPendientesCount;
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
        const neto = chofer.bruto - chofer.adelanto - chofer.penalidades;

        // Crear la estructura de la tarjeta
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
                    <div class="liq-amount-col">
                        <span class="liq-amount-label">Adelanto</span>
                        <span class="liq-amount-val-adelanto">-${formatMoneda(chofer.adelanto)}</span>
                    </div>
                    ${chofer.penalidades > 0 ? `
                    <div class="liq-amount-col">
                        <span class="liq-amount-label">Penalidades</span>
                        <span class="liq-amount-val-penalidades">-${formatMoneda(chofer.penalidades)}</span>
                    </div>
                    ` : ''}
                    <div class="liq-amount-col">
                        <span class="liq-amount-label">Neto a Pagar</span>
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

            <!-- Panel de detalles desplegable -->
            <div class="liq-details-panel" id="details-panel-${chofer.id}">
                <div class="liq-details-grid">
                    <div class="liq-detail-box">
                        <span class="liq-detail-label">Peso Total</span>
                        <span class="liq-detail-value">${chofer.peso.toFixed(2)} Ton</span>
                        <span class="liq-detail-subtext">${(chofer.peso * 1000).toLocaleString('es-PE')} kg</span>
                    </div>
                    <div class="liq-detail-box">
                        <span class="liq-detail-label">Tarifa Chofer</span>
                        <span class="liq-detail-value">S/ ${chofer.tarifa.toFixed(2)} / kg</span>
                    </div>
                    <div class="liq-detail-box box-warning">
                        <span class="liq-detail-label">Adelanto Registrado</span>
                        <span class="liq-detail-value txt-warning">${formatMoneda(chofer.adelanto)}</span>
                    </div>
                    <div class="liq-detail-box ${chofer.penalidades > 0 ? 'box-danger' : ''}">
                        <span class="liq-detail-label">Penalidades</span>
                        <span class="liq-detail-value ${chofer.penalidades > 0 ? 'val-red' : 'txt-muted'}">
                            ${chofer.penalidades > 0 ? `-${formatMoneda(chofer.penalidades)}` : 'Sin penalidades'}
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
            <td class="tabla-td" style="text-align: right; color: ${liq.penalidades > 0 ? '#e11d48' : 'var(--text-muted)'};">
                ${liq.penalidades > 0 ? `-${formatMoneda(liq.penalidades)}` : '—'}
            </td>
            <td class="tabla-td" style="text-align: right; color: #008f5d; font-weight: 700; font-size: 14px;">${formatMoneda(liq.neto)}</td>
            <td class="tabla-td" style="text-align: center; color: var(--text-muted); font-size: 12px;">${liq.fecha}</td>
        `;

        tbody.appendChild(tr);
    });
}

function abrirModalLiquidacion(chofer) {
    window.liqState.seleccionado = chofer;

    // Cargar información del chofer en modal
    document.getElementById("modal-viaje-id").textContent = chofer.viaje.replace("Viaje #", "");
    document.getElementById("modal-chofer-nombre").textContent = chofer.nombre;
    document.getElementById("modal-chofer-dni").textContent = chofer.dni;
    document.getElementById("modal-chofer-vehiculo").textContent = chofer.vehiculo;
    document.getElementById("modal-chofer-ruta").textContent = chofer.ruta;

    // Cargar resumen de cálculos
    document.getElementById("modal-resumen-peso").textContent = `${chofer.peso.toFixed(2)} Ton (${(chofer.peso * 1000).toLocaleString('es-PE')} kg)`;
    document.getElementById("modal-resumen-tarifa").textContent = `S/ ${chofer.tarifa.toFixed(2)} / kg`;
    document.getElementById("modal-resumen-bruto").textContent = formatMoneda(chofer.bruto);

    // Cargar inputs
    const inputAdelanto = document.getElementById("modal-input-adelanto");
    inputAdelanto.value = chofer.adelanto;
    document.getElementById("modal-input-observaciones").value = chofer.observaciones || "";

    // Calcular neto inicial
    const neto = chofer.bruto - chofer.adelanto - chofer.penalidades;
    document.getElementById("modal-neto-pagar").textContent = formatMoneda(neto);

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
