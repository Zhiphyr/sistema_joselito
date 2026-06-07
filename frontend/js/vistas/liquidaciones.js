window.liquidacionesCache = [];

const API_LIQ = 'http://localhost:3000/api/liquidaciones';

window.init_liquidaciones = function () {
    console.log("Módulo Liquidaciones inicializado");

    cargarMediosPagoLiq();
    cargarTablaLiquidaciones();

    // Pestañas internas
    document.querySelectorAll('.liq-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.liq-tab').forEach(t => {
                t.classList.remove('activa');
                t.style.borderBottom = '2px solid transparent';
                t.style.color = 'var(--text-secondary)';
                t.style.fontWeight = '500';
            });
            this.classList.add('activa');
            this.style.borderBottom = '2px solid var(--brand-blue)';
            this.style.color = 'var(--brand-blue)';
            this.style.fontWeight = '600';

            const tab = this.dataset.tab;
            document.getElementById('liq-panel-pendientes').style.display = tab === 'pendientes' ? 'block' : 'none';
            document.getElementById('liq-panel-generar').style.display = tab === 'generar' ? 'block' : 'none';

            if (tab === 'generar') cargarViajesLiquidables();
        });
    });

    document.getElementById('btnCerrarModalPago').addEventListener('click', cerrarModalPago);
    document.getElementById('btnCancelarModalPago').addEventListener('click', cerrarModalPago);
    document.getElementById('formPago').addEventListener('submit', guardarPago);

    document.getElementById('inputBuscarLiq').addEventListener('keyup', function (e) {
        const texto = e.target.value.toLowerCase();
        document.querySelectorAll('#tbody-liquidaciones tr').forEach(fila => {
            fila.style.display = fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
        });
    });
};

function sesionLiq() {
    return JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
}
function headersLiq() {
    const s = sesionLiq();
    return { 'Content-Type': 'application/json', 'x-user-profile': s.id_perfil, 'x-user-id': s.id_usuario };
}

async function cargarMediosPagoLiq() {
    try {
        const res = await fetch('http://localhost:3000/api/cobros/medios-pago', { headers: headersLiq() });
        const result = await res.json();
        if (result.success) {
            const select = document.getElementById('pago-medio');
            select.innerHTML = '';
            result.data.forEach(m => {
                select.innerHTML += `<option value="${m.id_medio_pago}">${m.nombre}</option>`;
            });
        }
    } catch (e) { console.error(e); }
}

async function cargarTablaLiquidaciones() {
    const tbody = document.getElementById('tbody-liquidaciones');
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:32px; color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';

    try {
        const res = await fetch(API_LIQ, { headers: headersLiq() });
        const result = await res.json();

        if (res.ok && result.success) {
            window.liquidacionesCache = result.data;

            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:32px; color:var(--text-muted);">No hay liquidaciones generadas</td></tr>';
                document.getElementById('liq-total-saldo').textContent = '0.00';
                document.getElementById('liq-total-abiertas').textContent = '0';
                return;
            }

            let html = '';
            let totalSaldo = 0, abiertas = 0;

            result.data.forEach(l => {
                const saldo = Number(l.saldo);
                if (l.estado_pago !== 'Pagado') { totalSaldo += saldo; abiertas++; }

                let badge;
                if (l.estado_pago === 'Pagado') badge = '<span class="badge-activo">Pagado</span>';
                else if (l.estado_pago === 'Parcial') badge = '<span class="badge-tipo-ruc">Parcial</span>';
                else badge = '<span class="badge-inactivo">Pendiente</span>';

                const btnPagar = l.estado_pago === 'Pagado'
                    ? `<button class="btn-action" onclick="abrirModalPago(${l.id_liquidacion})" title="Ver pagos"><i class="fas fa-eye"></i></button>`
                    : `<button class="btn-action btn-edit" onclick="abrirModalPago(${l.id_liquidacion})" title="Registrar pago"><i class="fas fa-money-check-alt"></i> Pagar</button>`;

                html += `
                    <tr class="tabla-tr">
                        <td class="tabla-td tabla-id">#${l.id_liquidacion}</td>
                        <td class="tabla-td tabla-id">#${l.id_viaje}</td>
                        <td class="tabla-td">
                            <div class="tabla-nombre">${l.chofer}</div>
                            <small class="tabla-secundario">${l.vehiculo} · ${l.ciudad_origen}→${l.ciudad_destino}</small>
                        </td>
                        <td class="tabla-td" style="text-align:right;">${Number(l.peso_total_kg).toFixed(2)}</td>
                        <td class="tabla-td" style="text-align:right;">S/ ${Number(l.monto_calculado).toFixed(2)}</td>
                        <td class="tabla-td" style="text-align:right; color:#dc2626;">- S/ ${Number(l.descuento_incidencia).toFixed(2)}</td>
                        <td class="tabla-td" style="text-align:right; font-weight:700;">S/ ${Number(l.monto_total).toFixed(2)}</td>
                        <td class="tabla-td" style="text-align:right; font-weight:700; color:#ea580c;">S/ ${saldo.toFixed(2)}</td>
                        <td class="tabla-td">${badge}</td>
                        <td class="tabla-td">${btnPagar}</td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
            document.getElementById('liq-total-saldo').textContent = totalSaldo.toFixed(2);
            document.getElementById('liq-total-abiertas').textContent = abiertas;
        } else {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:32px; color:#ef4444;">Error: ${result.message}</td></tr>`;
        }
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:32px; color:#ef4444;">Error de conexión</td></tr>';
    }
}

async function cargarViajesLiquidables() {
    const tbody = document.getElementById('tbody-liquidables');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:32px; color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';

    try {
        const res = await fetch(`${API_LIQ}/liquidables`, { headers: headersLiq() });
        const result = await res.json();

        if (res.ok && result.success) {
            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:32px; color:var(--text-muted);">No hay viajes pendientes de liquidar</td></tr>';
                return;
            }

            let html = '';
            result.data.forEach(v => {
                const peso = Number(v.peso_total_kg);
                const tarifa = Number(v.tarifa_transportista);
                const desc = Number(v.descuento_incidencia);
                const aPagar = (peso * tarifa) - desc;

                html += `
                    <tr class="tabla-tr">
                        <td class="tabla-td tabla-id">#${v.id_viaje}</td>
                        <td class="tabla-td">
                            <div class="tabla-nombre">${v.chofer}</div>
                            <small class="tabla-secundario">${v.vehiculo}</small>
                        </td>
                        <td class="tabla-td tabla-secundario">${v.ciudad_origen} → ${v.ciudad_destino}</td>
                        <td class="tabla-td" style="text-align:right;">${peso.toFixed(2)}</td>
                        <td class="tabla-td" style="text-align:right;">S/ ${tarifa.toFixed(2)}</td>
                        <td class="tabla-td" style="text-align:right; color:#dc2626;">- S/ ${desc.toFixed(2)}</td>
                        <td class="tabla-td" style="text-align:right; font-weight:700; color:#16a34a;">S/ ${aPagar.toFixed(2)}</td>
                        <td class="tabla-td">
                            <button class="btn-action btn-edit" onclick="generarLiquidacion(${v.id_viaje})" title="Generar">
                                <i class="fas fa-file-invoice-dollar"></i> Generar
                            </button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        } else {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:32px; color:#ef4444;">Error: ${result.message}</td></tr>`;
        }
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:32px; color:#ef4444;">Error de conexión</td></tr>';
    }
}

window.generarLiquidacion = async function (idViaje) {
    const confirm = await Swal.fire({
        title: '¿Generar liquidación?',
        text: 'Se calculará el monto a pagar al chofer (peso × tarifa − descuentos por incidencias).',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0f4c81',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, generar',
        cancelButtonText: 'Cancelar'
    });
    if (!confirm.isConfirmed) return;

    try {
        const res = await fetch(`${API_LIQ}/generar`, {
            method: 'POST',
            headers: headersLiq(),
            body: JSON.stringify({ id_viaje: idViaje })
        });
        const result = await res.json();
        if (res.ok && result.success) {
            Swal.fire({ icon: 'success', title: 'Liquidación generada', text: result.message, timer: 1500, showConfirmButton: false });
            cargarViajesLiquidables();
            cargarTablaLiquidaciones();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message });
        }
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
};

window.abrirModalPago = async function (idLiq) {
    const liq = window.liquidacionesCache.find(l => l.id_liquidacion === idLiq);
    if (!liq) return;

    document.getElementById('formPago').reset();
    document.getElementById('pago-id-liquidacion').value = liq.id_liquidacion;
    document.getElementById('pago-chofer').textContent = liq.chofer;
    document.getElementById('pago-total').textContent = `S/ ${Number(liq.monto_total).toFixed(2)}`;
    document.getElementById('pago-saldo').textContent = `S/ ${Number(liq.saldo).toFixed(2)}`;
    document.getElementById('pago-monto').max = Number(liq.saldo).toFixed(2);
    document.getElementById('pago-monto').value = Number(liq.saldo).toFixed(2);
    document.getElementById('pago-fecha').value = new Date().toISOString().split('T')[0];

    document.getElementById('modalPago').style.display = 'flex';
    cargarHistorialPagos(liq.id_liquidacion);
};

async function cargarHistorialPagos(idLiq) {
    const cont = document.getElementById('pago-historial');
    cont.innerHTML = '<small style="color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Cargando...</small>';
    try {
        const res = await fetch(`${API_LIQ}/${idLiq}/pagos`, { headers: headersLiq() });
        const result = await res.json();
        if (result.success) {
            const pagos = result.data.pagos;
            if (pagos.length === 0) {
                cont.innerHTML = '<small style="color:var(--text-muted); font-style:italic;">Sin pagos registrados.</small>';
                return;
            }
            cont.innerHTML = pagos.map(p => `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; border:1px solid var(--border-light); border-radius:6px; padding:8px 12px;">
                    <div>
                        <strong style="font-size:13px; color:#ea580c;">S/ ${Number(p.monto).toFixed(2)}</strong>
                        ${p.es_adelanto ? '<span class="badge-tipo-dni" style="margin-left:6px;">Adelanto</span>' : ''}
                        <small style="color:var(--text-muted); margin-left:8px;">${p.medio_pago} · ${p.fecha_pago}</small>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) {
        cont.innerHTML = '<small style="color:#ef4444;">Error al cargar historial.</small>';
    }
}

function cerrarModalPago() {
    document.getElementById('modalPago').style.display = 'none';
}

async function guardarPago(e) {
    e.preventDefault();

    const datos = {
        id_liquidacion: document.getElementById('pago-id-liquidacion').value,
        monto: document.getElementById('pago-monto').value,
        id_medio_pago: document.getElementById('pago-medio').value,
        fecha_pago: document.getElementById('pago-fecha').value,
        es_adelanto: document.getElementById('pago-adelanto').checked,
        referencia: document.getElementById('pago-referencia').value.trim(),
        observacion: document.getElementById('pago-observacion').value.trim()
    };

    try {
        const res = await fetch(`${API_LIQ}/pagos`, {
            method: 'POST',
            headers: headersLiq(),
            body: JSON.stringify(datos)
        });
        const result = await res.json();
        if (res.ok && result.success) {
            Swal.fire({ icon: 'success', title: 'Pago registrado', text: result.message, timer: 1500, showConfirmButton: false });
            cerrarModalPago();
            cargarTablaLiquidaciones();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message });
        }
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
}
