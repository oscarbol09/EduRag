-- Tabla para revocación de tokens JWT (access + refresh).
-- Permite invalidar tokens antes de su expiración natural (logout, password change).
CREATE TABLE IF NOT EXISTS public.revoked_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jti TEXT NOT NULL UNIQUE,
    token_type TEXT NOT NULL DEFAULT 'access' CHECK (token_type IN ('access', 'refresh')),
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    revoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Índice para búsqueda rápida por jti (verificación en cada request autenticado)
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_jti ON public.revoked_tokens(jti);

-- Índice para limpieza de tokens expirados
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires_at ON public.revoked_tokens(expires_at);

-- Auto-limpieza: eliminar tokens expirados mayores a 30 días
SELECT cron.schedule(
    'cleanup-revoked-tokens',
    '0 3 * * 0',
    $$DELETE FROM public.revoked_tokens WHERE expires_at < now() - INTERVAL '30 days'$$
);
