const bcrypt = require('bcryptjs');

/**
 * Registro Centralizado de Comercios / Inquilinos (Tenants)
 * Cada cliente tiene su propia identidad visual, vocabulario, credenciales hasheadas (Bcrypt)
 * y su propia Base de Datos y Tabla en Airtable.
 * 
 * SEGURIDAD: Ninguna contraseña se almacena en texto plano. Solo hashes de Bcrypt irreversibles.
 */
const TENANTS = {
  // ⚡ Cliente Activo Testing: Gimnasio & Estudio Fitness (Alexis)
  'fitness': {
    id: 'fitness',
    name: 'Gimnasio & Estudio Fitness Pro',
    theme: 'fitness',
    icon: '⚡',
    tagline: 'Control de Socios, Membresías y Turnos',
    username: 'alexis',
    // Bcrypt hash para 'testing'
    passwordHash: '$2a$10$SAbOqAbqxZVxe7hYQ4CqXO7NrhEZuFr0FhUgvKLjvx8CvwINbXWxu',
    vocabulary: {
      entitySingular: 'Socio',
      entityPlural: 'Socios',
      newAction: 'Nuevo Socio',
      editAction: 'Editar Socio',
      identifierLabel: 'N° Socio / DNI',
      eventsLabel: 'Clases / Turnos',
      primarySearchPlaceholder: 'Buscar por nombre, apellido, teléfono o socio...'
    },
    // Asociado a la tabla en curso de testing en Airtable:
    airtable: {
      baseId: process.env.AIRTABLE_BASE_ID || 'appljMcMjD7reOMsg',
      tableId: process.env.AIRTABLE_TABLE_ID || 'tblwNKUcveOLycUye'
    }
  },

  // 🌸 Cliente 2: Centro de Podología & Estética (María Elena - Base propia a definir)
  'podologia': {
    id: 'podologia',
    name: 'Centro de Podología & Manicuría',
    theme: 'aesthetic',
    icon: '💅',
    tagline: 'Gestión Integral de Pacientes y Turnos de Estética',
    username: 'maria.elena',
    passwordHash: '$2a$10$REzZcB8MQ8TTwejjppD6P.vsYw.Q4Wag5esxdQWAgwwi.J5fSBCbS',
    vocabulary: {
      entitySingular: 'Paciente',
      entityPlural: 'Pacientes',
      newAction: 'Nuevo Paciente',
      editAction: 'Editar Paciente',
      identifierLabel: 'Historia Clínica (HC)',
      eventsLabel: 'Turnos / Tratamientos',
      primarySearchPlaceholder: 'Buscar por nombre, apellido, teléfono o HC...'
    },
    formRules: {
      requiredFields: ['HC', 'Nombre', 'Apellido', 'Telefono', 'Mail'],
      defaultValues: {
        'Status': 'Activo'
      },
      hiddenFormFields: ['Honorarios', 'Notas', 'Status'],
      nonEditableFields: ['Status'],
      tableColumns: ['HC', 'Paciente', 'Telefono', 'Mail', 'Fecha Nacimiento', 'Direccion', 'Status'],
      autoIncrementField: 'HC',
      allowDelete: false
    },
    // Base a asignar cuando crees su workspace de Airtable:
    airtable: {
      baseId: process.env.AIRTABLE_PODO_BASE_ID || 'appUI1CEYeCJoqhkw',
      tableId: process.env.AIRTABLE_PODO_TABLE_ID || 'tblwNKUcveOLycUye'
    }
  },

  // 🏥 Cliente 3: Sanatorio & Centro Médico
  'clinica': {
    id: 'clinica',
    name: 'Sanatorio & Centro Médico Belgrano',
    theme: 'clinic',
    icon: '🏥',
    tagline: 'Portal Clínico de Gestión de Pacientes y Consultas',
    username: 'clinica_admin',
    passwordHash: '$2a$10$w0uGqK0t0m8b8M9W1qPqSeuVdD3wI2A2s9UqL8Y7H1O1b6L6N5D0W',
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

  // 🌿 Cliente 4: Centro de Rehabilitación & Kinesiología
  'rehab': {
    id: 'rehab',
    name: 'Centro de Rehabilitación & Kinesiología',
    theme: 'rehab',
    icon: '🌿',
    tagline: 'Seguimiento de Pacientes y Sesiones Terapéuticas',
    username: 'rehab_admin',
    passwordHash: '$2a$10$w0uGqK0t0m8b8M9W1qPqSeuVdD3wI2A2s9UqL8Y7H1O1b6L6N5D0W',
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
  }
};

function getTenantById(tenantId) {
  return TENANTS[tenantId] || null;
}

function findTenantByUsername(username) {
  if (!username) return null;
  const cleanUser = username.trim().toLowerCase();
  for (const t of Object.values(TENANTS)) {
    if (t.username && t.username.toLowerCase() === cleanUser) {
      return t;
    }
  }
  return null;
}

/**
 * Autenticación segura mediante verificación de Hash de Bcrypt
 */
async function verifyTenantCredentials(username, password) {
  const tenant = findTenantByUsername(username);
  if (!tenant || !password || !tenant.passwordHash) return null;

  try {
    const isMatch = await bcrypt.compare(password, tenant.passwordHash);
    if (isMatch) return tenant;
  } catch (err) {
    console.error('Error al comparar hash de Bcrypt:', err);
  }

  return null;
}

module.exports = {
  TENANTS,
  getTenantById,
  findTenantByUsername,
  verifyTenantCredentials
};
