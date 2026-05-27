export type Rol = 'vendedor' | 'admin'
export type DealEstado = 'contactado' | 'propuesta' | 'negociacion' | 'cerrado' | 'perdido'
export type MisionTipo = 'diaria' | 'semanal' | 'mensual'
export type DuelEstado = 'pendiente' | 'activo' | 'finalizado'

export interface Profile {
  id: string
  nombre: string
  apellido: string
  rol: Rol
  puntos_total: number
  nivel: string
  racha_actual: number
  racha_max: number
  ventas_cerradas: number
  avatar_color: string
  email?: string
  created_at: string
}

export interface Deal {
  id: string
  vendedor_id: string
  nombre_negocio: string
  telefono?: string
  categoria?: string
  estado: DealEstado
  monto?: number
  notas: string
  fuente: string
  maps_url?: string
  created_at: string
  updated_at: string
  closed_at?: string
}

export interface DealActivity {
  id: string
  deal_id: string
  vendedor_id: string
  tipo: string
  nota?: string
  puntos: number
  created_at: string
}

export interface RouletteSpin {
  id: string
  vendedor_id: string
  deal_id?: string
  puntos_ganados: number
  premio_texto: string
  created_at: string
}

export interface Mission {
  id: string
  tipo: MisionTipo
  titulo: string
  descripcion?: string
  tipo_accion: string
  objetivo: number
  puntos_recompensa: number
  activa: boolean
}

export interface MissionProgress {
  id: string
  mision_id: string
  vendedor_id: string
  fecha: string
  progreso: number
  completada: boolean
  completada_at?: string
  missions?: Mission
}

export interface Duel {
  id: string
  retador_id: string
  retado_id: string
  ganador_id?: string
  semana: number
  año: number
  retador_ventas: number
  retado_ventas: number
  puntos_apuesta: number
  estado: DuelEstado
  created_at: string
  retador?: Profile
  retado?: Profile
}

// ── Points ────────────────────────────────────────────────────
export const PUNTOS = {
  contacto: 10,
  propuesta: 25,
  seguimiento: 5,
  cierre: 100,
  perdido: -80,
} as const


export const NIVELES = [
  { nombre: 'Rookie',     min: 0,    color: '#888' },
  { nombre: 'Prospector', min: 500,  color: '#4a9eff' },
  { nombre: 'Closer',     min: 1500, color: '#cc44ff' },
  { nombre: 'Hunter',     min: 4000, color: '#ff8800' },
  { nombre: 'Legend',     min: 8000, color: '#ccff00' },
] as const

export function getNivel(puntos: number) {
  for (let i = NIVELES.length - 1; i >= 0; i--) {
    if (puntos >= NIVELES[i].min) return NIVELES[i]
  }
  return NIVELES[0]
}

export function getNextNivel(puntos: number) {
  for (let i = 0; i < NIVELES.length; i++) {
    if (puntos < NIVELES[i].min) return NIVELES[i]
  }
  return null
}

export function initials(p: Profile) {
  return `${p.nombre[0] ?? ''}${p.apellido[0] ?? ''}`.toUpperCase()
}

// ── Negocios ──────────────────────────────────────────────────
export type NegocioEstado = 'activo' | 'inactivo' | 'cliente' | 'perdido'
export type NegocioPrioridad = 'alta' | 'media' | 'baja'
export type NotaTipo = 'nota' | 'llamada' | 'reunion' | 'email' | 'tarea' | 'whatsapp'

export interface Negocio {
  id: string
  vendedor_id: string
  asignado_a?: string | null
  empresa: string
  contacto?: string
  telefono?: string
  email?: string
  categoria?: string
  fuente: string
  etiquetas: string[]
  estado: NegocioEstado
  prioridad: NegocioPrioridad
  monto_estimado?: number
  notas: string
  maps_url?: string
  website?: string
  instagram?: string
  direccion?: string
  latitud?: number | null
  longitud?: number | null
  ultimo_contacto?: string
  created_at: string
  updated_at: string
  vendedor?: Profile
  asignado?: Profile | null
}

export interface NegocioNota {
  id: string
  negocio_id: string
  vendedor_id: string
  tipo: NotaTipo
  contenido: string
  created_at: string
  vendedor?: Profile
}

export function getWeekNumber(date = new Date()): { semana: number; año: number } {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return {
    semana: 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7),
    año: d.getFullYear(),
  }
}
