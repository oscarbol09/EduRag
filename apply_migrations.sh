#!/usr/bin/env bash
# apply_migrations.sh
# Aplica todas las migraciones pendientes al proyecto remoto de Supabase.
# Ejecutar desde la raíz del proyecto: bash apply_migrations.sh

set -e

echo "==> Verificando estado actual de migraciones..."
supabase migration list

echo ""
echo "==> Aplicando migraciones al remoto..."
supabase db push

echo ""
echo "==> Migraciones aplicadas. Verificando tabla messages..."
supabase db diff --use-migra

echo ""
echo "Listo. Recuerda verificar en Supabase que:"
echo "  - public.messages existe con datos migrados"
echo "  - Los índices aparecen en la tabla Database > Indexes"
echo "  - conversations.messages (JSONB) fue eliminado por la migración fase 2"
