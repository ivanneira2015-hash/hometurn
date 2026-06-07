export interface PresetSlot {
  day: string
  chore_name: string
  member_slot: number
}

export interface PresetTemplate {
  name: string
  description: string
  icon: string
  system: string
  slots: PresetSlot[]
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    name: 'El Clásico',
    description: 'Basado en el organigrama de tareas del hogar. Cada miembro tiene su área fija.',
    icon: '🏠',
    system: 'Especialización',
    slots: [
      // Miembro 0: cocina y ropa
      { day: 'monday',    chore_name: 'Cocinar',                       member_slot: 0 },
      { day: 'monday',    chore_name: 'Lavar ropa',                    member_slot: 0 },
      { day: 'monday',    chore_name: 'Doblar ropa',                   member_slot: 0 },
      { day: 'tuesday',   chore_name: 'Lavar platos + limpiar hornallas', member_slot: 0 },
      { day: 'wednesday', chore_name: 'Cocinar',                       member_slot: 0 },
      { day: 'wednesday', chore_name: 'Lavar ropa',                    member_slot: 0 },
      { day: 'wednesday', chore_name: 'Doblar ropa',                   member_slot: 0 },
      { day: 'thursday',  chore_name: 'Lavar platos + limpiar hornallas', member_slot: 0 },
      { day: 'friday',    chore_name: 'Cocinar',                       member_slot: 0 },
      { day: 'friday',    chore_name: 'Lavar ropa',                    member_slot: 0 },
      // Miembro 1: baño y superficies
      { day: 'monday',    chore_name: 'Lavar platos',                  member_slot: 1 },
      { day: 'monday',    chore_name: 'Repasar baño',                  member_slot: 1 },
      { day: 'monday',    chore_name: 'Limpiar mueble',                member_slot: 1 },
      { day: 'tuesday',   chore_name: 'Sacar la basura',               member_slot: 1 },
      { day: 'tuesday',   chore_name: 'Limpiar el tacho',              member_slot: 1 },
      { day: 'tuesday',   chore_name: 'Repasar baño',                  member_slot: 1 },
      { day: 'wednesday', chore_name: 'Lavar platos',                  member_slot: 1 },
      { day: 'wednesday', chore_name: 'Repasar baño',                  member_slot: 1 },
      { day: 'thursday',  chore_name: 'Sacar la basura',               member_slot: 1 },
      { day: 'thursday',  chore_name: 'Limpiar el tacho',              member_slot: 1 },
      { day: 'friday',    chore_name: 'Lavar platos',                  member_slot: 1 },
      { day: 'friday',    chore_name: 'Repasar baño',                  member_slot: 1 },
      // Miembro 2: pisos y basura
      { day: 'monday',    chore_name: 'Barrer y trapear',              member_slot: 2 },
      { day: 'monday',    chore_name: 'Sacar la basura',               member_slot: 2 },
      { day: 'monday',    chore_name: 'Limpiar el tacho',              member_slot: 2 },
      { day: 'tuesday',   chore_name: 'Cocinar',                       member_slot: 2 },
      { day: 'tuesday',   chore_name: 'Barrer y trapear',              member_slot: 2 },
      { day: 'tuesday',   chore_name: 'Repasar baño',                  member_slot: 2 },
      { day: 'wednesday', chore_name: 'Limpiar heladera',              member_slot: 2 },
      { day: 'wednesday', chore_name: 'Barrer y trapear',              member_slot: 2 },
      { day: 'wednesday', chore_name: 'Sacar la basura',               member_slot: 2 },
      { day: 'thursday',  chore_name: 'Cocinar',                       member_slot: 2 },
      { day: 'thursday',  chore_name: 'Barrer y trapear',              member_slot: 2 },
      { day: 'friday',    chore_name: 'Barrer y trapear',              member_slot: 2 },
      { day: 'friday',    chore_name: 'Sacar la basura',               member_slot: 2 },
    ],
  },
  {
    name: 'Rotación Justa',
    description: 'Las tareas rotan entre los 3 miembros a lo largo de la semana. Nadie hace siempre lo mismo.',
    icon: '🔄',
    system: 'Rotación',
    slots: [
      // Lunes
      { day: 'monday', chore_name: 'Cocinar',          member_slot: 0 },
      { day: 'monday', chore_name: 'Barrer y trapear', member_slot: 1 },
      { day: 'monday', chore_name: 'Lavar platos',     member_slot: 2 },
      // Martes
      { day: 'tuesday', chore_name: 'Lavar platos',    member_slot: 0 },
      { day: 'tuesday', chore_name: 'Cocinar',         member_slot: 1 },
      { day: 'tuesday', chore_name: 'Sacar la basura', member_slot: 2 },
      // Miércoles
      { day: 'wednesday', chore_name: 'Barrer y trapear', member_slot: 0 },
      { day: 'wednesday', chore_name: 'Lavar platos',      member_slot: 1 },
      { day: 'wednesday', chore_name: 'Cocinar',           member_slot: 2 },
      // Jueves
      { day: 'thursday', chore_name: 'Repasar baño',   member_slot: 0 },
      { day: 'thursday', chore_name: 'Sacar la basura', member_slot: 1 },
      { day: 'thursday', chore_name: 'Barrer y trapear', member_slot: 2 },
      // Viernes
      { day: 'friday', chore_name: 'Sacar la basura',   member_slot: 0 },
      { day: 'friday', chore_name: 'Repasar baño',      member_slot: 1 },
      { day: 'friday', chore_name: 'Lavar ropa',        member_slot: 2 },
      // Extras repartidos
      { day: 'monday',    chore_name: 'Lavar ropa',      member_slot: 0 },
      { day: 'wednesday', chore_name: 'Limpiar heladera', member_slot: 1 },
      { day: 'friday',    chore_name: 'Doblar ropa',     member_slot: 0 },
    ],
  },
  {
    name: 'Por Zonas',
    description: 'Cada miembro es responsable de una zona de la casa toda la semana. Simple de recordar.',
    icon: '🗺️',
    system: 'Zonas',
    slots: [
      // Miembro 0: Zona Cocina
      { day: 'monday',    chore_name: 'Cocinar',        member_slot: 0 },
      { day: 'monday',    chore_name: 'Lavar platos',   member_slot: 0 },
      { day: 'tuesday',   chore_name: 'Cocinar',        member_slot: 0 },
      { day: 'tuesday',   chore_name: 'Lavar platos + limpiar hornallas', member_slot: 0 },
      { day: 'wednesday', chore_name: 'Cocinar',        member_slot: 0 },
      { day: 'wednesday', chore_name: 'Lavar platos',   member_slot: 0 },
      { day: 'thursday',  chore_name: 'Cocinar',        member_slot: 0 },
      { day: 'thursday',  chore_name: 'Lavar platos',   member_slot: 0 },
      { day: 'friday',    chore_name: 'Cocinar',        member_slot: 0 },
      { day: 'friday',    chore_name: 'Lavar platos + limpiar hornallas', member_slot: 0 },
      // Miembro 1: Zona Baño y Superficies
      { day: 'monday',    chore_name: 'Repasar baño',   member_slot: 1 },
      { day: 'monday',    chore_name: 'Limpiar mueble', member_slot: 1 },
      { day: 'wednesday', chore_name: 'Repasar baño',   member_slot: 1 },
      { day: 'wednesday', chore_name: 'Limpiar mueble', member_slot: 1 },
      { day: 'friday',    chore_name: 'Repasar baño',   member_slot: 1 },
      { day: 'friday',    chore_name: 'Limpiar heladera', member_slot: 1 },
      { day: 'tuesday',   chore_name: 'Limpiar el tacho', member_slot: 1 },
      { day: 'thursday',  chore_name: 'Limpiar el tacho', member_slot: 1 },
      // Miembro 2: Zona Pisos y Residuos
      { day: 'monday',    chore_name: 'Barrer y trapear', member_slot: 2 },
      { day: 'monday',    chore_name: 'Sacar la basura',  member_slot: 2 },
      { day: 'tuesday',   chore_name: 'Barrer y trapear', member_slot: 2 },
      { day: 'tuesday',   chore_name: 'Sacar la basura',  member_slot: 2 },
      { day: 'wednesday', chore_name: 'Barrer y trapear', member_slot: 2 },
      { day: 'thursday',  chore_name: 'Barrer y trapear', member_slot: 2 },
      { day: 'thursday',  chore_name: 'Sacar la basura',  member_slot: 2 },
      { day: 'friday',    chore_name: 'Barrer y trapear', member_slot: 2 },
      // Ropa compartida
      { day: 'monday',    chore_name: 'Lavar ropa',   member_slot: 2 },
      { day: 'wednesday', chore_name: 'Doblar ropa',  member_slot: 1 },
    ],
  },
  {
    name: 'La Minimalista',
    description: 'Solo las tareas esenciales, bien distribuidas. Una o dos por persona por día.',
    icon: '✨',
    system: 'Mínimo esencial',
    slots: [
      { day: 'monday',    chore_name: 'Cocinar',          member_slot: 0 },
      { day: 'monday',    chore_name: 'Lavar platos',     member_slot: 1 },
      { day: 'monday',    chore_name: 'Barrer y trapear', member_slot: 2 },
      { day: 'tuesday',   chore_name: 'Lavar platos + limpiar hornallas', member_slot: 0 },
      { day: 'tuesday',   chore_name: 'Repasar baño',     member_slot: 1 },
      { day: 'tuesday',   chore_name: 'Sacar la basura',  member_slot: 2 },
      { day: 'wednesday', chore_name: 'Cocinar',          member_slot: 1 },
      { day: 'wednesday', chore_name: 'Lavar platos',     member_slot: 2 },
      { day: 'wednesday', chore_name: 'Barrer y trapear', member_slot: 0 },
      { day: 'thursday',  chore_name: 'Lavar platos + limpiar hornallas', member_slot: 1 },
      { day: 'thursday',  chore_name: 'Sacar la basura',  member_slot: 0 },
      { day: 'thursday',  chore_name: 'Repasar baño',     member_slot: 2 },
      { day: 'friday',    chore_name: 'Cocinar',          member_slot: 2 },
      { day: 'friday',    chore_name: 'Lavar platos',     member_slot: 0 },
      { day: 'friday',    chore_name: 'Lavar ropa',       member_slot: 1 },
    ],
  },
  {
    name: 'Semana Intensa',
    description: 'Más tareas por día para dejar el fin de semana completamente libre. Ideal para quienes trabajan el fin de semana.',
    icon: '💪',
    system: 'Full semanal',
    slots: [
      // Lunes — limpieza general
      { day: 'monday', chore_name: 'Cocinar',          member_slot: 0 },
      { day: 'monday', chore_name: 'Lavar ropa',       member_slot: 0 },
      { day: 'monday', chore_name: 'Lavar platos',     member_slot: 1 },
      { day: 'monday', chore_name: 'Repasar baño',     member_slot: 1 },
      { day: 'monday', chore_name: 'Barrer y trapear', member_slot: 2 },
      { day: 'monday', chore_name: 'Sacar la basura',  member_slot: 2 },
      // Martes
      { day: 'tuesday', chore_name: 'Lavar platos + limpiar hornallas', member_slot: 0 },
      { day: 'tuesday', chore_name: 'Doblar ropa',      member_slot: 0 },
      { day: 'tuesday', chore_name: 'Limpiar el tacho', member_slot: 1 },
      { day: 'tuesday', chore_name: 'Limpiar mueble',   member_slot: 1 },
      { day: 'tuesday', chore_name: 'Barrer y trapear', member_slot: 2 },
      { day: 'tuesday', chore_name: 'Cocinar',          member_slot: 2 },
      // Miércoles
      { day: 'wednesday', chore_name: 'Cocinar',          member_slot: 0 },
      { day: 'wednesday', chore_name: 'Lavar platos',     member_slot: 1 },
      { day: 'wednesday', chore_name: 'Limpiar heladera', member_slot: 1 },
      { day: 'wednesday', chore_name: 'Barrer y trapear', member_slot: 2 },
      { day: 'wednesday', chore_name: 'Sacar la basura',  member_slot: 2 },
      // Jueves
      { day: 'thursday', chore_name: 'Lavar platos + limpiar hornallas', member_slot: 0 },
      { day: 'thursday', chore_name: 'Repasar baño',     member_slot: 1 },
      { day: 'thursday', chore_name: 'Limpiar el tacho', member_slot: 1 },
      { day: 'thursday', chore_name: 'Cocinar',          member_slot: 2 },
      { day: 'thursday', chore_name: 'Barrer y trapear', member_slot: 2 },
      // Viernes
      { day: 'friday', chore_name: 'Cocinar',          member_slot: 0 },
      { day: 'friday', chore_name: 'Lavar ropa',       member_slot: 0 },
      { day: 'friday', chore_name: 'Doblar ropa',      member_slot: 0 },
      { day: 'friday', chore_name: 'Lavar platos',     member_slot: 1 },
      { day: 'friday', chore_name: 'Repasar baño',     member_slot: 1 },
      { day: 'friday', chore_name: 'Limpiar mueble',   member_slot: 1 },
      { day: 'friday', chore_name: 'Barrer y trapear', member_slot: 2 },
      { day: 'friday', chore_name: 'Sacar la basura',  member_slot: 2 },
      { day: 'friday', chore_name: 'Limpiar el tacho', member_slot: 2 },
    ],
  },
  {
    name: 'Días Alternados',
    description: 'Cada miembro "toma el mando" de un día distinto. El que manda ese día hace todas las tareas.',
    icon: '📅',
    system: 'Un chef por día',
    slots: [
      // Lunes: Miembro 0 a cargo
      { day: 'monday', chore_name: 'Cocinar',          member_slot: 0 },
      { day: 'monday', chore_name: 'Lavar platos',     member_slot: 0 },
      { day: 'monday', chore_name: 'Sacar la basura',  member_slot: 0 },
      // Martes: Miembro 1 a cargo
      { day: 'tuesday', chore_name: 'Cocinar',         member_slot: 1 },
      { day: 'tuesday', chore_name: 'Lavar platos + limpiar hornallas', member_slot: 1 },
      { day: 'tuesday', chore_name: 'Barrer y trapear', member_slot: 1 },
      // Miércoles: Miembro 2 a cargo
      { day: 'wednesday', chore_name: 'Cocinar',        member_slot: 2 },
      { day: 'wednesday', chore_name: 'Lavar platos',   member_slot: 2 },
      { day: 'wednesday', chore_name: 'Repasar baño',   member_slot: 2 },
      // Jueves: Miembro 0 a cargo
      { day: 'thursday', chore_name: 'Cocinar',         member_slot: 0 },
      { day: 'thursday', chore_name: 'Lavar platos + limpiar hornallas', member_slot: 0 },
      { day: 'thursday', chore_name: 'Barrer y trapear', member_slot: 0 },
      // Viernes: Miembro 1 a cargo
      { day: 'friday', chore_name: 'Cocinar',          member_slot: 1 },
      { day: 'friday', chore_name: 'Lavar platos',     member_slot: 1 },
      { day: 'friday', chore_name: 'Barrer y trapear', member_slot: 1 },
      // Tareas de mantenimiento repartidas
      { day: 'monday',    chore_name: 'Lavar ropa',       member_slot: 2 },
      { day: 'wednesday', chore_name: 'Doblar ropa',      member_slot: 0 },
      { day: 'friday',    chore_name: 'Limpiar heladera', member_slot: 2 },
      { day: 'tuesday',   chore_name: 'Sacar la basura',  member_slot: 2 },
      { day: 'thursday',  chore_name: 'Limpiar el tacho', member_slot: 2 },
    ],
  },
]
