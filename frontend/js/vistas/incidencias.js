window.tiposIncidenciaCache = [];

const API_INC = 'http://localhost:3000/api/incidencias';

window.init_incidencias = function () {
    console.log("Módulo Incidencias inicializado");

    cargarTiposIncidencia();
    cargarTablaIncidencias();
    cargarViajesIncidencia();

    document.getElementById('btnNuevaIncidencia').addEventListener('click', abrirModalIncidencia);
    document.getElementById('btnCerrarModalIncidencia').addEventListener('click', cerrarModalIncidencia);
    document.getElementById('btnCancelarModalIncidencia').addEventListener('click', cerrarModalIncidencia);
    document.getElementById('btnGuardarIncidencia').addEventListener('click', guardarIncidenciasMasivas);

    // Al cambiar de viaje, cargar sus cargas
    document.getElementById('inc-viaje').addEventListener('change', function () {
        if (this.value) cargarCargasDeViaje(this.value);
        else document.getElementById('inc-lista-cargas').innerHTML = '<p style="font-size:13px; color:var(--text-muted); font-style:italic; text-align:center; padding:20px;">Seleccione un viaje para ver sus cargas.</p>';
    });

    // Al cambiar el tipo, sugerir la afectación por defecto
    document.getElementById('inc-tipo').addEventListener('change', function () {
        const tipo = window.tiposIncidenciaCache.find(t => t.id_tipo == this.value);
        if (tipo && tipo.afecta_default) {
            document.getElementById('inc-afecta').value = tipo.afecta_default;
        }
    });

    // Marcar todas
    document.getElementById('inc-check-todos').addEventListener('change', function () {
        document.querySelectorAll('.inc-check-carga').forEach(chk => {
            chk.checked = this.checked;
            toggleFilaCarga(chk);
        });
        actualizarResumenIncidencia();
    });

    // Buscador tabla
    document.getElementById('inputBuscarIncidencia').addEventListener('keyup', function (e) {
        const texto = e.target.value.toLowerCase();
        document.querySelectorAll('#tbody-incidencias tr').forEach(fila => {
            fila.style.display = fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
        });
    });
};

function sesionInc() {
    return JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
}
function headersInc() {
    const s = sesionInc();
    return { 'Content-Type': 'application/json', 'x-user-profile': s.id_perfil, 'x-user-id': s.id_usuario };
}

async function cargarTiposIncidencia() {
    try {
        const res = await fetch(`${API_INC}/tipos`, { headers: headersInc() });
        const result = await res.json();
        if (result.success) {
            window.tiposIncidenciaCache = result.data.filter(t => t.estado === 1);
            const select = document.getElementById('inc-tipo');
            select.innerHTML = '';
            window.tiposIncidenciaCache.forEach(t => {
                select.innerHTML += `<option value="${t.id_tipo}" data-afecta="${t.afecta_default}">${t.nombre}</option>`;
            });
            // Disparar sugerencia inicial
            select.dispatchEvent(new Event('change'));
        }
    } catch (e) { console.error(e); }
}

async function cargarViajesIncidencia() {
    try {
        const res = await fetch(`${API_INC}/viajes`, { headers: headersInc() });
        const result = await res.json();
        if (result.success) {
            const select = document.getElementById('inc-viaje');
            select.innerHTML = '<option value="">Seleccione un viaje...</option>';
            result.data.forEach(v => {
                select.innerHTML += `<option value="${v.id_viaje}">Viaje #${v.id_viaje} · ${v.vehiculo} · ${v.ciudad_origen}→${v.ciudad_destino} (${v.total_cargas} cargas)</option>`;
            });
        }
    } catch (e) { console.error(e); }
}

async function cargarCargasDeViaje(idViaje) {
    const cont = document.getElementById('inc-lista-cargas');
    cont.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;"><i class="fas fa-spinner fa-spin"></i> Cargando cargas...</p>';
    document.getElementById('inc-check-todos').checked = false;

    try {
        const res = await fetch(`${API_INC}/viajes/${idViaje}/cargas`, { headers: headersInc() });
        const result = await res.json();

        if (result.success) {
            if (result.data.length === 0) {
                cont.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">Este viaje no tiene cargas.</p>';
                return;
            }

            cont.innerHTML = result.data.map(c => `
                <div class="inc-fila-carga" data-id="${c.id_carga}" style="display:flex; align-items:center; gap:12px; border:1px solid var(--border-light); border-radius:var(--radius-md); padding:12px; background:#fafafa; transition:all 0.2s;">
                    <input type="checkbox" class="inc-check-carga" value="${c.id_carga}" style="width:18px; height:18px; cursor:pointer;">
                    <div style="flex:1;">
                        <div style="font-size:13px; font-weight:600; color:var(--text-primary);">Carga #${c.id_carga}</div>
                        <small style="color:var(--text-secondary);">${c.remitente} → ${c.destinatario} · ${Number(c.peso_total).toFixed(2)} kg · Flete S/ ${Number(c.flete_total).toFixed(2)}</small>
                    </div>
                    <div style="width:130px;">
                        <input type="number" step="0.01" min="0" class="form-control inc-monto-carga" placeholder="Monto S/" disabled style="margin:0; padding:8px;">
                    </div>
                </div>
            `).join('');

            // Eventos por fila
            document.querySelectorAll('.inc-check-carga').forEach(chk => {
                chk.addEventListener('change', function () {
                    toggleFilaCarga(this);
                    actualizarResumenIncidencia();
                });
            });
            document.querySelectorAll('.inc-monto-carga').forEach(inp => {
                inp.addEventListener('input', actualizarResumenIncidencia);
            });

            actualizarResumenIncidencia();
        }
    } catch (e) {
        console.error(e);
        cont.innerHTML = '<p style="text-align:center; color:#ef4444; padding:20px;">Error al cargar las cargas.</p>';
    }
}

function toggleFilaCarga(chk) {
    const fila = chk.closest('.inc-fila-carga');
    const inputMonto = fila.querySelector('.inc-monto-carga');
    inputMonto.disabled = !chk.checked;
    if (chk.checked) {
        fila.style.borderColor = 'var(--brand-blue)';
        fila.style.background = 'var(--brand-blue-light)';
        inputMonto.focus();
    } else {
        fila.style.borderColor = 'var(--border-light)';
        fila.style.background = '#fafafa';
        inputMonto.value = '';
    }
}

function actualizarResumenIncidencia() {
    const marcadas = document.querySelectorAll('.inc-check-carga:checked');
    let montoTotal = 0;
    marcadas.forEach(chk => {
        const fila = chk.closest('.inc-fila-carga');
        montoTotal += Number(fila.querySelector('.inc-monto-carga').value) || 0;
    });

    const resumen = document.getElementById('inc-resumen');
    if (marcadas.length > 0) {
        resumen.style.display = 'block';
        document.getElementById('inc-resumen-count').textContent = marcadas.length;
        document.getElementById('inc-resumen-monto').textContent = `S/ ${montoTotal.toFixed(2)}`;
    } else {
        resumen.style.display = 'none';
    }
}

function abrirModalIncidencia() {
    document.getElementById('inc-viaje').value = '';
    document.getElementById('inc-descripcion').value = '';
    document.getElementById('inc-fecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('inc-check-todos').checked = false;
    document.getElementById('inc-lista-cargas').innerHTML = '<p style="font-size:13px; color:var(--text-muted); font-style:italic; text-align:center; padding:20px;">Seleccione un viaje para ver sus cargas.</p>';
    document.getElementById('inc-resumen').style.display = 'none';
    document.getElementById('modalIncidencia').style.display = 'flex';
}

function cerrarModalIncidencia() {
    document.getElementById('modalIncidencia').style.display = 'none';
}

async function guardarIncidenciasMasivas() {
    const idViaje = document.getElementById('inc-viaje').value;
    const idTipo = document.getElementById('inc-tipo').value;
    const afecta = document.getElementById('inc-afecta').value;
    const descripcion = document.getElementById('inc-descripcion').value.trim();
    const fecha = document.getElementById('inc-fecha').value;

    if (!idViaje) { Swal.fire({ icon: 'warning', title: 'Atención', text: 'Seleccione un viaje.' }); return; }
    if (!fecha) { Swal.fire({ icon: 'warning', title: 'Atención', text: 'Indique la fecha.' }); return; }

    const marcadas = document.querySelectorAll('.inc-check-carga:checked');
    if (marcadas.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Sin cargas', text: 'Marque al menos una carga afectada.' });
        return;
    }

    // Construir el array de items (id_carga + monto)
    const items = [];
    let errorMonto = false;
    marcadas.forEach(chk => {
        const fila = chk.closest('.inc-fila-carga');
        const monto = Number(fila.querySelector('.inc-monto-carga').value);
        if (isNaN(monto) || monto < 0) errorMonto = true;
        items.push({ id_carga: Number(chk.value), monto_afectado: monto || 0 });
    });

    if (errorMonto) {
        Swal.fire({ icon: 'error', title: 'Montos inválidos', text: 'Revise que los montos sean números válidos.' });
        return;
    }

    const confirm = await Swal.fire({
        title: `¿Registrar ${items.length} incidencia(s)?`,
        text: afecta === 'Transportista'
            ? 'Los montos se descontarán de la liquidación del chofer correspondiente.'
            : 'Se registrarán las incidencias seleccionadas.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#0f4c81',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, registrar',
        cancelButtonText: 'Cancelar'
    });
    if (!confirm.isConfirmed) return;

    try {
        const res = await fetch(`${API_INC}/masiva`, {
            method: 'POST',
            headers: headersInc(),
            body: JSON.stringify({ id_tipo: idTipo, afecta_a: afecta, descripcion, fecha, items })
        });
        const result = await res.json();

        if (res.ok && result.success) {
            Swal.fire({ icon: 'success', title: 'Registrado', text: result.message, timer: 1800, showConfirmButton: false });
            cerrarModalIncidencia();
            cargarTablaIncidencias();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message });
        }
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
}

async function cargarTablaIncidencias() {
    const tbody = document.getElementById('tbody-incidencias');
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:32px; color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';

    try {
        const res = await fetch(API_INC, { headers: headersInc() });
        const result = await res.json();

        if (res.ok && result.success) {
            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:32px; color:var(--text-muted);">No hay incidencias registradas</td></tr>';
                return;
            }

            let html = '';
            result.data.forEach(i => {
                let badgeAfecta;
                if (i.afecta_a === 'Transportista') badgeAfecta = '<span class="badge-inactivo">Transportista</span>';
                else if (i.afecta_a === 'Cliente') badgeAfecta = '<span class="badge-tipo-ruc">Cliente</span>';
                else badgeAfecta = '<span class="badge-tipo-dni">Empresa</span>';

                html += `
                    <tr class="tabla-tr">
                        <td class="tabla-td tabla-id">${i.id_incidencia}</td>
                        <td class="tabla-td tabla-id">#${i.id_carga}</td>
                        <td class="tabla-td tabla-id">#${i.id_viaje}</td>
                        <td class="tabla-td tabla-nombre">${i.tipo}</td>
                        <td class="tabla-td tabla-secundario">${i.descripcion || '<span style="color:#cbd5e1; font-style:italic;">Sin descripción</span>'}</td>
                        <td class="tabla-td">${badgeAfecta}</td>
                        <td class="tabla-td" style="text-align:right; font-weight:700; color:#dc2626;">S/ ${Number(i.monto_afectado).toFixed(2)}</td>
                        <td class="tabla-td tabla-secundario">${i.fecha}</td>
                        <td class="tabla-td">
                            <button class="btn-action btn-delete" onclick="anularIncidencia(${i.id_incidencia})" title="Anular">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        } else {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:32px; color:#ef4444;">Error: ${result.message}</td></tr>`;
        }
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:32px; color:#ef4444;">Error de conexión</td></tr>';
    }
}

window.anularIncidencia = async function (id) {
    const confirm = await Swal.fire({
        title: '¿Anular incidencia?',
        text: 'Si afectaba al transportista, recuerde regenerar la liquidación si ya existía.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, anular',
        cancelButtonText: 'Cancelar'
    });
    if (!confirm.isConfirmed) return;

    try {
        const res = await fetch(`${API_INC}/${id}/anular`, { method: 'PATCH', headers: headersInc() });
        const result = await res.json();
        if (res.ok && result.success) {
            Swal.fire({ icon: 'success', title: 'Anulada', text: result.message, timer: 1500, showConfirmButton: false });
            cargarTablaIncidencias();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message });
        }
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
};
