require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middlewares
app.use(cors()); // Permitir peticiones de otros orígenes
app.use(express.json()); // Parseo de JSON
app.use(express.urlencoded({ extended: true })); // Parseo de datos de formularios urlencoded

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

// Ruta de prueba
app.get('/api/ping', (req, res) => {
    res.json({ message: 'Pong! API de Transporte Joselito funcionando correctamente.' });
});

// Configuración del puerto
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor de Transporte Joselito corriendo en el puerto ${PORT}`);
});
