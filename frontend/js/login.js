document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const btnSubmit = document.getElementById('btnSubmit');
    const btnText = btnSubmit.querySelector('span');
    const spinner = document.getElementById('spinner');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usuario = document.getElementById('usuario').value.trim();
        const clave = document.getElementById('clave').value;

        if (!usuario || !clave) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'Por favor, ingrese su usuario y contraseña.',
                confirmButtonColor: '#0f4c81'
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
                    icon: 'success',
                    title: '¡Bienvenido!',
                    text: `Hola ${result.data.nombre}`,
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    // Redirigir o cambiar vista
                    window.location.href = 'dashboard.html';
                });
            } else {
                // Error de credenciales o estado inactivo
                Swal.fire({
                    icon: 'error',
                    title: 'Error de acceso',
                    text: result.message || 'Ocurrió un problema al iniciar sesión.',
                    confirmButtonColor: '#0f4c81'
                });
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'No se pudo conectar con el servidor. Intente más tarde.',
                confirmButtonColor: '#0f4c81'
            });
        } finally {
            // Restaurar estado del botón
            btnSubmit.disabled = false;
            btnText.textContent = 'Iniciar Sesión';
            spinner.style.display = 'none';
        }
    });
});
