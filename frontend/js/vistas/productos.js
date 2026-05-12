window.productosCache = []; // Caché para la edición rápida

window.init_productos = function () {
    console.log("Módulo Productos inicializado");

    cargarTablaProductos();

    document.getElementById('btnNuevoProducto').addEventListener('click', abrirModalCrearProducto);
    document.getElementById('btnCerrarModal').addEventListener('click', cerrarModalProducto);
    document.getElementById('btnCancelarModal').addEventListener('click', cerrarModalProducto);
    document.getElementById('formProducto').addEventListener('submit', guardarProducto);

    // Buscador en tiempo real
    document.getElementById('inputBuscarProducto').addEventListener('keyup', function (e) {
        const text = e.target.value.toLowerCase();
        const filas = document.querySelectorAll('#tbody-productos tr');
        filas.forEach(fila => {
            if (fila.textContent.toLowerCase().includes(text)) {
                fila.style.display = '';
            } else {
                fila.style.display = 'none';
            }
        });
    });
};

async function cargarTablaProductos() {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const tbody = document.getElementById('tbody-productos');

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Cargando productos...</td></tr>';

    try {
        const response = await fetch('http://localhost:3000/api/productos', {
            headers: {
                'x-user-profile': sessionData.id_perfil
            }
        });
        const result = await response.json();

        if (response.ok && result.success) {
            window.productosCache = result.data;

            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color: var(--text-muted);">No se encontraron productos</td></tr>';
                return;
            }

            let filasHTML = '';
            result.data.forEach(p => {
                const badgeEstado = p.estado === 1
                    ? '<span class="badge-activo">Activo</span>'
                    : '<span class="badge-inactivo">Inactivo</span>';

                const descripcion = p.descripcion
                    ? p.descripcion
                    : '<span style="color:#aaa; font-style:italic;">Sin descripción</span>';

                const iconToggle = p.estado === 1 ? 'fa-ban' : 'fa-check';
                const titleToggle = p.estado === 1 ? 'Desactivar' : 'Activar';

                filasHTML += `
                    <tr class="tabla-tr">
                        <td class="tabla-td tabla-id">${p.id_producto}</td>
                        <td class="tabla-td tabla-nombre">${p.nombre}</td>
                        <td class="tabla-td tabla-secundario">${descripcion}</td>
                        <td class="tabla-td">${badgeEstado}</td>
                        <td class="tabla-td">
                            <button class="btn-action btn-edit" onclick="abrirModalEditarProducto(${p.id_producto})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-toggle" onclick="cambiarEstadoProducto(${p.id_producto}, ${p.estado === 1 ? 0 : 1})" title="${titleToggle}">
                                <i class="fas ${iconToggle}"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="cambiarEstadoProducto(${p.id_producto}, 2)" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = filasHTML;
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color: red;">Error: ${result.message}</td></tr>`;
        }
    } catch (error) {
        console.error("Error al cargar productos:", error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color: red;">Error de conexión con el servidor</td></tr>';
    }
}

function abrirModalCrearProducto() {
    document.getElementById('formProducto').reset();
    document.getElementById('id_producto').value = '';
    document.getElementById('modalTitle').textContent = 'Nuevo Producto';

    // Inmutabilidad del nombre (solo lectura al editar, editable al crear)
    document.getElementById('nombre_producto').readOnly = false;
    document.getElementById('nombre_producto').style.backgroundColor = '#fff';

    document.getElementById('modalProducto').style.display = 'flex';
}

function cerrarModalProducto() {
    document.getElementById('modalProducto').style.display = 'none';
}

window.abrirModalEditarProducto = function (id) {
    const data = window.productosCache.find(p => p.id_producto === id);
    if (!data) return;

    document.getElementById('id_producto').value = data.id_producto;
    document.getElementById('nombre_producto').value = data.nombre;
    document.getElementById('descripcion_producto').value = data.descripcion || '';

    // Regla: En edición, el nombre es inmutable (para proteger integridad histórica)
    document.getElementById('nombre_producto').readOnly = true;
    document.getElementById('nombre_producto').style.backgroundColor = '#f1f5f9';

    document.getElementById('modalTitle').textContent = 'Editar Producto';
    document.getElementById('modalProducto').style.display = 'flex';
}

async function guardarProducto(e) {
    e.preventDefault();

    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');
    const id = document.getElementById('id_producto').value;

    const nombreInput = document.getElementById('nombre_producto');
    const descripcionInput = document.getElementById('descripcion_producto');

    const datos = {
        nombre: nombreInput.value,
        descripcion: descripcionInput.value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `http://localhost:3000/api/productos/${id}` : 'http://localhost:3000/api/productos';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-user-profile': sessionData.id_perfil
            },
            body: JSON.stringify(datos)
        });

        const result = await response.json();

        // Lógica de Reactivación
        if (response.status === 409 && result.reactivar) {
            const confirm = await Swal.fire({
                title: 'Producto inactivo detectado',
                text: `El producto "${result.productoInfo.nombre}" ya existe en el sistema pero fue eliminado o desactivado. ¿Desea reactivarlo?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, reactivar',
                cancelButtonText: 'Cancelar'
            });

            if (confirm.isConfirmed) {
                // Preguntamos si quiere actualizar la descripción
                const updateConfirm = await Swal.fire({
                    title: '¿Actualizar detalles?',
                    text: '¿Desea actualizar la descripción de este producto o solo reactivarlo?',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, abrir edición',
                    cancelButtonText: 'Solo reactivar'
                });

                if (updateConfirm.isConfirmed) {
                    cerrarModalProducto();
                    abrirModalEdicionEspecial(result.productoInfo);
                } else {
                    // Solo reactivar
                    await cambiarEstadoProducto(result.productoInfo.id_producto, 1, true); // true para silencioso
                    cerrarModalProducto();
                    cargarTablaProductos();
                }
            }
            return;
        }

        if (response.ok && result.success) {
            Swal.fire({ icon: 'success', title: 'Éxito', text: result.message, timer: 1500, showConfirmButton: false });
            cerrarModalProducto();
            cargarTablaProductos();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
    }
}

// Helper para abrir la edición desde la reactivación
function abrirModalEdicionEspecial(data) {
    document.getElementById('id_producto').value = data.id_producto;
    document.getElementById('nombre_producto').value = data.nombre;
    document.getElementById('descripcion_producto').value = data.descripcion || '';

    // El nombre es inmutable
    document.getElementById('nombre_producto').readOnly = true;
    document.getElementById('nombre_producto').style.backgroundColor = '#f1f5f9';

    document.getElementById('modalTitle').textContent = 'Editar y Reactivar Producto';
    document.getElementById('modalProducto').style.display = 'flex';

    // Lo activamos silenciosamente
    cambiarEstadoProducto(data.id_producto, 1, true);
}

window.cambiarEstadoProducto = async function (id, estado, silent = false) {
    const sessionData = JSON.parse(sessionStorage.getItem('usuario_joselito') || '{}');

    if (!silent) {
        let titulo = estado === 2 ? '¿Eliminar producto?' : (estado === 1 ? '¿Activar producto?' : '¿Desactivar producto?');
        let texto = estado === 2 ? 'Esta acción lo ocultará del sistema.' : 'Cambiarás el estado del producto.';
        let icon = estado === 2 ? 'warning' : 'info';
        let btnColor = estado === 2 ? '#ef4444' : '#0f4c81';

        const confirm = await Swal.fire({
            title: titulo,
            text: texto,
            icon: icon,
            showCancelButton: true,
            confirmButtonColor: btnColor,
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'Cancelar'
        });

        if (!confirm.isConfirmed) return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/productos/${id}/estado`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-user-profile': sessionData.id_perfil
            },
            body: JSON.stringify({ estado })
        });

        const result = await response.json();

        if (!silent) {
            if (response.ok && result.success) {
                Swal.fire({ icon: 'success', title: 'Éxito', text: result.message, timer: 1500, showConfirmButton: false });
                cargarTablaProductos();
            } else {
                Swal.fire({ icon: 'error', title: 'Error', text: result.message });
            }
        } else {
            if (response.ok && result.success) {
                cargarTablaProductos();
            }
        }
    } catch (error) {
        if (!silent) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión con el servidor.' });
        }
    }
}
