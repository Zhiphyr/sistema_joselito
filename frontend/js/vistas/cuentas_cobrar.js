// Caché y medios de pago
window.cobrosCache = [];
window.mediosPagoCache = [];

const API_COBROS = 'http://localhost:3000/api/cobros';

window.init_cuentas_cobrar = function () {
    console.log("Módulo Cuentas por Cobrar inicializado");

    cargarMediosPagoCobro();
    cargarTablaCobros();

    document.getElementById('btnCerrarModalCobro').addEventListener('click', cerrarModalCobro);
    document.getElementById('btnCancelarModalCobro').addEventListener('click', cerrarModalCobro);
    document.getElementById('formCobro').addEventListener('submit', guardarCobro);

    document.getElementById('inputBuscarCobro').addEventListener('keyup', function (e) {
        const texto = e.target.value.toLowerCase();
        document.querySelectorAll('#tbody-cobros tr').forEach(fila => {
            fila.style.display = fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
        });
    });
};

function getSession() {
    return JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
}

function headersAuth() {
    const s = getSession();
    return {
        'Content-Type': 'application/json',
        'x-user-profile': s.id_perfil,
        'x-user-id': s.id_usuario
    };
}

async function cargarMediosPagoCobro() {
    try {
        const res = await fetch(`${API_COBROS}/medios-pago`, { headers: headersAuth() });
        const result = await res.json();
        if (result.success) {
            window.mediosPagoCache = result.data;
            const select = document.getElementById('cobro-medio');
            select.innerHTML = '';
            result.data.forEach(m => {
                select.innerHTML += `<option value="${m.id_medio_pago}">${m.nombre}</option>`;
            });
        }
    } catch (e) {
        console.error('Error medios de pago:', e);
    }
}

async function cargarTablaCobros() {
    const tbody = document.getElementById('tbody-cobros');
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:32px; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';

    try {
        const res = await fetch(API_COBROS, { headers: headersAuth() });
        const result = await res.json();

        if (res.ok && result.success) {
            window.cobrosCache = result.data;

            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:32px; color: var(--text-muted);">No hay cuentas pendientes de cobro</td></tr>';
                actualizarResumenCobros([]);
                return;
            }

            let html = '';
            result.data.forEach(c => {
                const saldo = Number(c.saldo);
                const cobrado = Number(c.cobrado);
                const badge = c.estado_cobro === 'Parcial'
                    ? '<span class="badge-tipo-ruc">Parcial</span>'
                    : '<span class="badge-inactivo">Pendiente</span>';

                html += `
                    <tr class="tabla-tr">
                        <td class="tabla-td tabla-id">#${c.id_carga}</td>
                        <td class="tabla-td tabla-id">#${c.id_viaje}</td>
                        <td class="tabla-td">
                            <div class="tabla-nombre">${c.cliente}</div>
                            <small class="tabla-secundario">${c.telefono || ''}</small>
                        </td>
                        <td class="tabla-td tabla-secundario">${c.ciudad_origen} → ${c.ciudad_destino}</td>
                        <td class="tabla-td" style="text-align:right;">S/ ${Number(c.flete_total).toFixed(2)}</td>
                        <td class="tabla-td" style="text-align:right; color:#16a34a;">S/ ${cobrado.toFixed(2)}</td>
                        <td class="tabla-td" style="text-align:right; font-weight:700; color:#dc2626;">S/ ${saldo.toFixed(2)}</td>
                        <td class="tabla-td">${badge}</td>
                        <td class="tabla-td">
                            <button class="btn-action btn-edit" onclick="abrirModalCobro(${c.id_carga})" title="Registrar cobro">
                                <i class="fas fa-hand-holding-usd"></i> Cobrar
                            </button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
            actualizarResumenCobros(result.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:32px; color:#ef4444;">Error: ${result.message}</td></tr>`;
        }
    } catch (e) {
        console.error('Error al cargar cobros:', e);
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:32px; color:#ef4444;">Error de conexión con el servidor</td></tr>';
    }
}

function actualizarResumenCobros(data) {
    const totalSaldo = data.reduce((s, c) => s + Number(c.saldo), 0);
    const totalCobrado = data.reduce((s, c) => s + Number(c.cobrado), 0);
    document.getElementById('cxc-total-saldo').textContent = totalSaldo.toFixed(2);
    document.getElementById('cxc-total-cargas').textContent = data.length;
    document.getElementById('cxc-total-cobrado').textContent = totalCobrado.toFixed(2);
}

window.abrirModalCobro = async function (idCarga) {
    const carga = window.cobrosCache.find(c => c.id_carga === idCarga);
    if (!carga) return;

    document.getElementById('formCobro').reset();
    document.getElementById('cobro-id-carga').value = carga.id_carga;
    document.getElementById('cobro-cliente').textContent = carga.cliente;
    document.getElementById('cobro-flete').textContent = `S/ ${Number(carga.flete_total).toFixed(2)}`;
    document.getElementById('cobro-saldo').textContent = `S/ ${Number(carga.saldo).toFixed(2)}`;
    document.getElementById('cobro-monto').max = Number(carga.saldo).toFixed(2);
    document.getElementById('cobro-monto').value = Number(carga.saldo).toFixed(2);

    // Fecha de hoy por defecto
    document.getElementById('cobro-fecha').value = new Date().toISOString().split('T')[0];

    document.getElementById('modalCobro').style.display = 'flex';

    cargarHistorialCobros(carga.id_carga);
};

async function cargarHistorialCobros(idCarga) {
    const cont = document.getElementById('cobro-historial');
    cont.innerHTML = '<small style="color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Cargando...</small>';
    try {
        const res = await fetch(`${API_COBROS}/${idCarga}/historial`, { headers: headersAuth() });
        const result = await res.json();
        if (result.success) {
            const cobros = result.data.cobros;
            if (cobros.length === 0) {
                cont.innerHTML = '<small style="color: var(--text-muted); font-style: italic;">Sin abonos registrados.</small>';
                return;
            }
            cont.innerHTML = cobros.map(co => `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; border:1px solid var(--border-light); border-radius:6px; padding:8px 12px;">
                    <div>
                        <strong style="font-size:13px; color:#16a34a;">S/ ${Number(co.monto).toFixed(2)}</strong>
                        <small style="color: var(--text-muted); margin-left:8px;">${co.medio_pago} · ${co.fecha_cobro}</small>
                    </div>
                    <button class="btn-action btn-delete" onclick="anularCobro(${co.id_cobro}, ${idCarga})" title="Anular">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');
        }
    } catch (e) {
        cont.innerHTML = '<small style="color:#ef4444;">Error al cargar historial.</small>';
    }
}

function cerrarModalCobro() {
    document.getElementById('modalCobro').style.display = 'none';
}

async function guardarCobro(e) {
    e.preventDefault();

    const datos = {
        id_carga: document.getElementById('cobro-id-carga').value,
        monto: document.getElementById('cobro-monto').value,
        id_medio_pago: document.getElementById('cobro-medio').value,
        fecha_cobro: document.getElementById('cobro-fecha').value,
        referencia: document.getElementById('cobro-referencia').value.trim(),
        observacion: document.getElementById('cobro-observacion').value.trim()
    };

    try {
        const res = await fetch(API_COBROS, {
            method: 'POST',
            headers: headersAuth(),
            body: JSON.stringify(datos)
        });
        const result = await res.json();

        if (res.ok && result.success) {
            Swal.fire({ icon: 'success', title: 'Cobro registrado', text: result.message, timer: 1500, showConfirmButton: false });
            cerrarModalCobro();
            cargarTablaCobros();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message });
        }
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
}

window.anularCobro = async function (idCobro, idCarga) {
    const confirm = await Swal.fire({
        title: '¿Anular este cobro?',
        text: 'El saldo de la carga se recalculará automáticamente.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, anular',
        cancelButtonText: 'Cancelar'
    });
    if (!confirm.isConfirmed) return;

    try {
        const res = await fetch(`${API_COBROS}/${idCobro}/anular`, {
            method: 'PATCH',
            headers: headersAuth(),
            body: JSON.stringify({ id_carga: idCarga })
        });
        const result = await res.json();
        if (res.ok && result.success) {
            Swal.fire({ icon: 'success', title: 'Anulado', text: result.message, timer: 1500, showConfirmButton: false });
            cargarHistorialCobros(idCarga);
            cargarTablaCobros();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message });
        }
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
};
