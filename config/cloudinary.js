const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// Configuración con credenciales
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuración del storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'sistema_joselito/comprobantes', // Carpeta donde se guardarán
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'pdf'],
    public_id: (req, file) => 'voucher_' + Date.now(),
  },
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };
