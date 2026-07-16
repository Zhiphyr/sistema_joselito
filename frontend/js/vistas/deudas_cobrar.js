let debounceTimerDeudas;
let dtDeudas = null;

function init_deudas_cobrar() {
    // init_ se reejecuta cada vez que se reingresa al módulo, pero el script
    // solo se carga una vez por sesión SPA: sin este reseteo, dtDeudas sigue
    // apuntando a la instancia de DataTables de la <table> anterior (ya
    // destruida al salir del módulo), y renderTablaDeudas actualiza una
    // tabla fantasma en vez de inicializar la nueva que se acaba de inyectar.
    dtDeudas = null;

    cargarDeudas();

    const inputBuscar = document.getElementById('inputBuscarDeuda');
    const selectFiltro = document.getElementById('selectFiltroDeuda');

    if (inputBuscar) {
        inputBuscar.addEventListener('input', (e) => {
            clearTimeout(debounceTimerDeudas);
            debounceTimerDeudas = setTimeout(() => {
                cargarDeudas();
            }, 300);
        });
    }

    if (selectFiltro) {
        selectFiltro.addEventListener('change', () => {
            cargarDeudas();
        });
    }

    // Event delegation para botones de la tabla
    const tbody = document.getElementById('tbody-deudas');
    if (tbody) {
        tbody.addEventListener('click', (e) => {
            const btnCobrar = e.target.closest('.btn-cobrar');
            if (btnCobrar) {
                const idCarga = btnCobrar.dataset.id;
                const flete = btnCobrar.dataset.flete;
                const saldo = btnCobrar.dataset.saldo;
                abrirModalCobro(idCarga, flete, saldo);
            }
            
            const btnVerPagos = e.target.closest('.btn-ver-pagos');
            if (btnVerPagos) {
                const idCarga = btnVerPagos.dataset.id;
                const flete = btnVerPagos.dataset.flete;
                const saldo = btnVerPagos.dataset.saldo;
                const estado = btnVerPagos.dataset.estado;
                abrirHistorial(idCarga, flete, saldo, estado);
            }
            
            const btnVerDetalles = e.target.closest('.btn-ver-detalles');
            if (btnVerDetalles) {
                const idCarga = btnVerDetalles.dataset.id;
                abrirDetallesCarga(idCarga);
            }
        });
    }

    // Inicializar Modal y Cuentas
    cargarCuentasBancarias();
    inicializarModalCobro();
    inicializarModalHistorial();
    inicializarModalDetalles();
}

let cuentasBancariasCache = [];
let billeterasDigitalesCache = [];

async function cargarCuentasBancarias() {
    try {
        const response = await fetch('/api/deudas/cuentas-bancarias', {
            headers: {
                'x-user-profile': localStorage.getItem('user_id') || 1
            }
        });
        const data = await response.json();
        if (data.success) {
            cuentasBancariasCache = data.data.cuentas || [];
            billeterasDigitalesCache = data.data.billeteras || [];
        }
    } catch (error) {
        console.error("Error al cargar cuentas bancarias:", error);
    }
}

let contadorPagosCobro = 0;

function agregarNuevoPagoCobro() {
    contadorPagosCobro++;
    const contenedor = document.getElementById('contenedorListaPagosCobro');
    const div = document.createElement('div');
    div.className = 'bloque-pago-cobro';
    div.style.padding = '16px';
    div.style.background = '#f8fafc';
    div.style.border = '1px solid #e2e8f0';
    div.style.borderRadius = '8px';
    div.style.position = 'relative';

    const fechaActual = new Date();
    fechaActual.setMinutes(fechaActual.getMinutes() - fechaActual.getTimezoneOffset());
    const fechaFormat = fechaActual.toISOString().slice(0, 16);

    div.innerHTML = `
        <button type="button" class="btn-eliminar-pago-cobro" style="position: absolute; top: 12px; right: 12px; background: none; border: none; color: #ef4444; cursor: pointer; font-size: 16px;">
            <i class="fas fa-trash-alt"></i>
        </button>
        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
            <div style="flex: 1;">
                <label style="font-size: 11px; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Monto</label>
                <input type="number" class="form-control input-monto-cobro" step="0.01" min="0.01" required style="font-size: 14px; font-weight: 700;">
            </div>
            <div style="flex: 1.5;">
                <label style="font-size: 11px; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Método</label>
                <select class="form-control select-canal-cobro" required style="font-size: 13px;">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Deposito">Deposito</option>
                    <option value="Billetera Digital">Billetera Digital</option>
                </select>
            </div>
            <div style="flex: 1.5;">
                <label style="font-size: 11px; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Fecha/Hora</label>
                <input type="datetime-local" class="form-control input-fecha-cobro" value="${fechaFormat}" required style="font-size: 13px;">
            </div>
        </div>
        
        <div class="zona-bancaria-cobro" style="display: none; border-top: 1px dashed #cbd5e1; padding-top: 12px; margin-top: 12px;">
            <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                <div style="flex: 2;">
                    <label style="font-size: 11px; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Cuenta / Billetera</label>
                    <select class="form-control select-cuenta-cobro" style="font-size: 13px;">
                        <option value="">Seleccione...</option>
                    </select>
                </div>
                <div style="flex: 1;">
                    <label style="font-size: 11px; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">N° Operación</label>
                    <input type="text" class="form-control input-operacion-cobro" style="font-size: 13px;" placeholder="Ej. 123456">
                </div>
            </div>
            <div>
                <label style="font-size: 11px; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Evidencia (Opcional)</label>
                <label style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; border: 2px dashed #cbd5e1; padding: 12px; border-radius: 8px; background: #f8fafc; color: #64748b; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; text-align: center; box-sizing: border-box;" onmouseover="this.style.borderColor='#3b82f6'; this.style.color='#3b82f6'" onmouseout="this.style.borderColor='#cbd5e1'; this.style.color='#64748b'">
                    <i class="fas fa-cloud-upload-alt" style="font-size: 16px;"></i>
                    <span class="file-name-text">Subir comprobante o captura</span>
                    <input type="file" class="input-evidencia-cobro" accept="image/*" style="display: none;" onchange="this.previousElementSibling.textContent = this.files.length > 0 ? this.files[0].name : 'Subir comprobante o captura';">
                </label>
            </div>
        </div>
    `;

    contenedor.appendChild(div);
}

function calcularTotalesCobro() {
    const inputTotal = document.getElementById('cobro_monto_total');
    if (!inputTotal) return;

    const montoTotal = Number(inputTotal.value) || 0;
    
    let sumaPagos = 0;
    const inputsMonto = document.querySelectorAll('.input-monto-cobro');
    
    let hasEmptyOrZero = false;
    
    inputsMonto.forEach(input => {
        const val = Number(input.value) || 0;
        sumaPagos += val;
        if (val <= 0) hasEmptyOrZero = true;
        
        // Reset styles initially
        input.style.borderColor = '#cbd5e1';
        input.style.background = '#ffffff';
    });

    const faltaPagar = montoTotal - sumaPagos;
    const badgeFalta = document.getElementById('modalCobroFaltaPagar');
    const btnAgregar = document.getElementById('btnAgregarPagoCobro');
    const btnGuardar = document.querySelector('#formCobro .btn-guardar');

    if (!badgeFalta || !btnAgregar || !btnGuardar) return;

    // UI Feedback for exceeding amount
    if (faltaPagar < 0) {
        inputsMonto.forEach(input => {
            input.style.borderColor = '#ef4444';
            input.style.background = '#fef2f2';
        });
        badgeFalta.textContent = `Excedido: S/ ${Math.abs(faltaPagar).toFixed(2)}`;
        badgeFalta.style.background = '#fef2f2';
        badgeFalta.style.color = '#ef4444';
    } else if (faltaPagar === 0 && montoTotal > 0 && sumaPagos > 0) {
        badgeFalta.textContent = 'Monto Cubierto';
        badgeFalta.style.background = '#dcfce7';
        badgeFalta.style.color = '#16a34a';
    } else {
        badgeFalta.textContent = `Falta Distribuir: S/ ${faltaPagar.toFixed(2)}`;
        badgeFalta.style.background = '#fee2e2';
        badgeFalta.style.color = '#ef4444';
    }

    // Lógica botón Agregar
    if (hasEmptyOrZero || sumaPagos >= montoTotal || montoTotal <= 0) {
        btnAgregar.disabled = true;
        btnAgregar.style.opacity = '0.5';
        btnAgregar.style.cursor = 'not-allowed';
    } else {
        btnAgregar.disabled = false;
        btnAgregar.style.opacity = '1';
        btnAgregar.style.cursor = 'pointer';
    }

    // Lógica botón Guardar
    if (sumaPagos === montoTotal && montoTotal > 0 && !hasEmptyOrZero && inputsMonto.length > 0) {
        btnGuardar.disabled = false;
        btnGuardar.style.opacity = '1';
        btnGuardar.style.cursor = 'pointer';
    } else {
        btnGuardar.disabled = true;
        btnGuardar.style.opacity = '0.5';
        btnGuardar.style.cursor = 'not-allowed';
    }
}

function inicializarModalCobro() {
    const modal = document.getElementById('modalCobro');
    const btnCerrar = document.getElementById('btnCerrarModalCobro');
    const btnCancelar = document.getElementById('btnCancelarCobro');
    const inputMontoTotal = document.getElementById('cobro_monto_total');
    const btnAgregarPagoCobro = document.getElementById('btnAgregarPagoCobro');
    const contenedorListaPagosCobro = document.getElementById('contenedorListaPagosCobro');

    if (!modal) return;

    const cerrarModal = () => {
        modal.style.display = 'none';
        document.getElementById('formCobro').reset();
        if (contenedorListaPagosCobro) contenedorListaPagosCobro.innerHTML = '';
        contadorPagosCobro = 0;
        calcularTotalesCobro();
    };

    btnCerrar.addEventListener('click', cerrarModal);
    btnCancelar.addEventListener('click', cerrarModal);

    if (inputMontoTotal) {
        inputMontoTotal.addEventListener('input', calcularTotalesCobro);
    }

    if (btnAgregarPagoCobro) {
        btnAgregarPagoCobro.addEventListener('click', () => {
            agregarNuevoPagoCobro();
            calcularTotalesCobro();
        });
    }

    if (contenedorListaPagosCobro) {
        // Delegación de eventos para inputs de monto
        contenedorListaPagosCobro.addEventListener('input', (e) => {
            if (e.target.classList.contains('input-monto-cobro')) {
                calcularTotalesCobro();
            }
        });

        // Delegación de eventos para botones eliminar
        contenedorListaPagosCobro.addEventListener('click', (e) => {
            const btnEliminar = e.target.closest('.btn-eliminar-pago-cobro');
            if (btnEliminar) {
                const bloque = btnEliminar.closest('.bloque-pago-cobro');
                bloque.remove();
                calcularTotalesCobro();
            }
        });

        // Delegación de eventos para select de canal
        contenedorListaPagosCobro.addEventListener('change', (e) => {
            if (e.target.classList.contains('select-canal-cobro')) {
                const bloque = e.target.closest('.bloque-pago-cobro');
                const canal = e.target.value;
                const zonaBancaria = bloque.querySelector('.zona-bancaria-cobro');
                const selectCuenta = bloque.querySelector('.select-cuenta-cobro');
                const inputOperacion = bloque.querySelector('.input-operacion-cobro');
                
                if (canal === 'Efectivo') {
                    zonaBancaria.style.display = 'none';
                    selectCuenta.required = false;
                    inputOperacion.required = false;
                } else {
                    zonaBancaria.style.display = 'block';
                    selectCuenta.required = true;
                    inputOperacion.required = true;
                    
                    selectCuenta.innerHTML = '<option value="">Seleccione...</option>';
                    if (canal === 'Billetera Digital') {
                        billeterasDigitalesCache.forEach(b => {
                            selectCuenta.innerHTML += `<option value="${b.id_billetera}">${b.entidad_financiera} - ${b.numero_celular} (${b.titular})</option>`;
                        });
                    } else {
                        cuentasBancariasCache.forEach(c => {
                            selectCuenta.innerHTML += `<option value="${c.id_cuenta}">${c.entidad_financiera} - ${c.nro_cuenta} (${c.titular})</option>`;
                        });
                    }
                }
            }
        });
    }

    document.getElementById('formCobro').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnGuardar = modal.querySelector('.btn-guardar');
        if (btnGuardar.disabled) return;

        const originalText = btnGuardar.innerHTML;
        btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        btnGuardar.disabled = true;

        const formData = new FormData();
        formData.append('id_carga', document.getElementById('cobro_id_carga').value);
        formData.append('observacion', document.getElementById('cobro_observacion').value);

        const pagos = [];
        const bloques = document.querySelectorAll('.bloque-pago-cobro');
        
        bloques.forEach((bloque, index) => {
            const monto = bloque.querySelector('.input-monto-cobro').value;
            const canal = bloque.querySelector('.select-canal-cobro').value;
            const fecha = bloque.querySelector('.input-fecha-cobro').value;
            const cuentaBilletera = bloque.querySelector('.select-cuenta-cobro').value;
            const operacion = bloque.querySelector('.input-operacion-cobro').value;
            const evidenciaInput = bloque.querySelector('.input-evidencia-cobro');

            let id_cuenta = null;
            let id_billetera = null;

            if (canal === 'Billetera Digital') {
                id_billetera = cuentaBilletera;
            } else if (canal !== 'Efectivo') {
                id_cuenta = cuentaBilletera;
            }

            pagos.push({
                monto_pagado: monto,
                tipo_pago: canal,
                fecha_pago: fecha,
                id_cuenta: id_cuenta,
                id_billetera: id_billetera,
                nro_operacion: operacion,
                index_evidencia: null
            });

            if (evidenciaInput && evidenciaInput.files && evidenciaInput.files.length > 0) {
                formData.append(`evidencia_${index}`, evidenciaInput.files[0]);
                pagos[pagos.length - 1].index_evidencia = index;
            }
        });

        formData.append('pagos', JSON.stringify(pagos));

        try {
            const response = await fetch('/api/deudas/cobrar', {
                method: 'POST',
                headers: {
                    'x-user-profile': localStorage.getItem('user_id') || 1
                },
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                cerrarModal();
                cargarDeudas(); // Refrescar la tabla
                Swal.fire({
                    icon: 'success',
                    title: 'Pago(s) Registrado(s)',
                    text: 'El cobro se ha procesado exitosamente.',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error al procesar',
                    text: data.message || 'No se pudo registrar el pago.'
                });
            }
        } catch (error) {
            console.error('Error al guardar cobro:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'Hubo un problema de red al intentar guardar el cobro.'
            });
        } finally {
            btnGuardar.innerHTML = originalText;
            btnGuardar.disabled = false;
        }
    });
}

function filtrarCuentas(canal) {
    const selectCuenta = document.getElementById('cobro_cuenta');
    selectCuenta.innerHTML = '<option value="">Seleccione una cuenta...</option>';
    
    let cuentasFiltradas = [];
    if (canal === 'Billetera Digital') {
        cuentasFiltradas = cuentasBancariasCache.filter(c => c.entidad_financiera === 'Yape' || c.entidad_financiera === 'Plin');
    } else {
        cuentasFiltradas = cuentasBancariasCache.filter(c => c.entidad_financiera !== 'Yape' && c.entidad_financiera !== 'Plin');
    }

    cuentasFiltradas.forEach(c => {
        selectCuenta.innerHTML += `<option value="${c.id_cuenta}">${c.entidad_financiera} - ${c.tipo_cuenta} (${c.titular})</option>`;
    });
}

function abrirModalCobro(idCarga, fleteOriginal, saldoPendiente) {
    const modal = document.getElementById('modalCobro');
    if (!modal) return;

    // Pre-llenar Contexto
    document.getElementById('modalCobroBadge').textContent = 'Carga ' + idCarga;
    document.getElementById('cobro_id_carga').value = idCarga;
    document.getElementById('cobro_deuda_original').textContent = 'S/ ' + Number(fleteOriginal).toFixed(2);
    document.getElementById('cobro_saldo_pendiente').textContent = 'S/ ' + Number(saldoPendiente).toFixed(2);

    // Pre-llenar Captura
    const saldoFinal = Number(saldoPendiente).toFixed(2);
    const inputMontoTotal = document.getElementById('cobro_monto_total');
    if (inputMontoTotal) {
        inputMontoTotal.value = saldoFinal;
    }
    
    const contenedorListaPagosCobro = document.getElementById('contenedorListaPagosCobro');
    if (contenedorListaPagosCobro) {
        contenedorListaPagosCobro.innerHTML = '';
    }
    contadorPagosCobro = 0;
    
    agregarNuevoPagoCobro();
    const firstMonto = document.querySelector('.input-monto-cobro');
    if (firstMonto) {
        firstMonto.value = saldoFinal;
    }

    calcularTotalesCobro();
    const inputObs = document.getElementById('cobro_observacion');
    if (inputObs) inputObs.value = '';

    modal.style.display = 'flex';
}

async function cargarResumenDiario() {
    try {
        const response = await fetch('/api/deudas/resumen-diario', {
            headers: {
                'x-user-profile': localStorage.getItem('user_id') || 1
            }
        });
        const result = await response.json();
        
        if (result.success && result.data) {
            const data = result.data;
            document.getElementById('cardTotalRecaudado').textContent = 'S/ ' + Number(data.total_recaudado).toFixed(2);
            document.getElementById('cardEfectivo').textContent = 'S/ ' + Number(data.total_efectivo).toFixed(2);
            document.getElementById('cardBilleteras').textContent = 'S/ ' + Number(data.total_billetera).toFixed(2);
            document.getElementById('cardBancos').textContent = 'S/ ' + Number(data.total_bancos).toFixed(2);
        }
    } catch (error) {
        console.error("Error al cargar resumen diario:", error);
    }
}

async function cargarDeudas() {
    cargarResumenDiario();
    const inputBuscar = document.getElementById('inputBuscarDeuda');
    const selectFiltro = document.getElementById('selectFiltroDeuda');
    const tbody = document.getElementById('tbody-deudas');
    
    if (!tbody) return;

    const search = '';
    const filtroEstado = 'todos';

    try {
        const response = await fetch(`/api/deudas?search=${encodeURIComponent(search)}&filtroEstado=${encodeURIComponent(filtroEstado)}`, {
            headers: {
                'x-user-profile': localStorage.getItem('user_id') || 1
            }
        });

        const data = await response.json();

        if (data.success) {
            window.deudasActuales = data.data;
            renderTablaDeudas(data.data);
        } else {
            throw new Error(data.message || 'Error al obtener las deudas.');
        }
    } catch (error) {
        console.error('Error cargarDeudas:', error);
    }
}

function renderTablaDeudas(deudas) {
    if (dtDeudas) {
        dtDeudas.clear().rows.add(deudas).draw();
        return;
    }

    dtDeudas = window.$('#tabla-deudas-cobrar').DataTable({
        data: deudas,
        dom: '<"dt-top-controls"<"dt-left-controls"l>f>rt<"bottom-controls"ip>',
        pageLength: 15,
        lengthMenu: [10, 15, 25, 50, 100],
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
        },
        order: [[0, 'desc']], // Ordenar por id por defecto
        columns: [
            {
                data: 'id_carga',
                type: 'num',
                render: function (data, type, row) {
                    if (type === 'sort' || type === 'type') {
                        return Number(data);
                    }
                    return `
                        <div style="font-weight: 800; color: var(--brand-blue); font-size: 13px;">Carga #${row.id_carga}</div>
                        <div style="font-size: 10px; color: var(--text-muted); font-weight: 600; background: #f1f5f9; display: inline-block; padding: 2px 6px; border-radius: 4px; margin-top: 2px;">Viaje #${row.id_viaje}</div>
                    `;
                }
            },
            {
                data: 'fecha_llegada',
                render: function (data, type, row) {
                    let fLlegada = data ? new Date(data).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
                    let moraHTML = '';
                    if (data && (row.estado_cobro === 'Pendiente' || row.estado_cobro === 'Parcial')) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const dateLlegada = new Date(data);
                        dateLlegada.setHours(0, 0, 0, 0);
                        
                        const diffTime = today.getTime() - dateLlegada.getTime();
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        
                        if (diffDays > 15) {
                            moraHTML = `<div style="margin-top: 6px;"><span style="background: #fecaca; color: #b91c1c; padding: 3px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;"><i class="fas fa-exclamation-triangle"></i> Hace ${diffDays} días</span></div>`;
                        }
                    }
                    return `<span style="font-weight: 600; color: var(--text-secondary); font-size: 12px;">${fLlegada}</span>${moraHTML}`;
                }
            },
            {
                data: 'remitente_nombre',
                render: function(data, type, row) {
                    return `<span style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">${data || 'Desconocido'}</span>`;
                }
            },
            {
                data: 'cliente_nombre',
                render: function(data, type, row) {
                    return `<span style="font-size: 12px; font-weight: 700; color: var(--text-primary); text-transform: uppercase;">${data || 'Desconocido'}</span>`;
                }
            },
            {
                data: 'estado_entrega',
                render: function(data, type, row) {
                    let badgeEntregaColor = '#f1f5f9';
                    let badgeEntregaText = '#64748b';
                    if (data === 'Entregado') {
                        badgeEntregaColor = '#dcfce7';
                        badgeEntregaText = '#16a34a';
                    } else if (data === 'En Ruta' || data === 'En ruta') {
                        badgeEntregaColor = '#e0f2fe';
                        badgeEntregaText = 'var(--brand-blue)';
                    } else if (data === 'Entregado Parcialmente') {
                        badgeEntregaColor = '#fef3c7';
                        badgeEntregaText = '#d97706';
                    } else if (data === 'Rechazado Total') {
                        badgeEntregaColor = '#fee2e2';
                        badgeEntregaText = '#dc2626';
                    }
                    return `<div style="display:inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: ${badgeEntregaColor}; color: ${badgeEntregaText};">${data || '-'}</div>`;
                }
            },
            {
                data: 'flete_total',
                render: function(data, type, row) {
                    return `<span style="font-weight: 600; color: var(--text-primary); font-size: 12px;">S/ ${Number(data || 0).toFixed(2)}</span>`;
                }
            },
            {
                data: 'saldo_pendiente',
                render: function(data, type, row) {
                    const saldo = Number(data || 0);
                    const color = saldo > 0 ? '#dc2626' : '#16a34a';
                    return `<span style="font-weight: 700; color: ${color}; font-size: 12px;">S/ ${saldo.toFixed(2)}</span>`;
                }
            },
            {
                data: 'estado_cobro',
                render: function(data, type, row) {
                    let badgeCobro = '';
                    if (data === 'Pendiente') {
                        badgeCobro = `<span style="display:inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #fee2e2; color: #dc2626;">PENDIENTE</span>`;
                    } else if (data === 'Parcial') {
                        badgeCobro = `<span style="display:inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #e0f2fe; color: #0369a1;">PARCIAL</span>`;
                    } else if (data === 'Completado') {
                        badgeCobro = `<span style="display:inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #dcfce7; color: #16a34a;">COMPLETADO</span>`;
                    } else if (data === 'Anulado') {
                        badgeCobro = `<span style="display:inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #fee2e2; color: #dc2626;">ANULADO</span>`;
                    } else {
                        badgeCobro = `<span style="display:inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #f1f5f9; color: #64748b;">${data}</span>`;
                    }
                    return badgeCobro;
                }
            },
            {
                data: null,
                orderable: false,
                render: function(data, type, row) {
                    const saldo = Number(row.saldo_pendiente || 0);
                    const flete = Number(row.flete_total || 0);
                    let btnCobrarHTML = '';
                    
                    if (row.estado_cobro !== 'Completado' && row.estado_cobro !== 'Anulado') {
                        btnCobrarHTML = `
                            <button class="btn-cobrar" data-id="${row.id_carga}" data-flete="${flete}" data-saldo="${saldo}" title="Registrar Cobro" style="background: #16a34a; color: white; border: none; width: 32px; height: 32px; border-radius: 6px; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                                <i class="fas fa-hand-holding-usd"></i>
                            </button>
                        `;
                    }
                    const btnVerPagos = `
                        <button class="btn-ver-pagos" data-id="${row.id_carga}" data-flete="${flete}" data-saldo="${saldo}" data-estado="${row.estado_cobro}" title="Historial de Pagos" style="background: #eab308; color: white; border: none; width: 32px; height: 32px; border-radius: 6px; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                            <i class="fas fa-file-invoice-dollar"></i>
                        </button>
                    `;
                    
                    const btnVerDetalles = `
                        <button class="btn-ver-detalles" data-id="${row.id_carga}" title="Ver Detalles de Carga" style="background: #0284c7; color: white; border: none; width: 32px; height: 32px; border-radius: 6px; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                            <i class="fas fa-eye"></i>
                        </button>
                    `;
                    
                    return `<div style="display: flex; gap: 8px;">${btnVerDetalles}${btnCobrarHTML}${btnVerPagos}</div>`;
                }
            }
        ],
        createdRow: function(row, data, dataIndex) {
            if (data.fecha_llegada && (data.estado_cobro === 'Pendiente' || data.estado_cobro === 'Parcial')) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dateLlegada = new Date(data.fecha_llegada);
                dateLlegada.setHours(0, 0, 0, 0);
                const diffTime = today.getTime() - dateLlegada.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays > 15) {
                    window.$(row).css('background-color', '#fef2f2');
                }
            }
        },
        initComplete: function() {
            const api = this.api();
            
            // Crear el contenedor del filtro
            const filterContainer = document.createElement('div');
            filterContainer.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-right: 16px;';
            filterContainer.innerHTML = `
                <label style="margin: 0; font-weight: 600; color: var(--text-secondary); font-size: 13px;">
                    <i class="fas fa-filter" style="color: var(--text-muted); margin-right: 4px;"></i> Estado:
                </label>
                <select class="form-control" style="width: auto; padding: 6px 12px; font-size: 13px; border-radius: 8px; border: 1px solid var(--border-light); outline: none; background: white; cursor: pointer;">
                    <option value="">Todos</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Parcial">Parcial</option>
                    <option value="Completado">Completado</option>
                    <option value="Anulado">Anulado</option>
                </select>
            `;
            
            // Insertarlo al inicio de dt-left-controls
            const leftControls = document.querySelector('#tabla-deudas-cobrar_wrapper .dt-left-controls');
            if (leftControls) {
                leftControls.insertBefore(filterContainer, leftControls.firstChild);
            }
            
            // Escuchar cambios para filtrar la columna 7 (Estado Cobro)
            const select = filterContainer.querySelector('select');
            select.addEventListener('change', function() {
                const val = window.$.fn.dataTable.util.escapeRegex(this.value);
                // Busca en la columna 7. true = regex, false = smart search
                api.column(7).search(val ? val : '', true, false).draw();
            });
        }
    });
}

// ----------------------------------------------------
// FUNCIONALIDAD HISTORIAL DE PAGOS
// ----------------------------------------------------

function inicializarModalHistorial() {
    const modal = document.getElementById('modalHistorial');
    const btnCerrar1 = document.getElementById('btnCerrarHistorial');
    const btnCerrar2 = document.getElementById('btnCerrarHistorialFooter');
    
    if(!modal) return;

    const cerrarModal = () => { modal.style.display = 'none'; };
    
    // Remover event listeners anteriores si existieran para evitar duplicados en SPA
    btnCerrar1.replaceWith(btnCerrar1.cloneNode(true));
    btnCerrar2.replaceWith(btnCerrar2.cloneNode(true));
    
    document.getElementById('btnCerrarHistorial').addEventListener('click', cerrarModal);
    document.getElementById('btnCerrarHistorialFooter').addEventListener('click', cerrarModal);

    // Configurar Botón WhatsApp
    const btnWhatsApp = document.getElementById('btnWhatsApp');
    if (btnWhatsApp) {
        // Remover listener anterior si existe
        btnWhatsApp.replaceWith(btnWhatsApp.cloneNode(true));
        document.getElementById('btnWhatsApp').addEventListener('click', async () => {
            const idCarga = window.idCargaAbierta;
            if (!idCarga || !window.deudasActuales) return;

            const deuda = window.deudasActuales.find(d => d.id_carga == idCarga);
            if (!deuda) return;

            const telOriginal = deuda.destinatario_telefono || '';

            const { value: numeroWA } = await Swal.fire({
                title: 'Enviar Mensaje',
                text: 'Confirme o edite el número de WhatsApp (Solo 9 dígitos)',
                input: 'text',
                inputValue: telOriginal,
                showCancelButton: true,
                confirmButtonText: '<i class="fab fa-whatsapp"></i> Enviar',
                confirmButtonColor: '#22c55e',
                cancelButtonText: 'Cancelar',
                inputValidator: (value) => {
                    const soloNumeros = /^\d+$/.test(value);
                    if (!value || !soloNumeros || value.length > 9 || value === '000000000' || Number(value) <= 0) {
                        return 'Ingrese un celular válido (Ej. 987654321)';
                    }
                }
            });

            if (numeroWA) {
                // Formatear mensaje
                const fechaDate = new Date(deuda.fecha_llegada);
                const opcionesFecha = { day: '2-digit', month: '2-digit', year: 'numeric' };
                const strFecha = fechaDate.toLocaleDateString('es-ES', opcionesFecha);
                
                const strProductos = deuda.resumen_carga || 'Sin detalle';

                let mensaje = '';
                const fleteTotal = Number(deuda.flete_total).toFixed(2);
                
                // Extraer el saldo del DOM (está siempre actualizado)
                const saldoActualStr = document.getElementById('historialSaldo').textContent.replace('S/', '').trim();
                const estadoActual = document.getElementById('historialEstado').textContent.trim();
                const pagadoActual = (Number(fleteTotal) - Number(saldoActualStr)).toFixed(2);

                if (estadoActual === 'PENDIENTE') {
                    mensaje = `Tiene una deuda pendiente de una carga del viaje que llego el dia ${strFecha} por los productos ${strProductos}.`;
                } else if (estadoActual === 'PARCIAL') {
                    mensaje = `Aun tiene una deuda por pagar de la carga del viaje que llego el dia ${strFecha} por los productos ${strProductos}, ha pagado S/ ${pagadoActual} de S/ ${fleteTotal}, aun debe S/ ${saldoActualStr}.`;
                } else if (estadoActual === 'COMPLETADO' || estadoActual === 'COBRADO') {
                    mensaje = `Su deuda de la carga del viaje que llego el dia ${strFecha} por los productos ${strProductos}. Ha sido completamente pagada, muchas gracias por su responsabilidad.`;
                } else {
                    mensaje = `Detalle de su carga del viaje llegado el ${strFecha} por los productos ${strProductos}.`;
                }

                const urlWA = `https://wa.me/51${numeroWA}?text=${encodeURIComponent(mensaje)}`;
                window.open(urlWA, '_blank');
            }
        });
    }
}

async function abrirHistorial(idCarga, fleteOriginal, saldoPendiente, estadoActual) {
    const modal = document.getElementById('modalHistorial');
    if (!modal) return;

    window.idCargaAbierta = idCarga;

    // 1. Cabecera y Resumen Financiero
    document.getElementById('modalHistorialBadge').textContent = 'Carga ' + idCarga;
    document.getElementById('historialDeuda').textContent = 'S/ ' + Number(fleteOriginal).toFixed(2);
    
    const saldoTxt = document.getElementById('historialSaldo');
    const nSaldo = Number(saldoPendiente);
    saldoTxt.textContent = 'S/ ' + nSaldo.toFixed(2);
    saldoTxt.style.color = nSaldo <= 0 ? '#16a34a' : '#ef4444'; // Verde si pagó todo, Rojo si debe

    const estadoBadge = document.getElementById('historialEstado');
    estadoBadge.textContent = estadoActual;
    
    // Colores para el estado
    if (estadoActual === 'Completado' || estadoActual === 'COBRADO') {
        estadoBadge.style.background = '#dcfce7';
        estadoBadge.style.color = '#16a34a';
        estadoBadge.textContent = 'COBRADO';
    } else if (estadoActual === 'Parcial' || estadoActual === 'PARCIAL') {
        estadoBadge.style.background = '#fef3c7';
        estadoBadge.style.color = '#d97706';
        estadoBadge.textContent = 'PARCIAL';
    } else {
        estadoBadge.style.background = '#fee2e2';
        estadoBadge.style.color = '#ef4444';
        estadoBadge.textContent = 'PENDIENTE';
    }

    // 2. Fetch y Render de la Lista
    let contenedorPagos = document.getElementById('historialPagosLista');
    if (!contenedorPagos) return;

    const sessionDataHistorial = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const puedeAnular = sessionDataHistorial.id_perfil === 1 || sessionDataHistorial.id_perfil === 2;

    // Clonar para remover event listeners previos (SPA safe)
    const newContenedor = contenedorPagos.cloneNode(false);
    contenedorPagos.parentNode.replaceChild(newContenedor, contenedorPagos);
    contenedorPagos = newContenedor;
    
    contenedorPagos.innerHTML = `
        <div style="text-align: center; color: #94a3b8; padding: 40px 0;">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 12px;"></i>
            <p>Cargando pagos...</p>
        </div>
    `;
    modal.style.display = 'flex';

    try {
        const response = await fetch(`/api/deudas/historial/${idCarga}`, {
            headers: { 'x-user-profile': localStorage.getItem('user_id') || 1 }
        });
        const data = await response.json();
        
        if (data.success) {
            const pagos = data.data;

            if (pagos.length === 0) {
                contenedorPagos.innerHTML = `
                    <div style="text-align: center; color: #94a3b8; padding: 40px 0; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px;">
                        <i class="fas fa-history" style="font-size: 32px; margin-bottom: 12px; color: #cbd5e1;"></i>
                        <h3 style="margin: 0; font-size: 16px; color: #475569; margin-bottom: 4px;">No hay pagos registrados</h3>
                        <p style="margin: 0; font-size: 13px;">Aún no se ha cobrado nada de esta carga.</p>
                    </div>
                `;
                return;
            }

            // Generar tarjetas
            let htmlPagos = '';
            pagos.forEach(p => {
                // Formatear Fecha
                const fechaDate = new Date(p.fecha_pago);
                const opcionesFecha = { day: '2-digit', month: 'short', year: 'numeric' };
                const opcionesHora = { hour: '2-digit', minute: '2-digit' };
                const strFecha = fechaDate.toLocaleDateString('es-ES', opcionesFecha);
                const strHora = fechaDate.toLocaleTimeString('es-ES', opcionesHora);
                
                // Lógica de anulación
                const isAnulado = (p.estado === 0);
                const bgCard = isAnulado ? '#f8fafc' : 'white';
                const opacityCard = isAnulado ? '0.75' : '1';
                const colorMonto = isAnulado ? '#ef4444' : '#16a34a';
                const txtMonto = isAnulado ? `<del>S/ ${Number(p.monto_pagado).toFixed(2)}</del>` : `+ S/ ${Number(p.monto_pagado).toFixed(2)}`;
                const badgeAnulado = isAnulado ? `<span style="background: #fecaca; color: #ef4444; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-left: 8px;">ANULADO</span>` : '';

                // Icono según tipo
                let iconTipo = 'fa-money-bill-wave';
                let colorTipo = '#10b981';
                if (p.tipo_pago === 'Transferencia' || p.tipo_pago === 'Deposito') { iconTipo = 'fa-university'; colorTipo = '#3b82f6'; }
                if (p.tipo_pago === 'Billetera Digital') { iconTipo = 'fa-wallet'; colorTipo = '#a855f7'; }

                // Caja de datos bancarios (Oculta si es Efectivo)
                let htmlBanco = '';
                if (p.tipo_pago !== 'Efectivo') {
                    // Limpiar "Nro de cuenta:" para Billeteras
                    let txtCuenta = `Corriente - ${p.nro_cuenta}`;
                    if (p.tipo_pago === 'Billetera Digital') {
                        txtCuenta = `Nro de cuenta: ${p.nro_cuenta}`;
                    }

                    htmlBanco = `
                        <div style="background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div>
                                <span style="display: block; font-size: 11px; color: #64748b;">Banco/Entidad</span>
                                <span style="font-size: 13px; font-weight: 500; color: #1e293b;">${p.entidad_financiera || '-'}</span>
                            </div>
                            <div>
                                <span style="display: block; font-size: 11px; color: #64748b;">Cuenta</span>
                                <span style="font-size: 13px; font-weight: 500; color: #1e293b;">${txtCuenta}</span>
                            </div>
                            <div>
                                <span style="display: block; font-size: 11px; color: #64748b;">Titular</span>
                                <span style="font-size: 13px; font-weight: 500; color: #1e293b;">${p.titular || '-'}</span>
                            </div>
                            <div>
                                <span style="display: block; font-size: 11px; color: #64748b;">N° OP</span>
                                <span style="font-size: 13px; font-weight: 500; color: #1e293b;">${p.nro_operacion || '-'}</span>
                            </div>
                        </div>
                    `;
                }

                // Observación
                let htmlObs = '';
                if (p.observacion) {
                    htmlObs = `<p style="margin: 0 0 12px 0; font-size: 13px; color: #64748b; font-style: italic;">"${p.observacion}"</p>`;
                }

                // Acciones (Anular / Voucher)
                let btnAnular = '';
                if (!isAnulado && puedeAnular) {
                    btnAnular = `
                        <button class="btn-anular-pago" data-id="${p.id_pago}" data-carga="${idCarga}" style="background: white; border: 1px solid #fecaca; color: #ef4444; padding: 6px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='white'">
                            <i class="fas fa-ban"></i> Anular Pago
                        </button>
                    `;
                }
                
                let btnVoucher = '';
                if (p.ruta_comprobante) {
                    btnVoucher = `
                        <button onclick="verVoucher('${p.ruta_comprobante}')" style="background: white; border: 1px solid #bfdbfe; color: #3b82f6; padding: 6px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='white'">
                            <i class="fas fa-eye"></i> Ver Comprobante
                        </button>
                    `;
                }

                let htmlAcciones = `
                    <div style="display: flex; gap: 8px; justify-content: flex-end; border-top: 1px dashed #e2e8f0; padding-top: 12px;">
                        ${btnAnular}
                        ${btnVoucher}
                    </div>
                `;

                htmlPagos += `
                    <div style="border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 16px; overflow: hidden; background: ${bgCard}; opacity: ${opacityCard};">
                        <!-- Top -->
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid #f1f5f9;">
                            <div style="display: flex; align-items: center; gap: 8px; color: #475569; font-weight: 600; font-size: 14px;">
                                <i class="far fa-clock" style="color: #94a3b8;"></i> ${strFecha} - ${strHora}
                                ${badgeAnulado}
                            </div>
                            <div style="font-size: 18px; font-weight: 800; color: ${colorMonto};">
                                ${txtMonto}
                            </div>
                        </div>
                        
                        <!-- Middle -->
                        <div style="padding: 16px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-weight: 600; color: #334155; font-size: 14px;">
                                <i class="fas ${iconTipo}" style="color: ${colorTipo};"></i> ${p.tipo_pago}
                            </div>
                            
                            ${htmlBanco}
                            ${htmlObs}
                            ${htmlAcciones}
                        </div>
                    </div>
                `;
            });

            contenedorPagos.innerHTML = htmlPagos;

            // Delegación de eventos para anulación
            contenedorPagos.addEventListener('click', async (e) => {
                const btnAnular = e.target.closest('.btn-anular-pago');
                if (btnAnular) {
                    const idPago = btnAnular.dataset.id;
                    const idCargaActual = btnAnular.dataset.carga;

                    const { value: formValues } = await Swal.fire({
                        title: 'Autorización Requerida',
                        html: `
                            <p style="text-align:left; font-size:13px; color:#64748b; margin-bottom:12px;">
                                Esta acción revertirá la deuda de la carga y el movimiento de caja asociado.
                            </p>
                            <label style="display:block; text-align:left; font-size:13px; font-weight:600; margin-bottom:4px;">Motivo de la anulación *</label>
                            <textarea id="swal-motivo-anulacion" class="swal2-textarea" style="margin:0 0 12px;"
                                placeholder="Ej: Se registró el cobro con el monto incorrecto, se corrige y se vuelve a registrar."></textarea>
                            <label style="display:block; text-align:left; font-size:13px; font-weight:600; margin-bottom:4px;">PIN de autorización *</label>
                            <input type="password" id="swal-pin-anulacion" class="swal2-input" style="margin:0"
                                inputmode="numeric" pattern="[0-9]*" placeholder="PIN numérico">
                        `,
                        focusConfirm: false,
                        showCancelButton: true,
                        confirmButtonText: 'Anular Pago',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#ef4444',
                        preConfirm: () => {
                            const motivo = document.getElementById('swal-motivo-anulacion').value.trim();
                            const pin = document.getElementById('swal-pin-anulacion').value.trim();
                            if (motivo.length < 10) {
                                Swal.showValidationMessage('El motivo debe tener al menos 10 caracteres.');
                                return false;
                            }
                            if (!/^[a-zA-Z0-9À-ÿ\s.,\-¿?¡!:;'"()/#]+$/.test(motivo)) {
                                Swal.showValidationMessage('El motivo tiene caracteres no permitidos.');
                                return false;
                            }
                            if (!/^[0-9]+$/.test(pin)) {
                                Swal.showValidationMessage('Ingrese un PIN numérico válido.');
                                return false;
                            }
                            return { motivo, pin };
                        }
                    });

                    if (formValues) {
                        try {
                            // Mostrar loading
                            Swal.fire({
                                title: 'Procesando...',
                                text: 'Anulando el pago y recalculando deuda',
                                allowOutsideClick: false,
                                didOpen: () => {
                                    Swal.showLoading();
                                }
                            });

                            const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
                            const resAnular = await fetch('/api/deudas/anular-pago', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'x-user-profile': sessionData.id_perfil,
                                    'x-user-id': sessionData.id_usuario
                                },
                                body: JSON.stringify({ id_pago: idPago, pin: formValues.pin, motivo: formValues.motivo })
                            });

                            const dataAnular = await resAnular.json();

                            if (dataAnular.success) {
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Pago Anulado',
                                    text: 'La deuda ha sido recalculada con éxito.',
                                    timer: 2000,
                                    showConfirmButton: false
                                });
                                // Refrescar la tabla de atrás y el modal actual
                                cargarDeudas();
                                const estadoNuevo = dataAnular.nuevo_estado;
                                const saldoNuevo = dataAnular.nuevo_saldo;
                                abrirHistorial(idCargaActual, fleteOriginal, saldoNuevo, estadoNuevo);
                            } else {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Error de Autorización',
                                    text: dataAnular.message || 'No se pudo anular el pago.'
                                });
                            }
                        } catch (err) {
                            console.error(err);
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: 'Error de conexión con el servidor.'
                            });
                        }
                    }
                }
            });

        } else {
            contenedorPagos.innerHTML = `<div style="text-align:center; color:red;">${data.message}</div>`;
        }
    } catch (error) {
        console.error("Error historial:", error);
        contenedorPagos.innerHTML = `<div style="text-align:center; color:red;">Error de conexión.</div>`;
    }
}

// Visor de Evidencia en Grande (Lightbox)
function verVoucher(url) {
    Swal.fire({
        html: `<img src="${url}" style="max-width: 100%; max-height: 80vh; object-fit: contain; border-radius: 8px;">`,
        background: '#1e293b',
        showConfirmButton: false,
        showCloseButton: true,
        width: 'auto',
        padding: '1rem',
        backdrop: `rgba(0,0,0,0.9)`,
        customClass: {
            popup: 'swal2-dark-popup'
        }
    });
}

// ----------------------------------------------------
// FUNCIONALIDAD DETALLES DE CARGA
// ----------------------------------------------------
function inicializarModalDetalles() {
    const modal = document.getElementById('modalDetallesCarga');
    const btnCerrar1 = document.getElementById('btnCerrarDetalles');
    const btnCerrar2 = document.getElementById('btnCerrarDetallesFooter');
    
    if(!modal) return;

    const cerrarModal = () => { modal.style.display = 'none'; };
    
    btnCerrar1.replaceWith(btnCerrar1.cloneNode(true));
    btnCerrar2.replaceWith(btnCerrar2.cloneNode(true));
    
    document.getElementById('btnCerrarDetalles').addEventListener('click', cerrarModal);
    document.getElementById('btnCerrarDetallesFooter').addEventListener('click', cerrarModal);
}

async function abrirDetallesCarga(idCarga) {
    const modal = document.getElementById('modalDetallesCarga');
    if (!modal) return;

    document.getElementById('modalDetallesBadge').textContent = 'Carga ' + idCarga;
    
    let contenedor = document.getElementById('detallesCargaLista');
    if (!contenedor) return;

    // Loader
    contenedor.innerHTML = `
        <div style="text-align: center; color: #94a3b8; padding: 40px 0;">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 12px;"></i>
            <p>Cargando detalles...</p>
        </div>
    `;
    modal.style.display = 'flex';

    try {
        const response = await fetch(`/api/deudas/${idCarga}/detalles`, {
            headers: { 'x-user-profile': localStorage.getItem('user_id') || 1 }
        });
        const data = await response.json();
        
        if (data.success) {
            const detalles = data.data;

            if (detalles.length === 0) {
                contenedor.innerHTML = `
                    <div style="text-align: center; color: #94a3b8; padding: 40px 0; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px;">
                        <i class="fas fa-box-open" style="font-size: 32px; margin-bottom: 12px; color: #cbd5e1;"></i>
                        <h3 style="margin: 0; font-size: 16px; color: #475569; margin-bottom: 4px;">Sin detalles</h3>
                        <p style="margin: 0; font-size: 13px;">No se encontraron productos para esta carga.</p>
                    </div>
                `;
                return;
            }

            let htmlDetalles = '<div style="display: grid; gap: 16px;">';
            let sumaCobrar = 0;
            detalles.forEach(d => {
                let badgeEstado = '';
                let estiloSubtotal = '';
                let colorSubtotal = '#0284c7';
                
                if (d.estado_operativo === 'Normal' || d.estado_operativo === 'Entregado') {
                    badgeEstado = `<span style="background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">${d.estado_operativo}</span>`;
                    if (d.estado_operativo === 'Entregado') {
                        sumaCobrar += Number(d.flete_subtotal);
                    }
                } else if (d.estado_operativo === 'Rechazado' || d.estado_operativo === 'Siniestrado') {
                    badgeEstado = `<span style="background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">${d.estado_operativo}</span>`;
                    if (d.estado_operativo === 'Rechazado') {
                        estiloSubtotal = 'text-decoration: line-through; opacity: 0.6;';
                        colorSubtotal = '#94a3b8';
                    }
                } else {
                    badgeEstado = `<span style="background: #fef3c7; color: #d97706; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">${d.estado_operativo}</span>`;
                }

                htmlDetalles += `
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
                            <div>
                                <h4 style="margin: 0; font-size: 15px; color: #1e293b;">${d.producto_nombre}</h4>
                                <span style="font-size: 12px; color: #64748b; font-weight: 600;">Marca: ${d.marca_visual || 'N/A'}</span>
                            </div>
                            <div>
                                ${badgeEstado}
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px;">
                            <div>
                                <span style="display: block; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Cantidad</span>
                                <span style="font-size: 14px; color: #334155; font-weight: 700;">${d.cantidad} sacos</span>
                            </div>
                            <div>
                                <span style="display: block; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Peso Unitario</span>
                                <span style="font-size: 14px; color: #334155; font-weight: 700;">${Number(d.peso_unitario).toFixed(2)} Kg</span>
                            </div>
                            <div>
                                <span style="display: block; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Peso Total</span>
                                <span style="font-size: 14px; color: #334155; font-weight: 700;">${Number(d.peso_total).toFixed(2)} Kg</span>
                            </div>
                            <div>
                                <span style="display: block; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Tarifa</span>
                                <span style="font-size: 14px; color: #334155; font-weight: 700;">S/ ${Number(d.tarifa).toFixed(2)}</span>
                            </div>
                            <div style="background: #f8fafc; padding: 8px; border-radius: 8px;">
                                <span style="display: block; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Subtotal</span>
                                <span style="font-size: 15px; color: ${colorSubtotal}; font-weight: 800; ${estiloSubtotal}">S/ ${Number(d.flete_subtotal).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            htmlDetalles += '</div>';
            contenedor.innerHTML = htmlDetalles;
            
            const spanSumaCobrar = document.getElementById('sumaTotalCobrar');
            if (spanSumaCobrar) {
                spanSumaCobrar.textContent = 'S/ ' + sumaCobrar.toFixed(2);
            }
        } else {
            contenedor.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;">Error: ${data.message}</div>`;
        }
    } catch (error) {
        console.error("Error al obtener detalles:", error);
        contenedor.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;">Error de conexión al obtener detalles.</div>`;
    }
}
