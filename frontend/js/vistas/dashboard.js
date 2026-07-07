window.init_dashboard = function() {
    console.log("Dashboard principal inicializado");

    // 1. Cargar Chart.js si no existe
    cargarChartJS(() => {
        inicializarGraficoFinanciero();
    });

    // 2. Animar indicador de flota radial
    animarMedidorFlota();

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

function inicializarGraficoFinanciero() {
    const ctx = document.getElementById('revChart');
    if (!ctx) return;

    // Obtener color de la variable CSS o usar default
    const brandColor = getComputedStyle(document.documentElement).getPropertyValue('--brand-blue').trim() || '#0f4c81';
    
    // Crear degradado para el área bajo la curva
    const canvasContext = ctx.getContext('2d');
    const gradient = canvasContext.createLinearGradient(0, 0, 0, ctx.offsetHeight || 250);
    gradient.addColorStop(0, 'rgba(15, 76, 129, 0.22)');
    gradient.addColorStop(1, 'rgba(15, 76, 129, 0.00)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
            datasets: [{
                label: 'Ingresos Mensuales (S/)',
                data: [14200, 18500, 16900, 24000, 21800, 32400],
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

function animarMedidorFlota() {
    const circle = document.getElementById('fleetGaugeCircle');
    const label = document.getElementById('fleetActivePercentage');
    if (!circle || !label) return;

    const total = 20;
    const active = 17;
    const percentage = Math.round((active / total) * 100); // 85%

    // Configurar circunferencia
    const radius = circle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius; // 251.2
    
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = circumference;

    // Trigger de animación (pequeño delay para que se cargue la vista en el DOM)
    setTimeout(() => {
        const offset = circumference - (percentage / 100) * circumference;
        circle.style.strokeDashoffset = offset;

        // Animar el número contador
        let current = 0;
        const duration = 1200; // 1.2s
        const stepTime = Math.max(Math.floor(duration / percentage), 10);
        
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
    // Buscar en la lista de navegación lateral el link correspondiente
    const links = document.querySelectorAll('#menuList .nav-link');
    let targetLink = null;

    links.forEach(link => {
        if (link.dataset.ruta === ruta) {
            targetLink = link;
        }
    });

    if (targetLink) {
        // Ejecutar evento click para cargar la vista vía SPA
        targetLink.click();
    } else {
        console.warn(`No se encontró enlace lateral para la ruta: ${ruta}`);
    }
}

