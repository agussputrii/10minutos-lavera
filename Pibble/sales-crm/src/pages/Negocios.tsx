import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Negocio, NegocioNota, NegocioEstado, NegocioPrioridad, NotaTipo } from '../types'
import { playClick, playXP, playError } from '../lib/sounds'

// ── Constants ────────────────────────────────────────────────
const ESTADOS: { key: NegocioEstado; label: string; color: string }[] = [
  { key: 'activo',   label: 'Activo',   color: '#00f0ff' },
  { key: 'inactivo', label: 'Inactivo', color: '#68687a' },
  { key: 'cliente',  label: 'Cliente',  color: '#ccff00' },
  { key: 'perdido',  label: 'Perdido',  color: '#ff4444' },
]
const PRIORIDADES: { key: NegocioPrioridad; label: string; color: string }[] = [
  { key: 'alta',  label: '🔴 Alta',  color: '#ff4444' },
  { key: 'media', label: '🟡 Media', color: '#ff8800' },
  { key: 'baja',  label: '🟢 Baja',  color: '#00c851' },
]
const FUENTES = ['manual','scraper','referido','web','instagram','facebook','llamada','evento']
const NOTA_TIPOS: { key: NotaTipo; icon: string; label: string }[] = [
  { key: 'nota',     icon: '📝', label: 'Nota'     },
  { key: 'llamada',  icon: '📞', label: 'Llamada'  },
  { key: 'reunion',  icon: '🤝', label: 'Reunión'  },
  { key: 'email',    icon: '📧', label: 'Email'    },
  { key: 'whatsapp', icon: '💬', label: 'WhatsApp' },
  { key: 'tarea',    icon: '✅', label: 'Tarea'    },
]

const EMPTY_FORM = {
  empresa: '', contacto: '', telefono: '', email: '', categoria: '',
  fuente: 'manual', etiquetas: [] as string[], estado: 'activo' as NegocioEstado,
  prioridad: 'media' as NegocioPrioridad, monto_estimado: '',
  notas: '', maps_url: '', website: '', instagram: '', direccion: '',
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)    return 'hace un momento'
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  return `hace ${Math.floor(diff / 86400)}d`
}

function fmtMonto(n?: number) {
  if (!n) return ''
  return '$' + n.toLocaleString('es-AR')
}

// ── Checkbox group ───────────────────────────────────────────
function CheckGroup<T extends string>({
  title, options, selected, onChange,
}: {
  title: string
  options: { key: T; label: string; color?: string }[]
  selected: T[]
  onChange: (v: T[]) => void
}) {
  const toggle = (k: T) =>
    onChange(selected.includes(k) ? selected.filter(x => x !== k) : [...selected, k])
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#68687a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 7 }}>
        {title}
      </div>
      {options.map(o => (
        <label key={o.key} onClick={() => { playClick(); toggle(o.key) }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', userSelect: 'none' }}>
          <div style={{
            width: 16, height: 16, borderRadius: 4,
            border: `2px solid ${selected.includes(o.key) ? (o.color || '#ccff00') : '#2a2a3a'}`,
            background: selected.includes(o.key) ? (o.color || '#ccff00') : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s',
          }}>
            {selected.includes(o.key) && <span style={{ fontSize: 9, color: '#000', fontWeight: 900 }}>✓</span>}
          </div>
          <span style={{ fontSize: 12, color: selected.includes(o.key) ? '#fff' : '#888' }}>{o.label}</span>
        </label>
      ))}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────
export default function Negocios() {
  const { profile } = useAuth()
  const isAdmin = profile?.rol === 'admin'

  const [negocios, setNegocios]     = useState<Negocio[]>([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<Negocio | null>(null)
  const [notas, setNotas]           = useState<NegocioNota[]>([])

  // Filters
  const [search, setSearch]             = useState('')
  const [fEstados, setFEstados]         = useState<NegocioEstado[]>([])
  const [fPrioridades, setFPrioridades] = useState<NegocioPrioridad[]>([])
  const [fFuentes, setFFuentes]         = useState<string[]>([])
  const [fCategorias, setFCategorias]   = useState<string[]>([])
  const [fEtiquetas, setFEtiquetas]     = useState<string[]>([])
  const [ocultarTomados, setOcultarTomados] = useState(false)

  // Modal / form
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode]   = useState(false)
  const [form, setForm]           = useState({ ...EMPTY_FORM })
  const [saving, setSaving]       = useState(false)
  const [tagInput, setTagInput]   = useState('')

  // New note
  const [notaTipo, setNotaTipo]     = useState<NotaTipo>('nota')
  const [notaTexto, setNotaTexto]   = useState('')
  const [addingNota, setAddingNota] = useState(false)

  // ── Data fetching ──────────────────────────────────────────
  async function fetchNegocios() {
    setLoading(true)
    let q = supabase
      .from('negocios')
      .select('*, vendedor:profiles(id,nombre,apellido,avatar_color)')
      .order('updated_at', { ascending: false })
    const { data } = await q
    setNegocios((data as Negocio[]) ?? [])
    setLoading(false)
  }

  async function fetchNotas(negocioId: string) {
    const { data } = await supabase
      .from('negocio_notas')
      .select('*, vendedor:profiles(id,nombre,apellido,avatar_color)')
      .eq('negocio_id', negocioId)
      .order('created_at', { ascending: false })
    setNotas((data as NegocioNota[]) ?? [])
  }

  useEffect(() => {
    fetchNegocios()

    const channel = supabase
      .channel('negocios-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'negocios' }, () => {
        fetchNegocios()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'negocio_notas' }, (payload) => {
        const rec = payload.new as { negocio_id?: string } | null
        if (rec?.negocio_id) fetchNotas(rec.negocio_id)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => { selected ? fetchNotas(selected.id) : setNotas([]) }, [selected])

  // Dynamic filter options
  const allCategorias = [...new Set(negocios.map(n => n.categoria).filter(Boolean).map(c => c!.trim()).filter(c => !/^\d+/.test(c)) as string[])].sort()
  const allEtiquetas  = [...new Set(negocios.flatMap(n => n.etiquetas))].sort()

  // Filtered list
  const filtered = negocios.filter(n => {
    if (ocultarTomados) {
      const isTomado = n.vendedor_id !== profile!.id && n.vendedor?.rol === 'vendedor'
      if (isTomado) return false
    }
    if (search) {
      const q = search.toLowerCase()
      if (!(n.empresa.toLowerCase().includes(q)
        || n.contacto?.toLowerCase().includes(q)
        || n.telefono?.includes(q)
        || n.categoria?.toLowerCase().includes(q)
        || n.etiquetas.some(e => e.toLowerCase().includes(q)))) return false
    }
    if (fEstados.length     && !fEstados.includes(n.estado))         return false
    if (fPrioridades.length && !fPrioridades.includes(n.prioridad))  return false
    if (fFuentes.length     && !fFuentes.includes(n.fuente))         return false
    if (fCategorias.length  && !fCategorias.includes(n.categoria ?? '')) return false
    if (fEtiquetas.length   && !fEtiquetas.some(e => n.etiquetas.includes(e))) return false
    return true
  })

  // ── Save ───────────────────────────────────────────────────
  async function handleSave() {
    if (!form.empresa.trim()) return
    setSaving(true)
    const payload: Record<string, unknown> = {
      empresa: form.empresa, contacto: form.contacto || null, telefono: form.telefono || null,
      email: form.email || null, categoria: form.categoria || null, fuente: form.fuente,
      etiquetas: form.etiquetas, estado: form.estado, prioridad: form.prioridad,
      monto_estimado: form.monto_estimado ? parseFloat(form.monto_estimado as string) : null,
      notas: form.notas, maps_url: form.maps_url || null, website: form.website || null,
      instagram: form.instagram || null, direccion: form.direccion || null,
      vendedor_id: profile!.id, updated_at: new Date().toISOString(),
    }
    let error: { message: string } | null = null
    if (editMode && selected) {
      ;({ error } = await supabase.from('negocios').update(payload).eq('id', selected.id))
    } else {
      ;({ error } = await supabase.from('negocios').insert(payload))
    }
    if (error) { playError(); console.error(error) }
    else { playXP(); setShowModal(false); setSelected(null); await fetchNegocios() }
    setSaving(false)
  }

  async function handleDelete() {
    if (!selected || !window.confirm(`¿Eliminar "${selected.empresa}"?`)) return
    await supabase.from('negocios').delete().eq('id', selected.id)
    setSelected(null)
    fetchNegocios()
  }

  async function handleAddNota() {
    if (!notaTexto.trim() || !selected) return
    setAddingNota(true)
    const { error } = await supabase.from('negocio_notas').insert({
      negocio_id: selected.id, vendedor_id: profile!.id, tipo: notaTipo, contenido: notaTexto.trim(),
    })
    if (!error) {
      await supabase.from('negocios').update({ ultimo_contacto: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', selected.id)
      playXP(); setNotaTexto(''); fetchNotas(selected.id); fetchNegocios()
    }
    setAddingNota(false)
  }

  function openEdit(n: Negocio) {
    setForm({
      empresa: n.empresa, contacto: n.contacto ?? '', telefono: n.telefono ?? '',
      email: n.email ?? '', categoria: n.categoria ?? '', fuente: n.fuente,
      etiquetas: n.etiquetas, estado: n.estado, prioridad: n.prioridad,
      monto_estimado: n.monto_estimado?.toString() ?? '', notas: n.notas,
      maps_url: n.maps_url ?? '', website: n.website ?? '',
      instagram: n.instagram ?? '', direccion: n.direccion ?? '',
    })
    setEditMode(true); setShowModal(true)
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (t && !form.etiquetas.includes(t)) setForm(f => ({ ...f, etiquetas: [...f.etiquetas, t] }))
    setTagInput('')
  }

  const activeFilters = fEstados.length + fPrioridades.length + fFuentes.length + fCategorias.length + fEtiquetas.length

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

      {/* FILTER SIDEBAR */}
      <aside style={{ width: 192, flexShrink: 0, borderRight: '1px solid rgba(255,0,127,0.12)', paddingRight: 18, paddingTop: 4, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#ccff00', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Filtros{activeFilters > 0 && (
              <span style={{ background: '#ccff00', color: '#000', borderRadius: 10, padding: '1px 6px', fontSize: 10, marginLeft: 5 }}>{activeFilters}</span>
            )}
          </span>
          {activeFilters > 0 && (
            <button onClick={() => { setFEstados([]); setFPrioridades([]); setFFuentes([]); setFCategorias([]); setFEtiquetas([]) }}
              style={{ fontSize: 10, color: '#ff4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Limpiar</button>
          )}
        </div>

        <div style={{ marginBottom: 18 }}>
          <label onClick={() => { playClick(); setOcultarTomados(!ocultarTomados) }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
            <div style={{
              width: 16, height: 16, borderRadius: 4,
              border: `2px solid ${ocultarTomados ? '#ccff00' : '#2a2a3a'}`,
              background: ocultarTomados ? '#ccff00' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s',
            }}>
              {ocultarTomados && <span style={{ fontSize: 9, color: '#000', fontWeight: 900 }}>✓</span>}
            </div>
            <span style={{ fontSize: 12, color: ocultarTomados ? '#fff' : '#888', fontWeight: 700 }}>Ocultar Tomados</span>
          </label>
        </div>

        <CheckGroup title="Estado" options={ESTADOS} selected={fEstados} onChange={setFEstados} />
        <CheckGroup title="Prioridad" options={PRIORIDADES} selected={fPrioridades} onChange={setFPrioridades} />
        <CheckGroup title="Fuente" options={FUENTES.map(f => ({ key: f, label: f[0].toUpperCase() + f.slice(1) }))} selected={fFuentes} onChange={setFFuentes} />
        {allCategorias.length > 0 && (
          <CheckGroup title="Categoría" options={allCategorias.map(c => ({ key: c, label: c }))} selected={fCategorias} onChange={setFCategorias} />
        )}
        {allEtiquetas.length > 0 && (
          <CheckGroup title="Etiquetas" options={allEtiquetas.map(e => ({ key: e, label: `#${e}` }))} selected={fEtiquetas} onChange={setFEtiquetas} />
        )}
      </aside>

      {/* MAIN LIST */}
      <div style={{ flex: 1, paddingLeft: 24, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexShrink: 0 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#fff' }}>Negocios 🏢</h1>
            <p style={{ margin: 0, fontSize: 11, color: '#68687a' }}>{filtered.length} de {negocios.length} negocios</p>
          </div>
          <div style={{ flex: 1 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
            style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: '8px 13px', color: '#fff', fontSize: 13, width: 210, outline: 'none' }} />
          <button onClick={() => { playClick(); setForm({ ...EMPTY_FORM }); setEditMode(false); setShowModal(true) }}
            style={{ background: 'linear-gradient(135deg,#ccff00,#88dd00)', color: '#000', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 900, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + Nuevo
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#68687a', marginTop: 40 }}>
              <div style={{ width: 18, height: 18, border: '2px solid #222', borderTopColor: '#ccff00', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: 60, color: '#68687a' }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>🏢</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{negocios.length === 0 ? 'Sin negocios aún' : 'Sin resultados'}</div>
              {negocios.length === 0 && (
                <button onClick={() => { setForm({ ...EMPTY_FORM }); setEditMode(false); setShowModal(true) }}
                  style={{ marginTop: 14, background: '#ccff00', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 900, cursor: 'pointer' }}>
                  Agregar primer negocio
                </button>
              )}
            </div>
          ) : (
            filtered.map(n => {
              const estado = ESTADOS.find(e => e.key === n.estado)!
              const isSel  = selected?.id === n.id
              return (
                <div key={n.id} onClick={() => { playClick(); setSelected(isSel ? null : n) }}
                  style={{
                    background: isSel ? 'rgba(0,240,255,0.04)' : '#0d0d16',
                    border: `1px solid ${isSel ? 'rgba(0,240,255,0.25)' : 'rgba(255,255,255,0.04)'}`,
                    borderRadius: 9, padding: '12px 14px', cursor: 'pointer', transition: 'all 0.12s',
                    display: 'flex', gap: 12, alignItems: 'center',
                  }}>
                  {/* Avatar */}
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: estado.color + '18', border: `2px solid ${estado.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: estado.color, flexShrink: 0 }}>
                    {n.empresa[0].toUpperCase()}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.empresa}</span>
                      {n.prioridad === 'alta' && <span style={{ fontSize: 9 }}>🔴</span>}
                      <span style={{ fontSize: 10, background: estado.color + '1a', color: estado.color, borderRadius: 4, padding: '2px 6px', fontWeight: 700, flexShrink: 0 }}>{estado.label}</span>
                      {n.vendedor_id !== profile!.id && n.vendedor?.rol === 'vendedor' && (
                        <span style={{ fontSize: 9, background: 'rgba(255,68,68,0.15)', color: '#ff4444', borderRadius: 4, padding: '2px 5px', fontWeight: 800, border: '1px solid #ff444430', whiteSpace: 'nowrap' }}>
                          ⚠️ Tomado por {n.vendedor?.nombre}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#68687a', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {n.contacto && <span>👤 {n.contacto}</span>}
                      {n.telefono && <span>📞 {n.telefono}</span>}
                      {n.categoria && !/^\d+/.test(n.categoria) && <span style={{ color: '#555' }}>{n.categoria}</span>}
                    </div>
                    {n.etiquetas.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                        {n.etiquetas.slice(0, 3).map(tag => (
                          <span key={tag} style={{ fontSize: 10, background: 'rgba(204,255,0,0.08)', color: '#ccff00', borderRadius: 4, padding: '1px 5px' }}>#{tag}</span>
                        ))}
                        {n.etiquetas.length > 3 && <span style={{ fontSize: 10, color: '#555' }}>+{n.etiquetas.length - 3}</span>}
                      </div>
                    )}
                  </div>
                  {/* Right */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {n.monto_estimado ? <div style={{ fontSize: 12, fontWeight: 800, color: '#ccff00' }}>{fmtMonto(n.monto_estimado)}</div> : null}
                    {n.vendedor && (
                      <div style={{ fontSize: 10, color: '#555' }}>{(n.vendedor as { nombre: string; apellido: string }).nombre}</div>
                    )}
                    <div style={{ fontSize: 10, color: '#333', marginTop: 2 }}>{timeAgo(n.ultimo_contacto ?? n.created_at)}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* DETAIL PANEL */}
      {selected && (
        <aside style={{ width: 300, flexShrink: 0, marginLeft: 18, borderLeft: '1px solid rgba(255,0,127,0.12)', paddingLeft: 20, overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingTop: 4, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: 15, color: '#fff', lineHeight: 1.2 }}>{selected.empresa}</div>
              {selected.contacto && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>👤 {selected.contacto}</div>}
            </div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#68687a', cursor: 'pointer', fontSize: 18, marginTop: -2 }}>×</button>
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {(() => { const e = ESTADOS.find(x => x.key === selected.estado)!; return <span style={{ fontSize: 10, background: e.color + '1a', color: e.color, borderRadius: 5, padding: '3px 8px', fontWeight: 700 }}>{e.label}</span> })()}
            {(() => { const p = PRIORIDADES.find(x => x.key === selected.prioridad)!; return <span style={{ fontSize: 10, background: '#ffffff0e', color: '#bbb', borderRadius: 5, padding: '3px 8px', fontWeight: 700 }}>{p.label}</span> })()}
            {selected.categoria && <span style={{ fontSize: 10, background: '#ffffff0e', color: '#888', borderRadius: 5, padding: '3px 8px' }}>{selected.categoria}</span>}
          </div>

          {/* Quick actions */}
          {(selected.telefono || selected.maps_url) && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {selected.telefono && <a href={`tel:${selected.telefono}`} style={{ flex: 1, textAlign: 'center', background: '#111', border: '1px solid #1e1e2e', borderRadius: 7, padding: '7px 2px', fontSize: 11, color: '#00f0ff', textDecoration: 'none', fontWeight: 700 }}>📞 Llamar</a>}
              {selected.telefono && <a href={`https://wa.me/${selected.telefono.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: 'center', background: '#111', border: '1px solid #1e1e2e', borderRadius: 7, padding: '7px 2px', fontSize: 11, color: '#00c851', textDecoration: 'none', fontWeight: 700 }}>💬 WA</a>}
              {selected.maps_url && <a href={selected.maps_url} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: 'center', background: '#111', border: '1px solid #1e1e2e', borderRadius: 7, padding: '7px 2px', fontSize: 11, color: '#ff8800', textDecoration: 'none', fontWeight: 700 }}>📍 Maps</a>}
            </div>
          )}

          {/* Details */}
          <div style={{ background: '#0d0d16', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            {[
              { label: 'Email',      value: selected.email,      icon: '📧' },
              { label: 'Fuente',     value: selected.fuente,     icon: '🎯' },
              { label: 'Dirección',  value: selected.direccion,  icon: '📍' },
              { label: 'Web',        value: selected.website,    icon: '🌐', href: selected.website },
              { label: 'Instagram',  value: selected.instagram,  icon: '📸', href: selected.instagram?.startsWith('http') ? selected.instagram : selected.instagram ? `https://instagram.com/${selected.instagram.replace('@','')}` : undefined },
              { label: 'Monto est.', value: selected.monto_estimado ? fmtMonto(selected.monto_estimado) : '', icon: '💰' },
            ].filter(f => f.value).map(f => (
              <div key={f.label} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 11 }}>{f.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, color: '#68687a', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{f.label}</div>
                  {f.href
                    ? <a href={f.href} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#00f0ff', wordBreak: 'break-all' }}>{f.value}</a>
                    : <div style={{ fontSize: 11, color: '#ccc', wordBreak: 'break-all' }}>{f.value}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Tags */}
          {selected.etiquetas.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
              {selected.etiquetas.map(tag => (
                <span key={tag} style={{ fontSize: 10, background: 'rgba(204,255,0,0.08)', color: '#ccff00', borderRadius: 5, padding: '3px 7px' }}>#{tag}</span>
              ))}
            </div>
          )}

          {/* Internal notes */}
          {selected.notas && (
            <div style={{ background: '#0d0d16', borderRadius: 8, padding: 11, marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: '#68687a', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Notas internas</div>
              <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{selected.notas}</div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 7, marginBottom: 16 }}>
            <button onClick={() => { playClick(); openEdit(selected) }}
              style={{ flex: 1, background: 'rgba(0,240,255,0.06)', border: '1px solid rgba(0,240,255,0.18)', borderRadius: 7, padding: '8px', fontSize: 11, color: '#00f0ff', cursor: 'pointer', fontWeight: 700 }}>
              ✏️ Editar
            </button>
            <button onClick={handleDelete}
              style={{ background: 'rgba(255,68,68,0.06)', border: '1px solid rgba(255,68,68,0.18)', borderRadius: 7, padding: '8px 11px', fontSize: 11, color: '#ff4444', cursor: 'pointer', fontWeight: 700 }}>
              🗑️
            </button>
          </div>

          {/* Add note */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#68687a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 9 }}>Registrar actividad</div>
            <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
              {NOTA_TIPOS.map(t => (
                <button key={t.key} onClick={() => { playClick(); setNotaTipo(t.key) }}
                  style={{ fontSize: 10, padding: '4px 7px', borderRadius: 5, border: `1px solid ${notaTipo === t.key ? '#ccff00' : '#1e1e2e'}`, background: notaTipo === t.key ? 'rgba(204,255,0,0.08)' : '#111', color: notaTipo === t.key ? '#ccff00' : '#68687a', cursor: 'pointer', fontWeight: 700 }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            <textarea value={notaTexto} onChange={e => setNotaTexto(e.target.value)} placeholder="Escribir nota..." rows={2}
              style={{ width: '100%', background: '#111', border: '1px solid #1e1e2e', borderRadius: 7, padding: '8px 10px', color: '#fff', fontSize: 12, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            <button onClick={handleAddNota} disabled={addingNota || !notaTexto.trim()}
              style={{ marginTop: 6, width: '100%', background: notaTexto.trim() ? '#ccff00' : '#1a1a2e', color: notaTexto.trim() ? '#000' : '#444', border: 'none', borderRadius: 7, padding: '8px', fontSize: 12, fontWeight: 900, cursor: notaTexto.trim() ? 'pointer' : 'default', transition: 'all 0.12s' }}>
              {addingNota ? 'Guardando...' : 'Guardar actividad'}
            </button>
          </div>

          {/* Timeline */}
          {notas.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#68687a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Historial</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {notas.map(nota => {
                  const t = NOTA_TIPOS.find(x => x.key === nota.tipo) ?? NOTA_TIPOS[0]
                  return (
                    <div key={nota.id} style={{ display: 'flex', gap: 9 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 6, background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>{t.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: '#ccc', lineHeight: 1.4, wordBreak: 'break-word' }}>{nota.contenido}</div>
                        <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>
                          {(nota.vendedor as { nombre: string } | undefined)?.nombre} · {timeAgo(nota.created_at)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </aside>
      )}

      {/* MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={{ background: '#0f0f18', border: '1px solid rgba(255,0,127,0.2)', borderRadius: 14, padding: 26, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontWeight: 900, color: '#fff', fontSize: 15 }}>{editMode ? '✏️ Editar negocio' : '🏢 Nuevo negocio'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#68687a', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Empresa *</label>
                <input style={inp} placeholder="Nombre del negocio" value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} />
              </div>
              {[
                { key: 'contacto', label: 'Contacto', placeholder: 'Nombre del contacto' },
                { key: 'telefono', label: 'Teléfono', placeholder: '+54 9 11...' },
                { key: 'email',    label: 'Email',    placeholder: 'mail@empresa.com' },
                { key: 'categoria',label: 'Categoría',placeholder: 'Restaurante, Gym...' },
              ].map(f => (
                <div key={f.key}>
                  <label style={lbl}>{f.label}</label>
                  <input style={inp} placeholder={f.placeholder} value={(form as Record<string, unknown>)[f.key] as string}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label style={lbl}>Fuente</label>
                <select style={inp} value={form.fuente} onChange={e => setForm(f => ({ ...f, fuente: e.target.value }))}>
                  {FUENTES.map(f => <option key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Estado</label>
                <select style={inp} value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value as NegocioEstado }))}>
                  {ESTADOS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Prioridad</label>
                <select style={inp} value={form.prioridad} onChange={e => setForm(f => ({ ...f, prioridad: e.target.value as NegocioPrioridad }))}>
                  {PRIORIDADES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Monto estimado</label>
                <input style={inp} type="number" placeholder="0" value={form.monto_estimado}
                  onChange={e => setForm(f => ({ ...f, monto_estimado: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Instagram</label>
                <input style={inp} placeholder="@usuario" value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Sitio web</label>
                <input style={inp} placeholder="https://..." value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Dirección</label>
                <input style={inp} placeholder="Dirección física" value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Google Maps URL</label>
                <input style={inp} placeholder="https://maps.google.com/..." value={form.maps_url} onChange={e => setForm(f => ({ ...f, maps_url: e.target.value }))} />
              </div>

              {/* Tags */}
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Etiquetas</label>
                <div style={{ display: 'flex', gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>
                  {form.etiquetas.map(tag => (
                    <span key={tag} onClick={() => setForm(f => ({ ...f, etiquetas: f.etiquetas.filter(t => t !== tag) }))}
                      style={{ fontSize: 11, background: 'rgba(204,255,0,0.08)', color: '#ccff00', borderRadius: 5, padding: '3px 8px', cursor: 'pointer' }}>
                      #{tag} ×
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input style={{ ...inp, flex: 1 }} placeholder="Agregar etiqueta y Enter..." value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} />
                  <button onClick={addTag} style={{ background: '#1a1a2e', border: '1px solid #2a2a3a', borderRadius: 7, padding: '0 12px', color: '#ccc', cursor: 'pointer', fontWeight: 700 }}>+</button>
                </div>
              </div>

              {/* Notes */}
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Notas internas</label>
                <textarea rows={3} style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' } as React.CSSProperties}
                  placeholder="Contexto del negocio, observaciones..." value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
              <button onClick={() => setShowModal(false)}
                style={{ flex: 1, background: '#111', border: '1px solid #1e1e2e', borderRadius: 8, padding: '11px', color: '#888', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving || !form.empresa.trim()}
                style={{ flex: 2, background: form.empresa.trim() ? 'linear-gradient(135deg,#ccff00,#88dd00)' : '#1a1a2e', color: form.empresa.trim() ? '#000' : '#444', border: 'none', borderRadius: 8, padding: '11px', fontWeight: 900, fontSize: 13, cursor: form.empresa.trim() ? 'pointer' : 'default', transition: 'all 0.12s' }}>
                {saving ? 'Guardando...' : editMode ? 'Guardar cambios' : 'Crear negocio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700, color: '#68687a',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
}
const inp: React.CSSProperties = {
  width: '100%', background: '#111', border: '1px solid #1e1e2e', borderRadius: 7,
  padding: '9px 11px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box',
}
