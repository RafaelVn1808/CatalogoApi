-- Script para adicionar colunas de TokenRedefinicao à tabela Usuarios
-- Execute este script no PostgreSQL se a migração não foi aplicada
-- Ex: psql -U postgres -d catalago -f add-token-redefinicao.sql

-- Colunas na tabela Usuarios
ALTER TABLE "Usuarios" ADD COLUMN IF NOT EXISTS "TokenRedefinicao" text NULL;
ALTER TABLE "Usuarios" ADD COLUMN IF NOT EXISTS "TokenRedefinicaoExpira" timestamp with time zone NULL;
