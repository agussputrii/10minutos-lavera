import { useState, useEffect } from 'react'
import { Negocio } from '../types'
import { playClick, playXP } from '../lib/sounds'

interface Template {
  id: string
  nombre: string
  emoji: string
  categoria: string
  body: string
}

const TEMPLATES: Template[] = [
  {
    id: 'frio',
    nombre: 'Saludo en frío',
    emoji: '👋',
    categoria: 'Prospección',
    body: `Hola {{contacto}}! 👋 Te escribo de parte de *Pibble*.\n\nVi que tienen *{{empresa}}* en {{categoria}} y me gustaría contarles sobre una solución que está ayudando a negocios como el suyo a conseguir más clientes.\n\n¿Tienen 5 minutos esta semana para una charla rápida? 🙌`,
  },
  {
    id: 'seguimiento',
    nombre: 'Seguimiento',
    emoji: '📞',
    categoria: 'Seguimiento',
    body: `Hola {{contacto}}! Soy {{vendedor}} de *Pibble*.\n\nQuería hacer un seguimiento de nuestra última conversación sobre *{{empresa}}*.\n\n¿Pudieron evaluar la propuesta? Cualquier duda que tengan, estoy a disposición 🤝`,
  },
  {
    id: 'propuesta',
    nombre: 'Envío de propuesta',
    emoji: '📋',
    categoria: 'Cierre',
    body: `Hola {{contacto}}! Te comparto la propuesta personalizada para *{{empresa}}* 📋\n\nEn base a su rubro ({{categoria}}) armamos algo pensado específicamente para ustedes.\n\nCualquier consulta me avisas. ¡Espero que les guste! 🚀`,
  },
  {
    id: 'apertura',
    nombre: 'Felicitación apertura',
    emoji: '🎉',
    categoria: 'Prospección',
    body: `Hola! Vi que abrieron *{{empresa}}* 🎉 ¡Felicitaciones!\n\nSoy {{vendedor}} de *Pibble* y ayudamos a negocios nuevos en {{categoria}} a conseguir sus primeros clientes rápido.\n\n¿Les interesa saber cómo? Sin compromiso 😊`,
  },
  {
    id: 'recordatorio',
    nombre: 'Recordatorio reunión',
    emoji: '📅',
    categoria: 'Seguimiento',
    body: `Hola {{contacto}}! Te recuerdo que mañana tenemos nuestro encuentro para hablar sobre *{{empresa}}*.\n\n📅 ¿Confirmamos horario?\n\nQuedo atento! — {{vendedor}} de Pibble`,
  },
  {
    id: 'reactivacion',
    nombre: 'Reactivación',
    emoji: '🔄',
    categoria: 'Recuperación',
    body: `Hola {{contacto}}! Hace un tiempo hablamos sobre *{{empresa}}* y quería retomar el contacto.\n\nTenemos novedades que pueden interesarles 🔄\n\n¿Tienen 10 minutos esta semana?`,
  },
  {
    id: 'custom',
    nombre: 'Personalizado',
    emoji: '✍️',
    categoria: 'Custom',
    body: '',
  },
]

const VARIABLES = [
  { key: '{{empresa}}',   label: 'Empresa',   icon: '🏢' },
  { key: '{{contacto}}',  label: 'Contacto',  icon: '👤' },
  { key: '{{categoria}}', label: 'Categoría', icon: '🏷️' },
  { key: '{{vendedor}}',  label: 'Mi nombre', icon: '⚡' },
  { key: '{{telefono}}',  label: 'Teléfono',  icon: '📞' },
  { key: '{{fuente}}',    label: 'Fuente',    icon: '🎯' },
]

const EMOJIS = ['👋','🤝','🚀','💡','🎯','🔥','⚡','💰','📞','✅','🎉','💬','📋','🌟','💪','🏆']

function resolveVars(text: string, negocio: Negocio, vendedorNombre: string) {
  return text
    .replace(/\{\{empresa\}\}/g,   negocio.empresa || '')
    .replace(/\{\{contacto\}\}/g,  negocio.contacto || negocio.empresa || '')
    .replace(/\{\{categoria\}\}/g, negocio.categoria || 'su rubro')
    .replace(/\{\{vendedor\}\}/g,  vendedorNombre)
    .replace(/\{\{telefono\}\}/g,  negocio.telefono || '')
    .replace(/\{\{fuente\}\}/g,    negocio.fuente || '')
}

function buildWaLink(phone: string, text: string) {
  const clean = phone.replace(/\D/g, '')
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`
}

interface Props {
  negocios: Negocio[]
  vendedorNombre: string
  onClose: () => void
}

export default function WhatsAppModal({ negocios, vendedorNombre, onClose }: Props) {
  const [tmpl, setTmpl]           = useState<Template>(TEMPLATES[0])
  const [body, setBody]           = useState(TEMPLATES[0].body)
  const [previewIdx, setPreviewIdx] = useState(0)
  const [copied, setCopied]       = useState<string | null>(null)

  const isBulk  = negocios.length > 1
  const current = negocios[previewIdx] ?? negocios[0]
  const preview = current ? resolveVars(body, current, vendedorNombre) : body
  const withPhone = negocios.filter(n => n.telefono)

  useEffect(() => { if (tmpl.id !== 'custom') setBody(tmpl.body) }, [tmpl])

  function insertVar(v: string) {
    const ta = document.getElementById('wa-editor') as HTMLTextAreaElement
    if (!ta) { setBody(b => b + v); return }
    const s = ta.selectionStart, e = ta.selectionEnd
    const next = body.slice(0, s) + v + body.slice(e)
    setBody(next)
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + v.length; ta.focus() }, 0)
  }

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(key); playXP()
    setTimeout(() => setCopied(null), 2000)
  }

  function openWA(neg: Negocio) {
    if (!neg.telefono) return
    window.open(buildWaLink(neg.telefono, resolveVars(body, neg, vendedorNombre)), '_blank')
  }

  function openAllWA() {
    withPhone.forEach((n, i) => setTimeout(() => openWA(n), i * 800))
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background:'#0c0c14', border:'1px solid rgba(0,200,81,0.25)', borderRadius:16, width:'100%', maxWidth:920, maxHeight:'92vh', overflow:'hidden', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
          <span style={{ fontSize:20 }}>💬</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900, fontSize:14, color:'#fff' }}>
              WhatsApp {isBulk ? `Bulk — ${negocios.length} negocios` : current?.empresa}
            </div>
            <div style={{ fontSize:11, color:'#68687a' }}>
              {withPhone.length} con teléfono · {negocios.length - withPhone.length} sin teléfono
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#68687a', cursor:'pointer', fontSize:22, lineHeight:1 }}>×</button>
        </div>

        <div style={{ display:'flex', flex:1, overflow:'hidden', minHeight:0 }}>

          {/* TEMPLATE SIDEBAR */}
          <div style={{ width:182, borderRight:'1px solid rgba(255,255,255,0.06)', overflowY:'auto', padding:'10px 8px', flexShrink:0 }}>
            <div style={{ fontSize:10, fontWeight:800, color:'#68687a', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8, paddingLeft:4 }}>Plantillas</div>
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => { playClick(); setTmpl(t) }}
                style={{ width:'100%', textAlign:'left', background: tmpl.id===t.id ? 'rgba(0,200,81,0.08)' : 'transparent', border:`1px solid ${tmpl.id===t.id ? 'rgba(0,200,81,0.25)' : 'transparent'}`, borderRadius:8, padding:'8px 10px', cursor:'pointer', marginBottom:3, transition:'all 0.12s' }}>
                <div style={{ fontSize:12, color: tmpl.id===t.id ? '#00c851' : '#ccc', fontWeight:700 }}>{t.emoji} {t.nombre}</div>
                <div style={{ fontSize:10, color:'#555', marginTop:1 }}>{t.categoria}</div>
              </button>
            ))}
          </div>

          {/* EDITOR */}
          <div style={{ flex:1, padding:'14px 16px', borderRight:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', gap:10, overflowY:'auto', minWidth:0 }}>

            {/* Variables */}
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:'#68687a', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Variables — click para insertar</div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {VARIABLES.map(v => (
                  <button key={v.key} onClick={() => insertVar(v.key)}
                    style={{ fontSize:11, padding:'4px 8px', borderRadius:6, border:'1px solid rgba(204,255,0,0.2)', background:'rgba(204,255,0,0.04)', color:'#ccff00', cursor:'pointer', fontWeight:700, fontFamily:'monospace' }}>
                    {v.icon} {v.key}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div style={{ position:'relative', flex:1, minHeight:160 }}>
              <textarea
                id="wa-editor"
                value={body}
                onChange={e => { setBody(e.target.value); setTmpl(TEMPLATES.find(t=>t.id==='custom')!) }}
                style={{ width:'100%', height:'100%', minHeight:160, background:'#111', border:'1px solid #1e1e2e', borderRadius:9, padding:'12px', color:'#fff', fontSize:13, resize:'vertical', outline:'none', boxSizing:'border-box', fontFamily:'inherit', lineHeight:1.6 }}
              />
              <div style={{ position:'absolute', bottom:8, right:10, fontSize:10, color:'#555' }}>{body.length} chars</div>
            </div>

            {/* Emojis */}
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:'#68687a', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:5 }}>Emojis rápidos</div>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => insertVar(e)}
                    style={{ fontSize:15, background:'rgba(255,255,255,0.04)', border:'1px solid #1e1e2e', borderRadius:6, padding:'3px 6px', cursor:'pointer', lineHeight:1 }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk actions */}
            {isBulk && (
              <div style={{ background:'rgba(0,200,81,0.05)', border:'1px solid rgba(0,200,81,0.18)', borderRadius:8, padding:12 }}>
                <div style={{ fontSize:11, fontWeight:800, color:'#00c851', marginBottom:8 }}>📦 Bulk — {withPhone.length} mensajes listos</div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => copyText(withPhone.map(n => `*${n.empresa}*\n${buildWaLink(n.telefono!, resolveVars(body,n,vendedorNombre))}`).join('\n\n'), 'bulk')}
                    style={{ flex:1, background:'rgba(0,200,81,0.08)', border:'1px solid rgba(0,200,81,0.25)', borderRadius:7, padding:'8px', fontSize:11, color:'#00c851', cursor:'pointer', fontWeight:800 }}>
                    {copied==='bulk' ? '✅ Copiados!' : '📋 Copiar todos los links'}
                  </button>
                  <button onClick={openAllWA}
                    style={{ flex:1, background:'#00c851', border:'none', borderRadius:7, padding:'8px', fontSize:11, color:'#000', cursor:'pointer', fontWeight:900 }}>
                    🚀 Abrir WA x{withPhone.length}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* PREVIEW */}
          <div style={{ width:250, padding:'14px', overflowY:'auto', display:'flex', flexDirection:'column', gap:10, flexShrink:0 }}>
            <div style={{ fontSize:10, fontWeight:800, color:'#68687a', letterSpacing:'0.1em', textTransform:'uppercase' }}>Vista previa</div>

            {isBulk && (
              <select value={previewIdx} onChange={e => setPreviewIdx(Number(e.target.value))}
                style={{ width:'100%', background:'#111', border:'1px solid #1e1e2e', borderRadius:7, padding:'7px', color:'#ccc', fontSize:11, outline:'none' }}>
                {negocios.map((n, i) => <option key={n.id} value={i}>{n.empresa}</option>)}
              </select>
            )}

            {/* Negocio attributes */}
            {current && (
              <div style={{ background:'#0d0d16', borderRadius:8, padding:10 }}>
                <div style={{ fontSize:9, color:'#68687a', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Datos usados</div>
                {[
                  { k:'Empresa',   v:current.empresa    },
                  { k:'Contacto',  v:current.contacto   },
                  { k:'Categoría', v:current.categoria  },
                  { k:'Teléfono',  v:current.telefono   },
                  { k:'Fuente',    v:current.fuente     },
                ].filter(f=>f.v).map(f => (
                  <div key={f.k} style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:3 }}>
                    <span style={{ color:'#555' }}>{f.k}</span>
                    <span style={{ color:'#ccc', fontWeight:600, maxWidth:130, textAlign:'right', wordBreak:'break-word' }}>{f.v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Bubble */}
            <div style={{ background:'#1a2e1a', border:'1px solid rgba(0,200,81,0.15)', borderRadius:12, borderTopRightRadius:2, padding:'11px 13px', flex:1 }}>
              <div style={{ fontSize:11, color:'#dcedc8', lineHeight:1.6, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                {preview || <span style={{ color:'#555' }}>El mensaje aparece aquí...</span>}
              </div>
              <div style={{ fontSize:9, color:'#4a7a4a', marginTop:8, textAlign:'right' }}>✓✓ Ahora</div>
            </div>

            {/* Send actions */}
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <button onClick={() => copyText(preview, 'single')}
                style={{ background:'rgba(255,255,255,0.04)', border:'1px solid #1e1e2e', borderRadius:8, padding:'8px', fontSize:12, color:'#ccc', cursor:'pointer', fontWeight:700 }}>
                {copied==='single' ? '✅ Copiado!' : '📋 Copiar mensaje'}
              </button>
              {current?.telefono ? (
                <button onClick={() => openWA(current)}
                  style={{ background:'#00c851', border:'none', borderRadius:8, padding:'10px', fontSize:13, color:'#000', cursor:'pointer', fontWeight:900 }}>
                  💬 Abrir WhatsApp
                </button>
              ) : (
                <div style={{ fontSize:11, color:'#ff4444', textAlign:'center', background:'rgba(255,68,68,0.06)', border:'1px solid rgba(255,68,68,0.15)', borderRadius:8, padding:8 }}>
                  ⚠️ Sin teléfono registrado
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
