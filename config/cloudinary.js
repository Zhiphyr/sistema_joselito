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

// Configuración del storage para comprobantes
const storageComprobantes = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'sistema_joselito/comprobantes',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'pdf'],
    public_id: (req, file) => 'voucher_' + Date.now(),
  },
});

// Configuración del storage para códigos QR
const storageQR = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'sistema_joselito/codigos_qr',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    public_id: (req, file) => 'qr_' + Date.now(),
  },
});

const upload = multer({ storage: storageComprobantes });
const uploadQR = multer({ storage: storageQR });

module.exports = { cloudinary, upload, uploadQR };
