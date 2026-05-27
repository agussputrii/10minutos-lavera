import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { MissionProgress } from '../types'

export default function Missions() {
  const { profile } = useAuth()
  const [daily,   setDaily]   = useState<MissionProgress[]>([])
  const [weekly,  setWeekly]  = useState<MissionProgress[]>([])
  const [monthly, setMonthly] = useState<MissionProgress[]>([])

  useEffect(() => { if (profile) load() }, [profile])

  async function load() {
    const today      = new Date().toISOString().slice(0,10)
    const weekStart  = getMonday()
    const monthStart = getMonthStart()

    // 1. Fetch all active missions
    const { data: activeMs } = await supabase.from('missions').select('*').eq('activa', true)
    if (!activeMs) return

    // 2. Fetch progress records
    const [{ data: dProgress }, { data: wProgress }, { data: mProgress }] = await Promise.all([
      supabase.from('mission_progress').select('*, missions(*)').eq('vendedor_id', profile!.id).eq('fecha', today),
      supabase.from('mission_progress').select('*, missions(*)').eq('vendedor_id', profile!.id).gte('fecha', weekStart),
      supabase.from('mission_progress').select('*, missions(*)').eq('vendedor_id', profile!.id).gte('fecha', monthStart),
    ])

    const progD = dProgress ?? []
    const progW = wProgress ?? []
    const progM = mProgress ?? []

    // 3. Map active missions to progress or mock them
    const mappedD: MissionProgress[] = activeMs
      .filter(m => m.tipo === 'diaria')
      .map(m => {
        const existing = progD.find(p => p.mision_id === m.id)
        return existing || {
          id: `mock-d-${m.id}`,
          mision_id: m.id,
          vendedor_id: profile!.id,
          fecha: today,
          progreso: 0,
          completada: false,
          missions: m
        }
      })

    const mappedW: MissionProgress[] = activeMs
      .filter(m => m.tipo === 'semanal')
      .map(m => {
        const existing = progW.find(p => p.mision_id === m.id)
        return existing || {
          id: `mock-w-${m.id}`,
          mision_id: m.id,
          vendedor_id: profile!.id,
          fecha: today,
          progreso: 0,
          completada: false,
          missions: m
        }
      })

    const mappedM: MissionProgress[] = activeMs
      .filter(m => m.tipo === 'mensual')
      .map(m => {
        const existing = progM.find(p => p.mision_id === m.id)
        return existing || {
          id: `mock-m-${m.id}`,
          mision_id: m.id,
          vendedor_id: profile!.id,
          fecha: today,
          progreso: 0,
          completada: false,
          missions: m
        }
      })

    setDaily(mappedD)
    setWeekly(mappedW)
    setMonthly(mappedM)
  }

  if (!profile) return null

  const dCompleted = daily.filter(m => m.completada).length
  const wCompleted = weekly.filter(m => m.completada).length
  const mCompleted = monthly.filter(m => m.completada).length

  return (
    <div className="fade-in">
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:22, fontWeight:900, color: '#ccff00', textShadow: '0 0 10px rgba(204,255,0,0.3)' }}>Misiones 🎯</h1>
        <p style={{ fontSize:13, color:'#ff007f', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop:3 }}>Completá misiones para ganar puntos extra</p>
      </div>

      <MissionGroup title="Misiones de hoy" emoji="🌅" missions={daily} completed={dCompleted} />
      <MissionGroup title="Misiones semanales" emoji="📅" missions={weekly} completed={wCompleted} style={{ marginTop:28 }} />
      <MissionGroup title="Misiones mensuales de Élite" emoji="🏆" missions={monthly} completed={mCompleted} style={{ marginTop:28 }} />
    </div>
  )
}


function MissionGroup({ title, emoji, missions, completed, style }: {
  title: string; emoji: string; missions: MissionProgress[]; completed: number; style?: React.CSSProperties
}) {
  return (
    <div style={style}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <h2 style={{ fontSize:15, fontWeight:800 }}>{emoji} {title}</h2>
        <span style={{ fontSize:12, color:'#555' }}>{completed}/{missions.length} completadas</span>
      </div>

      {missions.length === 0 ? (
        <div className="card" style={{ textAlign:'center', color:'#333', padding:'24px 0', fontSize:13 }}>
          Sin misiones activas
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
          {missions.map(mp => {
            const m   = mp.missions!
            const pct = Math.min(100, Math.round((mp.progreso / m.objetivo) * 100))
            return (
              <div key={mp.id} className="card" style={{
                border: mp.completada ? '1px solid #ccff0030' : '1px solid #181818',
                background: mp.completada ? 'linear-gradient(135deg,#0d0d00 0%,#111 100%)' : '#111',
                position:'relative', overflow:'hidden',
              }}>
                {mp.completada && (
                  <div style={{ position:'absolute', top:10, right:12, fontSize:18 }}>✅</div>
                )}
                <div style={{ fontSize:13, fontWeight:800, color: mp.completada ? '#ccff00' : '#fff', marginBottom:4, paddingRight:28 }}>
                  {m.titulo}
                </div>
                <div style={{ fontSize:11, color:'#555', marginBottom:14 }}>{m.descripcion}</div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div className="progress-bar" style={{ flex:1 }}>
                    <div className="progress-fill" style={{ width:`${pct}%`, background: mp.completada ? '#ccff00' : '#4a9eff' }} />
                  </div>
                  <span style={{ fontSize:10, color:'#444', whiteSpace:'nowrap' }}>{mp.progreso}/{m.objetivo}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12 }}>
                  <span style={{ fontSize:10, color:'#333' }}>Recompensa</span>
                  <span style={{ fontSize:14, fontWeight:900, color:'#ccff00' }}>+{m.puntos_recompensa} pts</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function getMonday() {
  const d   = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  d.setHours(0,0,0,0)
  return d.toISOString().slice(0,10)
}

function getMonthStart() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10)
}

