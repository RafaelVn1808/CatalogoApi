import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Produtos from '@/pages/Produtos'
import ProdutoDetalhe from '@/pages/ProdutoDetalhe'
import ProdutoForm from '@/pages/ProdutoForm'
import Categorias from '@/pages/Categorias'
import Lojas from '@/pages/Lojas'
import Estoque from '@/pages/Estoque'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Carregando...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/produtos" replace />} />
          <Route path="produtos" element={<Produtos />} />
          <Route path="produtos/novo" element={<ProdutoForm />} />
          <Route path="produtos/:id" element={<ProdutoDetalhe />} />
          <Route path="produtos/:id/editar" element={<ProdutoForm />} />
          <Route path="categorias" element={<Categorias />} />
          <Route path="lojas" element={<Lojas />} />
          <Route path="estoque" element={<Estoque />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
