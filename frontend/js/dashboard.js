// Si el navegador restaura esta página desde la bfcache (botón atrás/adelante tras
// cerrar sesión en otra pestaña o en esta misma), revalida la sesión en vez de
// mostrar el dashboard congelado tal cual quedó.
window.addEventListener('pageshow', (e) => {
    if (e.persisted && !sessionStorage.getItem('usuario_joselito')) {
        window.location.replace('/login');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // 1. Validar sesión
    const userDataStr = sessionStorage.getItem('usuario_joselito');
    if (!userDataStr) {
        window.location.replace('/login');
        return;
    }

    const userData = JSON.parse(userDataStr);

    // 2. Pintar datos del usuario
    document.getElementById('userName').textContent = userData.nombre;
    document.getElementById('userRole').textContent = userData.perfil;

    // 3. Manejar Cerrar Sesión
    document.getElementById('btnLogout').addEventListener('click', () => {
        sessionStorage.removeItem('usuario_joselito');
        window.location.replace('/login');
    });

    // 3b. Menú desplegable del usuario (topbar)
    const userDropdown = document.getElementById('userDropdown');
    document.getElementById('userMenuTrigger').addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => {
        userDropdown.classList.remove('show');
    });

    // 4. Manejar colapso del Sidebar
    const sidebar = document.getElementById('sidebar');
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');

    // Recuperar estado al cargar la página
    if (localStorage.getItem('sidebarCollapsed') === 'true') {
        sidebar.classList.add('collapsed');
    }

    btnToggleSidebar.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        // Guardar el estado actual en localStorage
        localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        // Los gráficos Chart.js de la vista activa no siempre se reajustan solos
        // al cambiar el ancho del sidebar; se fuerza su resize tras el reflow.
        requestAnimationFrame(redimensionarGraficosActivos);
    });

    // 5. Cargar menú dinámico RBAC
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
    menuList.innerHTML = '';

    const { standalone, categorias } = agruparOpciones(opciones);

    // 1. Enlaces de nivel superior (Dashboard) — fuera de cualquier categoría
    standalone.forEach(opcion => {
        menuList.appendChild(crearItemMenu(opcion));
    });

    // 2. Grupos categorizados con acordeón
    categorias.forEach(categoria => {
        menuList.appendChild(crearGrupoCategoria(categoria));
    });

    // 3. Auto-abrir el primer enlace disponible (Dashboard hoy, por ir primero en el DOM)
    const firstLink = menuList.querySelector('.nav-link');
    if (firstLink) firstLink.click();
}

// Agrupa opciones ya ordenadas por `orden` (backend) usando el orden de primera aparición
// de cada `categoria` para fijar la posición del grupo. Dashboard (ruta === 'dashboard')
// siempre queda fuera de las categorías, sin importar su valor de categoria en BD.
function agruparOpciones(opciones) {
    const standalone = [];
    const categorias = [];
    const indice = new Map(); // nombreCategoria -> índice en categorias[]

    opciones.forEach(opcion => {
        if (opcion.ruta === 'dashboard') {
            standalone.push(opcion);
            return;
        }

        const nombreCategoria = (opcion.categoria && opcion.categoria.trim() !== '')
            ? opcion.categoria.trim()
            : 'General';

        if (!indice.has(nombreCategoria)) {
            indice.set(nombreCategoria, categorias.length);
            categorias.push({ nombre: nombreCategoria, items: [] });
        }
        categorias[indice.get(nombreCategoria)].items.push(opcion);
    });

    return { standalone, categorias };
}

function crearGrupoCategoria(categoria) {
    const liCategoria = document.createElement('li');
    liCategoria.className = 'nav-category';

    const expandedKey = `sidebarCategoria_${slugify(categoria.nombre)}`;
    // Por defecto expandido; solo colapsado si el usuario lo cerró explícitamente antes
    const estaExpandido = localStorage.getItem(expandedKey) !== 'false';

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'nav-category-header';
    header.setAttribute('aria-expanded', String(estaExpandido));
    if (!estaExpandido) header.classList.add('collapsed');

    const headerText = document.createElement('span');
    headerText.className = 'nav-category-title';
    headerText.textContent = categoria.nombre;

    const chevron = document.createElement('i');
    chevron.className = 'fas fa-chevron-down nav-category-chevron';

    header.appendChild(headerText);
    header.appendChild(chevron);

    const subList = document.createElement('ul');
    subList.className = 'nav-category-items';
    if (!estaExpandido) subList.classList.add('collapsed');

    categoria.items.forEach(opcion => {
        subList.appendChild(crearItemMenu(opcion));
    });

    header.addEventListener('click', () => {
        const colapsado = subList.classList.toggle('collapsed');
        header.classList.toggle('collapsed', colapsado);
        header.setAttribute('aria-expanded', String(!colapsado));
        localStorage.setItem(expandedKey, String(!colapsado));
    });

    liCategoria.appendChild(header);
    liCategoria.appendChild(subList);
    return liCategoria;
}

function crearItemMenu(opcion) {
    const li = document.createElement('li');

    const a = document.createElement('a');
    a.className = 'nav-link';
    a.dataset.ruta = opcion.ruta;

    const icon = document.createElement('i');
    icon.className = opcion.icono || 'fas fa-circle';

    const span = document.createElement('span');
    span.textContent = opcion.nombre;

    a.appendChild(icon);
    a.appendChild(span);
    li.appendChild(a);

    a.addEventListener('click', (e) => {
        e.preventDefault();

        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        a.classList.add('active');
        actualizarTituloVista(opcion);

        cargarVistaSPA(opcion.ruta, opcion.nombre);
    });

    return li;
}

// Muestra el título de la vista como breadcrumb "Categoría > Nombre" cuando la
// opción pertenece a una categoría del sidebar; si no (ej. Dashboard), solo el nombre.
function actualizarTituloVista(opcion) {
    const viewTitle = document.getElementById('viewTitle');

    if (opcion.categoria && opcion.categoria.trim() !== '') {
        viewTitle.innerHTML = `
            <span class="breadcrumb-parent">${opcion.categoria}</span>
            <i class="fas fa-chevron-right breadcrumb-separator"></i>
            <span class="breadcrumb-current">${opcion.nombre}</span>
        `;
    } else {
        viewTitle.innerHTML = `<span class="breadcrumb-current">${opcion.nombre}</span>`;
    }
}

// Fuerza el redibujado de los gráficos Chart.js de la vista actual (si los hay)
// al ancho real disponible, para evitar que queden con el tamaño de antes de
// colapsar/expandir el sidebar.
function redimensionarGraficosActivos() {
    if (!window.Chart || !window.Chart.instances) return;
    Object.values(window.Chart.instances).forEach(chart => chart.resize());
}

function slugify(texto) {
    return texto
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

async function cargarVistaSPA(ruta, nombre) {
    const appContent = document.getElementById('app-content');

    if (window.$ && $.fn && $.fn.DataTable) {
        const api = $.fn.dataTable.tables({ api: true });
        if (api.length > 0) {
            api.destroy();
        }
    }

    try {
        appContent.innerHTML = `
            <div style="display:flex; justify-content:center; padding: 40px;">
                <i class="fas fa-spinner fa-spin fa-2x" style="color: var(--brand-blue)"></i>
            </div>
        `;

        const response = await fetch(`vistas/${ruta}.html`);

        if (!response.ok) {
            throw new Error(`Vista no encontrada: ${ruta}`);
        }

        const html = await response.text();
        appContent.innerHTML = html;

        const funcName = `init_${ruta}`;

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
