import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { playClick, playXP, playError } from '../lib/sounds'

const COLORS = ['#ccff00', '#ff007f', '#00f0ff', '#ffb000', '#b000ff', '#25d366']

export default function Register() {
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', password: '', avatar_color: '#ccff00' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.email.trim() || !form.password.trim()) {
      playError()
      setError('Por favor completa todos los campos marcados con *')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Sign up user using standard Supabase Auth (trigger handles profile copying)
      const { error: authErr } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            nombre: form.nombre.trim(),
            apellido: form.apellido.trim(),
            avatar_color: form.avatar_color,
            rol: 'vendedor',
          }
        }
      })

      if (authErr) {
        playError()
        setError(authErr.message)
        setLoading(false)
        return
      }

      playXP()
      setSuccess(true)
      setTimeout(() => {
        navigate('/')
      }, 2000)

    } catch (e: any) {
      playError()
      setError(e.message || 'Error inesperado durante el registro.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0d0d0d',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Vaporwave Background Perspective Grid */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40%',
        background: 'linear-gradient(to top, rgba(255, 0, 127, 0.1) 0%, transparent 100%)',
        backgroundImage: 'linear-gradient(rgba(255, 0, 127, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 0, 127, 0.2) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        transform: 'perspective(200px) rotateX(60deg)',
        transformOrigin: 'bottom center',
        zIndex: 0
      }} />

      {/* Cyberpunk Neon Glow Circles */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40vw', height: '40vw', borderRadius: '50%', background: 'rgba(0, 240, 255, 0.05)', filter: 'blur(80px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '-10%', width: '35vw', height: '35vw', borderRadius: '50%', background: 'rgba(255, 0, 127, 0.05)', filter: 'blur(80px)', zIndex: 0 }} />

      <div className="card fade-in" style={{
        width: 440,
        zIndex: 1,
        padding: 36,
        background: 'rgba(15, 15, 15, 0.9)',
        border: '1px solid rgba(255, 0, 127, 0.3)',
        boxShadow: '0 0 25px rgba(255, 0, 127, 0.15)',
        borderRadius: 12,
        backdropFilter: 'blur(8px)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#00f0ff', letterSpacing: '0.12em', textShadow: '0 0 10px rgba(0,240,255,0.5)' }}>
            PIBBLE CRM
          </div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#ff007f', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 4 }}>
            Registro de Agente 🌱
          </div>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#ccff00', marginBottom: 8 }}>¡Registro Exitoso!</div>
            <div style={{ fontSize: 13, color: '#555' }}>Iniciando sesión y cargando cabina cyberpunk...</div>
          </div>
        ) : (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label" style={{ color: '#aaa', fontSize: 11 }}>Nombre *</label>
                <input
                  style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 4, padding: 8, color: '#fff', outline: 'none' }}
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: '#aaa', fontSize: 11 }}>Apellido</label>
                <input
                  style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 4, padding: 8, color: '#fff', outline: 'none' }}
                  value={form.apellido}
                  onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#aaa', fontSize: 11 }}>Email *</label>
              <input
                type="email"
                style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 4, padding: 8, color: '#fff', outline: 'none' }}
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#aaa', fontSize: 11 }}>Contraseña *</label>
              <input
                type="password"
                style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 4, padding: 8, color: '#fff', outline: 'none' }}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
            </div>

            {/* Avatar Color Selector */}
            <div className="form-group">
              <label className="form-label" style={{ color: '#aaa', fontSize: 11 }}>Color del Holograma</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { playClick(); setForm(f => ({ ...f, avatar_color: c })) }}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: c,
                      border: form.avatar_color === c ? '2px solid #fff' : '2px solid transparent',
                      boxShadow: form.avatar_color === c ? `0 0 10px ${c}` : 'none',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  />
                ))}
              </div>
            </div>

            {error && (
              <div style={{ color: '#ff4444', fontSize: 12, padding: '8px 12px', background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 6, textAlign: 'center' }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              onClick={playClick}
              style={{
                background: 'linear-gradient(90deg, #ff007f 0%, #b000ff 100%)',
                color: '#fff',
                fontWeight: 900,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                border: 'none',
                borderRadius: 5,
                padding: '12px 0',
                cursor: 'pointer',
                boxShadow: '0 0 15px rgba(255,0,127,0.4)',
                marginTop: 10
              }}
            >
              {loading ? 'Inicializando Cabina...' : 'Alistarse en Pibble'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#444' }}>
          ¿Ya tenés habilitado el acceso?{' '}
          <Link to="/login" style={{ color: '#00f0ff', textDecoration: 'none', fontWeight: 700 }}>
            Iniciar Holograma
          </Link>
        </div>
      </div>
    </div>
  )
}
