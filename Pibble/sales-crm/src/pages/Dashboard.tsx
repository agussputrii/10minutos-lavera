import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getNivel, getNextNivel, initials, NIVELES } from '../types'
import type { Deal, MissionProgress } from '../types'

export default function Dashboard() {
  const { profile } = useAuth()
  const [deals, setDeals]               = useState<Deal[]>([])
  const [missions, setMissions]         = useState<MissionProgress[]>([])
  const [weekPoints, setWeekPoints]     = useState(0)
  const [todayActions, setTodayActions] = useState(0)

  useEffect(() => { if (profile) loadData() }, [profile])

  async function loadData() {
    const today     = new Date().toISOString().slice(0,10)
    const weekStart = getMonday()

    // 1. Fetch active daily missions
    const { data: activeMs } = await supabase.from('missions').select('*').eq('tipo', 'diaria').eq('activa', true)

    // 2. Fetch data
    const [{ data: d1 }, { data: d2 }, { data: d3 }, { data: d4 }] = await Promise.all([
      supabase.from('deals').select('*').eq('vendedor_id', profile!.id).order('created_at', { ascending:false }),
      supabase.from('mission_progress').select('*, missions(*)').eq('vendedor_id', profile!.id).eq('fecha', today),
      supabase.from('deal_activities').select('puntos').eq('vendedor_id', profile!.id).gte('created_at', weekStart),
      supabase.from('deal_activities').select('id').eq('vendedor_id', profile!.id).gte('created_at', today + 'T00:00:00'),
    ])
    setDeals(d1 ?? [])

    // 3. Map active daily missions to progress or mock them
    const progressList = d2 as MissionProgress[] ?? []
    const mappedD: MissionProgress[] = (activeMs ?? []).map(m => {
      const existing = progressList.find(p => p.mision_id === m.id)
      return existing || {
        id: `mock-${m.id}`,
        mision_id: m.id,
        vendedor_id: profile!.id,
        fecha: today,
        progreso: 0,
        completada: false,
        missions: m
      }
    })

    setMissions(mappedD)
    setWeekPoints((d3 ?? []).reduce((s: number, a: { puntos: number }) => s + a.puntos, 0))
    setTodayActions((d4 ?? []).length)
  }

  if (!profile) return null
  const nivel     = getNivel(profile.puntos_total)
  const nextNivel = getNextNivel(profile.puntos_total)
  const pctToNext = nextNivel
    ? Math.round(((profile.puntos_total - nivel.min) / (nextNivel.min - nivel.min)) * 100)
    : 100
  const cerrados     = deals.filter(d => d.estado === 'cerrado').length
  const abiertos     = deals.filter(d => !['cerrado','perdido'].includes(d.estado)).length
  const revenueTotal = deals.filter(d => d.estado === 'cerrado').reduce((s,d) => s + (d.monto ?? 0), 0)
  const misionesHoy  = missions.filter(m => m.missions?.tipo === 'diaria')
  const completadas  = misionesHoy.filter(m => m.completada).length

  return (
    <div className="fade-in">
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:24, fontWeight:900 }}>Hola, {profile.nombre} 👋</h1>
        <p style={{ color:'#555', fontSize:13, marginTop:4 }}>
          {new Date().toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' })}
        </p>
      </div>

      {/* Level card */}
      <div className="card" style={{ marginBottom:24, background:'linear-gradient(135deg,#111 0%,#141400 100%)', border:`1px solid ${nivel.color}20` }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div className="avatar" style={{ width:56, height:56, background:profile.avatar_color, fontSize:20 }}>
            {initials(profile)}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
              <span style={{ fontSize:20, fontWeight:900 }}>{profile.nombre} {profile.apellido}</span>
              <span className="badge" style={{ background:`${nivel.color}20`, color:nivel.color, border:`1px solid ${nivel.color}40` }}>
                {nivel.nombre}
              </span>
            </div>
            <div style={{ fontSize:13, color:'#555', marginTop:2 }}>
              {profile.puntos_total.toLocaleString()} pts
              {nextNivel && ` · ${(nextNivel.min - profile.puntos_total).toLocaleString()} para ${nextNivel.nombre}`}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:10 }}>
              <div className="progress-bar" style={{ flex:1 }}>
                <div className="progress-fill" style={{ width:`${pctToNext}%`, background:nivel.color }} />
              </div>
              <span style={{ fontSize:11, color:'#444' }}>{pctToNext}%</span>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:6, marginTop:16, flexWrap:'wrap' }}>
          {NIVELES.map(n => (
            <div key={n.nombre} style={{
              padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700,
              background: profile.puntos_total >= n.min ? `${n.color}20` : '#0d0d0d',
              color: profile.puntos_total >= n.min ? n.color : '#2a2a2a',
              border:`1px solid ${profile.puntos_total >= n.min ? n.color+'40' : '#1a1a1a'}`,
            }}>{n.nombre}</div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {[
          { label:'Deals abiertos',  value:abiertos,    color:'#4a9eff', icon:'📂' },
          { label:'Ventas cerradas', value:cerrados,    color:'#ccff00', icon:'✅' },
          { label:'Revenue total',   value:`$${revenueTotal>=1000?(revenueTotal/1000).toFixed(0)+'K':revenueTotal}`, color:'#25d366', icon:'💰' },
          { label:'Acciones hoy',    value:todayActions,color:'#cc44ff', icon:'⚡' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="card" style={{ textAlign:'center' }}>
            <div style={{ fontSize:24 }}>{icon}</div>
            <div style={{ fontSize:26, fontWeight:900, color, marginTop:6 }}>{value}</div>
            <div style={{ fontSize:11, color:'#444', marginTop:2 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Misiones hoy */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:800 }}>Misiones de hoy 🎯</h3>
            <span style={{ fontSize:11, color:'#555' }}>{completadas}/{misionesHoy.length}</span>
          </div>
          {misionesHoy.length === 0
            ? <div style={{ color:'#333', fontSize:12, textAlign:'center', padding:'20px 0' }}>Sin misiones activas</div>
            : misionesHoy.map(mp => {
              const m = mp.missions!
              const pct = Math.min(100, Math.round((mp.progreso / m.objetivo) * 100))
              return (
                <div key={mp.id} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color: mp.completada ? '#ccff00' : '#fff' }}>
                        {mp.completada && '✓ '}{m.titulo}
                      </div>
                      <div style={{ fontSize:10, color:'#444' }}>{m.descripcion}</div>
                    </div>
                    <span style={{ fontSize:11, color:'#ccff00', fontWeight:700, whiteSpace:'nowrap', marginLeft:8 }}>+{m.puntos_recompensa}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div className="progress-bar" style={{ flex:1 }}>
                      <div className="progress-fill" style={{ width:`${pct}%`, background: mp.completada ? '#ccff00' : '#4a9eff' }} />
                    </div>
                    <span style={{ fontSize:10, color:'#555' }}>{mp.progreso}/{m.objetivo}</span>
                  </div>
                </div>
              )
            })
          }
        </div>

        {/* Semana */}
        <div className="card">
          <h3 style={{ fontSize:14, fontWeight:800, marginBottom:16 }}>Esta semana 📅</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {[
              { label:'Puntos ganados',  value:`+${weekPoints}`,              color:'#ccff00' },
              { label:'Racha actual',    value:`🔥 ${profile.racha_actual} días`, color:'#ff8800' },
              { label:'Racha máxima',    value:`${profile.racha_max} días`,   color:'#555' },
              { label:'Ventas totales',  value:`${profile.ventas_cerradas}`,  color:'#ccff00' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:13, color:'#777' }}>{label}</span>
                <span style={{ fontSize:16, fontWeight:800, color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function getMonday() {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  d.setHours(0,0,0,0)
  return d.toISOString()
}
