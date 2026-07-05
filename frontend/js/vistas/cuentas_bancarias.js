let cuentasGlobales = [];
let billeterasGlobales = [];
let entidadesGlobales = [];
let proveedoresGlobales = [];
let tipoRegistroActual = 'cuenta'; // 'cuenta' o 'billetera'
let archivoQRSeleccionado = null;

window.init_cuentas_bancarias = function() {
    cargarDatos();
};

async function cargarDatos() {
    try {
        const headers = {
            'Authorization': `Bearer ${sessionStorage.getItem('token_joselito')}`,
            'x-user-profile': JSON.parse(sessionStorage.getItem('usuario_joselito'))?.id_usuario || 1
        };

        const [resCuentas, resEntidades, resProveedores] = await Promise.all([
            fetch('http://localhost:3000/api/cuentas-bancarias', { headers }),
            fetch('http://localhost:3000/api/cuentas-bancarias/entidades', { headers }),
            fetch('http://localhost:3000/api/cuentas-bancarias/proveedores', { headers })
        ]);

        const resultCuentas = await resCuentas.json();
        const resultEntidades = await resEntidades.json();
        const resultProveedores = await resProveedores.json();

        if (resCuentas.ok && resultCuentas.success) {
            cuentasGlobales = resultCuentas.data.cuentas;
            billeterasGlobales = resultCuentas.data.billeteras;
            
            renderizarCuentas();
            renderizarBilleterasIndependientes();
            llenarSelectCuentas();
        } else {
            console.error('Error al cargar datos:', resultCuentas.message);
        }

        if (resEntidades.ok && resultEntidades.success) {
            entidadesGlobales = resultEntidades.data;
            llenarSelectEntidades(resultEntidades.data);
        }

        if (resProveedores.ok && resultProveedores.success) {
            proveedoresGlobales = resultProveedores.data;
            llenarSelectProveedores(resultProveedores.data);
        }
    } catch (error) {
        console.error('Error de red:', error);
    }
}

function cambiarPestaña(tabId, btnElement) {
    // Actualizar botones
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');

    // Actualizar vistas
    document.getElementById('tab-bancos').style.display = 'none';
    document.getElementById('tab-billeteras').style.display = 'none';

    document.getElementById(`tab-${tabId}`).style.display = 'grid';
}

function llenarSelectEntidades(entidades) {
    const select = document.getElementById('regBancoEntidad');
    select.innerHTML = '<option value="">Seleccione...</option>';
    entidades.forEach(e => {
        const option = document.createElement('option');
        option.value = e.id_entidad;
        option.textContent = e.nombre;
        select.appendChild(option);
    });
}

function llenarSelectProveedores(proveedores) {
    const select = document.getElementById('regBillTipo');
    select.innerHTML = '<option value="">Seleccione...</option>';
    proveedores.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id_proveedor;
        option.textContent = p.nombre;
        select.appendChild(option);
    });
}

function renderizarCuentas() {
    const container = document.getElementById('tab-bancos');
    container.innerHTML = '';

    if (cuentasGlobales.length === 0) {
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
            <i class="fas fa-university" style="font-size: 32px; margin-bottom: 12px; opacity: 0.5;"></i>
            <p>No hay cuentas bancarias registradas.</p>
        </div>`;
        return;
    }

    cuentasGlobales.forEach(cuenta => {
        // Buscar billeteras vinculadas a esta cuenta
        const billeterasVinculadas = billeterasGlobales.filter(b => b.id_cuenta_vinculada === cuenta.id_cuenta);
        
        let htmlBilleteras = `
            <div class="wallets-accordion">
                <button class="wallets-accordion-toggle" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none';" style="width: 100%; background: none; border: none; border-top: 1px solid var(--border-light); padding: 12px 16px; text-align: center; color: var(--text-secondary); font-size: 13px; font-weight: 500; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px;">
                    <i class="fas fa-wallet"></i> ${billeterasVinculadas.length} Billetera${billeterasVinculadas.length > 1 ? 's' : ''} vinculada${billeterasVinculadas.length > 1 ? 's' : ''} <i class="fas fa-chevron-down" style="font-size: 10px;"></i>
                </button>
                <div class="wallets-section" style="display: none;">
                    ${billeterasVinculadas.map(b => `
                        <div class="wallet-pill ${b.estado === 0 ? 'card-inactiva' : ''}" style="border-left: 3px solid ${b.color_billetera || '#ccc'};">
                            <div class="wallet-pill-icon" style="background-color: ${b.fondo_billetera || '#f3f4f6'}; color: ${b.color_billetera || '#6b7280'};">
                                <i class="fas fa-mobile-alt"></i>
                            </div>
                            <div class="wallet-pill-info">
                                <span>${b.tipo_billetera} - ${b.numero_celular}</span>
                                <small>${b.titular}</small>
                            </div>
                            <button class="wallet-pill-action" title="Editar Billetera" onclick="abrirModalEditarBilletera(${b.id_billetera})"><i class="fas fa-edit"></i></button>
     <button class="wallet-pill-action" title="${b.estado === 1 ? 'Inactivar Billetera' : 'Activar Billetera'}" onclick="toggleEstadoBilletera(${b.id_billetera}, ${b.estado})" style="color: ${b.estado === 1 ? '#ef4444' : '#10b981'};"><i class="fas ${b.estado === 1 ? 'fa-ban' : 'fa-check-circle'}"></i></button>
     <button class="wallet-pill-action" title="Ver QR" onclick="verQRBilletera('${b.ruta_qr || ''}', '${b.titular}')">
                                <i class="fas fa-qrcode"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        if (billeterasVinculadas.length === 0) {
            htmlBilleteras = `
                <div class="wallets-accordion">
                    <div style="width: 100%; background: none; border: none; border-top: 1px solid var(--border-light); padding: 12px 16px; text-align: center; color: var(--text-muted); font-size: 13px; display: flex; justify-content: center; align-items: center; gap: 8px;">
                        <i class="fas fa-wallet"></i> Sin billeteras vinculadas
                    </div>
                </div>
            `;
        }

        const card = document.createElement('div');
        card.className = 'account-card ' + (cuenta.estado === 0 ? 'card-inactiva' : '');
        card.innerHTML = `
            <div class="account-header">
                <div class="bank-logo" style="background-color: ${cuenta.fondo_banco || '#f3f4f6'}; color: ${cuenta.color_banco || '#6b7280'};">
                    <i class="fas fa-university"></i>
                </div>
                <div class="account-title">
                    <h3>${cuenta.entidad_financiera}</h3>
                    <p>${cuenta.tipo_cuenta}</p>
                </div>
            </div>
            
            <div class="account-body">
                <div class="data-row">
                    <span class="data-label">Titular</span>
                    <span class="data-value">${cuenta.titular}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">N° Cuenta</span>
                    <span class="data-value">${cuenta.nro_cuenta || '-'}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">CCI</span>
                    <span class="data-value">${cuenta.nro_cci || '-'}</span>
                </div>
            </div>

            ${htmlBilleteras}
            
            <div class="account-footer">
                ${cuenta.es_sistema === 1 ? 
                    `<button class="btn-card-action" disabled style="opacity: 0.5; cursor: not-allowed; width: 100%; border: none;" title="Cuenta de Sistema Protegida">
                        <i class="fas fa-lock"></i> Cuenta de Sistema Protegida
                    </button>`
                :
                    `<button class="btn-card-action" onclick="abrirModalEditarCuenta(${cuenta.id_cuenta})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    ${cuenta.estado === 1 
                        ? `<button class="btn-card-action danger" onclick="toggleEstadoCuenta(${cuenta.id_cuenta}, 1)"><i class="fas fa-ban"></i> Inactivar</button>`
                        : `<button class="btn-card-action" style="color: #10b981; border-color: #10b981;" onclick="toggleEstadoCuenta(${cuenta.id_cuenta}, 0)"><i class="fas fa-check-circle"></i> Activar</button>`
                    }`
                }
            </div>
        `;
        container.appendChild(card);
    });
}

function renderizarBilleterasIndependientes() {
    const container = document.getElementById('tab-billeteras');
    container.innerHTML = '';

    const billeterasIndependientes = billeterasGlobales.filter(b => b.id_cuenta_vinculada === null);

    if (billeterasIndependientes.length === 0) {
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
            <i class="fas fa-mobile-alt" style="font-size: 32px; margin-bottom: 12px; opacity: 0.5;"></i>
            <p>No hay billeteras independientes registradas.</p>
        </div>`;
        return;
    }

    billeterasIndependientes.forEach(billetera => {
        const card = document.createElement('div');
        card.className = 'account-card ' + (billetera.estado === 0 ? 'card-inactiva' : '');
        card.innerHTML = `
            <div class="account-header">
                <div class="bank-logo" style="background-color: ${billetera.fondo_billetera || '#f3f4f6'}; color: ${billetera.color_billetera || '#6b7280'};">
                    <i class="fas fa-mobile-alt"></i>
                </div>
                <div class="account-title">
                    <h3>${billetera.tipo_billetera}</h3>
                    <p>Billetera Independiente</p>
                </div>
            </div>
            
            <div class="account-body">
                <div class="data-row">
                    <span class="data-label">Titular</span>
                    <span class="data-value">${billetera.titular}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">N° Celular</span>
                    <span class="data-value">${billetera.numero_celular}</span>
                </div>
                ${billetera.ruta_qr ? `
                <div style="text-align:center; margin-top: 10px;">
                    <button class="btn-secondary" style="width: 100%;" onclick="verQRBilletera('${billetera.ruta_qr || ''}', '${billetera.titular}')"><i class="fas fa-qrcode"></i> Ver Código QR</button>
                </div>
                ` : ''}
            </div>

            <div class="account-footer">
                <button class="btn-card-action" onclick="abrirModalEditarBilletera(${billetera.id_billetera})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                ${billetera ? (billetera.estado === 1 
            ? `<button class="btn-card-action danger" onclick="toggleEstadoBilletera(${billetera.id_billetera}, 1)"><i class="fas fa-ban"></i> Inactivar</button>`
            : `<button class="btn-card-action" style="color: #10b981; border-color: #10b981;" onclick="toggleEstadoBilletera(${billetera.id_billetera}, 0)"><i class="fas fa-check-circle"></i> Activar</button>`) 
    : ''}
            </div>
        `;
        container.appendChild(card);
    });
}

function llenarSelectCuentas() {
    const selects = document.querySelectorAll('#regBillCuentaVinculada, #editBillCuentaVinculada');
    selects.forEach(select => {
        select.innerHTML = '<option value="">Ninguna (Independiente)</option>';
        
        // Filtrar cuentas: Solo las activas (estado=1) que no tengan una billetera vinculada activa
        const cuentasDisponibles = cuentasGlobales.filter(cuenta => {
            if (cuenta.estado === 0) return false;
            if (cuenta.es_sistema === 1) return false;
            
            const billeterasDeEstaCuenta = billeterasGlobales.filter(b => b.id_cuenta_vinculada === cuenta.id_cuenta);
            const tieneBilleteraActiva = billeterasDeEstaCuenta.some(b => b.estado === 1);
            return !tieneBilleteraActiva;
        });

        cuentasDisponibles.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id_cuenta;
            option.textContent = `${c.entidad_financiera} - ${c.nro_cuenta || 'Sin número'} (${c.titular})`;
            select.appendChild(option);
        });
    });
}

function abrirModalRegistro() {
    document.getElementById('formCuentaBancaria').reset();
    document.getElementById('formBilleteraDigital').reset();
    Array.from(document.querySelectorAll('.form-group small')).forEach(s => s.style.display = 'none');
    
    const tabBancosVisible = document.getElementById('tab-bancos').style.display !== 'none';
    seleccionarTipoRegistro(tabBancosVisible ? 'cuenta' : 'billetera');
    
    document.getElementById('modalRegistro').style.display = 'flex';
}

function seleccionarTipoRegistro(tipo) {
    tipoRegistroActual = tipo;
    if (tipo === 'cuenta') {
        document.getElementById('optCuentaBancaria').classList.add('selected');
        document.getElementById('optBilleteraDigital').classList.remove('selected');
        document.getElementById('formCuentaBancaria').style.display = 'block';
        document.getElementById('formBilleteraDigital').style.display = 'none';
    } else {
        document.getElementById('optBilleteraDigital').classList.add('selected');
        document.getElementById('optCuentaBancaria').classList.remove('selected');
        document.getElementById('formBilleteraDigital').style.display = 'block';
        document.getElementById('formCuentaBancaria').style.display = 'none';
    }
}

function cerrarModalRegistro() {
    document.getElementById('modalRegistro').style.display = 'none';
}

function manejarArchivoQR(event) {
    const file = event.target.files[0];
    if (file) {
        // Validar que sea imagen
        if (!file.type.startsWith('image/')) {
            Swal.fire({icon: 'warning', title: 'Formato incorrecto', text: 'El archivo debe ser una imagen (JPG, PNG, WEBP).', confirmButtonColor: '#3b82f6'});
            event.target.value = '';
            return;
        }
        // Validar tamaño máximo 2MB
        if (file.size > 2 * 1024 * 1024) {
            Swal.fire({icon: 'warning', title: 'Archivo muy pesado', text: 'El archivo no debe pesar más de 2MB.', confirmButtonColor: '#3b82f6'});
            event.target.value = '';
            return;
        }
        archivoQRSeleccionado = file;
        document.getElementById('textQRUpload').textContent = `Archivo: ${file.name}`;
        document.getElementById('dropZoneQR').style.borderColor = "var(--primary-color)";
    }
}

async function guardarRegistro() {
    if (tipoRegistroActual === 'cuenta') {
        await guardarCuentaBancaria();
    } else {
        await guardarBilleteraDigital();
    }
}

async function guardarCuentaBancaria() {
    const form = document.getElementById('formCuentaBancaria');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const confirm = await Swal.fire({
        title: '¿Confirmar registro?',
        text: 'Revisa que la entidad bancaria, tipo de cuenta, número y CCI estén correctos. ¡Estos datos no podrán ser modificados más adelante por seguridad!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, registrar'
    });
    if (!confirm.isConfirmed) return;
    
    const id_entidad = document.getElementById('regBancoEntidad').value;
    const tipo_cuenta = document.getElementById('regBancoTipo').value;
    const nro_cuenta = document.getElementById('regBancoNum').value;
    const nro_cci = document.getElementById('regBancoCCI').value;
    const titular = document.getElementById('regBancoTitular').value;

    if (!id_entidad || !tipo_cuenta || !titular) {
        Swal.fire({icon: 'warning', title: 'Campos incompletos', text: 'Por favor, completa los campos obligatorios de la cuenta bancaria.', confirmButtonColor: '#3b82f6'});
        return;
    }

    try {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('token_joselito')}`,
            'x-user-profile': JSON.parse(sessionStorage.getItem('usuario_joselito'))?.id_usuario || 1
        };

        const body = { id_entidad, tipo_cuenta, nro_cuenta, nro_cci, titular };

        const response = await fetch('http://localhost:3000/api/cuentas-bancarias/cuenta', {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            Swal.fire({icon: 'success', title: '¡Éxito!', text: 'Cuenta registrada exitosamente.', confirmButtonColor: '#3b82f6'});
            cerrarModalRegistro();
            cargarDatos(); // Recargar la vista
        } else {
            Swal.fire({icon: 'error', title: 'Error', text: result.message || 'Error al guardar la cuenta', confirmButtonColor: '#3b82f6'});
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({icon: 'error', title: 'Oops...', text: 'Ocurrió un error al guardar', confirmButtonColor: '#3b82f6'});
    }
}

async function guardarBilleteraDigital() {
    const form = document.getElementById('formBilleteraDigital');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const confirm = await Swal.fire({
        title: '¿Confirmar registro?',
        text: 'Revisa que el proveedor y número de celular estén correctos. ¡Estos datos no podrán ser modificados más adelante!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, registrar'
    });
    if (!confirm.isConfirmed) return;
    
    const id_proveedor = document.getElementById('regBillTipo').value;
    const numero_celular = document.getElementById('regBillCelular').value;
    const titular = document.getElementById('regBillTitular').value;
    const id_cuenta_vinculada = document.getElementById('regBillCuentaVinculada').value;

    if (!id_proveedor || !numero_celular || !titular) {
        Swal.fire({icon: 'warning', title: 'Campos incompletos', text: 'Por favor, completa los campos obligatorios de la billetera.', confirmButtonColor: '#3b82f6'});
        return;
    }

    // Nota: Como subir QR es opcional y requiere FormData si hay archivo, por ahora enviaremos JSON 
    // y asumiremos ruta_qr nulo, ya que subir archivos requiere un backend con Multer/Cloudinary.
    // El usuario pidió "Subida de QR opcional", lo dejaremos listo para integrarse.
    
    try {
        const headers = {
            'Authorization': `Bearer ${sessionStorage.getItem('token_joselito')}`,
            'x-user-profile': JSON.parse(sessionStorage.getItem('usuario_joselito'))?.id_usuario || 1
        };

        const formData = new FormData();
        formData.append('id_proveedor', id_proveedor);
        formData.append('numero_celular', numero_celular);
        formData.append('titular', titular);
        if (id_cuenta_vinculada) {
            formData.append('id_cuenta_vinculada', id_cuenta_vinculada);
        }
        if (archivoQRSeleccionado) {
            formData.append('regBillQR', archivoQRSeleccionado);
        }

        const response = await fetch('http://localhost:3000/api/cuentas-bancarias/billetera', {
            method: 'POST',
            headers,
            body: formData
        });

        const result = await response.json();

        if (response.ok && result.success) {
            Swal.fire({icon: 'success', title: '¡Éxito!', text: 'Billetera registrada exitosamente.', confirmButtonColor: '#3b82f6'});
            cerrarModalRegistro();
            cargarDatos(); // Recargar la vista
        } else {
            Swal.fire({icon: 'error', title: 'Error', text: result.message || 'Error al guardar la billetera', confirmButtonColor: '#3b82f6'});
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({icon: 'error', title: 'Oops...', text: 'Ocurrió un error al guardar', confirmButtonColor: '#3b82f6'});
    }
}

// ----------------------------------------------------
// LÓGICA DE EDICIÓN
// ----------------------------------------------------
let archivoQREditSeleccionado = null;

function manejarArchivoQREdit(event) {
    const file = event.target.files[0];
    if (file) {
        if (!file.type.startsWith('image/')) {
            Swal.fire({icon: 'warning', title: 'Formato incorrecto', text: 'El archivo debe ser una imagen (JPG, PNG, WEBP).', confirmButtonColor: '#3b82f6'});
            event.target.value = '';
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            Swal.fire({icon: 'warning', title: 'Archivo muy pesado', text: 'El archivo no debe pesar más de 2MB.', confirmButtonColor: '#3b82f6'});
            event.target.value = '';
            return;
        }
        archivoQREditSeleccionado = file;
        document.getElementById('editTextQRUpload').textContent = `Archivo nuevo: ${file.name}`;
        document.getElementById('editDropZoneQR').style.borderColor = "var(--primary-color)";
    }
}

function abrirModalEditarCuenta(id_cuenta) {
    const cuenta = cuentasGlobales.find(c => c.id_cuenta === id_cuenta);
    if (!cuenta) return;

    const selectEntidad = document.getElementById('editBancoEntidad');
    selectEntidad.innerHTML = '<option value="">Seleccione...</option>' + entidadesGlobales.map(e => `<option value="${e.id_entidad}">${e.nombre}</option>`).join('');

    document.getElementById('editBancoId').value = cuenta.id_cuenta;
    document.getElementById('editBancoEntidad').value = cuenta.id_entidad;
    document.getElementById('editBancoTipo').value = cuenta.tipo_cuenta;
    document.getElementById('editBancoNum').value = cuenta.nro_cuenta || '';
    document.getElementById('editBancoCCI').value = cuenta.nro_cci || '';
    document.getElementById('editBancoTitular').value = cuenta.titular || '';
    
    // Deshabilitar campos críticos para evitar cambios post-creación
    document.getElementById('editBancoEntidad').disabled = true;
    document.getElementById('editBancoTipo').disabled = true;
    document.getElementById('editBancoNum').readOnly = true;
    document.getElementById('editBancoNum').style.backgroundColor = '#f3f4f6';
    
    // El CCI solo se puede editar si estaba vacío
    if (cuenta.nro_cci && cuenta.nro_cci.trim() !== '') {
        document.getElementById('editBancoCCI').readOnly = true;
        document.getElementById('editBancoCCI').style.backgroundColor = '#f3f4f6';
    } else {
        document.getElementById('editBancoCCI').readOnly = false;
        document.getElementById('editBancoCCI').style.backgroundColor = '';
    }

    Array.from(document.querySelectorAll('#formEditarCuenta small')).forEach(s => s.style.display = 'none');

    document.getElementById('modalEditarCuenta').style.display = 'flex';
}

function cerrarModalEditarCuenta() {
    document.getElementById('modalEditarCuenta').style.display = 'none';
}

async function guardarEdicionCuenta() {
    const form = document.getElementById('formEditarCuenta');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const id_cuenta = document.getElementById('editBancoId').value;
    const cuentaOriginal = cuentasGlobales.find(c => c.id_cuenta === parseInt(id_cuenta));
    const cciNuevo = document.getElementById('editBancoCCI').value;

    if (!cuentaOriginal.nro_cci && cciNuevo && cciNuevo.trim() !== '') {
        const confirm = await Swal.fire({
            title: '¿Confirmar nuevo CCI?',
            text: 'Estás a punto de registrar el CCI. Una vez guardado, no podrás editarlo nunca más. ¿Deseas continuar?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, guardar'
        });
        if (!confirm.isConfirmed) return;
    } else {
        const confirm = await Swal.fire({
            title: '¿Guardar cambios?',
            text: '¿Estás seguro que deseas actualizar el titular de esta cuenta bancaria?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, guardar'
        });
        if (!confirm.isConfirmed) return;
    }
    const body = {
        id_entidad: document.getElementById('editBancoEntidad').value,
        tipo_cuenta: document.getElementById('editBancoTipo').value,
        nro_cuenta: document.getElementById('editBancoNum').value,
        nro_cci: document.getElementById('editBancoCCI').value,
        titular: document.getElementById('editBancoTitular').value
    };

    try {
        const res = await fetch(`http://localhost:3000/api/cuentas-bancarias/cuenta/${id_cuenta}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token_joselito')}`,
                'Content-Type': 'application/json',
                'x-user-profile': JSON.parse(sessionStorage.getItem('usuario_joselito'))?.id_usuario || 1
            },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success) {
            Swal.fire({icon: 'success', title: '¡Éxito!', text: 'Cuenta actualizada exitosamente.', confirmButtonColor: '#3b82f6'});
            cerrarModalEditarCuenta();
            cargarDatos();
        } else {
            Swal.fire({icon: 'error', title: 'Error', text: data.message, confirmButtonColor: '#3b82f6'});
        }
    } catch (e) {
        console.error(e);
        Swal.fire({icon: 'error', title: 'Error de conexión', text: 'Ocurrió un error de conexión al actualizar la cuenta.', confirmButtonColor: '#3b82f6'});
    }
}

function abrirModalEditarBilletera(id_billetera) {
    const billetera = billeterasGlobales.find(b => b.id_billetera === id_billetera);
    if (!billetera) return;

    const selectProv = document.getElementById('editBillTipo');
    selectProv.innerHTML = '<option value="">Seleccione...</option>' + proveedoresGlobales.map(p => `<option value="${p.id_proveedor}">${p.nombre}</option>`).join('');

    const selectCuenta = document.getElementById('editBillCuentaVinculada');
    selectCuenta.innerHTML = '<option value="">-- No vincular (Independiente) --</option>' + cuentasGlobales.filter(c => c.es_sistema !== 1).map(c => `<option value="${c.id_cuenta}">${c.entidad_financiera} - ${c.nro_cuenta || c.nro_cci || c.tipo_cuenta} - ${c.titular}</option>`).join('');

    document.getElementById('editBillId').value = billetera.id_billetera;
    
    // Deshabilitar campos críticos para evitar cambios post-creación
    document.getElementById('editBillTipo').value = billetera.id_proveedor;
    document.getElementById('editBillTipo').disabled = true;
    
    document.getElementById('editBillCelular').value = billetera.numero_celular;
    document.getElementById('editBillCelular').readOnly = true;
    document.getElementById('editBillCelular').style.backgroundColor = '#f3f4f6';
    
    document.getElementById('editBillTitular').value = billetera.titular;
    document.getElementById('editBillCuentaVinculada').value = billetera.id_cuenta_vinculada || '';
    
    archivoQREditSeleccionado = null;
    document.getElementById('editBillQR').value = '';
    document.getElementById('editTextQRUpload').textContent = 'Subir nuevo QR (Reemplazará el actual)';
    document.getElementById('editDropZoneQR').style.borderColor = "var(--border-light)";

    Array.from(document.querySelectorAll('#formEditarBilletera small')).forEach(s => s.style.display = 'none');

    document.getElementById('modalEditarBilletera').style.display = 'flex';
}

function cerrarModalEditarBilletera() {
    document.getElementById('modalEditarBilletera').style.display = 'none';
}

async function guardarEdicionBilletera() {
    const form = document.getElementById('formEditarBilletera');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const id_billetera = document.getElementById('editBillId').value;
    const confirm = await Swal.fire({
        title: '¿Guardar cambios?',
        text: '¿Estás seguro que deseas actualizar esta billetera digital?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, guardar'
    });
    if (!confirm.isConfirmed) return;
    const formData = new FormData();
    formData.append('id_proveedor', document.getElementById('editBillTipo').value);
    formData.append('numero_celular', document.getElementById('editBillCelular').value);
    formData.append('titular', document.getElementById('editBillTitular').value);
    
    const idCuenta = document.getElementById('editBillCuentaVinculada').value;
    if (idCuenta) {
        formData.append('id_cuenta_vinculada', idCuenta);
    }
    if (archivoQREditSeleccionado) {
        formData.append('regBillQR', archivoQREditSeleccionado);
    }

    try {
        const res = await fetch(`http://localhost:3000/api/cuentas-bancarias/billetera/${id_billetera}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token_joselito')}`,
                'x-user-profile': JSON.parse(sessionStorage.getItem('usuario_joselito'))?.id_usuario || 1
            },
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            Swal.fire({icon: 'success', title: '¡Éxito!', text: 'Billetera actualizada exitosamente.', confirmButtonColor: '#3b82f6'});
            cerrarModalEditarBilletera();
            cargarDatos();
        } else {
            Swal.fire({icon: 'error', title: 'Error', text: data.message, confirmButtonColor: '#3b82f6'});
        }
    } catch (e) {
        console.error(e);
        Swal.fire({icon: 'error', title: 'Error de conexión', text: 'Ocurrió un error de conexión al actualizar la billetera.', confirmButtonColor: '#3b82f6'});
    }
}

// ----------------------------------------------------
// INACTIVACIÓN
// ----------------------------------------------------
async function toggleEstadoCuenta(id, estadoActual) {
    const accion = estadoActual === 1 ? 'Inactivar' : 'Activar';
    const nuevoEstado = estadoActual === 1 ? 0 : 1;

    const result = await Swal.fire({
        title: `¿${accion} cuenta?`,
        text: estadoActual === 1 
            ? '¿Estás seguro que deseas inactivar esta cuenta bancaria?\nNota: También se inactivarán todas las billeteras vinculadas a esta cuenta.' 
            : '¿Estás seguro que deseas activar esta cuenta bancaria?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: estadoActual === 1 ? '#ef4444' : '#10b981',
        cancelButtonColor: '#6b7280',
        confirmButtonText: `Sí, ${accion.toLowerCase()}`,
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`http://localhost:3000/api/cuentas-bancarias/cuenta/${id}/estado`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token_joselito')}`,
                    'Content-Type': 'application/json',
                    'x-user-profile': JSON.parse(sessionStorage.getItem('usuario_joselito'))?.id_usuario || 1
                },
                body: JSON.stringify({ estado: nuevoEstado })
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire('¡Éxito!', `Cuenta ${accion.toLowerCase()}da exitosamente.`, 'success');
                cargarDatos();
            } else {
                Swal.fire('Error', data.message || 'Error al cambiar estado', 'error');
            }
        } catch (e) {
            Swal.fire('Error de conexión', 'Ocurrió un error al cambiar estado', 'error');
        }
    }
}

async function toggleEstadoBilletera(id, estadoActual) {
    // Si intentamos activar (estadoActual===0 -> nuevoEstado===1)
    if (estadoActual === 0) {
        const billetera = billeterasGlobales.find(b => b.id_billetera === id);
        if (billetera && billetera.id_cuenta_vinculada) {
            // Verificar si el padre está inactivo
            const cuentaPadre = cuentasGlobales.find(c => c.id_cuenta === billetera.id_cuenta_vinculada);
            if (cuentaPadre && cuentaPadre.estado === 0) {
                return Swal.fire('Acción bloqueada', 'No puedes activar esta billetera porque su cuenta bancaria padre está inactiva.', 'error');
            }
            // Verificar si ya hay una activa
            const billeteraActiva = billeterasGlobales.find(b => b.id_cuenta_vinculada === billetera.id_cuenta_vinculada && b.estado === 1);
            if (billeteraActiva) {
                return Swal.fire('Acción bloqueada', 'Esta cuenta bancaria ya tiene una billetera vinculada activa. Inactiva la actual antes de activar otra.', 'error');
            }
        }
    }

    const accion = estadoActual === 1 ? 'Inactivar' : 'Activar';
    const nuevoEstado = estadoActual === 1 ? 0 : 1;

    const result = await Swal.fire({
        title: `¿${accion} billetera?`,
        text: `¿Estás seguro que deseas ${accion.toLowerCase()} esta billetera digital?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: estadoActual === 1 ? '#ef4444' : '#10b981',
        cancelButtonColor: '#6b7280',
        confirmButtonText: `Sí, ${accion.toLowerCase()}`,
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`http://localhost:3000/api/cuentas-bancarias/billetera/${id}/estado`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token_joselito')}`,
                    'Content-Type': 'application/json',
                    'x-user-profile': JSON.parse(sessionStorage.getItem('usuario_joselito'))?.id_usuario || 1
                },
                body: JSON.stringify({ estado: nuevoEstado })
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire('¡Éxito!', `Billetera ${accion.toLowerCase()}da exitosamente.`, 'success');
                cargarDatos();
            } else {
                Swal.fire('Error', data.message || 'Error al cambiar estado', 'error');
            }
        } catch (e) {
            Swal.fire('Error de conexión', 'Ocurrió un error al cambiar estado', 'error');
        }
    }
}

window.verQRBilletera = function(url, titular) {
    if (!url || url === 'null' || url === 'undefined') {
        Swal.fire({
            icon: 'info',
            title: 'Sin código QR',
            text: 'Esta billetera digital no tiene una imagen QR registrada.',
            confirmButtonColor: '#3b82f6'
        });
        return;
    }

    let urlImagen = url.replace(/\\/g, '/');
    if (urlImagen.startsWith('public/')) {
        urlImagen = urlImagen.replace('public/', '/');
    } else if (!urlImagen.startsWith('http') && !urlImagen.startsWith('/')) {
        urlImagen = '/' + urlImagen;
    }

    Swal.fire({
        title: 'QR de ' + titular,
        imageUrl: urlImagen.startsWith('http') ? urlImagen : 'http://localhost:3000' + urlImagen,
        imageAlt: 'Código QR',
        imageHeight: 300,
        confirmButtonColor: '#3b82f6',
        confirmButtonText: 'Cerrar',
        customClass: {
            image: 'rounded-xl shadow-lg'
        }
    });
};
