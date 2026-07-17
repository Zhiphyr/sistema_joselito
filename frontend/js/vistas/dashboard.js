let chartVolumen, chartCargas, chartRutas, chartIncidencias;

function init_dashboard() {
    cargarDatosDashboard();
}

function cargarChartJsSiFalta(callback) {
    if (window.Chart) {
        callback();
        return;
    }
    if (document.querySelector('script[src*="chart.js"]')) {
        document.querySelector('script[src*="chart.js"]').addEventListener('load', callback);
        return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = callback;
    document.head.appendChild(script);
}

async function cargarDatosDashboard() {
    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch('http://localhost:3000/api/dashboard-general/resumen', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();

        if (result.success) {
            renderKPIs(result.data.kpis);
            renderListas(result.data.listas);
            cargarChartJsSiFalta(() => renderGraficos(result.data.graficos));
        } else {
            Swal.fire('Error', 'No se pudieron cargar los datos del dashboard', 'error');
        }
    } catch (error) {
        console.error('Error cargando dashboard:', error);
    }
}

function renderKPIs(kpis) {
    document.getElementById('kpi-viajes-curso').textContent = kpis.viajesEnCurso || 0;
    document.getElementById('kpi-viajes-fin').textContent = kpis.viajesFinalizados || 0;
    document.getElementById('kpi-cargas-transito').textContent = kpis.cargasTransito || 0;
    document.getElementById('kpi-flota').textContent = `${kpis.flotaActiva || 0} / ${kpis.flotaTotal || 0}`;
    document.getElementById('kpi-deuda').textContent = formatMonedaLocal(kpis.deudaTotal || 0);
}

function renderListas(listas) {
    // 1. Cargas Críticas
    const contCriticas = document.getElementById('lista-cargas-criticas');
    document.getElementById('badge-criticas').textContent = listas.cargasCriticas.length;
    
    if (listas.cargasCriticas.length === 0) {
        contCriticas.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;">No hay cargas siniestradas o rechazadas.</div>`;
    } else {
        contCriticas.innerHTML = listas.cargasCriticas.map(c => `
            <div style="padding: 12px 16px; border-bottom: 1px solid #fee2e2; display: flex; justify-content: space-between; align-items: center; background: white;">
                <div>
                    <div style="font-size: 13px; font-weight: 700; color: #1e293b;">${c.razon_social || 'Cliente Desconocido'}</div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Guía: ${c.numero_guia} | Viaje: ${c.correlativo}</div>
                </div>
                <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #fee2e2; color: #ef4444; font-weight: 700;">${c.estado_entrega}</span>
            </div>
        `).join('');
    }

    // 2. Últimos Viajes Activos
    const contViajes = document.getElementById('lista-viajes-activos');
    if (listas.ultimosViajes.length === 0) {
        contViajes.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;">No hay viajes en curso.</div>`;
    } else {
        contViajes.innerHTML = listas.ultimosViajes.map(v => `
            <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; background: white;">
                <div>
                    <div style="font-size: 13px; font-weight: 700; color: var(--brand-blue);">Viaje ${v.correlativo} &bull; ${v.placa || '-'}</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;"><i class="fas fa-map-marker-alt" style="color:var(--text-muted);"></i> ${v.origen} &rarr; ${v.destino}</div>
                </div>
                <span style="font-size: 11px; font-weight: 600; color: var(--text-primary);">${v.estado_operativo}</span>
            </div>
        `).join('');
    }

    // 3. Pendientes de Cobro
    const contDeudas = document.getElementById('lista-pendientes-cobro');
    if (listas.pendientesCobro.length === 0) {
        contDeudas.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;">No hay deudas urgentes.</div>`;
    } else {
        contDeudas.innerHTML = listas.pendientesCobro.map(d => {
            // Check si esta vencida
            const isVencida = new Date(d.fecha_vencimiento) < new Date();
            const colorMonto = isVencida ? '#ef4444' : '#1e293b';
            const textVence = isVencida ? 'Vencido' : 'Vence';
            
            return `
            <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; background: white;">
                <div style="max-width: 65%;">
                    <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${d.razon_social}</div>
                    <div style="font-size: 11px; color: ${isVencida ? '#ef4444' : 'var(--text-muted)'}; margin-top: 2px;">${textVence}: ${new Date(d.fecha_vencimiento).toLocaleDateString()}</div>
                </div>
                <div style="font-size: 13px; font-weight: 800; color: ${colorMonto};">${formatMonedaLocal(d.monto_restante)}</div>
            </div>
        `}).join('');
    }
}

function renderGraficos(graficos) {
    Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";
    Chart.defaults.color = '#64748b';

    // 1. Volumen de Viajes (Líneas)
    const ctxVolumen = document.getElementById('chart-volumen').getContext('2d');
    if (chartVolumen) chartVolumen.destroy();
    
    chartVolumen = new Chart(ctxVolumen, {
        type: 'line',
        data: {
            labels: graficos.volumenViajes.map(v => new Date(v.fecha).toLocaleDateString('es-PE', {day:'2-digit', month:'short'})),
            datasets: [{
                label: 'Viajes Iniciados',
                data: graficos.volumenViajes.map(v => v.total),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            }
        }
    });

    // 2. Distribución de Estados de Carga (Dona)
    const ctxCargas = document.getElementById('chart-estados-carga').getContext('2d');
    if (chartCargas) chartCargas.destroy();

    const colorMapCargas = {
        'Entregado': '#10b981',
        'En ruta': '#3b82f6',
        'Siniestrado': '#ef4444',
        'Rechazado': '#f59e0b',
        'En Almacen de Origen': '#64748b',
        'En Almacen de Destino': '#8b5cf6'
    };

    chartCargas = new Chart(ctxCargas, {
        type: 'doughnut',
        data: {
            labels: graficos.distribucionCargas.map(c => c.estado),
            datasets: [{
                data: graficos.distribucionCargas.map(c => c.total),
                backgroundColor: graficos.distribucionCargas.map(c => colorMapCargas[c.estado] || '#cbd5e1'),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } }
            }
        }
    });

    // 3. Top Rutas Frecuentes (Barras Verticales)
    const ctxRutas = document.getElementById('chart-rutas').getContext('2d');
    if (chartRutas) chartRutas.destroy();

    chartRutas = new Chart(ctxRutas, {
        type: 'bar',
        data: {
            labels: graficos.topRutas.map(r => `${r.origen.split(',')[0]} - ${r.destino.split(',')[0]}`),
            datasets: [{
                label: 'Cant. Viajes',
                data: graficos.topRutas.map(r => r.cantidad),
                backgroundColor: '#8b5cf6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { borderDash: [2, 4] } },
                x: { grid: { display: false }, ticks: { font: { size: 10 } } }
            }
        }
    });

    // 4. Top Incidencias (Barras Horizontales)
    const ctxIncidencias = document.getElementById('chart-incidencias').getContext('2d');
    if (chartIncidencias) chartIncidencias.destroy();

    chartIncidencias = new Chart(ctxIncidencias, {
        type: 'bar',
        data: {
            labels: graficos.topIncidencias.map(i => i.tipo_incidencia),
            datasets: [{
                label: 'Cant. Reportes',
                data: graficos.topIncidencias.map(i => i.total),
                backgroundColor: '#f43f5e',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { borderDash: [2, 4] } },
                y: { grid: { display: false }, ticks: { font: { size: 11 } } }
            }
        }
    });
}

function formatMonedaLocal(monto) {
    return 'S/ ' + parseFloat(monto).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
