const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config');
const routes = require('./routes');

const app = express();

// Habilitar trust proxy para reconocer HTTPS y la IP real del cliente detrás de proxies (Render, Cloudflare, Nginx, etc.)
app.set('trust proxy', 1);

// Seguridad con Helmet (permitiendo scripts y estilos locales y fuentes de Google)
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

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../public')));

// Enrutador de la API
app.use('/api', routes);

// Fallback para SPA: redirigir a index.html si no es /api
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint API no encontrado' });
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error('🔥 Error no controlado en la aplicación:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(config.PORT, () => {
  console.log(`
======================================================
 ✨ Interfaz Web Resiliente y Multirrubro para Airtable
 🚀 Servidor escuchando en: http://localhost:${config.PORT}
 🏢 Rubro inicial: ${config.DEFAULT_INDUSTRY}
 🔒 Modo Seguro: Activo
======================================================
  `);
});
