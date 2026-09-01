const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const routes = require('./routes');

const app = express();

// Habilitar trust proxy para reconocer HTTPS en Netlify, Render, Cloudflare, etc.
app.set('trust proxy', 1);

// Seguridad con Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://*.airtable.com', 'https://v5.airtableusercontent.com']
      }
    }
  })
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas de la API (soporte tanto para /api como para llamadas serverless)
app.use('/api', routes);
app.use('/.netlify/functions/api', routes);

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../public')));

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error('🔥 Error no controlado en la aplicación:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
