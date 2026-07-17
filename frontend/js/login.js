document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const btnSubmit = document.getElementById('btnSubmit');
    const btnText = btnSubmit.querySelector('span');
    const spinner = document.getElementById('spinner');

    // Lógica de interactividad 3D (Parallax del Fondo y Tilt de la tarjeta)
    const panelVisual = document.getElementById('panelVisual');
    const bgLayer = document.getElementById('bgLayer');
    const infoCard = document.getElementById('infoCard');

    if (panelVisual && bgLayer && infoCard) {
        panelVisual.addEventListener('mousemove', (e) => {
            const rect = panelVisual.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            
            // Mouse relativo al centro de la columna izquierda (-1 a 1)
            const mouseX = ((e.clientX - rect.left) - width / 2) / (width / 2);
            const mouseY = ((e.clientY - rect.top) - height / 2) / (height / 2);

            // 1. Parallax del fondo: se mueve en dirección contraria muy suavemente
            const bgX = -mouseX * 15;
            const bgY = -mouseY * 15;
            bgLayer.style.transform = `translateX(${bgX}px) translateY(${bgY}px) scale(1.06)`;

            // 2. Inclinación 3D (Tilt) de la tarjeta de información
            const rotateX = -mouseY * 8; // Inclinación eje X (máx 8 grados)
            const rotateY = mouseX * 8;  // Inclinación eje Y (máx 8 grados)
            infoCard.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(30px)`;
        });

        // Restablecer posiciones originales al salir el mouse
        panelVisual.addEventListener('mouseleave', () => {
            bgLayer.style.transform = 'translateX(0px) translateY(0px) scale(1.06)';
            infoCard.style.transform = 'rotateX(0deg) rotateY(0deg) translateZ(0px)';
        });
    }

    // Lógica de autenticación del formulario
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usuario = document.getElementById('usuario').value.trim();
        const clave = document.getElementById('clave').value;

        if (!usuario || !clave) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'Por favor, ingrese su usuario y contraseña.',
                confirmButtonColor: '#0f4c81',
                heightAuto: false
            });
            return;
        }

        // Estado de carga
        btnSubmit.disabled = true;
        btnText.textContent = 'Iniciando...';
        spinner.style.display = 'block';

        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ usuario, clave })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Guardar en sessionStorage
                sessionStorage.setItem('usuario_joselito', JSON.stringify(result.data));

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: '¡Acceso concedido!',
                    text: `Conectando: ${result.data.nombre}...`,
                    showConfirmButton: false,
                    timer: 1500,
                    background: '#070a13',
                    color: '#ffffff',
                    iconColor: '#0ea5e9'
                }).then(() => {
                    // Redirigir al dashboard
                    window.location.href = 'dashboard.html';
                });
            } else {
                // Error de credenciales o estado inactivo
                Swal.fire({
                    icon: 'error',
                    title: 'Error de acceso',
                    text: result.message || 'Ocurrió un problema al iniciar sesión.',
                    confirmButtonColor: '#0ea5e9',
                    background: '#070a13',
                    color: '#ffffff',
                    heightAuto: false
                });
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'No se pudo conectar con el servidor. Intente más tarde.',
                confirmButtonColor: '#0ea5e9',
                background: '#070a13',
                color: '#ffffff',
                heightAuto: false
            });
        } finally {
            // Restaurar estado del botón
            btnSubmit.disabled = false;
            btnText.textContent = 'Ingresar a la Plataforma';
            spinner.style.display = 'none';
        }
    });
});
