document.addEventListener('DOMContentLoaded', () => {
    // 1. Validar sesión
    const userDataStr = sessionStorage.getItem('usuario_joselito');
    if (!userDataStr) {
        window.location.href = 'login.html';
        return;
    }

    const userData = JSON.parse(userDataStr);

    // 2. Pintar datos del usuario
    document.getElementById('userName').textContent = userData.nombre;
    document.getElementById('userRole').textContent = userData.perfil;

    // 3. Manejar Cerrar Sesión
    document.getElementById('btnLogout').addEventListener('click', () => {
        sessionStorage.removeItem('usuario_joselito');
        window.location.href = 'login.html';
    });

    // 4. Cargar menú dinámico RBAC
    cargarMenu(userData.id_perfil);
});

async function cargarMenu(id_perfil) {
    try {
        const response = await fetch(`http://localhost:3000/api/menu/${id_perfil}`);
        const result = await response.json();

        if (response.ok && result.success) {
            construirSidebar(result.data);
        } else {
            console.error('Error al cargar menú:', result.message);
        }
    } catch (error) {
        console.error('Error de conexión:', error);
    }
}

function construirSidebar(opciones) {
    const menuList = document.getElementById('menuList');
    menuList.innerHTML = ''; // Limpiar lista inicial

    opciones.forEach(opcion => {
        const li = document.createElement('li');
        
        // El enlace almacena la ruta en dataset para uso del SPA
        const a = document.createElement('a');
        a.className = 'nav-link';
        a.dataset.ruta = opcion.ruta;
        
        // Ícono (usa FontAwesome guardado en BD)
        const icon = document.createElement('i');
        icon.className = opcion.icono || 'fas fa-circle';
        
        // Texto
        const span = document.createElement('span');
        span.textContent = opcion.nombre;

        a.appendChild(icon);
        a.appendChild(span);
        li.appendChild(a);

        // Evento SPA: No recarga la página, solo cambia el main container
        a.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Gestión visual de 'active'
            document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
            a.classList.add('active');

            // Actualizar Título
            document.getElementById('viewTitle').textContent = opcion.nombre;

            // Cargar el componente correspondiente
            cargarVistaSPA(opcion.ruta, opcion.nombre);
        });

        menuList.appendChild(li);
    });

    // Auto-click a la primera opción para no ver el panel vacío al entrar
    if (opciones.length > 0) {
        const firstLink = menuList.querySelector('.nav-link');
        if (firstLink) firstLink.click();
    }
}

// Lógica inicial del SPA para inyectar contenido
async function cargarVistaSPA(ruta, nombre) {
    const appContent = document.getElementById('app-content');
    
    try {
        // Mostramos un loader mientras carga la vista
        appContent.innerHTML = `
            <div style="display:flex; justify-content:center; padding: 40px;">
                <i class="fas fa-spinner fa-spin fa-2x" style="color: var(--brand-blue)"></i>
            </div>
        `;

        // Fetch del archivo HTML de la vista
        const response = await fetch(`vistas/${ruta}.html`);
        
        if (!response.ok) {
            throw new Error(`Vista no encontrada: ${ruta}`);
        }

        const html = await response.text();
        appContent.innerHTML = html;

        // Ejecutar script asociado a la vista si existe
        // Verificamos si existe la función init_${ruta}
        const funcName = `init_${ruta}`;
        
        // Cargamos el script dinámicamente si no está en el DOM
        if (!document.querySelector(`script[src="js/vistas/${ruta}.js"]`)) {
            const script = document.createElement('script');
            script.src = `js/vistas/${ruta}.js`;
            script.onload = () => {
                if (typeof window[funcName] === 'function') {
                    window[funcName]();
                }
            };
            document.body.appendChild(script);
        } else {
            // Si ya está cargado, solo lo ejecutamos
            if (typeof window[funcName] === 'function') {
                window[funcName]();
            }
        }

    } catch (error) {
        console.error(error);
        appContent.innerHTML = `
            <div class="welcome-card" style="border-left: 4px solid #ef4444;">
                <h2 style="color: #ef4444;">Error al cargar módulo</h2>
                <p>No se pudo cargar la vista <strong>${nombre}</strong>.</p>
                <p class="text-muted" style="font-size: 12px; margin-top: 10px;">${error.message}</p>
            </div>
        `;
    }
}
