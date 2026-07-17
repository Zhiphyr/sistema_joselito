// DataTables activos y movimientos ya cargados por tarjeta (cuenta-X / billetera-X),
// para no volver a pedirlos al servidor cada vez que se colapsa/expande el acordeón.
let dtInstanciasFinanciero = {};
let movimientosCacheFinanciero = {};

// Instancias de Chart.js del módulo (se destruyen y recrean al reingresar a la vista).
let chartFlujoDiario = null;
let chartDistribucionGastos = null;
let diasFlujoActual = 15;

window.init_dashboard_financiero = function () {
    // El framework destruye las instancias de DataTable al salir de la vista, pero no
    // limpia estas referencias propias: sin este reseteo quedarían apuntando a tablas
    // ya destruidas si el usuario reingresa al módulo dentro de la misma sesión SPA.
    dtInstanciasFinanciero = {};
    movimientosCacheFinanciero = {};

    if (chartFlujoDiario) { chartFlujoDiario.destroy(); chartFlujoDiario = null; }
    if (chartDistribucionGastos) { chartDistribucionGastos.destroy(); chartDistribucionGastos = null; }
    diasFlujoActual = 15;

    cargarResumenFinanciero();
    cargarCuentasDetalle();
    inicializarToggleCuentas();
    cargarFlujoDiario(diasFlujoActual);
    cargarDistribucionGastos();
    cargarUltimosMovimientos();

    document.querySelectorAll('.btn-rango-flujo').forEach(btn => {
        btn.addEventListener('click', () => cargarFlujoDiario(Number(btn.dataset.dias)));
    });

    document.getElementById('btnNuevoIngreso').addEventListener('click', abrirModalNuevoIngreso);
    document.getElementById('btnNuevoEgreso').addEventListener('click', abrirModalNuevoEgreso);
    document.getElementById('btnTransferenciaInterna').addEventListener('click', abrirModalTransferenciaInterna);
    document.getElementById('btnVerTodosMovimientos').addEventListener('click', abrirModalHistorialMovimientos);
};

// ----------------------------------------------------
// HELPERS COMPARTIDOS: Nuevo Ingreso / Nuevo Egreso / Transferencia Interna
// ----------------------------------------------------

const REGEX_MONTO_DECIMAL_FINANCIERO = /^\d{1,8}(\.\d{1,2})?$/;
const REGEX_NUMERO_OPERACION_FINANCIERO = /^[a-zA-Z0-9-]{1,100}$/;

// Trae fresco (nunca cacheado, el saldo cambia constantemente) el listado de cuentas y
// billeteras activas, usado tanto para poblar los selects como para validar fondos.
async function obtenerResumenCuentasParaFormulario() {
    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch('/api/dashboard-financiero/cuentas-resumen', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('Error al cargar cuentas y billeteras:', error);
        return null;
    }
}

// Arma las <option> (agrupadas por Cuentas y Billeteras) para un <select> de origen/destino.
// Cada opción codifica su tipo+id en el value ("cuenta:5" / "billetera:3") y el método de
// pago derivado en data-metodo, para que el resto de funciones no tengan que resolverlo de nuevo.
function construirOpcionesCuentasYBilleteras(data) {
    if (!data) return '<option value="">Error al cargar opciones</option>';

    let htmlCuentas = '';
    if (data.caja_fisica) {
        htmlCuentas += `<option value="cuenta:${data.caja_fisica.id_cuenta}" data-metodo="Efectivo" data-saldo="${data.caja_fisica.saldo}">Caja Física (Efectivo)</option>`;
    }
    data.cuentas_bancarias.forEach(c => {
        htmlCuentas += `<option value="cuenta:${c.id_cuenta}" data-metodo="Transferencia" data-saldo="${c.saldo}">${c.entidad_financiera} - ${c.tipo_cuenta} (${c.nro_cuenta || c.titular})</option>`;
    });

    let htmlBilleteras = '';
    data.cuentas_bancarias.forEach(c => {
        if (c.billetera_vinculada) {
            htmlBilleteras += `<option value="billetera:${c.billetera_vinculada.id_billetera}" data-metodo="Billetera Digital" data-saldo="${c.saldo}">${c.billetera_vinculada.proveedor} - ${c.billetera_vinculada.numero_celular} (vinculada a ${c.entidad_financiera})</option>`;
        }
    });
    data.billeteras_independientes.forEach(b => {
        htmlBilleteras += `<option value="billetera:${b.id_billetera}" data-metodo="Billetera Digital" data-saldo="${b.saldo}">${b.proveedor} - ${b.numero_celular} (${b.titular})</option>`;
    });

    let html = '<option value="">Seleccione...</option>';
    if (htmlCuentas) html += `<optgroup label="Caja y Cuentas Bancarias">${htmlCuentas}</optgroup>`;
    if (htmlBilleteras) html += `<optgroup label="Billeteras Digitales">${htmlBilleteras}</optgroup>`;
    return html;
}

// Solo permite dígitos y un único punto decimal, máx. 2 decimales (DECIMAL(10,2), sin negativos).
function limpiarInputMontoDecimalFinanciero(input) {
    let val = input.value.replace(/[^0-9.]/g, '');

    const partes = val.split('.');
    if (partes.length > 2) {
        val = partes[0] + '.' + partes.slice(1).join('');
    }

    if (val.includes('.')) {
        const [entero, decimal] = val.split('.');
        val = entero.slice(0, 8) + '.' + decimal.slice(0, 2);
    } else {
        val = val.slice(0, 8);
    }

    input.value = val;
}

// Letras (con tildes/ñ), números, paréntesis, guiones y espacios.
function limpiarInputConceptoFinanciero(input) {
    input.value = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9()\-\s]/g, '');
}

// Letras, números y guiones (mismo criterio que el resto del sistema, ej. liquidación).
function limpiarInputNumeroOperacionFinanciero(input) {
    input.value = input.value.replace(/[^a-zA-Z0-9-]/g, '');
}

// Muestra/oculta y marca requerido el campo de N° de Operación según el método derivado
// de la opción seleccionada (obligatorio para todo lo que no sea Efectivo).
function actualizarNumeroOperacionFinanciero(selectId, grupoId, inputId) {
    const select = document.getElementById(selectId);
    const opcionSeleccionada = select.options[select.selectedIndex];
    const metodo = opcionSeleccionada ? opcionSeleccionada.dataset.metodo : null;
    const grupo = document.getElementById(grupoId);
    const input = document.getElementById(inputId);

    if (metodo && metodo !== 'Efectivo') {
        grupo.style.display = 'block';
        input.required = true;
    } else {
        grupo.style.display = 'none';
        input.required = false;
        input.value = '';
    }
}

function validarConceptoFinanciero(texto) {
    return /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9()\-\s]{1,150}$/.test(texto);
}

// ----------------------------------------------------
// MODAL NUEVO INGRESO
// ----------------------------------------------------

async function abrirModalNuevoIngreso() {
    document.getElementById('formNuevoIngreso').reset();
    document.getElementById('ingresoConcepto').value = 'Ingreso Manual';
    document.getElementById('grupoNumeroOperacionIngreso').style.display = 'none';
    document.getElementById('ingresoNumeroOperacion').required = false;

    const select = document.getElementById('ingresoDestino');
    select.innerHTML = '<option value="">Cargando...</option>';
    document.getElementById('modalNuevoIngreso').style.display = 'flex';

    const data = await obtenerResumenCuentasParaFormulario();
    select.innerHTML = construirOpcionesCuentasYBilleteras(data);
}

function cerrarModalNuevoIngreso() {
    document.getElementById('modalNuevoIngreso').style.display = 'none';
}

async function guardarNuevoIngreso() {
    const concepto = document.getElementById('ingresoConcepto').value.trim();
    const montoTexto = document.getElementById('ingresoMonto').value.trim();
    const destinoValor = document.getElementById('ingresoDestino').value;
    const numeroOperacion = document.getElementById('ingresoNumeroOperacion').value.trim();

    if (!validarConceptoFinanciero(concepto)) {
        Swal.fire({ icon: 'warning', title: 'Concepto inválido', text: 'Ingresa una descripción con letras, números, paréntesis y/o guiones (máx. 150 caracteres).', confirmButtonColor: '#3b82f6' });
        return;
    }

    if (!REGEX_MONTO_DECIMAL_FINANCIERO.test(montoTexto) || Number(montoTexto) <= 0) {
        Swal.fire({ icon: 'warning', title: 'Monto inválido', text: 'Ingresa un monto válido, sin negativos y con máximo 2 decimales.', confirmButtonColor: '#3b82f6' });
        return;
    }

    if (!destinoValor) {
        Swal.fire({ icon: 'warning', title: 'Falta el destino', text: 'Selecciona a dónde ingresa el dinero.', confirmButtonColor: '#3b82f6' });
        return;
    }

    const [tipo_destino, id_destino] = destinoValor.split(':');
    const select = document.getElementById('ingresoDestino');
    const opcionSeleccionada = select.options[select.selectedIndex];
    const metodo = opcionSeleccionada ? opcionSeleccionada.dataset.metodo : null;

    if (metodo !== 'Efectivo' && !numeroOperacion) {
        Swal.fire({ icon: 'warning', title: 'Falta el N° de Operación', text: 'Este destino requiere un número de operación.', confirmButtonColor: '#3b82f6' });
        return;
    }
    if (numeroOperacion && !REGEX_NUMERO_OPERACION_FINANCIERO.test(numeroOperacion)) {
        Swal.fire({ icon: 'warning', title: 'N° de Operación inválido', text: 'Solo letras, números y guiones.', confirmButtonColor: '#3b82f6' });
        return;
    }

    const btn = document.getElementById('btnGuardarNuevoIngreso');
    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch('/api/dashboard-financiero/ingreso-manual', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-profile': sessionData.id_perfil
            },
            body: JSON.stringify({
                concepto,
                monto: montoTexto,
                tipo_destino,
                id_destino,
                numero_operacion: numeroOperacion || null
            })
        });
        const result = await response.json();

        if (result.success) {
            cerrarModalNuevoIngreso();
            Swal.fire({ icon: 'success', title: 'Ingreso registrado', text: 'El ingreso se registró correctamente.', timer: 2000, showConfirmButton: false });
            cargarResumenFinanciero();
            cargarCuentasDetalle();
            cargarFlujoDiario(diasFlujoActual);
            cargarUltimosMovimientos();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message || 'No se pudo registrar el ingreso.', confirmButtonColor: '#3b82f6' });
        }
    } catch (error) {
        console.error('Error al registrar el ingreso:', error);
        Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'Ocurrió un error al registrar el ingreso.', confirmButtonColor: '#3b82f6' });
    } finally {
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }
}

// ----------------------------------------------------
// MODAL NUEVO EGRESO
// ----------------------------------------------------

async function abrirModalNuevoEgreso() {
    document.getElementById('formNuevoEgreso').reset();
    document.getElementById('grupoNumeroOperacionEgreso').style.display = 'none';
    document.getElementById('egresoNumeroOperacion').required = false;
    document.getElementById('egresoSaldoDisponible').textContent = '';

    const select = document.getElementById('egresoOrigen');
    select.innerHTML = '<option value="">Cargando...</option>';
    document.getElementById('modalNuevoEgreso').style.display = 'flex';

    const data = await obtenerResumenCuentasParaFormulario();
    select.innerHTML = construirOpcionesCuentasYBilleteras(data);
}

function cerrarModalNuevoEgreso() {
    document.getElementById('modalNuevoEgreso').style.display = 'none';
}

function onCambioOrigenEgreso() {
    actualizarNumeroOperacionFinanciero('egresoOrigen', 'grupoNumeroOperacionEgreso', 'egresoNumeroOperacion');
    mostrarSaldoDisponible('egresoOrigen', 'egresoSaldoDisponible');
}

function mostrarSaldoDisponible(selectId, hintId) {
    const select = document.getElementById(selectId);
    const opcionSeleccionada = select.options[select.selectedIndex];
    const hint = document.getElementById(hintId);
    if (opcionSeleccionada && opcionSeleccionada.value) {
        hint.textContent = `Saldo disponible: S/ ${Number(opcionSeleccionada.dataset.saldo || 0).toFixed(2)}`;
    } else {
        hint.textContent = '';
    }
}

async function guardarNuevoEgreso() {
    const concepto = document.getElementById('egresoConcepto').value.trim();
    const montoTexto = document.getElementById('egresoMonto').value.trim();
    const origenValor = document.getElementById('egresoOrigen').value;
    const numeroOperacion = document.getElementById('egresoNumeroOperacion').value.trim();

    if (!validarConceptoFinanciero(concepto)) {
        Swal.fire({ icon: 'warning', title: 'Concepto inválido', text: 'Ingresa una descripción con letras, números, paréntesis y/o guiones (máx. 150 caracteres).', confirmButtonColor: '#3b82f6' });
        return;
    }

    if (!REGEX_MONTO_DECIMAL_FINANCIERO.test(montoTexto) || Number(montoTexto) <= 0) {
        Swal.fire({ icon: 'warning', title: 'Monto inválido', text: 'Ingresa un monto válido, sin negativos y con máximo 2 decimales.', confirmButtonColor: '#3b82f6' });
        return;
    }

    if (!origenValor) {
        Swal.fire({ icon: 'warning', title: 'Falta el origen', text: 'Selecciona de dónde sale el dinero.', confirmButtonColor: '#3b82f6' });
        return;
    }

    const [tipo_origen, id_origen] = origenValor.split(':');
    const select = document.getElementById('egresoOrigen');
    const opcionSeleccionada = select.options[select.selectedIndex];
    const metodo = opcionSeleccionada ? opcionSeleccionada.dataset.metodo : null;

    if (metodo !== 'Efectivo' && !numeroOperacion) {
        Swal.fire({ icon: 'warning', title: 'Falta el N° de Operación', text: 'Este origen requiere un número de operación.', confirmButtonColor: '#3b82f6' });
        return;
    }
    if (numeroOperacion && !REGEX_NUMERO_OPERACION_FINANCIERO.test(numeroOperacion)) {
        Swal.fire({ icon: 'warning', title: 'N° de Operación inválido', text: 'Solo letras, números y guiones.', confirmButtonColor: '#3b82f6' });
        return;
    }

    // Chequeo de fondos con datos frescos (el valor cacheado en el <option> pudo quedar
    // desactualizado si hubo otros movimientos mientras el modal estaba abierto).
    const resumenFresco = await obtenerResumenCuentasParaFormulario();
    const saldoDisponible = resolverSaldoDisponibleFinanciero(resumenFresco, metodo, tipo_origen === 'cuenta' ? id_origen : null, tipo_origen === 'billetera' ? id_origen : null);
    if (Number(montoTexto) > saldoDisponible) {
        Swal.fire({ icon: 'error', title: 'Fondos Insuficientes', text: `El origen seleccionado solo tiene S/ ${saldoDisponible.toFixed(2)} disponible.`, confirmButtonColor: '#3b82f6' });
        return;
    }

    const btn = document.getElementById('btnGuardarNuevoEgreso');
    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch('/api/dashboard-financiero/egreso-manual', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-profile': sessionData.id_perfil
            },
            body: JSON.stringify({
                concepto,
                monto: montoTexto,
                tipo_origen,
                id_origen,
                numero_operacion: numeroOperacion || null
            })
        });
        const result = await response.json();

        if (result.success) {
            cerrarModalNuevoEgreso();
            Swal.fire({ icon: 'success', title: 'Egreso registrado', text: 'El egreso se registró correctamente.', timer: 2000, showConfirmButton: false });
            cargarResumenFinanciero();
            cargarCuentasDetalle();
            cargarFlujoDiario(diasFlujoActual);
            cargarDistribucionGastos();
            cargarUltimosMovimientos();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message || 'No se pudo registrar el egreso.', confirmButtonColor: '#3b82f6' });
        }
    } catch (error) {
        console.error('Error al registrar el egreso:', error);
        Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'Ocurrió un error al registrar el egreso.', confirmButtonColor: '#3b82f6' });
    } finally {
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }
}

// ----------------------------------------------------
// MODAL TRANSFERENCIA INTERNA
// ----------------------------------------------------

async function abrirModalTransferenciaInterna() {
    document.getElementById('formTransferenciaInterna').reset();
    document.getElementById('transferenciaConcepto').value = 'Transferencia entre cuentas propias';
    document.getElementById('transferenciaSaldoDisponible').textContent = '';

    const selectOrigen = document.getElementById('transferenciaOrigen');
    const selectDestino = document.getElementById('transferenciaDestino');
    selectOrigen.innerHTML = '<option value="">Cargando...</option>';
    selectDestino.innerHTML = '<option value="">Cargando...</option>';
    document.getElementById('modalTransferenciaInterna').style.display = 'flex';

    const data = await obtenerResumenCuentasParaFormulario();
    const opciones = construirOpcionesCuentasYBilleteras(data);
    selectOrigen.innerHTML = opciones;
    selectDestino.innerHTML = opciones;
}

function cerrarModalTransferenciaInterna() {
    document.getElementById('modalTransferenciaInterna').style.display = 'none';
}

function onCambioOrigenTransferencia() {
    mostrarSaldoDisponible('transferenciaOrigen', 'transferenciaSaldoDisponible');
}

// Resuelve el saldo disponible de un método de pago (Efectivo -> Caja Física; Billetera
// Digital -> billetera independiente o, si está vinculada a una cuenta, el saldo combinado
// de esa cuenta; Transferencia -> la cuenta bancaria seleccionada) contra datos frescos.
function resolverSaldoDisponibleFinanciero(resumenCuentas, metodo, idCuentaSeleccionada, idBilleteraSeleccionada) {
    if (!resumenCuentas) return 0;

    if (metodo === 'Efectivo') {
        return resumenCuentas.caja_fisica ? Number(resumenCuentas.caja_fisica.saldo) : 0;
    }

    if (metodo === 'Billetera Digital') {
        const cuentaVinculada = resumenCuentas.cuentas_bancarias.find(c =>
            c.billetera_vinculada && String(c.billetera_vinculada.id_billetera) === String(idBilleteraSeleccionada)
        );
        if (cuentaVinculada) return Number(cuentaVinculada.saldo);

        const billeteraIndependiente = resumenCuentas.billeteras_independientes.find(b =>
            String(b.id_billetera) === String(idBilleteraSeleccionada)
        );
        return billeteraIndependiente ? Number(billeteraIndependiente.saldo) : 0;
    }

    if (String(idCuentaSeleccionada) === String(resumenCuentas.caja_fisica && resumenCuentas.caja_fisica.id_cuenta)) {
        return Number(resumenCuentas.caja_fisica.saldo);
    }
    const cuenta = resumenCuentas.cuentas_bancarias.find(c => String(c.id_cuenta) === String(idCuentaSeleccionada));
    return cuenta ? Number(cuenta.saldo) : 0;
}

async function guardarTransferenciaInterna() {
    const concepto = document.getElementById('transferenciaConcepto').value.trim();
    const montoTexto = document.getElementById('transferenciaMonto').value.trim();
    const origenValor = document.getElementById('transferenciaOrigen').value;
    const destinoValor = document.getElementById('transferenciaDestino').value;
    const numeroOperacion = document.getElementById('transferenciaNumeroOperacion').value.trim();

    if (!validarConceptoFinanciero(concepto)) {
        Swal.fire({ icon: 'warning', title: 'Concepto inválido', text: 'Ingresa una descripción con letras, números, paréntesis y/o guiones (máx. 150 caracteres).', confirmButtonColor: '#3b82f6' });
        return;
    }

    if (!REGEX_MONTO_DECIMAL_FINANCIERO.test(montoTexto) || Number(montoTexto) <= 0) {
        Swal.fire({ icon: 'warning', title: 'Monto inválido', text: 'Ingresa un monto válido, sin negativos y con máximo 2 decimales.', confirmButtonColor: '#3b82f6' });
        return;
    }

    if (!origenValor || !destinoValor) {
        Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Selecciona el origen y el destino de la transferencia.', confirmButtonColor: '#3b82f6' });
        return;
    }

    if (origenValor === destinoValor) {
        Swal.fire({ icon: 'warning', title: 'Origen y destino iguales', text: 'El origen y el destino no pueden ser la misma cuenta.', confirmButtonColor: '#3b82f6' });
        return;
    }

    if (numeroOperacion && !REGEX_NUMERO_OPERACION_FINANCIERO.test(numeroOperacion)) {
        Swal.fire({ icon: 'warning', title: 'N° de Operación inválido', text: 'Solo letras, números y guiones.', confirmButtonColor: '#3b82f6' });
        return;
    }

    const [tipo_origen, id_origen] = origenValor.split(':');
    const [tipo_destino, id_destino] = destinoValor.split(':');

    const selectOrigen = document.getElementById('transferenciaOrigen');
    const opcionOrigen = selectOrigen.options[selectOrigen.selectedIndex];
    const metodoOrigen = opcionOrigen ? opcionOrigen.dataset.metodo : null;

    // Chequeo de fondos con datos frescos (el valor cacheado en el <option> pudo quedar
    // desactualizado si hubo otros movimientos mientras el modal estaba abierto).
    const resumenFresco = await obtenerResumenCuentasParaFormulario();
    const saldoDisponible = resolverSaldoDisponibleFinanciero(resumenFresco, metodoOrigen, tipo_origen === 'cuenta' ? id_origen : null, tipo_origen === 'billetera' ? id_origen : null);
    if (Number(montoTexto) > saldoDisponible) {
        Swal.fire({ icon: 'error', title: 'Fondos Insuficientes', text: `El origen seleccionado solo tiene S/ ${saldoDisponible.toFixed(2)} disponible.`, confirmButtonColor: '#3b82f6' });
        return;
    }

    const btn = document.getElementById('btnGuardarTransferenciaInterna');
    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Transfiriendo...';

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch('/api/dashboard-financiero/transferencia-interna', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-profile': sessionData.id_perfil
            },
            body: JSON.stringify({
                concepto,
                monto: montoTexto,
                tipo_origen,
                id_origen,
                tipo_destino,
                id_destino,
                numero_operacion: numeroOperacion || null
            })
        });
        const result = await response.json();

        if (result.success) {
            cerrarModalTransferenciaInterna();
            Swal.fire({ icon: 'success', title: 'Transferencia realizada', text: 'La transferencia se registró correctamente.', timer: 2000, showConfirmButton: false });
            cargarResumenFinanciero();
            cargarCuentasDetalle();
            cargarFlujoDiario(diasFlujoActual);
            cargarUltimosMovimientos();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message || 'No se pudo realizar la transferencia.', confirmButtonColor: '#3b82f6' });
        }
    } catch (error) {
        console.error('Error al realizar la transferencia:', error);
        Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'Ocurrió un error al realizar la transferencia.', confirmButtonColor: '#3b82f6' });
    } finally {
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }
}

async function cargarResumenFinanciero() {
    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch('/api/dashboard-financiero/resumen', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();

        if (result.success && result.data) {
            const data = result.data;
            document.getElementById('cardSaldoTotal').textContent = 'S/ ' + Number(data.saldo_total_disponible).toFixed(2);
            document.getElementById('cardIngresosMes').textContent = 'S/ ' + Number(data.ingresos_mes).toFixed(2);
            document.getElementById('cardEgresosMes').textContent = 'S/ ' + Number(data.egresos_mes).toFixed(2);

            const rentabilidad = Number(data.rentabilidad);
            const cardRentabilidad = document.getElementById('cardRentabilidad');
            const cardRentabilidadWrapper = document.getElementById('cardRentabilidadWrapper');
            cardRentabilidad.textContent = 'S/ ' + rentabilidad.toFixed(2);
            cardRentabilidadWrapper.style.background = rentabilidad >= 0
                ? 'linear-gradient(135deg, #065f46, #10b981)'
                : 'linear-gradient(135deg, #9a3412, #ef4444)';
        }
    } catch (error) {
        console.error('Error al cargar el resumen financiero:', error);
    }
}

// ----------------------------------------------------
// DETALLE POR CUENTA / BILLETERA (acordeón)
// ----------------------------------------------------

async function cargarCuentasDetalle() {
    const contenedor = document.getElementById('contenedorCuentasDetalle');
    if (!contenedor) return;

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch('/api/dashboard-financiero/cuentas-resumen', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();

        if (result.success && result.data) {
            renderSeccionesCuentas(result.data);
        } else {
            contenedor.innerHTML = `<div style="color:#ef4444; padding:20px; text-align:center;">${result.message || 'No se pudo cargar el detalle de cuentas.'}</div>`;
        }
    } catch (error) {
        console.error('Error al cargar el detalle de cuentas:', error);
        contenedor.innerHTML = `<div style="color:#ef4444; padding:20px; text-align:center;">Error de conexión al cargar el detalle de cuentas.</div>`;
    }
}

function renderSeccionesCuentas(data) {
    const contenedor = document.getElementById('contenedorCuentasDetalle');

    let html = '';

    html += tituloSeccion('fa-cash-register', '#10b981', 'Caja Física');
    html += data.caja_fisica
        ? tarjetaCuentaHTML(data.caja_fisica)
        : mensajeVacio('No se ha registrado la caja física.');

    html += tituloSeccion('fa-university', '#3b82f6', 'Cuentas Bancarias');
    html += data.cuentas_bancarias.length
        ? data.cuentas_bancarias.map(tarjetaCuentaHTML).join('')
        : mensajeVacio('No hay cuentas bancarias registradas.');

    html += tituloSeccion('fa-mobile-alt', '#8b5cf6', 'Billeteras Independientes');
    html += data.billeteras_independientes.length
        ? data.billeteras_independientes.map(tarjetaBilleteraHTML).join('')
        : mensajeVacio('No hay billeteras independientes registradas.');

    contenedor.innerHTML = html;
}

function tituloSeccion(icono, color, texto) {
    return `<h3 style="font-size:15px; font-weight:700; color:var(--text-primary); margin:20px 0 12px; display:flex; align-items:center; gap:8px;"><i class="fas ${icono}" style="color:${color};"></i> ${texto}</h3>`;
}

function mensajeVacio(texto) {
    return `<p style="color:var(--text-secondary); font-size:13px; margin-bottom:20px;">${texto}</p>`;
}

function crearTarjetaHTML({ key, tipo, id, icono, colorPrimario, colorFondo, titulo, subtitulo, saldo, badgeExtra }) {
    const colorSaldo = Number(saldo) >= 0 ? '#16a34a' : '#dc2626';

    return `
    <div style="border:1px solid var(--border-light); border-radius:12px; margin-bottom:12px; overflow:hidden; background:white;">
        <div class="header-cuenta-financiera" data-toggle="${key}" data-tipo="${tipo}" data-id="${id}" style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; cursor:pointer; background:${colorFondo || '#f8fafc'}; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:44px; height:44px; border-radius:10px; background:${colorPrimario || '#64748b'}; display:flex; align-items:center; justify-content:center; color:white; font-size:18px; flex-shrink:0;">
                    <i class="fas ${icono}"></i>
                </div>
                <div>
                    <div style="font-weight:700; color:var(--text-primary); font-size:14px;">${titulo}</div>
                    <div style="font-size:12px; color:var(--text-secondary);">${subtitulo}</div>
                    ${badgeExtra || ''}
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:16px;">
                <div style="text-align:right;">
                    <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Saldo Actual</div>
                    <div style="font-size:18px; font-weight:800; color:${colorSaldo};">S/ ${Number(saldo).toFixed(2)}</div>
                </div>
                <i class="fas fa-chevron-down icono-toggle-cuenta" style="color:var(--text-muted); transition: transform 0.2s;"></i>
            </div>
        </div>
        <div id="body-${key}" style="display:none; padding:20px; border-top:1px solid var(--border-light); background:#fbfcfd;">
            <div id="contenido-${key}">
                <div style="text-align:center; color:#94a3b8; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Cargando movimientos...</div>
            </div>
        </div>
    </div>`;
}

function tarjetaCuentaHTML(cuenta) {
    const key = `cuenta-${cuenta.id_cuenta}`;
    const badgeExtra = cuenta.billetera_vinculada
        ? `<span style="display:inline-flex; align-items:center; gap:4px; margin-top:4px; background:#ede9fe; color:#7c3aed; padding:2px 8px; border-radius:12px; font-size:10px; font-weight:700;"><i class="fas fa-link"></i> ${cuenta.billetera_vinculada.proveedor} · ${cuenta.billetera_vinculada.numero_celular}</span>`
        : '';

    return crearTarjetaHTML({
        key,
        tipo: 'cuenta',
        id: cuenta.id_cuenta,
        icono: cuenta.es_sistema === 1 ? 'fa-cash-register' : 'fa-university',
        colorPrimario: cuenta.color_primario,
        colorFondo: cuenta.color_fondo,
        titulo: `${cuenta.entidad_financiera || 'Cuenta'} — ${cuenta.tipo_cuenta}`,
        subtitulo: `${cuenta.nro_cuenta} · ${cuenta.titular}`,
        saldo: cuenta.saldo,
        badgeExtra
    });
}

function tarjetaBilleteraHTML(billetera) {
    const key = `billetera-${billetera.id_billetera}`;

    return crearTarjetaHTML({
        key,
        tipo: 'billetera',
        id: billetera.id_billetera,
        icono: 'fa-mobile-alt',
        colorPrimario: billetera.color_primario,
        colorFondo: billetera.color_fondo,
        titulo: billetera.proveedor,
        subtitulo: `${billetera.numero_celular} · ${billetera.titular}`,
        saldo: billetera.saldo,
        badgeExtra: ''
    });
}

function inicializarToggleCuentas() {
    const contenedor = document.getElementById('contenedorCuentasDetalle');
    if (!contenedor) return;

    contenedor.addEventListener('click', (e) => {
        const header = e.target.closest('.header-cuenta-financiera');
        if (!header) return;

        const key = header.dataset.toggle;
        const body = document.getElementById(`body-${key}`);
        const icono = header.querySelector('.icono-toggle-cuenta');
        if (!body) return;

        const expandido = body.style.display === 'block';
        body.style.display = expandido ? 'none' : 'block';
        if (icono) icono.style.transform = expandido ? 'rotate(0deg)' : 'rotate(180deg)';

        if (!expandido) {
            cargarMovimientosParaTarjeta(key, header.dataset.tipo, header.dataset.id);
        }
    });
}

async function cargarMovimientosParaTarjeta(key, tipo, id) {
    if (movimientosCacheFinanciero[key]) {
        renderContenidoMovimientos(key, movimientosCacheFinanciero[key], tipo === 'cuenta');
        return;
    }

    const contenedor = document.getElementById(`contenido-${key}`);

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const url = tipo === 'cuenta'
            ? `/api/dashboard-financiero/cuentas/${id}/movimientos`
            : `/api/dashboard-financiero/billeteras/${id}/movimientos`;

        const response = await fetch(url, { headers: { 'x-user-profile': sessionData.id_perfil } });
        const result = await response.json();

        if (result.success) {
            movimientosCacheFinanciero[key] = result.data;
            renderContenidoMovimientos(key, result.data, tipo === 'cuenta');
        } else {
            contenedor.innerHTML = `<div style="color:#ef4444; padding:12px; text-align:center;">${result.message}</div>`;
        }
    } catch (error) {
        console.error('Error al cargar movimientos:', error);
        contenedor.innerHTML = `<div style="color:#ef4444; padding:12px; text-align:center;">Error de conexión.</div>`;
    }
}

function renderContenidoMovimientos(key, data, mostrarCanal) {
    const contenedor = document.getElementById(`contenido-${key}`);
    if (!contenedor) return;

    const colCanal = mostrarCanal ? '<th class="tabla-th">Canal</th>' : '';

    contenedor.innerHTML = `
        <div style="margin-bottom:24px;">
            <h4 style="font-size:12px; font-weight:700; color:#16a34a; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;"><i class="fas fa-arrow-down"></i> Ingresos</h4>
            <div class="tabla-scroll">
                <table id="tabla-ingresos-${key}" class="tabla-modulo display" style="width:100%;">
                    <thead>
                        <tr>
                            <th class="tabla-th">Fecha</th>
                            <th class="tabla-th">Concepto</th>
                            <th class="tabla-th">Monto</th>
                            <th class="tabla-th">Método</th>
                            ${colCanal}
                            <th class="tabla-th">N° Operación</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
        <div>
            <h4 style="font-size:12px; font-weight:700; color:#dc2626; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;"><i class="fas fa-arrow-up"></i> Egresos</h4>
            <div class="tabla-scroll">
                <table id="tabla-egresos-${key}" class="tabla-modulo display" style="width:100%;">
                    <thead>
                        <tr>
                            <th class="tabla-th">Fecha</th>
                            <th class="tabla-th">Concepto</th>
                            <th class="tabla-th">Monto</th>
                            <th class="tabla-th">Método</th>
                            ${colCanal}
                            <th class="tabla-th">N° Operación</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    `;

    crearDataTableMovimientos(`tabla-ingresos-${key}`, data.ingresos, mostrarCanal);
    crearDataTableMovimientos(`tabla-egresos-${key}`, data.egresos, mostrarCanal);
}

function crearDataTableMovimientos(idTabla, movimientos, mostrarCanal) {
    const columnas = [
        { data: 'fecha_movimiento', render: (d) => formatearFechaHora(d) },
        { data: 'concepto', render: (d) => d || '-' },
        { data: 'monto', render: (m) => 'S/ ' + Number(m).toFixed(2) },
        { data: 'metodo_pago', render: (d) => d || '-' }
    ];

    if (mostrarCanal) {
        columnas.push({ data: 'canal', render: (d) => d || '-' });
    }

    columnas.push({ data: 'numero_operacion', render: (d) => d || '-' });

    dtInstanciasFinanciero[idTabla] = window.$(`#${idTabla}`).DataTable({
        data: movimientos,
        language: { url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json' },
        pageLength: 5,
        lengthMenu: [5, 10, 25, 50],
        order: [[0, 'desc']],
        columns: columnas
    });
}

function formatearFechaHora(fecha) {
    if (!fecha) return '-';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

// ----------------------------------------------------
// GRÁFICOS ESTADÍSTICOS
// ----------------------------------------------------

function cargarChartJsSiFalta(callback) {
    if (window.Chart) {
        callback();
        return;
    }
    if (document.querySelector('script[src*="chart.js"]')) {
        // Ya se está cargando (otra tarjeta lo disparó primero): esperar a que termine.
        document.querySelector('script[src*="chart.js"]').addEventListener('load', callback);
        return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js';
    script.onload = callback;
    document.head.appendChild(script);
}

function formatearFechaCortaEje(fechaStr) {
    const d = new Date(fechaStr + 'T00:00:00');
    const texto = d.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: '2-digit' });
    return texto.charAt(0).toUpperCase() + texto.slice(1).replace('.', '');
}

async function cargarFlujoDiario(dias) {
    diasFlujoActual = dias;

    document.querySelectorAll('.btn-rango-flujo').forEach(btn => {
        const activo = Number(btn.dataset.dias) === dias;
        btn.style.background = activo ? 'white' : 'transparent';
        btn.style.color = activo ? '#1e293b' : '#64748b';
        btn.style.boxShadow = activo ? '0 1px 2px rgba(0,0,0,0.08)' : 'none';
    });

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch(`/api/dashboard-financiero/flujo-diario?dias=${dias}`, {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();

        if (result.success) {
            renderChartFlujoDiario(result.data);
        }
    } catch (error) {
        console.error('Error al cargar el flujo diario:', error);
    }
}

function renderChartFlujoDiario(data) {
    cargarChartJsSiFalta(() => {
        const ctx = document.getElementById('chartFlujoDiario');
        if (!ctx) return;

        const labels = data.map(d => formatearFechaCortaEje(d.fecha));
        const ingresos = data.map(d => Number(d.ingresos));
        // Los egresos se grafican como negativos para que "caigan" bajo la línea base:
        // así el lector ve de un vistazo qué días entra más plata (barra arriba) vs.
        // qué días sale más (barra abajo), sin depender solo del color.
        const egresos = data.map(d => -Number(d.egresos));

        if (chartFlujoDiario) {
            chartFlujoDiario.data.labels = labels;
            chartFlujoDiario.data.datasets[0].data = ingresos;
            chartFlujoDiario.data.datasets[1].data = egresos;
            chartFlujoDiario.update();
            return;
        }

        chartFlujoDiario = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Ingresos', data: ingresos, backgroundColor: '#10b981', borderRadius: 4, borderSkipped: false, maxBarThickness: 24 },
                    { label: 'Egresos', data: egresos, backgroundColor: '#ef4444', borderRadius: 4, borderSkipped: false, maxBarThickness: 24 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (item) => `${item.dataset.label}: S/ ${Math.abs(item.raw).toFixed(2)}`
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#898781', font: { size: 11 } } },
                    y: {
                        grid: { color: '#e1e0d9' },
                        ticks: {
                            color: '#898781',
                            font: { size: 11 },
                            callback: (value) => 'S/ ' + Math.abs(value).toLocaleString('es-PE')
                        }
                    }
                }
            }
        });
    });
}

const CATEGORIAS_GASTO = {
    LIQUIDACION: { color: '#2a78d6', label: 'Liquidaciones a Transportistas' },
    GASTO_OPERATIVO: { color: '#1baf7a', label: 'Gastos Operativos' },
    ADELANTOS: { color: '#eda100', label: 'Adelantos a Transportistas' },
    SINIESTROS: { color: '#e34948', label: 'Siniestros / Grúas' },
    GASTOS_ADMINISTRATIVOS: { color: '#4a3aa7', label: 'Gastos Administrativos' },
    MANUAL: { color: '#898781', label: 'Otros / Manual' }
};

async function cargarDistribucionGastos() {
    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch('/api/dashboard-financiero/distribucion-gastos', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();

        if (result.success) {
            renderChartDistribucionGastos(result.data);
        }
    } catch (error) {
        console.error('Error al cargar la distribución de gastos:', error);
    }
}

function renderChartDistribucionGastos(data) {
    cargarChartJsSiFalta(() => {
        const ctx = document.getElementById('chartDistribucionGastos');
        const leyenda = document.getElementById('leyendaDistribucionGastos');
        if (!ctx || !leyenda) return;

        if (!data.length) {
            ctx.parentElement.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:40px 0;">Sin egresos registrados este mes.</div>';
            leyenda.innerHTML = '';
            return;
        }

        const total = data.reduce((acc, d) => acc + Number(d.total), 0);
        const labels = data.map(d => (CATEGORIAS_GASTO[d.modulo_origen] || {}).label || d.modulo_origen);
        const colores = data.map(d => (CATEGORIAS_GASTO[d.modulo_origen] || {}).color || '#94a3b8');
        const montos = data.map(d => Number(d.total));

        leyenda.innerHTML = data.map((d, i) => {
            const pct = total > 0 ? ((montos[i] / total) * 100).toFixed(1) : '0.0';
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
                    <span style="display:flex; align-items:center; gap:8px; color:var(--text-primary); font-weight:600; min-width:0;">
                        <span style="width:10px; height:10px; border-radius:2px; background:${colores[i]}; display:inline-block; flex-shrink:0;"></span>
                        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${labels[i]}</span>
                    </span>
                    <span style="color:var(--text-secondary); font-weight:700; white-space:nowrap;">S/ ${montos[i].toFixed(2)} <span style="color:#94a3b8; font-weight:500;">(${pct}%)</span></span>
                </div>
            `;
        }).join('');

        if (chartDistribucionGastos) {
            chartDistribucionGastos.data.labels = labels;
            chartDistribucionGastos.data.datasets[0].data = montos;
            chartDistribucionGastos.data.datasets[0].backgroundColor = colores;
            chartDistribucionGastos.update();
            return;
        }

        chartDistribucionGastos = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data: montos, backgroundColor: colores, borderColor: '#ffffff', borderWidth: 2 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (item) => {
                                const pct = total > 0 ? ((Number(item.raw) / total) * 100).toFixed(1) : '0.0';
                                return ` S/ ${Number(item.raw).toFixed(2)} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    });
}

// ----------------------------------------------------
// ÚLTIMOS MOVIMIENTOS
// ----------------------------------------------------

async function cargarUltimosMovimientos() {
    const tbody = document.getElementById('tbodyUltimosMovimientos');
    if (!tbody) return;

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch('/api/dashboard-financiero/ultimos-movimientos', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();

        if (result.success && result.data) {
            renderUltimosMovimientos(result.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#ef4444; padding:20px;">${result.message || 'No se pudieron cargar los movimientos.'}</td></tr>`;
        }
    } catch (error) {
        console.error('Error al cargar últimos movimientos:', error);
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#ef4444; padding:20px;">Error de conexión.</td></tr>`;
    }
}

// Movimientos ya renderizados (Top 10 + historial completo), indexados por
// id_movimiento, para poder abrir el modal de auditoría de anulación sin volver a
// pedirlos al servidor ni tener que serializar el objeto entero en el onclick.
let movimientosIndexados = {};

// Construye el <tr> de un movimiento — compartido entre la tabla "Top 10" del
// dashboard y el historial completo del modal, para no duplicar la plantilla.
function construirFilaMovimiento(m) {
    const isAnulado = m.estado === 0;
    const isEgreso = !m.tipo_movimiento.includes('INGRESO');
    const colorTipo = isAnulado ? '#94a3b8' : (isEgreso ? '#ef4444' : '#10b981');

    const badgeTipo = `<span style="background:${colorTipo}20; color:${colorTipo}; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:700; white-space:nowrap;">
        <i class="fas ${isEgreso ? 'fa-arrow-up' : 'fa-arrow-down'}"></i> ${m.tipo_movimiento}
    </span>`;

    const rowStyle = isAnulado ? 'opacity: 0.75;' : '';

    const colorMonto = isAnulado ? '#94a3b8' : (isEgreso ? '#ef4444' : 'var(--text-primary)');
    const prefijoMonto = isEgreso ? '- S/' : 'S/';

    let displayMonto = `${prefijoMonto} ${m.monto.toFixed(2)}`;
    if (isAnulado) {
        displayMonto = `<span style="text-decoration: line-through;">${displayMonto}</span>`;
    }

    const badgeEstado = isAnulado
        ? `<button type="button" onclick="verAuditoriaAnulacion(${m.id_movimiento})" title="Ver detalle de la anulación" style="cursor: pointer; font-size: 11px; padding: 4px 10px; background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; white-space: nowrap;"><i class="fas fa-undo" style="margin-right: 4px;"></i> Anulado</button>`
        : `<span style="font-size: 11px; padding: 4px 10px; background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; white-space: nowrap;"><i class="fas fa-check-circle" style="margin-right: 4px;"></i> Completado</span>`;

    const fechaObj = new Date(m.fecha_movimiento);
    const fechaTexto = fechaObj.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
    const horaTexto = fechaObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }).toLowerCase();
    const displayFecha = `<div style="text-align:center; white-space:nowrap;">
                            <div style="font-size:13px; font-weight:500; color: #1e293b;">${fechaTexto}</div>
                            <div style="font-size:11px; color:#94a3b8; margin-top:2px;">${horaTexto}</div>
                          </div>`;

    return `
        <tr class="tabla-tr" style="${rowStyle}">
            <td class="tabla-td">${badgeTipo}</td>
            <td class="tabla-td">
                <div style="font-weight:600; color:var(--text-primary); font-size:13px; max-width:200px; white-space:normal; overflow-wrap:break-word;">${m.concepto || '-'}</div>
            </td>
            <td class="tabla-td" style="font-weight:700; color:${colorMonto}; white-space:nowrap;">
                ${displayMonto}
            </td>
            <td class="tabla-td" style="font-size:12px; white-space:nowrap;">${m.metodo_pago || '-'}</td>
            <td class="tabla-td">
                <div style="font-size:12px; font-weight:600; color:var(--brand-blue); white-space:nowrap;">${m.cuenta_afectada}</div>
            </td>
            <td class="tabla-td" style="font-size:12px; color:var(--text-secondary); white-space:nowrap;">${m.modulo_origen || '-'}</td>
            <td class="tabla-td">
                ${m.numero_operacion ? `<span class="tabla-mono">${m.numero_operacion}</span>` : '-'}
            </td>
            <td class="tabla-td">${displayFecha}</td>
            <td class="tabla-td" style="font-size:12px; color:var(--text-secondary); white-space:nowrap;"><i class="fas fa-user" style="font-size:10px; margin-right:4px;"></i>${m.usuario}</td>
            <td class="tabla-td" style="text-align: center; white-space: nowrap;">${badgeEstado}</td>
        </tr>
    `;
}

function renderUltimosMovimientos(movimientos) {
    const tbody = document.getElementById('tbodyUltimosMovimientos');

    if (movimientos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-secondary); padding:30px;">No hay movimientos recientes.</td></tr>`;
        return;
    }

    movimientos.forEach(m => { movimientosIndexados[m.id_movimiento] = m; });
    tbody.innerHTML = movimientos.map(construirFilaMovimiento).join('');
}

// ----------------------------------------------------
// HISTORIAL COMPLETO DE MOVIMIENTOS (modal)
// ----------------------------------------------------

let historialMovimientosGlobal = [];

function abrirModalHistorialMovimientos() {
    document.getElementById('modalHistorialMovimientos').style.display = 'flex';
    cargarHistorialMovimientos();
}

function cerrarModalHistorialMovimientos() {
    document.getElementById('modalHistorialMovimientos').style.display = 'none';
}

async function cargarHistorialMovimientos() {
    const tbody = document.getElementById('tbodyHistorialMovimientos');
    if (!tbody) return;

    if ($.fn.DataTable.isDataTable('#tabla-historial-movimientos')) {
        $('#tabla-historial-movimientos').DataTable().destroy();
    }
    tbody.innerHTML = `<tr class="tabla-estado-fila"><td colspan="9"><i class="fas fa-spinner fa-spin fa-2x"></i><p style="margin-top:10px;">Cargando movimientos...</p></td></tr>`;

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
        const response = await fetch('/api/dashboard-financiero/todos-movimientos', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const result = await response.json();

        if (result.success && result.data) {
            historialMovimientosGlobal = result.data;
            renderHistorialMovimientos(historialMovimientosGlobal);
        } else {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#ef4444; padding:20px;">${result.message || 'No se pudieron cargar los movimientos.'}</td></tr>`;
        }
    } catch (error) {
        console.error('Error al cargar el historial de movimientos:', error);
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#ef4444; padding:20px;">Error de conexión.</td></tr>`;
    }
}

function renderHistorialMovimientos(movimientos) {
    const tbody = document.getElementById('tbodyHistorialMovimientos');

    if (movimientos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-secondary); padding:30px;">No hay movimientos registrados.</td></tr>`;
        return;
    }

    movimientos.forEach(m => { movimientosIndexados[m.id_movimiento] = m; });
    tbody.innerHTML = movimientos.map(construirFilaMovimiento).join('');

    // Filtro de fechas personalizado (mismo patrón que el historial de pagos de
    // Indemnizaciones): se registra una sola vez en la extensión global de DataTables.
    if (!$.fn.dataTable.ext.search.includes(filtroRangoFechasMovimientos)) {
        $.fn.dataTable.ext.search.push(filtroRangoFechasMovimientos);
    }

    $('#filtro-fecha-desde-mov, #filtro-fecha-hasta-mov').off('change').on('change', function() {
        if ($.fn.DataTable.isDataTable('#tabla-historial-movimientos')) {
            $('#tabla-historial-movimientos').DataTable().draw();
        }
    });

    const tablaMovimientos = $('#tabla-historial-movimientos').DataTable({
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
        },
        order: [[7, 'desc']],
        pageLength: 15,
        lengthMenu: [[15, 25, 50, -1], [15, 25, 50, "Todos"]],
        dom: 'rt<"bottom-controls"ilp>',
        columnDefs: [
            { className: "dt-right", targets: 2 }, // Monto a la derecha
            { className: "dt-center", targets: [0, 5, 6, 7, 9] }
        ]
    });

    // Buscador propio (no el `f` de DataTables), igual que en Indemnizaciones.
    $('#buscador-historial-movimientos').off('keyup change').on('keyup change', function() {
        tablaMovimientos.search(this.value).draw();
    });
}

function filtroRangoFechasMovimientos(settings, data, dataIndex) {
    if (settings.nTable.id !== 'tabla-historial-movimientos') return true;

    const minDateStr = $('#filtro-fecha-desde-mov').val();
    const maxDateStr = $('#filtro-fecha-hasta-mov').val();

    if (!minDateStr && !maxDateStr) return true;

    const rowData = historialMovimientosGlobal[dataIndex];
    if (!rowData) return true;

    const rowDate = new Date(rowData.fecha_movimiento);
    rowDate.setHours(0, 0, 0, 0);

    if (minDateStr) {
        const minDate = new Date(minDateStr + 'T00:00:00');
        if (rowDate < minDate) return false;
    }
    if (maxDateStr) {
        const maxDate = new Date(maxDateStr + 'T23:59:59');
        if (rowDate > maxDate) return false;
    }
    return true;
}

function limpiarFiltroFechasMovimientos() {
    $('#filtro-fecha-desde-mov').val('');
    $('#filtro-fecha-hasta-mov').val('');
    if ($.fn.DataTable.isDataTable('#tabla-historial-movimientos')) {
        $('#tabla-historial-movimientos').DataTable().draw();
    }
}

// ----------------------------------------------------
// AUDITORÍA DE ANULACIÓN (quién anuló, cuándo y por qué)
// ----------------------------------------------------

function verAuditoriaAnulacion(idMovimiento) {
    const m = movimientosIndexados[idMovimiento];
    if (!m) return;

    let html;
    if (m.motivo_anulacion) {
        const fechaObj = new Date(m.fecha_anulacion);
        const fechaTexto = fechaObj.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
            + ' ' + fechaObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

        html = `
            <div style="display:flex; flex-direction:column; gap:14px;">
                <div>
                    <span style="font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">Anulado por</span>
                    <p style="margin:4px 0 0; font-size:14px; font-weight:600; color:var(--text-primary);">
                        <i class="fas fa-user" style="margin-right:6px; color:var(--text-muted);"></i>${m.usuario_anulacion || 'Desconocido'}
                    </p>
                </div>
                <div>
                    <span style="font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">Fecha de anulación</span>
                    <p style="margin:4px 0 0; font-size:14px; color:var(--text-primary);">
                        <i class="far fa-clock" style="margin-right:6px; color:var(--text-muted);"></i>${fechaTexto}
                    </p>
                </div>
                <div>
                    <span style="font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">Motivo</span>
                    <p style="margin:6px 0 0; font-size:13px; color:var(--text-primary); background:#f8fafc; border:1px solid var(--border-light); border-radius:8px; padding:12px; line-height:1.5;">${m.motivo_anulacion}</p>
                </div>
            </div>
        `;
    } else {
        html = `
            <div style="text-align:center; padding:24px 12px; color:var(--text-muted);">
                <i class="fas fa-circle-info" style="font-size:24px; margin-bottom:10px; display:block;"></i>
                <p style="margin:0; font-size:13px;">No hay información de auditoría disponible para esta anulación.</p>
            </div>
        `;
    }

    document.getElementById('contenidoAuditoriaAnulacion').innerHTML = html;
    document.getElementById('modalAuditoriaAnulacion').style.display = 'flex';
}

function cerrarModalAuditoriaAnulacion() {
    document.getElementById('modalAuditoriaAnulacion').style.display = 'none';
}
