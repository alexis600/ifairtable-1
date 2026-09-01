const path = require('path');
const config = require('./config');
const app = require('./app');

// Fallback para SPA local
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/.netlify')) {
    return res.status(404).json({ error: 'Endpoint API no encontrado' });
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
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
