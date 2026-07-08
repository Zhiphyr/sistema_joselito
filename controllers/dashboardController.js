const db = require('../config/db');

const obtenerEstadisticas = async (req, res) => {
    try {
        const { rango = 'este-mes', fecha, graficoRango = '6meses', graficoFecha } = req.query;

        // Definir condiciones de fecha según el rango seleccionado
        let whereCarga = '';
        let whereViaje = '';
        let whereClientesNuevos = '';
        
        let whereCargaComparativo = '';
        let whereViajeComparativo = '';
        let whereClientesNuevosComparativo = '';

        let paramsCarga = [];
        let paramsViaje = [];
        let paramsClientesNuevos = [];
        
        let paramsCargaComparativo = [];
        let paramsViajeComparativo = [];
        let paramsClientesNuevosComparativo = [];

        let comparativaTexto = 'vs mes anterior';

        switch (rango) {
            case 'hoy':
                whereCarga = 'DATE(fecha_registro) = CURRENT_DATE()';
                whereViaje = 'DATE(fecha_salida) = CURRENT_DATE()';
                whereClientesNuevos = 'DATE(fecha_creacion) = CURRENT_DATE()';

                whereCargaComparativo = 'DATE(fecha_registro) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)';
                whereViajeComparativo = 'DATE(fecha_salida) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)';
                whereClientesNuevosComparativo = 'DATE(fecha_creacion) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)';
                
                comparativaTexto = 'vs ayer';
                break;
                
            case 'esta-semana':
                whereCarga = 'YEARWEEK(fecha_registro, 1) = YEARWEEK(CURRENT_DATE(), 1)';
                whereViaje = 'YEARWEEK(fecha_salida, 1) = YEARWEEK(CURRENT_DATE(), 1)';
                whereClientesNuevos = 'YEARWEEK(fecha_creacion, 1) = YEARWEEK(CURRENT_DATE(), 1)';

                whereCargaComparativo = 'YEARWEEK(fecha_registro, 1) = YEARWEEK(DATE_SUB(CURRENT_DATE(), INTERVAL 1 WEEK), 1)';
                whereViajeComparativo = 'YEARWEEK(fecha_salida, 1) = YEARWEEK(DATE_SUB(CURRENT_DATE(), INTERVAL 1 WEEK), 1)';
                whereClientesNuevosComparativo = 'YEARWEEK(fecha_creacion, 1) = YEARWEEK(DATE_SUB(CURRENT_DATE(), INTERVAL 1 WEEK), 1)';

                comparativaTexto = 'vs semana anterior';
                break;

            case 'este-ano':
                whereCarga = 'YEAR(fecha_registro) = YEAR(CURRENT_DATE())';
                whereViaje = 'YEAR(fecha_salida) = YEAR(CURRENT_DATE())';
                whereClientesNuevos = 'YEAR(fecha_creacion) = YEAR(CURRENT_DATE())';

                whereCargaComparativo = 'YEAR(fecha_registro) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR))';
                whereViajeComparativo = 'YEAR(fecha_salida) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR))';
                whereClientesNuevosComparativo = 'YEAR(fecha_creacion) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR))';

                comparativaTexto = 'vs año anterior';
                break;

            case 'personalizado':
                let selectedYear = new Date().getFullYear();
                let selectedMonth = new Date().getMonth() + 1;
                
                if (fecha) {
                    const parts = fecha.split('-');
                    if (parts.length === 2) {
                        selectedYear = parseInt(parts[0]);
                        selectedMonth = parseInt(parts[1]);
                    }
                }

                // Período seleccionado
                whereCarga = 'MONTH(fecha_registro) = ? AND YEAR(fecha_registro) = ?';
                whereViaje = 'MONTH(fecha_salida) = ? AND YEAR(fecha_salida) = ?';
                whereClientesNuevos = 'MONTH(fecha_creacion) = ? AND YEAR(fecha_creacion) = ?';

                // Período comparativo anterior (mes anterior)
                let prevYear = selectedYear;
                let prevMonth = selectedMonth - 1;
                if (prevMonth === 0) {
                    prevMonth = 12;
                    prevYear = selectedYear - 1;
                }

                whereCargaComparativo = 'MONTH(fecha_registro) = ? AND YEAR(fecha_registro) = ?';
                whereViajeComparativo = 'MONTH(fecha_salida) = ? AND YEAR(fecha_salida) = ?';
                whereClientesNuevosComparativo = 'MONTH(fecha_creacion) = ? AND YEAR(fecha_creacion) = ?';

                const nombresMesesCompleto = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                comparativaTexto = `vs ${nombresMesesCompleto[prevMonth - 1]} de ${prevYear}`;

                // Parámetros para las consultas SQL
                paramsCarga = [selectedMonth, selectedYear];
                paramsViaje = [selectedMonth, selectedYear];
                paramsClientesNuevos = [selectedMonth, selectedYear];

                paramsCargaComparativo = [prevMonth, prevYear];
                paramsViajeComparativo = [prevMonth, prevYear];
                paramsClientesNuevosComparativo = [prevMonth, prevYear];
                break;

            case 'este-mes':
            default:
                whereCarga = 'MONTH(fecha_registro) = MONTH(CURRENT_DATE()) AND YEAR(fecha_registro) = YEAR(CURRENT_DATE())';
                whereViaje = 'MONTH(fecha_salida) = MONTH(CURRENT_DATE()) AND YEAR(fecha_salida) = YEAR(CURRENT_DATE())';
                whereClientesNuevos = 'MONTH(fecha_creacion) = MONTH(CURRENT_DATE()) AND YEAR(fecha_creacion) = YEAR(CURRENT_DATE())';

                whereCargaComparativo = 'MONTH(fecha_registro) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)) AND YEAR(fecha_registro) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))';
                whereViajeComparativo = 'MONTH(fecha_salida) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)) AND YEAR(fecha_salida) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))';
                whereClientesNuevosComparativo = 'MONTH(fecha_creacion) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)) AND YEAR(fecha_creacion) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))';

                comparativaTexto = 'vs mes anterior';
                break;
        }

        // 1. Fletes e Ingresos (Periodo actual)
        const sqlIngresos = `
            SELECT COALESCE(SUM(flete_total), 0) AS total_fletes 
            FROM Carga 
            WHERE ${whereCarga} AND estado != 2
        `;
        const [resIngresos] = await db.query(sqlIngresos, paramsCarga);
        const totalFletes = Number(resIngresos[0].total_fletes) || 0;

        // Fletes e Ingresos (Periodo comparativo anterior)
        const sqlIngresosComparativo = `
            SELECT COALESCE(SUM(flete_total), 0) AS total_fletes 
            FROM Carga 
            WHERE ${whereCargaComparativo} AND estado != 2
        `;
        const [resIngresosComparativo] = await db.query(sqlIngresosComparativo, paramsCargaComparativo);
        const totalFletesComparativo = Number(resIngresosComparativo[0].total_fletes) || 0;
        
        let variacionIngresos = 0;
        if (totalFletesComparativo > 0) {
            variacionIngresos = ((totalFletes - totalFletesComparativo) / totalFletesComparativo) * 100;
        }

        // 2. Viajes Completados (Periodo actual)
        const sqlViajes = `
            SELECT COUNT(*) AS total_viajes 
            FROM Viaje 
            WHERE estado_operativo = 'Finalizado'
              AND ${whereViaje} AND estado != 2
        `;
        const [resViajes] = await db.query(sqlViajes, paramsViaje);
        const viajesCompletados = resViajes[0].total_viajes;

        // Viajes Completados (Periodo comparativo anterior)
        const sqlViajesComparativo = `
            SELECT COUNT(*) AS total_viajes
            FROM Viaje
            WHERE estado_operativo = 'Finalizado'
              AND ${whereViajeComparativo} AND estado != 2
        `;
        const [resViajesComparativo] = await db.query(sqlViajesComparativo, paramsViajeComparativo);
        const viajesComparativo = resViajesComparativo[0].total_viajes;

        // 3. Cargas Pendientes (No se ven afectadas por el filtro de periodo porque son un estado acumulativo)
        const sqlCargasPendientes = `
            SELECT COUNT(*) AS total_pendientes 
            FROM Carga 
            WHERE estado_entrega NOT IN ('Entregado', 'Rechazado Total', 'Rechazado')
              AND estado != 2
        `;
        const [resCargas] = await db.query(sqlCargasPendientes);
        const cargasPendientes = resCargas[0].total_pendientes;

        // 4. Clientes Activos (Acumulado general)
        const sqlClientes = `
            SELECT COUNT(*) AS total_clientes 
            FROM clientes 
            WHERE estado = 1
        `;
        const [resClientes] = await db.query(sqlClientes);
        const clientesActivos = resClientes[0].total_clientes;

        // Clientes nuevos registrados en el periodo seleccionado
        const sqlClientesNuevos = `
            SELECT COUNT(*) AS clientes_nuevos
            FROM clientes
            WHERE ${whereClientesNuevos} AND estado = 1
        `;
        let clientesNuevos = 0;
        try {
            const [resClientesNuevos] = await db.query(sqlClientesNuevos, paramsClientesNuevos);
            clientesNuevos = resClientesNuevos[0].clientes_nuevos;
        } catch (e) {
            clientesNuevos = 0;
        }

        // 5. Estado de la Flota (Camiones - Acumulado general)
        const sqlFlota = `
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN estado = 1 THEN 1 ELSE 0 END) AS activos,
                SUM(CASE WHEN estado = 0 THEN 1 ELSE 0 END) AS inactivos
            FROM camiones 
            WHERE estado IN (0, 1)
        `;
        const [resFlota] = await db.query(sqlFlota);
        const flotaTotal = resFlota[0].total || 0;
        const flotaActivos = resFlota[0].activos || 0;
        const flotaInactivos = resFlota[0].inactivos || 0;

        // 6. Historial de Ingresos / Rendimiento (Gráfico Dinámico)
        let sqlGrafico = '';
        let paramsGrafico = [];
        let datosGrafico = { labels: [], data: [] };

        if (graficoRango === '12meses') {
            // Todos los meses del año en curso
            sqlGrafico = `
                SELECT 
                    MONTH(fecha_registro) AS mes_num,
                    SUM(flete_total) AS total
                FROM Carga
                WHERE YEAR(fecha_registro) = YEAR(CURRENT_DATE())
                  AND estado != 2
                GROUP BY MONTH(fecha_registro)
                ORDER BY mes_num ASC
            `;
        } else if (graficoRango === 'mes-detalle') {
            // Desglose día por día de un mes específico (o el actual)
            let selectedYear = new Date().getFullYear();
            let selectedMonth = new Date().getMonth() + 1;

            const fechaEvaluar = graficoFecha || fecha; // Fallback al selector principal si no se envió fecha específica para el gráfico
            if (fechaEvaluar) {
                const parts = fechaEvaluar.split('-');
                if (parts.length === 2) {
                    selectedYear = parseInt(parts[0]);
                    selectedMonth = parseInt(parts[1]);
                }
            }

            sqlGrafico = `
                SELECT 
                    DAY(fecha_registro) AS dia_num,
                    SUM(flete_total) AS total
                FROM Carga
                WHERE MONTH(fecha_registro) = ? 
                  AND YEAR(fecha_registro) = ?
                  AND estado != 2
                GROUP BY DAY(fecha_registro)
                ORDER BY dia_num ASC
            `;
            paramsGrafico = [selectedMonth, selectedYear];
        } else {
            // Por defecto: 6meses (Últimos 6 meses)
            sqlGrafico = `
                SELECT 
                    DATE_FORMAT(fecha_registro, '%Y-%m') AS mes_anio,
                    MONTH(fecha_registro) AS mes_num,
                    SUM(flete_total) AS total
                FROM Carga
                WHERE fecha_registro >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
                  AND estado != 2
                GROUP BY DATE_FORMAT(fecha_registro, '%Y-%m'), MONTH(fecha_registro)
                ORDER BY mes_anio ASC
            `;
        }

        try {
            const [resGrafico] = await db.query(sqlGrafico, paramsGrafico);
            const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

            if (graficoRango === 'mes-detalle') {
                // Obtener cantidad de días del mes evaluado
                let selectedYear = new Date().getFullYear();
                let selectedMonth = new Date().getMonth() + 1;
                const fechaEvaluar = graficoFecha || fecha;
                if (fechaEvaluar) {
                    const parts = fechaEvaluar.split('-');
                    if (parts.length === 2) {
                        selectedYear = parseInt(parts[0]);
                        selectedMonth = parseInt(parts[1]);
                    }
                }
                const diasEnMes = new Date(selectedYear, selectedMonth, 0).getDate();
                
                // Inicializar mapa de días
                const diasMapa = {};
                for (let d = 1; d <= diasEnMes; d++) {
                    diasMapa[d] = 0;
                }
                
                resGrafico.forEach(row => {
                    diasMapa[row.dia_num] = Number(row.total) || 0;
                });

                for (let d = 1; d <= diasEnMes; d++) {
                    datosGrafico.labels.push(`Día ${d}`);
                    datosGrafico.data.push(diasMapa[d]);
                }
            } else if (graficoRango === '12meses') {
                // Rellenar los 12 meses
                const mesesMapa = {};
                for (let m = 1; m <= 12; m++) {
                    mesesMapa[m] = 0;
                }
                resGrafico.forEach(row => {
                    mesesMapa[row.mes_num] = Number(row.total) || 0;
                });
                for (let m = 1; m <= 12; m++) {
                    datosGrafico.labels.push(nombresMeses[m - 1]);
                    datosGrafico.data.push(mesesMapa[m]);
                }
            } else {
                // 6meses normal
                resGrafico.forEach(row => {
                    const nombreMes = nombresMeses[row.mes_num - 1] || row.mes_num;
                    datosGrafico.labels.push(nombreMes);
                    datosGrafico.data.push(Number(row.total) || 0);
                });
            }
        } catch (error) {
            console.error("Error al obtener datos del gráfico:", error);
        }

        if (datosGrafico.labels.length === 0) {
            datosGrafico = {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                data: [0, 0, 0, 0, 0, 0]
            };
        }

        return res.status(200).json({
            success: true,
            data: {
                ingresos: {
                    total: totalFletes,
                    variacion: variacionIngresos.toFixed(1),
                    comparativaTexto: comparativaTexto
                },
                viajes: {
                    completados: viajesCompletados,
                    comparativa: viajesComparativo,
                    comparativaTexto: comparativaTexto
                },
                cargas: {
                    pendientes: cargasPendientes
                },
                clientes: {
                    activos: clientesActivos,
                    nuevos: clientesNuevos,
                    comparativaTexto: comparativaTexto
                },
                flota: {
                    total: flotaTotal,
                    activos: flotaActivos,
                    inactivos: flotaInactivos
                },
                grafico: datosGrafico
            }
        });

    } catch (error) {
        console.error('Error al obtener estadísticas del dashboard:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

module.exports = {
    obtenerEstadisticas
};
