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
    document.getElementById('kpi-flota').textContent = `${kpis.transportistasDisponibles || 0} / ${kpis.transportistasTotal || 0}`;
    document.getElementById('kpi-deuda').textContent = formatMonedaLocal(kpis.deudaTotal || 0);
}

function renderListas(listas) {
    // 1. Incidencias Pendientes
    const contCriticas = document.getElementById('lista-cargas-criticas');
    const noDataCriticas = document.getElementById('no-data-incidencias-pendientes');
    document.getElementById('badge-criticas').textContent = listas.cargasCriticas.length;
    
    if (listas.cargasCriticas.length === 0) {
        contCriticas.style.display = 'none';
        noDataCriticas.style.display = 'block';
    } else {
        contCriticas.style.display = 'block';
        noDataCriticas.style.display = 'none';
        contCriticas.innerHTML = listas.cargasCriticas.map(c => `
            <li style="padding: 12px 20px; border-bottom: 1px solid #fee2e2; display: flex; justify-content: space-between; align-items: center; background: white;">
                <div>
                    <div style="font-size: 13px; font-weight: 700; color: #1e293b;">${c.nombre_producto}</div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Guía: ${c.numero_guia} | Viaje: ${c.correlativo} | ${c.razon_social || 'Desconocido'}</div>
                </div>
                <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #fee2e2; color: #ef4444; font-weight: 700;">${c.estado_operativo}</span>
            </li>
        `).join('');
    }

    // 2. Últimos Viajes Activos
    const contViajes = document.getElementById('lista-viajes-activos');
    const noDataViajes = document.getElementById('no-data-viajes-activos');
    if (listas.ultimosViajes.length === 0) {
        contViajes.style.display = 'none';
        noDataViajes.style.display = 'block';
    } else {
        contViajes.style.display = 'block';
        noDataViajes.style.display = 'none';
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
    const noDataDeudas = document.getElementById('no-data-deudas-pendientes');
    if (listas.pendientesCobro.length === 0) {
        contDeudas.style.display = 'none';
        noDataDeudas.style.display = 'block';
    } else {
        contDeudas.style.display = 'block';
        noDataDeudas.style.display = 'none';
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

    if (graficos.volumenViajes.length === 0) {
        document.getElementById('chart-volumen').style.display = 'none';
        document.getElementById('no-data-viajes').style.display = 'block';
    } else {
        document.getElementById('chart-volumen').style.display = 'block';
        document.getElementById('no-data-viajes').style.display = 'none';
    }

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

    const inputMesViajes = document.getElementById('filtro-mes-viajes');
    if (!inputMesViajes.value) {
        const now = new Date();
        inputMesViajes.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    const newFiltroViajes = inputMesViajes.cloneNode(true);
    inputMesViajes.parentNode.replaceChild(newFiltroViajes, inputMesViajes);

    newFiltroViajes.addEventListener('change', async (e) => {
        const [anio, mes] = e.target.value.split('-');
        if(!anio || !mes) return;
        
        try {
            const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
            const response = await fetch(`http://localhost:3000/api/dashboard-general/volumen-viajes?mes=${mes}&anio=${anio}`, {
                headers: { 'x-user-profile': sessionData.id_perfil }
            });
            const result = await response.json();
            if(result.success) {
                if (result.data.length === 0) {
                    document.getElementById('chart-volumen').style.display = 'none';
                    document.getElementById('no-data-viajes').style.display = 'block';
                } else {
                    document.getElementById('chart-volumen').style.display = 'block';
                    document.getElementById('no-data-viajes').style.display = 'none';
                    chartVolumen.data.labels = result.data.map(v => new Date(v.fecha).toLocaleDateString('es-PE', {day:'2-digit', month:'short'}));
                    chartVolumen.data.datasets[0].data = result.data.map(v => v.total);
                    chartVolumen.update();
                }
            }
        } catch (error) {
            console.error('Error filtrando viajes:', error);
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
        'En Almacen de Destino': '#8b5cf6',
        'Transbordado': '#0ea5e9', // Celeste
        'Entregado Parcialmente': '#2dd4bf', // Turquesa
        'Rechazado Total': '#f43f5e', // Rosa Fuerte
        'Siniestrado Parcialmente': '#f97316' // Naranja
    };

    if (graficos.distribucionCargas.length === 0) {
        document.getElementById('chart-estados-carga').style.display = 'none';
        document.getElementById('no-data-cargas').style.display = 'block';
    } else {
        document.getElementById('chart-estados-carga').style.display = 'block';
        document.getElementById('no-data-cargas').style.display = 'none';
    }

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



    const inputMes = document.getElementById('filtro-mes-cargas');
    if (!inputMes.value) {
        const now = new Date();
        inputMes.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    // Remover listener previo si existe para evitar duplicados en re-renders
    const newFiltro = inputMes.cloneNode(true);
    inputMes.parentNode.replaceChild(newFiltro, inputMes);

    newFiltro.addEventListener('change', async (e) => {
        const [anio, mes] = e.target.value.split('-');
        if(!anio || !mes) return;
        
        try {
            const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
            const response = await fetch(`http://localhost:3000/api/dashboard-general/distribucion-cargas?mes=${mes}&anio=${anio}`, {
                headers: { 'x-user-profile': sessionData.id_perfil }
            });
            const result = await response.json();
            if(result.success) {
                if (result.data.length === 0) {
                    document.getElementById('chart-estados-carga').style.display = 'none';
                    document.getElementById('no-data-cargas').style.display = 'block';
                } else {
                    document.getElementById('chart-estados-carga').style.display = 'block';
                    document.getElementById('no-data-cargas').style.display = 'none';
                    chartCargas.data.labels = result.data.map(c => c.estado);
                    chartCargas.data.datasets[0].data = result.data.map(c => c.total);
                    chartCargas.data.datasets[0].backgroundColor = result.data.map(c => colorMapCargas[c.estado] || '#cbd5e1');
                    chartCargas.update();
                }
            }
        } catch (error) {
            console.error('Error filtrando cargas:', error);
        }
    });

    // 3. Top Rutas Frecuentes (Barras Verticales)
    const ctxRutas = document.getElementById('chart-rutas').getContext('2d');
    if (chartRutas) chartRutas.destroy();

    if (graficos.topRutas.length === 0) {
        document.getElementById('chart-rutas').style.display = 'none';
        document.getElementById('no-data-rutas').style.display = 'block';
    } else {
        document.getElementById('chart-rutas').style.display = 'block';
        document.getElementById('no-data-rutas').style.display = 'none';
    }

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

    const inputMesRutas = document.getElementById('filtro-mes-rutas');
    if (!inputMesRutas.value) {
        const now = new Date();
        inputMesRutas.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    const newFiltroRutas = inputMesRutas.cloneNode(true);
    inputMesRutas.parentNode.replaceChild(newFiltroRutas, inputMesRutas);

    newFiltroRutas.addEventListener('change', async (e) => {
        const [anio, mes] = e.target.value.split('-');
        if(!anio || !mes) return;
        
        try {
            const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
            const response = await fetch(`http://localhost:3000/api/dashboard-general/top-rutas?mes=${mes}&anio=${anio}`, {
                headers: { 'x-user-profile': sessionData.id_perfil }
            });
            const result = await response.json();
            if(result.success) {
                if (result.data.length === 0) {
                    document.getElementById('chart-rutas').style.display = 'none';
                    document.getElementById('no-data-rutas').style.display = 'block';
                } else {
                    document.getElementById('chart-rutas').style.display = 'block';
                    document.getElementById('no-data-rutas').style.display = 'none';
                    chartRutas.data.labels = result.data.map(r => `${r.origen.split(',')[0]} - ${r.destino.split(',')[0]}`);
                    chartRutas.data.datasets[0].data = result.data.map(r => r.cantidad);
                    chartRutas.update();
                }
            }
        } catch (error) {
            console.error('Error filtrando rutas:', error);
        }
    });

    // 4. Top Incidencias (Barras Horizontales)
    const ctxIncidencias = document.getElementById('chart-incidencias').getContext('2d');
    if (chartIncidencias) chartIncidencias.destroy();

    if (graficos.topIncidencias.length === 0) {
        document.getElementById('chart-incidencias').style.display = 'none';
        document.getElementById('no-data-incidencias').style.display = 'block';
    } else {
        document.getElementById('chart-incidencias').style.display = 'block';
        document.getElementById('no-data-incidencias').style.display = 'none';
    }

    chartIncidencias = new Chart(ctxIncidencias, {
        type: 'bar',
        data: {
            labels: graficos.topIncidencias.map(i => i.tipo_incidencia),
            datasets: [{
                label: 'Cant. Incidentes',
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
                y: { grid: { display: false }, ticks: { font: { size: 10 } } }
            }
        }
    });

    const inputMesIncidencias = document.getElementById('filtro-mes-incidencias');
    if (!inputMesIncidencias.value) {
        const now = new Date();
        inputMesIncidencias.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    const newFiltroIncidencias = inputMesIncidencias.cloneNode(true);
    inputMesIncidencias.parentNode.replaceChild(newFiltroIncidencias, inputMesIncidencias);

    newFiltroIncidencias.addEventListener('change', async (e) => {
        const [anio, mes] = e.target.value.split('-');
        if(!anio || !mes) return;
        
        try {
            const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
            const response = await fetch(`http://localhost:3000/api/dashboard-general/top-incidencias?mes=${mes}&anio=${anio}`, {
                headers: { 'x-user-profile': sessionData.id_perfil }
            });
            const result = await response.json();
            if(result.success) {
                if (result.data.length === 0) {
                    document.getElementById('chart-incidencias').style.display = 'none';
                    document.getElementById('no-data-incidencias').style.display = 'block';
                } else {
                    document.getElementById('chart-incidencias').style.display = 'block';
                    document.getElementById('no-data-incidencias').style.display = 'none';
                    chartIncidencias.data.labels = result.data.map(i => i.tipo_incidencia);
                    chartIncidencias.data.datasets[0].data = result.data.map(i => i.total);
                    chartIncidencias.update();
                }
            }
        } catch (error) {
            console.error('Error filtrando incidencias:', error);
        }
    });
}

function formatMonedaLocal(monto) {
    return 'S/ ' + parseFloat(monto).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
