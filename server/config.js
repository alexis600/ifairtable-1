require('dotenv').config();

const INDUSTRIES = {
  estetica: {
    id: 'estetica',
    name: 'Centro de Estética & Belleza',
    theme: 'aesthetic',
    icon: '🌸',
    tagline: 'Gestión Integral de Clientes y Tratamientos',
    vocabulary: {
      entitySingular: 'Cliente',
      entityPlural: 'Clientes',
      newAction: 'Nuevo Cliente',
      editAction: 'Editar Cliente',
      identifierLabel: 'Ficha / ID',
      eventsLabel: 'Tratamientos / Turnos',
      primarySearchPlaceholder: 'Buscar por nombre, teléfono o ficha...'
    }
  },
  clinica: {
    id: 'clinica',
    name: 'Centro Médico & Sanatorio',
    theme: 'clinic',
    icon: '🏥',
    tagline: 'Portal Clínico de Gestión de Pacientes y Consultas',
    vocabulary: {
      entitySingular: 'Paciente',
      entityPlural: 'Pacientes',
      newAction: 'Nuevo Paciente',
      editAction: 'Editar Paciente',
      identifierLabel: 'Historia Clínica (HC)',
      eventsLabel: 'Consultas / Turnos',
      primarySearchPlaceholder: 'Buscar por nombre, apellido o HC...'
    }
  },
  rehab: {
    id: 'rehab',
    name: 'Centro de Rehabilitación & Terapia',
    theme: 'rehab',
    icon: '🌿',
    tagline: 'Seguimiento de Pacientes y Sesiones Terapéuticas',
    vocabulary: {
      entitySingular: 'Paciente',
      entityPlural: 'Pacientes',
      newAction: 'Nueva Ficha',
      editAction: 'Editar Ficha',
      identifierLabel: 'Legajo / HC',
      eventsLabel: 'Sesiones / Terapias',
      primarySearchPlaceholder: 'Buscar por nombre, apellido o legajo...'
    }
  },
  fitness: {
    id: 'fitness',
    name: 'Gimnasio & Estudio Fitness',
    theme: 'fitness',
    icon: '⚡',
    tagline: 'Control de Socios, Membresías y Reservas',
    vocabulary: {
      entitySingular: 'Socio',
      entityPlural: 'Socios',
      newAction: 'Nuevo Socio',
      editAction: 'Editar Socio',
      identifierLabel: 'N° Socio / DNI',
      eventsLabel: 'Clases / Turnos',
      primarySearchPlaceholder: 'Buscar por nombre, socio o DNI...'
    }
  }
};

module.exports = {
  PORT: process.env.PORT || 3000,
  AIRTABLE_PAT: process.env.AIRTABLE_PAT || '',
  AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID || 'appljMcMjD7reOMsg',
  AIRTABLE_TABLE_ID: process.env.AIRTABLE_TABLE_ID || 'tblwNKUcveOLycUye',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_key_interfaz_airtable_2026',
  OPERATOR_USER: process.env.OPERATOR_USER || 'operador',
  OPERATOR_PASSWORD: process.env.OPERATOR_PASSWORD || 'admin123',
  DEFAULT_INDUSTRY: process.env.DEFAULT_INDUSTRY || 'estetica',
  INDUSTRIES
};
