window.init_dashboard = function() {
    console.log("Dashboard principal inicializado");

    // 1. Cargar estadísticas dinámicas por defecto (este mes)
    cargarEstadisticasDashboard('este-mes');

    // 2. Enlazar el selector de rango de tiempo
    const rangeSelect = document.getElementById('dashboardRangeSelect');
    if (rangeSelect) {
        // Asegurarse de que esté seleccionado por defecto
        rangeSelect.value = 'este-mes';
        rangeSelect.addEventListener('change', (e) => {
            cargarEstadisticasDashboard(e.target.value);
        });
    }

    // 3. Enlazar botón de flota completa
    const btnGoToFleet = document.getElementById('btnGoToFleet');
    if (btnGoToFleet) {
        btnGoToFleet.addEventListener('click', () => {
            navegarAModulo('camiones');
        });
    }

    // 4. Enlazar accesos rápidos
    const shortcuts = document.querySelectorAll('.shortcut-card');
    shortcuts.forEach(card => {
        card.addEventListener('click', () => {
            const ruta = card.dataset.shortcut;
            if (ruta) {
                navegarAModulo(ruta);
            }
        });
    });
};

async function cargarEstadisticasDashboard(rango = 'este-mes') {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    
    try {
        const response = await fetch(`http://localhost:3000/api/dashboard/stats?rango=${rango}`, {
            headers: { 'x-user-profile': sessionData.id_perfil || 1 }
        });
        const result = await response.json();
        
        if (response.ok && result.success) {
            const data = result.data;
            
            // 1. Fletes e Ingresos
            document.getElementById('stat-fletes-valor').textContent = `S/ ${data.ingresos.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            const varIngresos = data.ingresos.variacion;
            const compIngresos = data.ingresos.comparativaTexto || 'vs mes anterior';
            const textVarIngresos = varIngresos >= 0 ? `+${varIngresos}% ${compIngresos}` : `${varIngresos}% ${compIngresos}`;
            document.getElementById('stat-fletes-comparativa').textContent = textVarIngresos;
            
            // 2. Viajes Completados
            document.getElementById('stat-viajes-valor').textContent = data.viajes.completados;
            
            const compViajes = data.viajes.comparativaTexto || 'vs mes anterior';
            if (rango === 'hoy') {
                document.getElementById('stat-viajes-comparativa').textContent = `+${data.viajes.completados - data.viajes.comparativa >= 0 ? data.viajes.completados - data.viajes.comparativa : 0} vs ayer (${data.viajes.comparativa} viajes)`;
            } else if (rango === 'esta-semana') {
                document.getElementById('stat-viajes-comparativa').textContent = `+${data.viajes.completados - data.viajes.comparativa >= 0 ? data.viajes.completados - data.viajes.comparativa : 0} vs sem. pasada (${data.viajes.comparativa} viajes)`;
            } else if (rango === 'este-mes') {
                document.getElementById('stat-viajes-comparativa').textContent = `+${data.viajes.completados - data.viajes.comparativa >= 0 ? data.viajes.completados - data.viajes.comparativa : 0} vs mes anterior (${data.viajes.comparativa} viajes)`;
            } else {
                document.getElementById('stat-viajes-comparativa').textContent = `+${data.viajes.completados - data.viajes.comparativa >= 0 ? data.viajes.completados - data.viajes.comparativa : 0} vs año anterior (${data.viajes.comparativa} viajes)`;
            }
            
            // 3. Cargas Pendientes
            document.getElementById('stat-cargas-valor').textContent = data.cargas.pendientes;
            
            // 4. Clientes Activos
            document.getElementById('stat-clientes-valor').textContent = data.clientes.activos;
            
            if (rango === 'hoy') {
                document.getElementById('stat-clientes-comparativa').textContent = `+${data.clientes.nuevos} registrados hoy`;
            } else if (rango === 'esta-semana') {
                document.getElementById('stat-clientes-comparativa').textContent = `+${data.clientes.nuevos} esta semana`;
            } else if (rango === 'este-mes') {
                document.getElementById('stat-clientes-comparativa').textContent = `+${data.clientes.nuevos} este mes`;
            } else {
                document.getElementById('stat-clientes-comparativa').textContent = `+${data.clientes.nuevos} este año`;
            }
            
            // 5. Estado de la Flota (Textos e Indicador)
            document.getElementById('totalTrucksText').textContent = data.flota.total;
            document.getElementById('activeTrucksText').textContent = data.flota.activos;
            document.getElementById('inactiveTrucksText').textContent = data.flota.inactivos;
            
            // Inicializar/Animar Medidor Flota
            animarMedidorFlota(data.flota.total, data.flota.activos);
            
            // Inicializar Grafico Financiero
            cargarChartJS(() => {
                inicializarGraficoFinanciero(data.grafico);
            });
            
        } else {
            console.error("Error al obtener estadísticas del dashboard:", result.message);
            // Fallback a animación estática básica si la API falla
            animarMedidorFlota(20, 17);
            cargarChartJS(() => {
                inicializarGraficoFinanciero();
            });
        }
    } catch (error) {
        console.error("Error de conexión al cargar estadísticas:", error);
        // Fallback
        animarMedidorFlota(20, 17);
        cargarChartJS(() => {
            inicializarGraficoFinanciero();
        });
    }
}

function cargarChartJS(callback) {
    if (window.Chart) {
        callback();
        return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = callback;
    script.onerror = () => console.error("No se pudo cargar Chart.js");
    document.head.appendChild(script);
}

function inicializarGraficoFinanciero(datosGrafico) {
    const ctx = document.getElementById('revChart');
    if (!ctx) return;

    // Si no vienen datos de gráfico, usamos los estáticos de prueba
    const labels = datosGrafico ? datosGrafico.labels : ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const data = datosGrafico ? datosGrafico.data : [14200, 18500, 16900, 24000, 21800, 32400];

    // Obtener color de la variable CSS o usar default
    const brandColor = getComputedStyle(document.documentElement).getPropertyValue('--brand-blue').trim() || '#0f4c81';
    
    // Crear degradado para el área bajo la curva
    const canvasContext = ctx.getContext('2d');
    const gradient = canvasContext.createLinearGradient(0, 0, 0, ctx.offsetHeight || 250);
    gradient.addColorStop(0, 'rgba(15, 76, 129, 0.22)');
    gradient.addColorStop(1, 'rgba(15, 76, 129, 0.00)');

    // Destruir gráfico anterior si existe para evitar duplicación al recargar SPA
    if (window.miGraficoDashboard) {
        window.miGraficoDashboard.destroy();
    }

    window.miGraficoDashboard = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ingresos Mensuales (S/)',
                data: data,
                borderColor: brandColor,
                borderWidth: 3,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4, // Curva suave
                pointBackgroundColor: '#ffffff',
                pointBorderColor: brandColor,
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointHoverBackgroundColor: brandColor,
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Ocultamos la leyenda estándar
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    padding: 12,
                    borderColor: 'rgba(15, 76, 129, 0.1)',
                    borderWidth: 1,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return ' S/. ' + context.raw.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: {
                        color: 'rgba(15, 76, 129, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            family: 'Inter',
                            size: 11
                        },
                        callback: function(value) {
                            return 'S/. ' + value.toLocaleString();
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            family: 'Inter',
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

function animarMedidorFlota(totalArg, activeArg) {
    const circle = document.getElementById('fleetGaugeCircle');
    const label = document.getElementById('fleetActivePercentage');
    if (!circle || !label) return;

    // Valores por defecto
    const total = totalArg !== undefined ? totalArg : 20;
    const active = activeArg !== undefined ? activeArg : 17;
    const percentage = total > 0 ? Math.round((active / total) * 100) : 0;

    // Configurar circunferencia
    const radius = circle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius; // 251.2
    
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = circumference;

    // Trigger de animación
    setTimeout(() => {
        const offset = circumference - (percentage / 100) * circumference;
        circle.style.strokeDashoffset = offset;

        // Animar el número contador
        let current = 0;
        const duration = 1200; // 1.2s
        const stepTime = percentage > 0 ? Math.max(Math.floor(duration / percentage), 10) : 10;
        
        if (percentage === 0) {
            label.textContent = `0%`;
            return;
        }

        const timer = setInterval(() => {
            current += 1;
            label.textContent = `${current}%`;
            if (current >= percentage) {
                clearInterval(timer);
                label.textContent = `${percentage}%`;
            }
        }, stepTime);
    }, 150);
}

function navegarAModulo(ruta) {
    const links = document.querySelectorAll('#menuList .nav-link');
    let targetLink = null;

    links.forEach(link => {
        if (link.dataset.ruta === ruta) {
            targetLink = link;
        }
    });

    if (targetLink) {
        targetLink.click();
    } else {
        console.warn(`No se encontró enlace lateral para la ruta: ${ruta}`);
    }
}





