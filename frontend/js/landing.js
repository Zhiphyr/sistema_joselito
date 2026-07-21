let cotizacionActualId = null;
let productosCatalogoLanding = [];

document.addEventListener('DOMContentLoaded', () => {
    // Cargar rutas
    fetch('/api/landing/rutas')
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                const select = document.getElementById('cot-ruta');
                select.innerHTML = '<option value="">Seleccione una ruta</option>';
                data.rutas.forEach(r => {
                    const opt = document.createElement('option');
                    opt.value = r.id_ruta;
                    opt.textContent = `${r.ciudad_origen} -> ${r.ciudad_destino}`;
                    select.appendChild(opt);
                });
            }
        });

    // Cargar catálogo de productos para el select de cada fila
    fetch('/api/landing/productos')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                productosCatalogoLanding = data.productos;
                refrescarSelectsProductoLanding();
            }
        });

    initValidations();

    // Agregar la primera fila de producto
    agregarProductoCotizacion();
    
    // Boton de la landing para abrir
    const btnsCotizar = document.querySelectorAll('a[href="#cotizar"]');
    btnsCotizar.forEach(b => {
        b.addEventListener('click', (e) => {
            e.preventDefault();
            abrirCotizador();
        });
    });

    document.getElementById('form-cotizador').addEventListener('submit', (e) => {
        e.preventDefault();
        calcularCotizacion();
    });

    document.getElementById('btn-whatsapp-cot').addEventListener('click', enviarWhatsApp);
});

function abrirCotizador() {
    document.getElementById('modal-cotizador').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function cerrarCotizador() {
    document.getElementById('modal-cotizador').style.display = 'none';
    document.body.style.overflow = '';
}

function resetCotizador() {
    // 1. Limpiar formulario
    document.getElementById('form-cotizador').reset();
    
    // 2. Habilitar inputs y selects
    const formInputs = document.querySelectorAll('#form-cotizador input, #form-cotizador select');
    formInputs.forEach(input => input.disabled = false);
    
    // 3. Restaurar botones ocultos
    const btnAdd = document.querySelector('button[onclick="agregarProductoCotizacion()"]');
    if (btnAdd) btnAdd.style.display = 'inline-flex';
    
    // 4. Limpiar lista de productos y añadir uno vacío
    const lista = document.getElementById('lista-productos');
    lista.innerHTML = '';
    agregarProductoCotizacion();
    
    // 5. Ocultar resultado y mostrar footer
    document.getElementById('resultado-cotizacion').style.display = 'none';
    document.querySelector('#form-cotizador .modal-footer').style.display = 'block';
    
    // 6. Resetear variable
    cotizacionActualId = null;
}

function opcionesProductoLandingHTML() {
    let html = '<option value="">Seleccione un producto...</option>';
    html += productosCatalogoLanding.map(p => `<option value="${p.id_producto}">${p.nombre}</option>`).join('');
    html += '<option value="otro">Otro (no está en la lista)</option>';
    return html;
}

function refrescarSelectsProductoLanding() {
    document.querySelectorAll('.prod-select').forEach(select => {
        const valorActual = select.value;
        select.innerHTML = opcionesProductoLandingHTML();
        select.value = valorActual;
    });
}

function agregarProductoCotizacion() {
    const lista = document.getElementById('lista-productos');
    const index = lista.children.length;

    const html = `
        <div class="producto-row">
            <div style="display: flex; gap: 12px; align-items: flex-end;">
                <div style="flex: 3;">
                    <label style="display: block; margin-bottom: 4px; font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Nombre de producto</label>
                    <select class="prod-select" required>${opcionesProductoLandingHTML()}</select>
                    <div class="prod-otro-wrap" style="display: none; gap: 8px; align-items: center;">
                        <input type="text" class="prod-nombre-otro" placeholder="EJ. CAJAS DE MANZANA" autocomplete="off" style="flex: 1;">
                        <button type="button" class="btn-volver-select" title="Elegir del catálogo"><i class="fas fa-list"></i></button>
                    </div>
                    <input type="hidden" class="prod-nombre" value="">
                    <input type="hidden" class="prod-id-producto" value="">
                </div>
                <div style="flex: 1.5;">
                    <label style="display: block; margin-bottom: 4px; font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Peso Unit.(Kg)</label>
                    <input type="text" inputmode="decimal" class="prod-peso" required placeholder="Ej. 10.5">
                </div>
                <div style="width: 70px; flex-shrink: 0;">
                    <label style="display: block; margin-bottom: 4px; font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Cantidad</label>
                    <input type="number" class="prod-cant" required min="1" placeholder="Ej. 5">
                </div>
                ${index > 0 ? `<button type="button" onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #ef4444; font-size: 16px; cursor: pointer; transition: color 0.3s; margin-bottom: 10px;" onmouseover="this.style.color='#f87171'" onmouseout="this.style.color='#ef4444'"><i class="fas fa-trash"></i></button>` : `<div style="width: 16px;"></div>`}
            </div>
            <div style="margin-top: 12px; margin-bottom: 4px;">
                <label style="font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Opciones del producto</label>
            </div>
            <div class="checkbox-group" style="margin-top: 0;">
                <label class="chip-label">
                    <input type="checkbox" class="prod-fragil">
                    <span>Frágil</span>
                </label>
                <label class="chip-label">
                    <input type="checkbox" class="prod-perecible">
                    <span>Perecible</span>
                </label>
            </div>
        </div>
    `;
    lista.insertAdjacentHTML('beforeend', html);
}

function formatMoneda(valor) {
    return 'S/ ' + parseFloat(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function calcularCotizacion() {
    const nombres = document.getElementById('cot-nombre').value;
    const telefono = document.getElementById('cot-telefono').value;
    const correo = document.getElementById('cot-correo').value;
    const id_ruta = document.getElementById('cot-ruta').value;

    const sitioWeb = document.getElementById('cot-sitio-web').value;

    const filas = document.querySelectorAll('.producto-row');
    const productos = [];
    for (const f of filas) {
        const nombre = f.querySelector('.prod-nombre').value.trim();
        const idProducto = f.querySelector('.prod-id-producto').value;

        if (!nombre) {
            alert('Seleccione o especifique el nombre de cada producto a transportar.');
            return;
        }

        productos.push({
            nombre,
            id_producto: idProducto ? Number(idProducto) : null,
            peso_unitario: parseFloat(f.querySelector('.prod-peso').value),
            cantidad: parseInt(f.querySelector('.prod-cant').value),
            fragil: f.querySelector('.prod-fragil').checked,
            perecible: f.querySelector('.prod-perecible').checked
        });
    }

    try {
        const response = await fetch('/api/landing/cotizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_ruta, nombres, telefono, correo, productos, sitio_web: sitioWeb
            })
        });

        const data = await response.json();
        if (data.success) {
            document.getElementById('monto-estimado').textContent = `${formatMoneda(data.min)} - ${formatMoneda(data.max)}`;
            document.getElementById('resultado-cotizacion').style.display = 'block';
            document.querySelector('#form-cotizador .modal-footer').style.display = 'none';
            cotizacionActualId = data.id_cotizacion;

            // Deshabilitar todos los inputs y selects
            const formInputs = document.querySelectorAll('#form-cotizador input, #form-cotizador select');
            formInputs.forEach(input => input.disabled = true);
            
            // Ocultar botones de añadir y eliminar
            const btnAdd = document.querySelector('button[onclick="agregarProductoCotizacion()"]');
            if (btnAdd) btnAdd.style.display = 'none';
            
            const btnsDelete = document.querySelectorAll('.producto-row button');
            btnsDelete.forEach(btn => btn.style.display = 'none');

        } else {
            alert(data.message || 'Ocurrió un error al calcular');
        }
    } catch (e) {
        console.error(e);
        alert('Error de conexión');
    }
}

function enviarWhatsApp() {
    const telefonoDestino = "51947010376"; // Teléfono de la empresa (según la web)
    const min = document.getElementById('monto-estimado').textContent;
    
    let mensaje = `Hola Transporte Joselito, acabo de realizar una cotización en línea (ID: ${cotizacionActualId}).%0A`;
    mensaje += `El monto estimado que me salió es de *${min}*.%0A`;
    mensaje += `Me gustaría confirmar los detalles y solicitar el servicio.`;

    window.open(`https://wa.me/${telefonoDestino}?text=${mensaje}`, '_blank');
}

function initValidations() {
    const nombreInput = document.getElementById('cot-nombre');
    const telefonoInput = document.getElementById('cot-telefono');

    if (nombreInput) {
        nombreInput.addEventListener('input', function() {
            let val = this.value;
            val = val.toUpperCase();
            val = val.replace(/[^A-ZÑ\s]/g, ''); // Solo letras (incluye Ñ) y espacios
            val = val.replace(/\s{2,}/g, ' '); // Evitar espacios dobles
            this.value = val;
        });
        nombreInput.addEventListener('blur', function() {
            this.value = this.value.trim(); // Eliminar espacios al final
        });
    }

    if (telefonoInput) {
        telefonoInput.addEventListener('input', function() {
            let val = this.value;
            val = val.replace(/\D/g, ''); // Solo numeros
            if (val.length > 0 && val[0] !== '9') {
                val = '9' + val.substring(1); // Forzar que empiece con 9
            }
            if (val.length > 9) val = val.substring(0, 9); // Max 9 digitos
            this.value = val;
        });
    }

    const staticPhoneInput = document.getElementById('static-phone');
    if (staticPhoneInput) {
        staticPhoneInput.addEventListener('input', function() {
            let val = this.value;
            val = val.replace(/\D/g, ''); // Solo numeros
            if (val.length > 0 && val[0] !== '9') {
                val = '9' + val.substring(1); // Forzar que empiece con 9
            }
            if (val.length > 9) val = val.substring(0, 9); // Max 9 digitos
            this.value = val;
        });
    }

    // Cambiar entre "producto del catálogo" y "otro" (texto libre) con event delegation
    document.getElementById('lista-productos').addEventListener('change', function(e) {
        if (e.target.classList.contains('prod-select')) {
            const fila = e.target.closest('.producto-row');
            const wrapOtro = fila.querySelector('.prod-otro-wrap');
            const inputOtro = fila.querySelector('.prod-nombre-otro');
            const hiddenNombre = fila.querySelector('.prod-nombre');
            const hiddenId = fila.querySelector('.prod-id-producto');

            if (e.target.value === 'otro') {
                e.target.style.display = 'none';
                wrapOtro.style.display = 'flex';
                inputOtro.value = '';
                hiddenNombre.value = '';
                hiddenId.value = '';
                inputOtro.focus();
            } else if (e.target.value === '') {
                wrapOtro.style.display = 'none';
                inputOtro.value = '';
                hiddenNombre.value = '';
                hiddenId.value = '';
            } else {
                wrapOtro.style.display = 'none';
                inputOtro.value = '';
                const match = productosCatalogoLanding.find(p => String(p.id_producto) === e.target.value);
                hiddenNombre.value = match ? match.nombre : '';
                hiddenId.value = e.target.value;
            }
        }
    });

    // Frágil y Perecible son mutuamente excluyentes
    document.getElementById('lista-productos').addEventListener('change', function(e) {
        if (e.target.classList.contains('prod-fragil') || e.target.classList.contains('prod-perecible')) {
            if (!e.target.checked) return;
            const fila = e.target.closest('.producto-row');
            const otra = e.target.classList.contains('prod-fragil')
                ? fila.querySelector('.prod-perecible')
                : fila.querySelector('.prod-fragil');
            if (otra) otra.checked = false;
        }
    });

    // Volver del modo "texto libre" al select del catálogo
    document.getElementById('lista-productos').addEventListener('click', function(e) {
        const btnVolver = e.target.closest('.btn-volver-select');
        if (btnVolver) {
            const fila = btnVolver.closest('.producto-row');
            const select = fila.querySelector('.prod-select');
            const wrapOtro = fila.querySelector('.prod-otro-wrap');
            const inputOtro = fila.querySelector('.prod-nombre-otro');
            const hiddenNombre = fila.querySelector('.prod-nombre');
            const hiddenId = fila.querySelector('.prod-id-producto');

            wrapOtro.style.display = 'none';
            inputOtro.value = '';
            hiddenNombre.value = '';
            hiddenId.value = '';
            select.value = '';
            select.style.display = 'block';
            select.focus();
        }
    });

    // Validar productos dinámicos con event delegation
    document.getElementById('lista-productos').addEventListener('input', function(e) {
        if (e.target.classList.contains('prod-nombre-otro')) {
            let val = e.target.value;
            val = val.toUpperCase();
            val = val.replace(/[^A-ZÑ0-9\s]/g, ''); // Letras (incluye Ñ) y numeros permitidos, sin tildes ni simbolos
            val = val.replace(/\s{2,}/g, ' '); // Sin espacios dobles
            e.target.value = val;

            e.target.closest('.producto-row').querySelector('.prod-nombre').value = val.trim();
        }

        if (e.target.classList.contains('prod-peso')) {
            filtrarDecimalConCursor(e.target, 8, 2);
        }

        if (e.target.classList.contains('prod-cant')) {
            let val = e.target.value;
            // Solo numeros enteros
            val = val.replace(/\D/g, '');
            // Eliminar ceros iniciales (para evitar 0005)
            if (val.startsWith('0')) {
                val = val.replace(/^0+/, '');
            }
            // Maximo 4 digitos
            if (val.length > 4) {
                val = val.substring(0, 4);
            }
            e.target.value = val;
        }
    });

    document.getElementById('lista-productos').addEventListener('blur', function(e) {
        if (e.target.classList.contains('prod-nombre-otro')) {
            const val = e.target.value.trim();
            e.target.value = val;
            e.target.closest('.producto-row').querySelector('.prod-nombre').value = val;
        }
        if (e.target.classList.contains('prod-peso')) {
            let val = parseFloat(e.target.value);
            if (!isNaN(val)) {
                e.target.value = val.toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1');
            }
        }
    }, true);
}

// Filtra un input de decimal (solo dígitos + 1 punto, con límites de enteros/decimales)
// preservando la posición del cursor para que no "salte" al final al escribir.
function filtrarDecimalConCursor(input, maxEnteros, maxDecimales) {
    const cursorPos = input.selectionStart;
    const valorAntes = input.value.slice(0, cursorPos);

    let val = input.value.replace(/[^0-9.]/g, '');

    const partes = val.split('.');
    if (partes.length > 2) {
        val = partes[0] + '.' + partes.slice(1).join('');
    }

    let [entero, decimal] = val.split('.');
    entero = entero || '';
    if (entero.length > maxEnteros) entero = entero.slice(0, maxEnteros);
    if (decimal !== undefined && decimal.length > maxDecimales) decimal = decimal.slice(0, maxDecimales);

    val = decimal !== undefined ? `${entero}.${decimal}` : entero;

    const validosAntes = (valorAntes.match(/[0-9.]/g) || []).length;
    const nuevaPos = Math.min(validosAntes, val.length);

    input.value = val;
    input.setSelectionRange(nuevaPos, nuevaPos);
}

function enviarDatosEstatico() {
    const toast = document.getElementById('toast-notification');
    const form = document.getElementById('static-form');
    
    // Mostrar Toast
    toast.classList.add('show');
    
    // Limpiar form
    if (form) {
        form.reset();
    }

    // Ocultar despues de 4 segundos
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}
