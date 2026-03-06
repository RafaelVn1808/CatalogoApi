import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Produtos from '@/pages/Produtos'
import ProdutoDetalhe from '@/pages/ProdutoDetalhe'
import ProdutoForm from '@/pages/ProdutoForm'
import Categorias from '@/pages/Categorias'
import Lojas from '@/pages/Lojas'
import NossaLoja from '@/pages/NossaLoja'
import Estoque from '@/pages/Estoque'
import AlterarSenhaObrigatoria from '@/pages/AlterarSenhaObrigatoria'

function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Carregando...</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.deveAlterarSenha) return <Navigate to="/alterar-senha" replace />
  const role = user.role?.toLowerCase()
  const isAdmin = role === 'admin' || role === 'administrador'
  if (!isAdmin) return <Navigate to="/produtos" replace />
  return <Outlet />
}

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/alterar-senha" element={<AlterarSenhaObrigatoria />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/produtos" replace />} />
          <Route path="produtos" element={<Produtos />} />
          <Route path="produtos/:id" element={<ProdutoDetalhe />} />
          <Route path="nossa-loja" element={<NossaLoja />} />

          <Route element={<ProtectedRoute />}>
            <Route path="produtos/novo" element={<ProdutoForm />} />
            <Route path="produtos/:id/editar" element={<ProdutoForm />} />
            <Route path="categorias" element={<Categorias />} />
            <Route path="lojas" element={<Lojas />} />
            <Route path="estoque" element={<Estoque />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
