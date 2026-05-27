import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getNivel, getNextNivel, initials, NIVELES } from '../types'
import { triggerConfetti } from '../lib/Confetti'
import CelebrationModal from '../components/CelebrationModal'
import { playLevelUp, playXP } from '../lib/sounds'
import type { Deal, MissionProgress } from '../types'

export default function Dashboard() {
  const { profile } = useAuth()
  const [deals, setDeals]               = useState<Deal[]>([])
  const [missions, setMissions]         = useState<MissionProgress[]>([])
  const [weekPoints, setWeekPoints]     = useState(0)
  const [todayActions, setTodayActions] = useState(0)

  // Duels & Activity Feed state
  const [pendingDuels, setPendingDuels] = useState<any[]>([])
  const [activities, setActivities]     = useState<any[]>([])
  const [levelUpData, setLevelUpData]   = useState<{ nombre: string; color: string } | null>(null)

  useEffect(() => { if (profile) loadData() }, [profile])

  // Subscribirse a actividades y duelos en tiempo real
  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deal_activities' }, async () => {
        fetchRecentActivities()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duels' }, async () => {
        fetchPendingDuels()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile])

  // Chequeo de Level Up al cambiar puntos
  useEffect(() => {
    if (profile) {
      const currentLevel = getNivel(profile.puntos_total)
      const storedLevel = localStorage.getItem(`pibble_level_${profile.id}`)
      if (storedLevel && storedLevel !== currentLevel.nombre) {
        // Encontrar si es ascenso
        const storedLevelMin = NIVELES.find(n => n.nombre === storedLevel)?.min ?? 0
        if (profile.puntos_total > storedLevelMin) {
          setTimeout(() => {
            playLevelUp()
            triggerConfetti()
            setLevelUpData({ nombre: currentLevel.nombre, color: currentLevel.color })
          }, 800)
        }
      }
      localStorage.setItem(`pibble_level_${profile.id}`, currentLevel.nombre)
    }
  }, [profile?.puntos_total])

  async function fetchRecentActivities() {
    const { data } = await supabase.from('deal_activities')
      .select('*, vendedor:profiles(id, nombre, apellido, avatar_color), deal:deals(id, nombre_negocio)')
      .order('created_at', { ascending: false })
      .limit(8)
    setActivities(data ?? [])
  }

  async function fetchPendingDuels() {
    const { data } = await supabase.from('duels')
      .select('*, retador:profiles!retador_id(id, nombre, apellido, avatar_color)')
      .eq('retado_id', profile!.id)
      .eq('estado', 'pendiente')
    setPendingDuels(data ?? [])
  }

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
    
    // Fetch feed & pending duels
    fetchRecentActivities()
    fetchPendingDuels()
  }

  async function handleAcceptDuel(duelId: string) {
    const { error } = await supabase.from('duels').update({ estado: 'activo' }).eq('id', duelId)
    if (!error) {
      playXP()
      fetchPendingDuels()
    }
  }

  async function handleDeclineDuel(duelId: string) {
    const { error } = await supabase.from('duels').update({ estado: 'rechazado' }).eq('id', duelId)
    if (!error) {
      fetchPendingDuels()
    }
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
      {/* ── Level Up Modal Celebration ── */}
      {levelUpData && (
        <CelebrationModal
          nivelNombre={levelUpData.nombre}
          nivelColor={levelUpData.color}
          onClose={() => setLevelUpData(null)}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>Hola, {profile.nombre} 👋</h1>
          <p style={{ color: '#555', fontSize: 13, marginTop: 4 }}>
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* ── Pending Challenges Notification Banner ── */}
      {pendingDuels.length > 0 && (
        <div style={{
          background: 'linear-gradient(90deg, #ff880020 0%, #ff880005 100%)',
          border: '1px solid #ff880055',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          animation: 'pulse 2s infinite alternate'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>⚔️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#ff8800' }}>¡Tenés un duelo pendiente!</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                {(pendingDuels[0].retador as { nombre: string }).nombre} te desafió a un duelo de ventas por <strong style={{ color: '#ccff00' }}>{pendingDuels[0].puntos_apuesta} pts</strong>.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => handleDeclineDuel(pendingDuels[0].id)}
              style={{ background: 'none', border: '1px solid #ff444433', color: '#ff4444', borderRadius: 7, padding: '7px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Rechazar
            </button>
            <button onClick={() => handleAcceptDuel(pendingDuels[0].id)}
              style={{ background: '#ff8800', border: 'none', color: '#000', borderRadius: 7, padding: '7px 14px', fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>
              Aceptar ⚔️
            </button>
          </div>
        </div>
      )}

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

      {/* Layout Split: Left: Missions & Weekly. Right: Live Activity Muro */}
      <div style={{ display:'grid', gridTemplateColumns:'1.2fr 0.8fr', gap:20 }}>
        
        {/* Left Side Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
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

        {/* Right Side Column: Live Activity Feed */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800 }}>Muro en Vivo ⚡</h3>
            <span style={{ fontSize: 10, background: '#00f0ff20', color: '#00f0ff', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>Realtime</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: '380px' }}>
            {activities.length === 0 ? (
              <div style={{ color: '#333', fontSize: 12, textAlign: 'center', padding: '40px 0' }}>Sin actividad reciente</div>
            ) : (
              activities.map((act) => {
                const vend = act.vendedor as { nombre: string; avatar_color: string }
                const deal = act.deal as { nombre_negocio: string } | undefined
                const actionLabel: Record<string, string> = {
                  contacto: 'realizó un Contacto con',
                  propuesta: 'envió una Propuesta a',
                  seguimiento: 'realizó un Seguimiento a',
                  cierre: '¡CERRÓ LA VENTA de!',
                  perdido: 'perdió el deal de'
                }

                return (
                  <div key={act.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', borderBottom: '1px solid #111', paddingBottom: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', background: vend?.avatar_color || '#ccff00',
                      color: '#000', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      {vend?.nombre ? vend.nombre[0].toUpperCase() : 'V'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: '#fff', lineHeight: 1.4 }}>
                        <strong style={{ color: '#ccff00' }}>{vend?.nombre ?? 'Vendedor'}</strong> {actionLabel[act.tipo] || 'hizo una acción en'} <strong style={{ color: '#00f0ff' }}>{deal?.nombre_negocio ?? 'Negocio'}</strong>
                      </div>
                      <div style={{ fontSize: 10, color: '#444', marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                        <span>+{act.puntos} pts</span>
                        <span>{new Date(act.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
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
