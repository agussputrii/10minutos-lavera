import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Roulette, { type Prize } from '../components/Roulette'
import { PUNTOS } from '../types'
import { playClick, playXP, playError, playRouletteWin } from '../lib/sounds'
import type { Deal, DealEstado } from '../types'

const COLS: { estado: DealEstado; label: string; color: string }[] = [
  { estado:'contactado',  label:'Contactado',  color:'#4a9eff' },
  { estado:'propuesta',   label:'Propuesta',   color:'#ffa500' },
  { estado:'negociacion', label:'Negociación', color:'#cc44ff' },
  { estado:'cerrado',     label:'Cerrado ✅',  color:'#ccff00' },
  { estado:'perdido',     label:'Perdido',     color:'#ff4444' },
]

const CATEGORIAS = ['restaurante','peluqueria','ferreteria','veterinaria','farmacia','gimnasio','kiosco','taller','inmobiliaria','otro']

export default function Pipeline() {
  const { profile } = useAuth()
  const [deals, setDeals]               = useState<Deal[]>([])
  const [showForm, setShowForm]         = useState(false)
  const [rouletteDeal, setRouletteDeal] = useState<Deal | null>(null)
  const [form, setForm]                 = useState({ nombre_negocio:'', telefono:'', categoria:'', monto:'', notas:'', maps_url:'' })
  const [saving, setSaving]             = useState(false)
  const [moving, setMoving]             = useState<string|null>(null)

  useEffect(() => { if (profile) load() }, [profile])

  async function load() {
    const { data } = await supabase.from('deals').select('*').order('created_at', { ascending:false })
    setDeals(data ?? [])
  }

  async function addPoints(extra: number) {
    const newPoints = Math.max(0, profile!.puntos_total + extra)
    await supabase.from('profiles').update({ puntos_total: newPoints }).eq('id', profile!.id)
  }

  async function logActivity(dealId: string, tipo: string, puntos: number) {
    await Promise.all([
      supabase.from('deal_activities').insert({ deal_id:dealId, vendedor_id:profile!.id, tipo, puntos }),
      addPoints(puntos),
      tipo === 'cierre'
        ? supabase.from('profiles').update({ ventas_cerradas: profile!.ventas_cerradas + 1 }).eq('id', profile!.id)
        : Promise.resolve(),
    ])
  }

  async function updateMissions(accion: string) {
    const today = new Date().toISOString().slice(0,10)
    const { data: ms } = await supabase.from('missions').select('*').eq('tipo_accion', accion).eq('activa', true)
    if (!ms?.length) return
    for (const m of ms) {
      const { data: ex } = await supabase.from('mission_progress').select('*')
        .eq('mision_id', m.id).eq('vendedor_id', profile!.id).eq('fecha', today).single()
      if (ex) {
        if (ex.completada) continue
        const prog = ex.progreso + 1
        const done = prog >= m.objetivo
        await supabase.from('mission_progress').update({ progreso:prog, completada:done, completada_at: done ? new Date().toISOString() : null }).eq('id', ex.id)
        if (done) await addPoints(m.puntos_recompensa)
      } else {
        const done = 1 >= m.objetivo
        await supabase.from('mission_progress').insert({ mision_id:m.id, vendedor_id:profile!.id, fecha:today, progreso:1, completada:done, completada_at: done ? new Date().toISOString() : null })
        if (done) await addPoints(m.puntos_recompensa)
      }
    }
  }

  async function createDeal() {
    if (!form.nombre_negocio.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('deals').insert({
      vendedor_id: profile!.id,
      nombre_negocio: form.nombre_negocio.trim(),
      telefono: form.telefono || null,
      categoria: form.categoria || null,
      monto: form.monto ? parseFloat(form.monto) : null,
      notas: form.notas,
      maps_url: form.maps_url || null,
      estado: 'contactado',
    }).select().single()
    if (!error && data) {
      playXP()
      await logActivity(data.id, 'contacto', PUNTOS.contacto)
      await updateMissions('contactos')
      setDeals(p => [data as Deal, ...p])
      setForm({ nombre_negocio:'', telefono:'', categoria:'', monto:'', notas:'', maps_url:'' })
      setShowForm(false)
    } else {
      playError()
    }
    setSaving(false)
  }

  async function moveDeal(deal: Deal, newEstado: DealEstado) {
    if (deal.estado === newEstado) return
    setMoving(deal.id)
    const now = new Date().toISOString()
    const upd: Record<string,unknown> = { estado:newEstado, updated_at:now }
    if (newEstado === 'cerrado') upd.closed_at = now

    await supabase.from('deals').update(upd).eq('id', deal.id)

    const tipoMap: Record<DealEstado, keyof typeof PUNTOS> = {
      contactado:'contacto', propuesta:'propuesta', negociacion:'seguimiento', cerrado:'cierre', perdido:'perdido',
    }

    if (newEstado === 'cerrado') {
      playRouletteWin()
    } else if (newEstado === 'perdido') {
      playError()
    } else {
      playClick()
    }

    await logActivity(deal.id, tipoMap[newEstado], PUNTOS[tipoMap[newEstado]])
    if (newEstado === 'propuesta')   await updateMissions('propuestas')
    if (newEstado === 'cerrado')     await updateMissions('cierres')
    if (newEstado === 'negociacion') await updateMissions('seguimientos')

    const updated = { ...deal, ...upd } as Deal
    setDeals(p => p.map(d => d.id === deal.id ? updated : d))
    setMoving(null)
    if (newEstado === 'cerrado') setTimeout(() => setRouletteDeal(updated), 150)
  }

  async function handleRouletteResult(prize: Prize) {
    if (!rouletteDeal) return
    if (prize.puntos < 0) {
      playError()
    } else {
      playXP()
    }
    await supabase.from('roulette_spins').insert({ vendedor_id:profile!.id, deal_id:rouletteDeal.id, puntos_ganados:prize.puntos, premio_texto:prize.label })
    await addPoints(prize.puntos)
  }


  const byEstado = (e: DealEstado) => deals.filter(d => d.estado === e)
  const fmt = (m?: number) => m ? `$${m >= 1000 ? (m/1000).toFixed(0)+'K' : m}` : ''

  return (
    <div className="fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900 }}>Pipeline 📋</h1>
          <p style={{ fontSize:13, color:'#555', marginTop:3 }}>
            {deals.filter(d=>!['cerrado','perdido'].includes(d.estado)).length} deals activos
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nuevo deal</button>
      </div>

      {/* Kanban board */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12 }}>
        {COLS.map(col => (
          <div key={col.estado}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <span className="badge" style={{ background:`${col.color}15`, color:col.color, border:`1px solid ${col.color}30` }}>
                {col.label}
              </span>
              <span style={{ fontSize:11, color:'#444', fontWeight:700 }}>{byEstado(col.estado).length}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, minHeight:100 }}>
              {byEstado(col.estado).map(deal => (
                <div key={deal.id} className="card fade-in"
                  style={{ padding:12, opacity: moving===deal.id ? 0.4 : 1, transition:'opacity 0.2s' }}>
                  <div style={{ fontSize:12, fontWeight:700, marginBottom:5, lineHeight:1.3 }}>{deal.nombre_negocio}</div>
                  {deal.categoria && <span className="tag" style={{ fontSize:9, marginBottom:6, display:'inline-block' }}>{deal.categoria}</span>}
                  {deal.telefono && <div style={{ fontSize:10, color:'#4a9eff', marginBottom:3 }}>📞 {deal.telefono}</div>}
                  {deal.monto && <div style={{ fontSize:13, fontWeight:800, color:'#ccff00', marginBottom:6 }}>{fmt(deal.monto)}</div>}
                  {!['cerrado','perdido'].includes(deal.estado) && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginTop:4 }}>
                      {COLS.filter(c => c.estado !== deal.estado && c.estado !== 'contactado').map(c => (
                        <button key={c.estado} onClick={() => moveDeal(deal, c.estado)} disabled={!!moving}
                          style={{ padding:'3px 6px', borderRadius:4, border:`1px solid ${c.color}40`, background:'transparent',
                            color:c.color, fontSize:9, fontWeight:700, cursor:'pointer' }}>
                          → {c.label.replace(' ✅','')}
                        </button>
                      ))}
                    </div>
                  )}
                  {deal.maps_url && (
                    <a href={deal.maps_url} target="_blank" rel="noreferrer"
                      style={{ fontSize:10, color:'#4285f4', display:'block', marginTop:6 }}>📍 Maps</a>
                  )}
                </div>
              ))}
              {byEstado(col.estado).length === 0 && (
                <div style={{ border:'1px dashed #1e1e1e', borderRadius:8, padding:'20px 0', textAlign:'center', fontSize:11, color:'#252525' }}>
                  vacío
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* New deal modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Nuevo deal</div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="form-group">
                <label className="form-label">Negocio *</label>
                <input value={form.nombre_negocio} onChange={e=>setForm(f=>({...f,nombre_negocio:e.target.value}))} placeholder="Nombre del negocio" autoFocus />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))} placeholder="0261..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Monto ARS</label>
                  <input type="number" value={form.monto} onChange={e=>setForm(f=>({...f,monto:e.target.value}))} placeholder="300000" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}>
                  <option value="">Seleccioná...</option>
                  {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Google Maps URL</label>
                <input value={form.maps_url} onChange={e=>setForm(f=>({...f,maps_url:e.target.value}))} placeholder="https://maps.google.com/..." />
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea value={form.notas} onChange={e=>setForm(f=>({...f,notas:e.target.value}))} placeholder="Observaciones..." />
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={createDeal} disabled={saving||!form.nombre_negocio.trim()}>
                  {saving ? 'Guardando...' : 'Crear +10pts'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rouletteDeal && (
        <Roulette onResult={handleRouletteResult} onClose={() => { setRouletteDeal(null); load() }} />
      )}
    </div>
  )
}
