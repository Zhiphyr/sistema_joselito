let contadorViajes = 0;
window.opcionesCamiones = [];
window.opcionesRutas = [];
window.opcionesClientes = [];
window.opcionesProductos = [];

// Estado en memoria de las cargas por cada viaje activo. Formato: { "vista-viaje-1": [ { ...carga1 }, { ...carga2 } ] }
window.cargasPorViaje = {};
window.idViajeModalActivo = null;

/**
 * Inicializador de la vista Registro de Viajes
 * Es invocado dinámicamente por cargarVistaSPA en dashboard.js
 */
async function init_registro_viajes() {
    contadorViajes = 0; // Resetear al entrar a la vista
    window.cargasPorViaje = {}; // Limpiar estado de memoria
    
    // Cargar catálogos (camiones, rutas, clientes, productos activos)
    await cargarCatalogosViajes();
    
    const btnCrear = document.getElementById('btnCrearNuevoViaje');
    if (btnCrear) {
        btnCrear.addEventListener('click', () => {
            mostrarPantallaInicioViaje();
            crearNuevaPestaniaViaje();
        });
    }

    const btnAgregarOtro = document.getElementById('btnAgregarOtroViaje');
    if (btnAgregarOtro) {
        btnAgregarOtro.addEventListener('click', crearNuevaPestaniaViaje);
    }
}

/**
 * Carga los catálogos necesarios desde el backend para los selectores
 */
async function cargarCatalogosViajes() {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    
    try {
        // Camiones
        const resCamiones = await fetch('http://localhost:3000/api/camiones', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const jsonCamiones = await resCamiones.json();
        if (resCamiones.ok && jsonCamiones.success) {
            window.opcionesCamiones = jsonCamiones.data.filter(c => c.estado === 1);
        }

        // Rutas
        const resRutas = await fetch('http://localhost:3000/api/rutas', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const jsonRutas = await resRutas.json();
        if (resRutas.ok && jsonRutas.success) {
            window.opcionesRutas = jsonRutas.data.filter(r => r.estado === 1);
        }

        // Clientes
        const resClientes = await fetch('http://localhost:3000/api/clientes', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const jsonClientes = await resClientes.json();
        if (resClientes.ok && jsonClientes.success) {
            window.opcionesClientes = jsonClientes.data.filter(c => c.estado === 1);
            poblarSelectoresClientesModal();
        }

        // Productos
        const resProductos = await fetch('http://localhost:3000/api/productos', {
            headers: { 'x-user-profile': sessionData.id_perfil }
        });
        const jsonProductos = await resProductos.json();
        if (resProductos.ok && jsonProductos.success) {
            window.opcionesProductos = jsonProductos.data.filter(p => p.estado === 1);
        }
    } catch (error) {
        console.error("Error al cargar catálogos para viajes:", error);
    }
}

function poblarSelectoresClientesModal() {
    const selectRem = document.getElementById('select-remitente-modal');
    const selectDest = document.getElementById('select-destinatario-modal');
    
    if (!selectRem || !selectDest) return;

    selectRem.innerHTML = '<option value="">Seleccione un cliente remitente...</option>';
    selectDest.innerHTML = '<option value="">Seleccione un cliente destinatario...</option>';

    window.opcionesClientes.forEach(c => {
        const optionHTML = `<option value="${c.id_cliente}">${c.nombre_razon_social} (${c.numero_documento})</option>`;
        selectRem.innerHTML += optionHTML;
        selectDest.innerHTML += optionHTML;
    });
}

/**
 * Transición de la pantalla de inicio a la interfaz de pestañas
 */
function mostrarPantallaInicioViaje() {
    const pantallaInicio = document.getElementById('pantallaInicioViaje');
    const interfazTabs = document.getElementById('interfazTabsViaje');
    
    if (pantallaInicio && interfazTabs) {
        // Fade out
        pantallaInicio.style.opacity = '0';
        
        setTimeout(() => {
            pantallaInicio.style.display = 'none';
            interfazTabs.style.display = 'flex';
            
            // Forzar reflow para aplicar la opacidad
            void interfazTabs.offsetWidth;
            
            // Fade in
            interfazTabs.style.opacity = '1';
        }, 300);
    }
}

/**
 * Transición de vuelta a la pantalla vacía
 */
function mostrarPantallaVacia() {
    const pantallaInicio = document.getElementById('pantallaInicioViaje');
    const interfazTabs = document.getElementById('interfazTabsViaje');
    
    if (pantallaInicio && interfazTabs) {
        interfazTabs.style.opacity = '0';
        
        setTimeout(() => {
            interfazTabs.style.display = 'none';
            pantallaInicio.style.display = 'flex';
            
            void pantallaInicio.offsetWidth;
            
            pantallaInicio.style.opacity = '1';
        }, 300);
    }
}

/**
 * Crea una nueva pestaña y la activa
 */
function crearNuevaPestaniaViaje() {
    contadorViajes++;
    const idViaje = `vista-viaje-${contadorViajes}`;
    
    // Iniciar memoria vacía para este viaje
    window.cargasPorViaje[idViaje] = [];
    
    // 1. Crear el botón de pestaña
    const contenedorBotones = document.getElementById('contenedor-botones-pestanias');
    const tabBtn = document.createElement('button');
    tabBtn.className = 'tab-btn';
    tabBtn.dataset.targetId = idViaje;
    
    tabBtn.innerHTML = `
        Viaje ${contadorViajes}
        <span class="tab-close" title="Cerrar pestaña">&times;</span>
    `;
    
    // Activar pestaña al hacer clic
    tabBtn.addEventListener('click', (e) => {
        if (!e.target.classList.contains('tab-close')) {
            activarPestania(idViaje);
        }
    });

    // Cerrar pestaña al hacer clic en 'x'
    const closeBtn = tabBtn.querySelector('.tab-close');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cerrarPestania(idViaje, tabBtn);
    });

    contenedorBotones.appendChild(tabBtn);

    // 2. Clonar el template del formulario
    const template = document.getElementById('template-viaje');
    const contenedorPestanias = document.getElementById('contenido-pestanias-viaje');
    
    const clone = template.content.cloneNode(true);
    const divContenido = clone.querySelector('.vista-viaje');
    divContenido.id = idViaje;
    
    // Llenar selectores dinámicamente con los catálogos en caché
    const selectCamion = divContenido.querySelector('.select-camion');
    const selectRuta = divContenido.querySelector('.select-ruta');
    
    if (selectCamion) {
        window.opcionesCamiones.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id_camion;
            opt.textContent = `${c.placa} - Conductor: ${c.conductor}`;
            selectCamion.appendChild(opt);
        });
    }

    if (selectRuta) {
        window.opcionesRutas.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.id_ruta;
            opt.textContent = `${r.ciudad_origen} a ${r.ciudad_destino}`;
            selectRuta.appendChild(opt);
        });
    }

    contenedorPestanias.appendChild(clone);

    // 3. Activar la nueva pestaña
    activarPestania(idViaje);
}

/**
 * Muestra el contenido de la pestaña seleccionada
 */
function activarPestania(id) {
    // Quitar estado activo a todos los botones
    const botones = document.querySelectorAll('.tab-btn');
    botones.forEach(btn => btn.classList.remove('activa'));

    // Ocultar todos los formularios (Retención de datos con display: none)
    const contenidos = document.querySelectorAll('.vista-viaje');
    contenidos.forEach(div => div.style.display = 'none');

    // Activar el botón seleccionado
    const btnActivo = document.querySelector(`.tab-btn[data-target-id="${id}"]`);
    if (btnActivo) {
        btnActivo.classList.add('activa');
    }

    // Mostrar el formulario seleccionado
    const divActivo = document.getElementById(id);
    if (divActivo) {
        divActivo.style.display = 'block';
    }
}

/**
 * Cierra y destruye la pestaña especificada
 */
function cerrarPestania(id, btnElement) {
    const eraActiva = btnElement.classList.contains('activa');
    
    // Limpiar memoria
    delete window.cargasPorViaje[id];

    // Destruir botón y formulario del DOM
    btnElement.remove();
    const divContenido = document.getElementById(id);
    if (divContenido) {
        divContenido.remove();
    }

    const botonesRestantes = document.querySelectorAll('.tab-btn');
    
    if (botonesRestantes.length === 0) {
        // Si no quedan pestañas, regresamos a la pantalla de inicio
        mostrarPantallaVacia();
        contadorViajes = 0; // Opcional, pero mantiene orden lógico
    } else if (eraActiva) {
        // Si cerramos la pestaña activa, activamos la última abierta
        const ultimoBoton = botonesRestantes[botonesRestantes.length - 1];
        activarPestania(ultimoBoton.dataset.targetId);
    }
}


/* ==========================================================
   LÓGICA DEL MODAL DE CARGAS Y SUB-FORMULARIOS DE PRODUCTOS
   ========================================================== */

function abrirModalNuevaCarga(btnElement) {
    // 1. Identificar a qué viaje pertenece este botón
    const vistaViaje = btnElement.closest('.vista-viaje');
    if (!vistaViaje) return;
    
    window.idViajeModalActivo = vistaViaje.id;

    // 2. Leer Flete Global
    const inputFleteGlobal = vistaViaje.querySelector('.flete-global-input');
    const fleteGlobal = parseFloat(inputFleteGlobal.value);

    if (isNaN(fleteGlobal) || fleteGlobal <= 0) {
        if (window.Swal) {
            Swal.fire({ icon: 'warning', title: 'Atención', text: 'Por favor, defina un Precio de Flete Global válido antes de registrar cargas.' });
        } else {
            alert('Por favor, defina un Precio de Flete Global válido antes de registrar cargas.');
        }
        inputFleteGlobal.focus();
        return;
    }

    // 3. Preparar UI del modal
    document.getElementById('texto-flete-global-modal').textContent = `S/ ${fleteGlobal.toFixed(2)}`;
    document.getElementById('select-remitente-modal').value = '';
    document.getElementById('select-destinatario-modal').value = '';
    
    const contenedorItems = document.getElementById('contenedor-items-carga');
    contenedorItems.innerHTML = ''; // Limpiar bloques anteriores

    // 4. Agregar un primer bloque por defecto
    agregarBloqueProducto();

    // 5. Mostrar Modal
    document.getElementById('modalNuevaCarga').style.display = 'flex';
}

function cerrarModalNuevaCarga() {
    document.getElementById('modalNuevaCarga').style.display = 'none';
    window.idViajeModalActivo = null;
}

function agregarBloqueProducto() {
    const contenedor = document.getElementById('contenedor-items-carga');
    const idBloque = 'bloque-prod-' + Date.now() + Math.floor(Math.random() * 100);

    // Opciones de productos
    let optionsProductosHTML = '<option value="">Seleccione producto...</option>';
    window.opcionesProductos.forEach(p => {
        optionsProductosHTML += `<option value="${p.id_producto}">${p.nombre}</option>`;
    });

    const html = `
        <div id="${idBloque}" class="bloque-producto" style="border: 1px solid var(--border-light); padding: 16px; border-radius: var(--radius-md); background-color: #fafafa; position: relative;">
            
            <button type="button" onclick="eliminarBloqueProducto('${idBloque}')" style="position: absolute; top: 12px; right: 12px; background: none; border: none; color: #ef4444; font-size: 16px; cursor: pointer;" title="Eliminar producto">
                <i class="fas fa-trash-alt"></i>
            </button>

            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 12px;">Producto</label>
                    <select class="form-control prod-select" required>
                        ${optionsProductosHTML}
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 12px;">Cantidad</label>
                    <input type="number" min="1" step="1" class="form-control prod-cant" placeholder="0" required>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 12px;">Peso x Unid. (kg)</label>
                    <input type="number" min="0.01" step="0.01" class="form-control prod-peso" placeholder="0.00" required>
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px; padding-top: 12px; border-top: 1px dashed var(--border-light);">
                <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-primary); cursor: pointer; margin-bottom: 0;">
                    <input type="checkbox" class="prod-check-flete" style="width: 16px; height: 16px;">
                    Flete personalizado para este producto
                </label>
                <div style="flex: 1; max-width: 200px;">
                    <div class="input-group" style="display: flex; align-items: center;">
                        <span style="padding: 0 8px; font-size: 13px; color: var(--text-muted);">S/</span>
                        <input type="number" step="0.01" class="form-control prod-flete-custom" placeholder="0.00" disabled style="padding-left: 4px;">
                        <span style="padding: 0 8px; font-size: 13px; color: var(--text-muted);">/ kg</span>
                    </div>
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 24px; padding: 12px; background-color: var(--brand-blue-light); border-radius: var(--radius-md);">
                <div style="font-size: 13px; color: var(--text-secondary);">
                    Peso Total: <strong class="texto-peso-total" style="color: var(--text-primary);">0.00 kg</strong>
                </div>
                <div style="font-size: 13px; color: var(--text-secondary);">
                    Flete Calculado: <strong class="texto-flete-calculado" style="color: var(--brand-blue);">S/ 0.00</strong>
                </div>
            </div>

        </div>
    `;

    // Inyectar al final
    contenedor.insertAdjacentHTML('beforeend', html);

    // Asignar eventos en tiempo real a este nuevo bloque
    const bloqueEl = document.getElementById(idBloque);
    
    const inputCant = bloqueEl.querySelector('.prod-cant');
    const inputPeso = bloqueEl.querySelector('.prod-peso');
    const checkFlete = bloqueEl.querySelector('.prod-check-flete');
    const inputFleteCustom = bloqueEl.querySelector('.prod-flete-custom');

    const inputsReactivoss = [inputCant, inputPeso, inputFleteCustom];
    inputsReactivoss.forEach(inp => inp.addEventListener('input', () => calcularTotalesBloque(bloqueEl)));

    checkFlete.addEventListener('change', (e) => {
        if (e.target.checked) {
            inputFleteCustom.disabled = false;
            inputFleteCustom.required = true;
        } else {
            inputFleteCustom.disabled = true;
            inputFleteCustom.required = false;
            inputFleteCustom.value = '';
        }
        calcularTotalesBloque(bloqueEl);
    });
}

function eliminarBloqueProducto(idBloque) {
    const bloque = document.getElementById(idBloque);
    if (bloque) {
        bloque.remove();
    }
}

function calcularTotalesBloque(bloqueEl) {
    if (!window.idViajeModalActivo) return;

    const vistaViaje = document.getElementById(window.idViajeModalActivo);
    const fleteGlobal = parseFloat(vistaViaje.querySelector('.flete-global-input').value) || 0;

    const cant = parseFloat(bloqueEl.querySelector('.prod-cant').value) || 0;
    const pesoU = parseFloat(bloqueEl.querySelector('.prod-peso').value) || 0;
    const isCustom = bloqueEl.querySelector('.prod-check-flete').checked;
    const fleteCustom = parseFloat(bloqueEl.querySelector('.prod-flete-custom').value) || 0;

    // Fórmulas
    const pesoTotal = cant * pesoU;
    const tarifaAplicada = isCustom && fleteCustom > 0 ? fleteCustom : fleteGlobal;
    const fleteCalculado = pesoTotal * tarifaAplicada;

    // Actualizar Textos
    bloqueEl.querySelector('.texto-peso-total').textContent = `${pesoTotal.toFixed(2)} kg`;
    bloqueEl.querySelector('.texto-flete-calculado').textContent = `S/ ${fleteCalculado.toFixed(2)}`;
    
    // Guardar dataset para acceso rápido después
    bloqueEl.dataset.pesoTotal = pesoTotal;
    bloqueEl.dataset.tarifa = tarifaAplicada;
    bloqueEl.dataset.fleteCalculado = fleteCalculado;
}

function guardarCargaEnMemoria() {
    const idRemitente = document.getElementById('select-remitente-modal').value;
    const idDestinatario = document.getElementById('select-destinatario-modal').value;

    if (!idRemitente || !idDestinatario) {
        Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Seleccione Remitente y Destinatario.' });
        return;
    }

    if (idRemitente === idDestinatario) {
        Swal.fire({ icon: 'warning', title: 'Inconsistencia', text: 'El remitente no puede ser igual al destinatario.' });
        return;
    }

    const bloques = document.querySelectorAll('#contenedor-items-carga .bloque-producto');
    if (bloques.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Sin productos', text: 'Añada al menos un producto a la carga.' });
        return;
    }

    let productos = [];
    let hayErrores = false;
    let sumaPesoTotal = 0;
    let sumaFleteTotal = 0;

    bloques.forEach(b => {
        const idProd = b.querySelector('.prod-select').value;
        const nombreProd = b.querySelector('.prod-select').options[b.querySelector('.prod-select').selectedIndex].text;
        const cant = parseFloat(b.querySelector('.prod-cant').value);
        const pesoU = parseFloat(b.querySelector('.prod-peso').value);

        if (!idProd || isNaN(cant) || cant <= 0 || isNaN(pesoU) || pesoU <= 0) {
            hayErrores = true;
        } else {
            const pesoTot = parseFloat(b.dataset.pesoTotal || 0);
            const fleteTot = parseFloat(b.dataset.fleteCalculado || 0);
            const tarifa = parseFloat(b.dataset.tarifa || 0);

            const isCustom = b.querySelector('.prod-check-flete').checked;

            sumaPesoTotal += pesoTot;
            sumaFleteTotal += fleteTot;

            productos.push({
                id_producto: idProd,
                nombre_producto: nombreProd,
                cantidad: cant,
                peso_unidad: pesoU,
                peso_total: pesoTot,
                tarifa_flete: tarifa,
                flete_total: fleteTot,
                es_personalizado: isCustom
            });
        }
    });

    if (hayErrores) {
        Swal.fire({ icon: 'error', title: 'Datos inválidos', text: 'Revise que todos los productos seleccionados tengan cantidad y peso mayor a cero.' });
        return;
    }

    const remNombre = document.getElementById('select-remitente-modal').options[document.getElementById('select-remitente-modal').selectedIndex].text;
    const destNombre = document.getElementById('select-destinatario-modal').options[document.getElementById('select-destinatario-modal').selectedIndex].text;

    const nuevaCarga = {
        id_carga_temp: 'carga-' + Date.now(),
        id_remitente: idRemitente,
        nombre_remitente: remNombre,
        id_destinatario: idDestinatario,
        nombre_destinatario: destNombre,
        productos: productos,
        resumen: {
            total_peso: sumaPesoTotal,
            total_flete: sumaFleteTotal
        }
    };

    // Guardar en memoria
    const idViajeActual = window.idViajeModalActivo;
    window.cargasPorViaje[idViajeActual].push(nuevaCarga);

    cerrarModalNuevaCarga();
    
    // Renderizar
    renderizarCargasViaje(idViajeActual);
}

function renderizarCargasViaje(idViaje) {
    const vista = document.getElementById(idViaje);
    if (!vista) return;

    const contenedorCargas = vista.querySelector('.contenedor-cargas-renderizadas');
    const estadoVacio = vista.querySelector('.estado-vacio-cargas');
    const listaCargas = window.cargasPorViaje[idViaje] || [];

    if (listaCargas.length === 0) {
        contenedorCargas.style.display = 'none';
        estadoVacio.style.display = 'flex';
        contenedorCargas.innerHTML = '';
        return;
    }

    // Hay cargas
    estadoVacio.style.display = 'none';
    contenedorCargas.style.display = 'flex';
    contenedorCargas.innerHTML = '';

    listaCargas.forEach((carga, index) => {
        let tbodyHtml = '';
        let totalCant = 0;
        carga.productos.forEach(p => {
            totalCant += p.cantidad;
            const badgePersonalizado = p.es_personalizado ? `<span style="background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 12px; font-size: 10px; font-weight: 600; margin-left: 8px;">Personalizado</span>` : '';
            tbodyHtml += `
                <tr style="border-bottom: 1px solid var(--border-light);">
                    <td style="padding: 14px 16px; font-size: 13px; font-weight: 600; color: var(--text-primary); text-transform: uppercase;">${p.nombre_producto}${badgePersonalizado}</td>
                    <td style="padding: 14px 16px; font-size: 13px; text-align: center; color: var(--text-secondary);">${p.cantidad}</td>
                    <td style="padding: 14px 16px; font-size: 13px; text-align: right; color: var(--text-secondary);">${p.peso_unidad.toFixed(0)} kg</td>
                    <td style="padding: 14px 16px; font-size: 13px; text-align: right; font-weight: 700; color: var(--text-primary);">${p.peso_total.toFixed(2)} kg</td>
                    <td style="padding: 14px 16px; font-size: 13px; text-align: right; color: var(--text-secondary);">S/ ${p.tarifa_flete.toFixed(2)}</td>
                    <td style="padding: 14px 16px; font-size: 13px; text-align: right; font-weight: 700; color: var(--brand-blue);">S/ ${p.flete_total.toFixed(2)}</td>
                </tr>
            `;
        });

        const cardHtml = `
            <div style="border: 1px solid var(--border-light); border-radius: var(--radius-lg); background: #fff; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 16px;">
                <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center;">
                        <span style="background-color: #e0f2fe; color: var(--brand-blue); padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 12px;">Carga ${index + 1}</span>
                        ${carga.nombre_remitente} <span style="color: var(--text-muted); margin: 0 12px;">&rarr;</span> ${carga.nombre_destinatario}
                    </div>
                    <div>
                        <button class="btn-action btn-edit" title="Editar" style="color: var(--text-muted);"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn-action btn-delete" title="Eliminar" style="color: var(--text-muted);"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
                
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="border-bottom: 1px solid var(--border-light);">
                            <tr>
                                <th style="padding: 12px 16px; text-align: left; font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Producto</th>
                                <th style="padding: 12px 16px; text-align: center; font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Cant.</th>
                                <th style="padding: 12px 16px; text-align: right; font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Peso (u)</th>
                                <th style="padding: 12px 16px; text-align: right; font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Kilos Tot.</th>
                                <th style="padding: 12px 16px; text-align: right; font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Flete x Kg</th>
                                <th style="padding: 12px 16px; text-align: right; font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Flete Tot.</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tbodyHtml}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td style="padding: 16px; text-align: left; font-size: 14px; font-weight: 700; color: var(--text-primary);">Totales de Carga</td>
                                <td style="padding: 16px; text-align: center; font-size: 14px; font-weight: 700; color: var(--brand-blue);">${totalCant} und</td>
                                <td></td>
                                <td style="padding: 16px; text-align: right; font-size: 14px; font-weight: 700; color: var(--brand-blue);">${carga.resumen.total_peso.toFixed(2)} kg</td>
                                <td></td>
                                <td style="padding: 16px; text-align: right; font-size: 15px; font-weight: 700; color: #16a34a;">S/ ${carga.resumen.total_flete.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
        
        contenedorCargas.insertAdjacentHTML('beforeend', cardHtml);
    });

    actualizarTotalesGenerales(vista, listaCargas);
}

function actualizarTotalesGenerales(vista, listaCargas) {
    let pesoTotalViaje = 0;
    let fleteTotalViaje = 0;
    
    listaCargas.forEach(c => {
        pesoTotalViaje += c.resumen.total_peso;
        fleteTotalViaje += c.resumen.total_flete;
    });

    const spanPeso = vista.querySelector('.texto-peso-total-viaje');
    const spanFlete = vista.querySelector('.texto-flete-total-viaje');
    
    if (spanPeso) spanPeso.textContent = pesoTotalViaje.toFixed(2);
    if (spanFlete) spanFlete.textContent = fleteTotalViaje.toFixed(2);

    const badgeContador = vista.querySelector('.badge-contador-cargas');
    if (badgeContador) {
        if (listaCargas.length > 0) {
            badgeContador.textContent = listaCargas.length;
            badgeContador.style.display = 'inline-block';
        } else {
            badgeContador.style.display = 'none';
        }
    }
}

// Hacer disponible globalmente
window.init_registro_viajes = init_registro_viajes;
window.mostrarPantallaInicioViaje = mostrarPantallaInicioViaje;
window.crearNuevaPestaniaViaje = crearNuevaPestaniaViaje;
window.activarPestania = activarPestania;
window.cerrarPestania = cerrarPestania;
window.abrirModalNuevaCarga = abrirModalNuevaCarga;
window.cerrarModalNuevaCarga = cerrarModalNuevaCarga;
window.agregarBloqueProducto = agregarBloqueProducto;
window.eliminarBloqueProducto = eliminarBloqueProducto;
window.guardarCargaEnMemoria = guardarCargaEnMemoria;
