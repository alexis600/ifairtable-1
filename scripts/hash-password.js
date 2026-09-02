#!/usr/bin/env node
const bcrypt = require('bcryptjs');

const rawPassword = process.argv[2];

if (!rawPassword) {
  console.log(`
============================================================
 🔐 GENERADOR DE HASH BCRYPT PARA NUEVOS CLIENTES
============================================================
 Uso:
   npm run hash "TuContraseñaSecreta"

 Ejemplo:
   npm run hash "Clinica.2026!"
============================================================
  `);
  process.exit(1);
}

const saltRounds = 10;
const hash = bcrypt.hashSync(rawPassword, saltRounds);

console.log(`
============================================================
 🔐 CONTRASEÑA HASHEADA CON ÉXITO
============================================================
 🔑 Contraseña original : ${rawPassword}
 🛡️  Hash de Bcrypt      : ${hash}

 📋 Copiá y pegá esta línea en server/tenants.js:
    passwordHash: '${hash}',
============================================================
`);
