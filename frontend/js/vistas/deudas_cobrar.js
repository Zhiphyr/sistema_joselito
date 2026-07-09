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

async function cargarCuentasBancarias() {
    try {
        const response = await fetch('/api/deudas/cuentas-bancarias', {
            headers: {
                'x-user-profile': localStorage.getItem('user_id') || 1
            }
        });
        const data = await response.json();
        if (data.success) {
            cuentasBancariasCache = data.data;
        }
    } catch (error) {
        console.error("Error al cargar cuentas bancarias:", error);
    }
}

function inicializarModalCobro() {
    const modal = document.getElementById('modalCobro');
    const btnCerrar = document.getElementById('btnCerrarModalCobro');
    const btnCancelar = document.getElementById('btnCancelarCobro');
    const selectCanal = document.getElementById('cobro_canal');
    const zonaBancaria = document.getElementById('zona_bancaria');
    const selectCuenta = document.getElementById('cobro_cuenta');

    if (!modal) return;

    // Cerrar modal
    const cerrarModal = () => {
        modal.style.display = 'none';
        document.getElementById('formCobro').reset();
        zonaBancaria.style.display = 'none';
    };

    btnCerrar.addEventListener('click', cerrarModal);
    btnCancelar.addEventListener('click', cerrarModal);

    // Cambiar Canal de Pago
    selectCanal.addEventListener('change', (e) => {
        const canal = e.target.value;
        if (canal === 'Efectivo') {
            zonaBancaria.style.display = 'none';
            selectCuenta.required = false;
            document.getElementById('cobro_operacion').required = false;
        } else {
            zonaBancaria.style.display = 'block';
            selectCuenta.required = true;
            document.getElementById('cobro_operacion').required = true;
            filtrarCuentas(canal);
        }
        // Reset QR al cambiar de canal
        document.getElementById('zona_qr').style.display = 'none';
        document.getElementById('zona_qr').innerHTML = '';
    });

    // Cambiar Cuenta Bancaria (Para el QR)
    selectCuenta.addEventListener('change', (e) => {
        const idCuenta = Number(e.target.value);
        const zonaQR = document.getElementById('zona_qr');
        zonaQR.innerHTML = ''; // Limpiar anterior
        zonaQR.style.display = 'none';

        if (!idCuenta) return;

        const cuentaObj = cuentasBancariasCache.find(c => c.id_cuenta === idCuenta);
        const canal = selectCanal.value;

        if (cuentaObj && cuentaObj.ruta_qr && canal === 'Billetera Digital') {
            zonaQR.innerHTML = `
                <div style="margin-top: 10px; margin-bottom: 10px;">
                    <img src="${cuentaObj.ruta_qr}" alt="Código QR ${cuentaObj.entidad_financiera}" 
                         style="max-width: 240px; height: auto; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: 2px solid #e2e8f0;">
                    <p style="margin-top: 8px; font-size: 11px; color: #64748b; font-weight: 600;">Escanea el código para pagar</p>
                </div>
            `;
            zonaQR.style.display = 'block';
        }
    });

    // Subir evidencia UI
    const btnEvidencia = document.getElementById('btnEvidenciaUpload') || document.querySelector('button[onclick="document.getElementById(\'cobro_evidencia\').click()"]');
    const inputEvidencia = document.getElementById('cobro_evidencia');
    
    // Si el botón no tiene ID ni onclick, lo arreglamos seleccionándolo estructuralmente
    const btnEvidenciaFallback = inputEvidencia.previousElementSibling;
    btnEvidenciaFallback.addEventListener('click', () => {
        inputEvidencia.click();
    });

    inputEvidencia.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            btnEvidenciaFallback.innerHTML = `<i class="fas fa-check-circle"></i> ${file.name}`;
            btnEvidenciaFallback.style.borderColor = '#10b981';
            btnEvidenciaFallback.style.color = '#10b981';
            btnEvidenciaFallback.style.background = '#ecfdf5';
        }
    });

    // Validación estricta del Monto Recibido
    const inputMonto = document.getElementById('cobro_monto');
    if (inputMonto) {
        inputMonto.addEventListener('input', (e) => {
            let val = Number(e.target.value);
            let maxVal = Number(e.target.max);
            
            if (val < 0) {
                e.target.value = 0;
            } else if (val > maxVal) {
                e.target.value = maxVal;
            }
        });

        inputMonto.addEventListener('blur', (e) => {
            let val = Number(e.target.value);
            if (!isNaN(val)) {
                e.target.value = val.toFixed(2);
            } else {
                e.target.value = '0.00';
            }
        });
    }

    // Guardar Cobro
    document.getElementById('formCobro').addEventListener('submit', async (e) => {
        e.preventDefault();

        const montoStr = document.getElementById('cobro_monto').value;
        const montoNum = Number(montoStr);

        if (montoNum <= 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Monto Inválido',
                text: 'El monto a cobrar debe ser mayor a S/ 0.00'
            });
            return;
        }

        const canalPago = document.getElementById('cobro_canal').value;
        const cuentaSelect = document.getElementById('cobro_cuenta');
        const operacionInput = document.getElementById('cobro_operacion');

        if (canalPago !== 'Efectivo') {
            if (!cuentaSelect.value || !operacionInput.value.trim()) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Datos Incompletos',
                    text: 'Debe seleccionar la Cuenta de Destino e ingresar el Nro. de Operación.'
                });
                return;
            }
        }

        const btnGuardar = modal.querySelector('.btn-guardar');
        const originalText = btnGuardar.innerHTML;
        btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        btnGuardar.disabled = true;

        const formData = new FormData();
        formData.append('id_carga', document.getElementById('cobro_id_carga').value);
        formData.append('monto_pagado', document.getElementById('cobro_monto').value);
        formData.append('fecha_pago', document.getElementById('cobro_fecha').value);
        formData.append('canal_pago', document.getElementById('cobro_canal').value);
        
        if (selectCanal.value !== 'Efectivo') {
            formData.append('id_cuenta', document.getElementById('cobro_cuenta').value);
            formData.append('nro_operacion', document.getElementById('cobro_operacion').value);
            if (inputEvidencia.files.length > 0) {
                formData.append('evidencia', inputEvidencia.files[0]);
            }
        }
        
        formData.append('observacion', document.getElementById('cobro_observacion').value);

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
                // Éxito
                cerrarModal();
                cargarDeudas(); // Refrescar la tabla
                Swal.fire({
                    icon: 'success',
                    title: 'Pago Registrado',
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
    const inputMonto = document.getElementById('cobro_monto');
    inputMonto.value = saldoFinal;
    inputMonto.max = saldoFinal; // Guardar el máximo permitido para la validación
    
    // Pre-llenar Fecha/Hora actual
    const now = new Date();
    // Ajuste de zona horaria local para datetime-local
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - tzOffset)).toISOString().slice(0, 16);
    document.getElementById('cobro_fecha').value = localISOTime;

    // Reset zona bancaria y QR
    document.getElementById('cobro_canal').value = 'Efectivo';
    document.getElementById('zona_bancaria').style.display = 'none';
    document.getElementById('cobro_cuenta').required = false;
    document.getElementById('cobro_operacion').required = false;
    document.getElementById('zona_qr').style.display = 'none';
    document.getElementById('zona_qr').innerHTML = '';
    
    // Reset file input UI
    const inputEvidencia = document.getElementById('cobro_evidencia');
    inputEvidencia.value = '';
    const btnEvidenciaFallback = inputEvidencia.previousElementSibling;
    btnEvidenciaFallback.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Subir foto del voucher';
    btnEvidenciaFallback.style.borderColor = '#cbd5e1';
    btnEvidenciaFallback.style.color = '#64748b';
    btnEvidenciaFallback.style.background = 'white';

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
                if (!isAnulado) {
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

                    const { value: pin } = await Swal.fire({
                        title: 'Autorización Requerida',
                        text: 'Ingrese su PIN numérico para anular este pago',
                        input: 'password',
                        inputAttributes: {
                            autocapitalize: 'off',
                            pattern: '[0-9]*',
                            inputmode: 'numeric'
                        },
                        showCancelButton: true,
                        confirmButtonText: 'Anular Pago',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#ef4444',
                        inputValidator: (value) => {
                            if (!value || isNaN(value) || Number(value) <= 0) {
                                return 'Debe ingresar un PIN numérico válido';
                            }
                        }
                    });

                    if (pin) {
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

                            const resAnular = await fetch('/api/deudas/anular-pago', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'x-user-profile': localStorage.getItem('user_id') || 1
                                },
                                body: JSON.stringify({ id_pago: idPago, pin: pin })
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
