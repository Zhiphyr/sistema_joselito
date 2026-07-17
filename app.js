require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const autoSeed = require('./config/seeder');

const app = express();

// Middlewares
app.use(cors()); // Permitir peticiones de otros orígenes
app.use(express.json()); // Parseo de JSON
app.use(express.urlencoded({ extended: true })); // Parseo de datos de formularios urlencoded

// Rutas "limpias" para las vistas principales (sin exponer la extensión .html)
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'dashboard.html'));
});

// Compatibilidad: si alguien entra con la URL .html antigua, se lleva a la versión limpia
app.get('/login.html', (req, res) => res.redirect(301, '/login'));
app.get('/dashboard.html', (req, res) => res.redirect(301, '/dashboard'));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Importación de rutas
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const perfilRoutes = require('./routes/perfilRoutes');
const opcionRoutes = require('./routes/opcionRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const productoRoutes = require('./routes/productoRoutes');
const camionRoutes = require('./routes/camionRoutes');
const rutaRoutes = require('./routes/rutaRoutes');
const viajeRoutes = require('./routes/viajeRoutes');
const deudaRoutes = require('./routes/deudaRoutes');
const cuentaBancariaRoutes = require('./routes/cuentaBancariaRoutes');
const dashboardFinancieroRoutes = require('./routes/dashboardFinancieroRoutes');
const indemnizacionRoutes = require('./routes/indemnizacionRoutes');
const dashboardGeneralRoutes = require('./routes/dashboardGeneralRoutes');

// Registro de rutas
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/perfiles', perfilRoutes);
app.use('/api/opciones', opcionRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/camiones', camionRoutes);
app.use('/api/rutas', rutaRoutes);
app.use('/api/viajes', viajeRoutes);
app.use('/api/deudas', deudaRoutes);
app.use('/api/cuentas-bancarias', cuentaBancariaRoutes);
app.use('/api/dashboard-financiero', dashboardFinancieroRoutes);
app.use('/api/indemnizaciones', indemnizacionRoutes);
app.use('/api/dashboard-general', dashboardGeneralRoutes);

// Ruta de prueba
app.get('/api/ping', (req, res) => {
    res.json({ message: 'Pong! API de Transporte Joselito funcionando correctamente.' });
});

// Configuración del puerto
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`Servidor de Transporte Joselito corriendo en el puerto ${PORT}`);
    await autoSeed();
});
