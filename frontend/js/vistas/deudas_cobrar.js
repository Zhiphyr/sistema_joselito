let debounceTimerDeudas;

function init_deudas_cobrar() {
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
}

async function cargarDeudas() {
    const inputBuscar = document.getElementById('inputBuscarDeuda');
    const selectFiltro = document.getElementById('selectFiltroDeuda');
    const tbody = document.getElementById('tbody-deudas');
    
    if (!tbody) return;

    const search = inputBuscar ? inputBuscar.value.trim() : '';
    const filtroEstado = selectFiltro ? selectFiltro.value : 'activas';

    tbody.innerHTML = `
        <tr>
            <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 12px;"></i>
                <p style="margin:0;">Cargando deudas...</p>
            </td>
        </tr>
    `;

    try {
        const response = await fetch(`/api/deudas?search=${encodeURIComponent(search)}&filtroEstado=${encodeURIComponent(filtroEstado)}`, {
            headers: {
                'x-user-profile': localStorage.getItem('user_id') || 1
            }
        });

        const data = await response.json();

        if (data.success) {
            renderTablaDeudas(data.data);
        } else {
            throw new Error(data.message || 'Error al obtener las deudas.');
        }
    } catch (error) {
        console.error('Error cargarDeudas:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 24px; margin-bottom: 12px;"></i>
                    <p style="margin:0;">Error: ${error.message}</p>
                </td>
            </tr>
        `;
    }
}

function renderTablaDeudas(deudas) {
    const tbody = document.getElementById('tbody-deudas');
    if (!tbody) return;

    if (!deudas || deudas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fas fa-search" style="font-size: 24px; margin-bottom: 12px; color: #cbd5e1;"></i>
                    <p style="margin:0;">No se encontraron deudas para los filtros aplicados.</p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';

    deudas.forEach(d => {
        // Formatear fechas
        const fLlegada = d.fecha_llegada ? new Date(d.fecha_llegada).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
        
        // Deudor format
        const deudor = d.cliente_nombre || 'Desconocido';
        
        // Saldo pendiente (por ahora igual al flete total)
        const fleteTotal = Number(d.flete_total) || 0;
        const saldoPendiente = fleteTotal; 

        // Badge de Estado Cobro
        let badgeCobro = '';
        if (d.estado_cobro === 'Pendiente') {
            badgeCobro = `<span style="display:inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #fee2e2; color: #dc2626;">PENDIENTE</span>`;
        } else if (d.estado_cobro === 'Parcial') {
            badgeCobro = `<span style="display:inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #fef3c7; color: #d97706;">PARCIAL</span>`;
        } else if (d.estado_cobro === 'Completado') {
            badgeCobro = `<span style="display:inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #dcfce7; color: #16a34a;">COMPLETADO</span>`;
        } else {
            badgeCobro = `<span style="display:inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #f1f5f9; color: #64748b;">${d.estado_cobro}</span>`;
        }

        html += `
            <tr class="tabla-tr" style="transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='white'">
                <td class="tabla-td" style="font-weight: 600; color: var(--text-primary); font-size: 12px;">Carga #${d.id_carga}</td>
                <td class="tabla-td" style="font-size: 12px;">Viaje #${d.id_viaje}</td>
                <td class="tabla-td" style="font-size: 12px;">${fLlegada}</td>
                <td class="tabla-td" style="font-size: 11px; font-weight: 500; color: var(--text-secondary); max-width: 250px; white-space: normal; line-height: 1.4;">${deudor}</td>
                <td class="tabla-td" style="font-size: 12px;">${d.estado_entrega || '-'}</td>
                <td class="tabla-td" style="font-weight: 600; color: var(--text-primary); font-size: 12px;">S/ ${fleteTotal.toFixed(2)}</td>
                <td class="tabla-td" style="font-weight: 700; color: ${saldoPendiente > 0 ? '#dc2626' : '#16a34a'}; font-size: 12px;">S/ ${saldoPendiente.toFixed(2)}</td>
                <td class="tabla-td">${badgeCobro}</td>
                <td class="tabla-td">
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-cobrar" data-id="${d.id_carga}" title="Registrar Cobro" style="background: #16a34a; color: white; border: none; width: 32px; height: 32px; border-radius: 6px; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                            <i class="fas fa-hand-holding-usd"></i>
                        </button>
                        <button class="btn-ver-pagos" data-id="${d.id_carga}" title="Historial de Pagos" style="background: #eab308; color: white; border: none; width: 32px; height: 32px; border-radius: 6px; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                            <i class="fas fa-file-invoice-dollar"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}
