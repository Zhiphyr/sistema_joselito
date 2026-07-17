let cotizacionActualId = null;

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
}

function cerrarCotizador() {
    document.getElementById('modal-cotizador').style.display = 'none';
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

function agregarProductoCotizacion() {
    const lista = document.getElementById('lista-productos');
    const index = lista.children.length;
    
    const html = `
        <div class="producto-row">
            <div style="display: flex; gap: 12px; align-items: flex-end;">
                <div style="flex: 3;">
                    <label style="display: block; margin-bottom: 4px; font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Nombre de producto</label>
                    <input type="text" class="prod-nombre" required placeholder="EJ. CAJAS DE MANZANA" autocomplete="off">
                </div>
                <div style="flex: 1.5;">
                    <label style="display: block; margin-bottom: 4px; font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Peso Unit.(Kg)</label>
                    <input type="number" class="prod-peso" required min="0.1" step="0.01" placeholder="Ej. 10.5">
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
                <label class="chip-label">
                    <input type="checkbox" class="prod-mudanza">
                    <span>Mudanza</span>
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

    const filas = document.querySelectorAll('.producto-row');
    const productos = [];
    filas.forEach(f => {
        productos.push({
            nombre: f.querySelector('.prod-nombre').value,
            peso_unitario: parseFloat(f.querySelector('.prod-peso').value),
            cantidad: parseInt(f.querySelector('.prod-cant').value),
            fragil: f.querySelector('.prod-fragil').checked,
            perecible: f.querySelector('.prod-perecible').checked,
            mudanza: f.querySelector('.prod-mudanza').checked
        });
    });

    try {
        const response = await fetch('/api/landing/cotizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_ruta, nombres, telefono, correo, productos
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
            val = val.replace(/[0-9]/g, ''); // Sin numeros
            val = val.replace(/[^A-Z\s]/g, ''); // Solo letras y espacios (sin tildes)
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

    // Validar productos dinámicos con event delegation
    document.getElementById('lista-productos').addEventListener('input', function(e) {
        if (e.target.classList.contains('prod-nombre')) {
            let val = e.target.value;
            val = val.toUpperCase();
            val = val.replace(/[^A-Z0-9\s]/g, ''); // Letras y numeros permitidos, pero sin tildes ni simbolos
            val = val.replace(/\s{2,}/g, ' '); // Sin espacios dobles
            e.target.value = val;
        }
        
        if (e.target.classList.contains('prod-peso')) {
            let val = e.target.value;
            // Solo numeros y un punto
            val = val.replace(/[^0-9.]/g, '');
            // Evitar multiples puntos
            const partes = val.split('.');
            if (partes.length > 2) {
                val = partes[0] + '.' + partes.slice(1).join('');
            }
            // Eliminar ceros iniciales si no es 0.
            if (val.length > 1 && val.startsWith('0') && val[1] !== '.') {
                val = val.replace(/^0+/, '');
            }
            e.target.value = val;
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
        if (e.target.classList.contains('prod-nombre')) {
            e.target.value = e.target.value.trim();
        }
        if (e.target.classList.contains('prod-peso')) {
            let val = parseFloat(e.target.value);
            if (!isNaN(val)) {
                e.target.value = val.toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1');
            }
        }
    }, true);
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
