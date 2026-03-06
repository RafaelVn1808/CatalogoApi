import { useState, useEffect } from 'react'
import { MapPin, Clock, Phone, MessageCircle } from 'lucide-react'
import { lojasApi } from '@/api/lojas'
import type { LojaDto } from '@/types/api'

export default function NossaLoja() {
  const [lojas, setLojas] = useState<LojaDto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    lojasApi
      .listar()
      .then((r) => setLojas(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Carregando...</div>

  if (lojas.length === 0) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h1 style={{ marginBottom: '1rem' }}>Nossa Loja</h1>
        <p style={{ color: 'var(--text-muted)' }}>Nenhuma loja cadastrada ainda.</p>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: 900 }}>
      <h1 style={{ marginBottom: '2rem' }}>Nossa Loja</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {lojas.map((loja) => (
          <div
            key={loja.id}
            className="card"
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{loja.nome}</h2>

            {loja.endereco && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <MapPin size={20} style={{ color: '#b91c1c', flexShrink: 0, marginTop: 2 }} />
                <span>{loja.endereco}</span>
              </div>
            )}

            {loja.horario && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Clock size={20} style={{ color: '#b91c1c', flexShrink: 0, marginTop: 2 }} />
                <span>{loja.horario}</span>
              </div>
            )}

            {loja.telefone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Phone size={20} style={{ color: '#b91c1c', flexShrink: 0 }} />
                <a href={`tel:${loja.telefone}`} style={{ color: 'var(--text)' }}>
                  {loja.telefone}
                </a>
              </div>
            )}

            {loja.whatsApp && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <MessageCircle size={20} style={{ color: '#25d366', flexShrink: 0 }} />
                <a
                  href={`https://wa.me/${loja.whatsApp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#25d366', fontWeight: 500 }}
                >
                  {loja.whatsApp}
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
