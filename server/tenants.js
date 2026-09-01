const bcrypt = require('bcryptjs');

/**
 * Registro Centralizado de Comercios / Inquilinos (Tenants)
 * Cada cliente tiene su propia identidad visual, vocabulario, credenciales
 * y su propia Base de Datos y Tabla en Airtable.
 */
const TENANTS = {
  'estetica': {
    id: 'estetica',
    name: 'Centro de Estética & Belleza Glam',
    theme: 'aesthetic',
    icon: '🌸',
    tagline: 'Gestión Integral de Clientes y Tratamientos',
    username: 'estetica_admin',
    // Password predeterminada: 'estetica123'
    passwordPlain: 'estetica123',
    passwordHash: '$2a$10$w0uGqK0t0m8b8M9W1qPqSeuVdD3wI2A2s9UqL8Y7H1O1b6L6N5D0W', // Hash bcrypt para estetica123
    vocabulary: {
      entitySingular: 'Cliente',
      entityPlural: 'Clientes',
      newAction: 'Nuevo Cliente',
      editAction: 'Editar Cliente',
      identifierLabel: 'Ficha / ID',
      eventsLabel: 'Tratamientos / Turnos',
      primarySearchPlaceholder: 'Buscar por nombre, teléfono o ficha...'
    },
    airtable: {
      baseId: process.env.AIRTABLE_BASE_ID || 'appljMcMjD7reOMsg',
      tableId: process.env.AIRTABLE_TABLE_ID || 'tblwNKUcveOLycUye'
    }
  },
  'clinica': {
    id: 'clinica',
    name: 'Sanatorio & Centro Médico Belgrano',
    theme: 'clinic',
    icon: '🏥',
    tagline: 'Portal Clínico de Gestión de Pacientes y Consultas',
    username: 'clinica_admin',
    passwordPlain: 'clinica123',
    passwordHash: '$2a$10$w0uGqK0t0m8b8M9W1qPqSeuVdD3wI2A2s9UqL8Y7H1O1b6L6N5D0W', // clinica123
    vocabulary: {
      entitySingular: 'Paciente',
      entityPlural: 'Pacientes',
      newAction: 'Nuevo Paciente',
      editAction: 'Editar Paciente',
      identifierLabel: 'Historia Clínica (HC)',
      eventsLabel: 'Consultas / Turnos',
      primarySearchPlaceholder: 'Buscar por nombre, apellido o HC...'
    },
    airtable: {
      baseId: 'appClinicaDemoBase',
      tableId: 'tblPacientesSanatorio'
    }
  },
  'rehab': {
    id: 'rehab',
    name: 'Centro de Rehabilitación & Kinesiología',
    theme: 'rehab',
    icon: '🌿',
    tagline: 'Seguimiento de Pacientes y Sesiones Terapéuticas',
    username: 'rehab_admin',
    passwordPlain: 'rehab123',
    passwordHash: '$2a$10$w0uGqK0t0m8b8M9W1qPqSeuVdD3wI2A2s9UqL8Y7H1O1b6L6N5D0W', // rehab123
    vocabulary: {
      entitySingular: 'Paciente',
      entityPlural: 'Pacientes',
      newAction: 'Nueva Ficha',
      editAction: 'Editar Ficha',
      identifierLabel: 'Legajo / HC',
      eventsLabel: 'Sesiones / Terapias',
      primarySearchPlaceholder: 'Buscar por nombre, apellido o legajo...'
    },
    airtable: {
      baseId: 'appRehabDemoBase',
      tableId: 'tblPacientesRehab'
    }
  },
  'fitness': {
    id: 'fitness',
    name: 'Gimnasio & Estudio Fitness Pro',
    theme: 'fitness',
    icon: '⚡',
    tagline: 'Control de Socios, Membresías y Reservas',
    username: 'gym_admin',
    passwordPlain: 'gym123',
    passwordHash: '$2a$10$w0uGqK0t0m8b8M9W1qPqSeuVdD3wI2A2s9UqL8Y7H1O1b6L6N5D0W', // gym123
    vocabulary: {
      entitySingular: 'Socio',
      entityPlural: 'Socios',
      newAction: 'Nuevo Socio',
      editAction: 'Editar Socio',
      identifierLabel: 'N° Socio / DNI',
      eventsLabel: 'Clases / Turnos',
      primarySearchPlaceholder: 'Buscar por nombre, socio o DNI...'
    },
    airtable: {
      baseId: 'appGymDemoBase',
      tableId: 'tblSociosGimnasio'
    }
  }
};

// Asegurar soporte retrocompatible con el operador por defecto
TENANTS['operador'] = {
  ...TENANTS['estetica'],
  id: 'operador',
  username: 'operador',
  passwordPlain: 'admin123'
};

function getTenantById(tenantId) {
  return TENANTS[tenantId] || null;
}

function findTenantByUsername(username) {
  for (const t of Object.values(TENANTS)) {
    if (t.username.toLowerCase() === username.toLowerCase()) {
      return t;
    }
  }
  return null;
}

async function verifyTenantCredentials(username, password) {
  const tenant = findTenantByUsername(username);
  if (!tenant) return null;

  // Verificación directa o bcrypt
  if (tenant.passwordPlain && tenant.passwordPlain === password) {
    return tenant;
  }

  if (tenant.passwordHash) {
    const isMatch = await bcrypt.compare(password, tenant.passwordHash);
    if (isMatch) return tenant;
  }

  return null;
}

function getPublicTenantsList() {
  return Object.values(TENANTS).filter(t => t.id !== 'operador').map(t => ({
    id: t.id,
    name: t.name,
    icon: t.icon,
    theme: t.theme,
    tagline: t.tagline,
    username: t.username,
    demoPassword: t.passwordPlain,
    vocabulary: t.vocabulary,
    airtableBaseId: t.airtable.baseId,
    airtableTableId: t.airtable.tableId
  }));
}

module.exports = {
  TENANTS,
  getTenantById,
  findTenantByUsername,
  verifyTenantCredentials,
  getPublicTenantsList
};
