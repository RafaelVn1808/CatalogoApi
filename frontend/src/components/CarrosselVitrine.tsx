import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { VitrineDto, VitrineItemDto } from '@/types/api'

interface Props {
  vitrine: VitrineDto
}

function chunkPairs<T>(arr: T[]): T[][] {
  const pairs: T[][] = []
  for (let i = 0; i < arr.length; i += 2) pairs.push(arr.slice(i, i + 2))
  return pairs
}

export default function CarrosselVitrine({ vitrine }: Props) {
  const itens = vitrine.itens.filter((i) => i.ativo)
  const pairs = chunkPairs(itens)
  const [pairIndex, setPairIndex] = useState(0)
  const [pausado, setPausado] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  const ir = useCallback((idx: number) => {
    setPairIndex((idx + pairs.length) % pairs.length)
  }, [pairs.length])

  const proximo = useCallback(() => ir(pairIndex + 1), [pairIndex, ir])
  const anterior = useCallback(() => ir(pairIndex - 1), [pairIndex, ir])

  useEffect(() => {
    if (pairs.length <= 1 || pausado) return
    timerRef.current = setTimeout(proximo, vitrine.autoPlayMs)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [pairIndex, pausado, proximo, pairs.length, vitrine.autoPlayMs])

  if (itens.length === 0) return null

  function handleItemClick(item: VitrineItemDto) {
    if (item.linkUrl) {
      if (item.linkUrl.startsWith('/')) navigate(item.linkUrl)
      else window.open(item.linkUrl, '_blank', 'noopener')
    } else if (item.produtoId) {
      navigate(`/produtos/${item.produtoId}`)
    }
  }

  const par = pairs[pairIndex]

  return (
    <div
      className="carrossel-vitrine"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div className="carrossel-pares">
        {par.map((item) => {
          const clicavel = !!(item.linkUrl || item.produtoId)
          return (
            <div
              key={item.id}
              className={`carrossel-slot${clicavel ? ' carrossel-slot--clicavel' : ''}`}
              onClick={() => clicavel && handleItemClick(item)}
              role={clicavel ? 'button' : undefined}
              tabIndex={clicavel ? 0 : undefined}
              onKeyDown={(e) => { if (clicavel && (e.key === 'Enter' || e.key === ' ')) handleItemClick(item) }}
              aria-label={item.titulo ?? undefined}
            >
              <img
                src={item.imagemUrl}
                alt={item.titulo ?? vitrine.nome}
                className="carrossel-img"
              />
              {(item.titulo || item.subtitulo) && (
                <div className="carrossel-overlay">
                  {item.titulo && <p className="carrossel-titulo">{item.titulo}</p>}
                  {item.subtitulo && <p className="carrossel-subtitulo">{item.subtitulo}</p>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {pairs.length > 1 && (
        <>
          <button
            type="button"
            className="carrossel-btn carrossel-btn--prev"
            onClick={(e) => { e.stopPropagation(); anterior() }}
            aria-label="Par anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="carrossel-btn carrossel-btn--next"
            onClick={(e) => { e.stopPropagation(); proximo() }}
            aria-label="Próximo par"
          >
            <ChevronRight size={18} />
          </button>

          <div className="carrossel-dots" role="tablist" aria-label="Pares de banners">
            {pairs.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === pairIndex}
                aria-label={`Par ${i + 1}`}
                className={`carrossel-dot${i === pairIndex ? ' carrossel-dot--ativo' : ''}`}
                onClick={(e) => { e.stopPropagation(); ir(i) }}
              />
            ))}
          </div>
        </>
      )}

      <style>{`
        .carrossel-vitrine {
          position: relative;
          width: 100%;
          background: #000;
        }
        .carrossel-pares {
          display: flex;
          gap: 4px;
          height: 200px;
        }
        .carrossel-slot {
          flex: 1;
          position: relative;
          overflow: hidden;
          min-width: 0;
        }
        .carrossel-slot--clicavel {
          cursor: pointer;
        }
        .carrossel-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .carrossel-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 0.75rem 1rem;
          background: linear-gradient(to top, rgba(0,0,0,0.70) 0%, transparent 100%);
        }
        .carrossel-titulo {
          color: #fff;
          font-size: clamp(0.8rem, 1.8vw, 1.1rem);
          font-weight: 700;
          margin: 0 0 2px;
          line-height: 1.2;
          text-shadow: 0 1px 3px rgba(0,0,0,0.5);
        }
        .carrossel-subtitulo {
          color: rgba(255,255,255,0.88);
          font-size: clamp(0.7rem, 1.3vw, 0.9rem);
          margin: 0;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
        .carrossel-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: rgba(0,0,0,0.45);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
          z-index: 2;
        }
        .carrossel-btn:hover { background: rgba(0,0,0,0.72); }
        .carrossel-btn--prev { left: 8px; }
        .carrossel-btn--next { right: 8px; }
        .carrossel-dots {
          display: flex;
          justify-content: center;
          gap: 6px;
          padding: 6px 0;
          background: #000;
        }
        .carrossel-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.4);
          cursor: pointer;
          padding: 0;
          transition: background 0.2s, transform 0.2s;
        }
        .carrossel-dot--ativo {
          background: #fff;
          transform: scale(1.3);
        }
        @media (max-width: 767px) {
          .carrossel-pares { height: 140px; }
          .carrossel-slot:nth-child(2) { display: none; }
          .carrossel-btn { width: 28px; height: 28px; }
        }
      `}</style>
    </div>
  )
}
