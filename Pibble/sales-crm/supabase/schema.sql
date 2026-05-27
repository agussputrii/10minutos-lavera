-- ============================================================
-- PIBBLE CRM — Supabase Schema
-- Run this in Supabase SQL Editor (Database > SQL Editor)
-- ============================================================

-- ── Profiles (one per auth user) ─────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  nombre          TEXT NOT NULL,
  apellido        TEXT DEFAULT '',
  rol             TEXT DEFAULT 'vendedor',
  puntos_total    INTEGER DEFAULT 0,
  nivel           TEXT DEFAULT 'Rookie',
  racha_actual    INTEGER DEFAULT 0,
  racha_max       INTEGER DEFAULT 0,
  ultimo_login    DATE,
  ventas_cerradas INTEGER DEFAULT 0,
  avatar_color    TEXT DEFAULT '#ccff00',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden leer perfiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Solo el dueño edita su perfil" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin puede insertar perfiles" ON profiles FOR INSERT WITH CHECK (true);

-- ── Deals (pipeline) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deals (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendedor_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  nombre_negocio  TEXT NOT NULL,
  telefono        TEXT,
  categoria       TEXT,
  estado          TEXT DEFAULT 'contactado',
  monto           NUMERIC(12,2),
  notas           TEXT DEFAULT '',
  fuente          TEXT DEFAULT 'manual',
  maps_url        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  closed_at       TIMESTAMPTZ
);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vendedor ve sus deals" ON deals;
DROP POLICY IF EXISTS "Admin ve todos" ON deals;
DROP POLICY IF EXISTS "Vendedor crea deals" ON deals;
DROP POLICY IF EXISTS "Vendedor actualiza sus deals" ON deals;

CREATE POLICY "Cualquiera ve deals" ON deals FOR SELECT USING (true);
CREATE POLICY "Cualquiera crea deals" ON deals FOR INSERT WITH CHECK (true);
CREATE POLICY "Cualquiera actualiza deals" ON deals FOR UPDATE USING (true);
CREATE POLICY "Cualquiera borra deals" ON deals FOR DELETE USING (true);

-- ── Deal activities ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_activities (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id     UUID REFERENCES deals(id) ON DELETE CASCADE,
  vendedor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,
  nota        TEXT,
  puntos      INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos leen actividades" ON deal_activities FOR SELECT USING (true);
CREATE POLICY "Vendedor crea actividades" ON deal_activities FOR INSERT WITH CHECK (auth.uid() = vendedor_id);

-- ── Roulette spins ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roulette_spins (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendedor_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  deal_id        UUID REFERENCES deals(id) ON DELETE SET NULL,
  puntos_ganados INTEGER NOT NULL,
  premio_texto   TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE roulette_spins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos leen spins" ON roulette_spins FOR SELECT USING (true);
CREATE POLICY "Vendedor crea spins" ON roulette_spins FOR INSERT WITH CHECK (auth.uid() = vendedor_id);

-- ── Missions (templates) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS missions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo              TEXT NOT NULL,
  titulo            TEXT NOT NULL,
  descripcion       TEXT,
  tipo_accion       TEXT NOT NULL,
  objetivo          INTEGER NOT NULL,
  puntos_recompensa INTEGER NOT NULL,
  activa            BOOLEAN DEFAULT true
);

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos leen misiones" ON missions FOR SELECT USING (true);
CREATE POLICY "Admin gestiona misiones" ON missions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
);

-- ── Mission progress ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mission_progress (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mision_id     UUID REFERENCES missions(id) ON DELETE CASCADE,
  vendedor_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  fecha         DATE DEFAULT CURRENT_DATE,
  progreso      INTEGER DEFAULT 0,
  completada    BOOLEAN DEFAULT false,
  completada_at TIMESTAMPTZ,
  UNIQUE(mision_id, vendedor_id, fecha)
);

ALTER TABLE mission_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos leen progreso" ON mission_progress FOR SELECT USING (true);
CREATE POLICY "Vendedor gestiona su progreso" ON mission_progress FOR ALL USING (auth.uid() = vendedor_id);

-- ── Duels ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS duels (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  retador_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  retado_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ganador_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  semana          INTEGER NOT NULL,
  año             INTEGER NOT NULL,
  retador_ventas  INTEGER DEFAULT 0,
  retado_ventas   INTEGER DEFAULT 0,
  puntos_apuesta  INTEGER DEFAULT 50,
  estado          TEXT DEFAULT 'pendiente',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE duels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos leen duelos" ON duels FOR SELECT USING (true);
CREATE POLICY "Admin gestiona duelos" ON duels FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
);
CREATE POLICY "Vendedor actualiza duelos" ON duels FOR UPDATE USING (
  auth.uid() = retador_id OR auth.uid() = retado_id
);

-- ── Realtime ──────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE deals;
ALTER PUBLICATION supabase_realtime ADD TABLE roulette_spins;
ALTER PUBLICATION supabase_realtime ADD TABLE duels;

-- ── Seed: default missions ────────────────────────────────────
INSERT INTO missions (tipo, titulo, descripcion, tipo_accion, objetivo, puntos_recompensa) VALUES
  ('diaria', 'Primer contacto', 'Contactá al menos 1 negocio hoy', 'contactos', 1, 20),
  ('diaria', 'Máquina de contactos', 'Contactá 5 negocios en un día', 'contactos', 5, 60),
  ('diaria', 'Propuesta enviada', 'Enviá al menos 1 propuesta hoy', 'propuestas', 1, 40),
  ('semanal', 'Primer cierre', 'Cerrá 1 venta esta semana', 'cierres', 1, 200),
  ('semanal', 'Máquina de guerra', 'Contactá 20 negocios en la semana', 'contactos', 20, 150),
  ('semanal', 'Propuestero', 'Enviá 5 propuestas en la semana', 'propuestas', 5, 100);

-- ── 1. Latitud y Longitud en Deals ─────────────────────────────
ALTER TABLE deals ADD COLUMN IF NOT EXISTS latitud NUMERIC(10, 8);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS longitud NUMERIC(11, 8);

-- ── 2. Tabla de Configuración de Sistema (Código Invitación) ─────
CREATE TABLE IF NOT EXISTS system_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO system_settings (key, value) VALUES ('invite_code', 'PIBBLE2026') ON CONFLICT (key) DO NOTHING;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos leen settings" ON system_settings FOR SELECT USING (true);
CREATE POLICY "Admin gestiona settings" ON system_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
);

-- ── 3. Tabla de Registro de Niveles (Felicitaciones) ────────────
CREATE TABLE IF NOT EXISTS level_ups (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendedor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  nivel_nuevo TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE level_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos leen level_ups" ON level_ups FOR SELECT USING (true);
CREATE POLICY "Vendedor crea level_ups" ON level_ups FOR INSERT WITH CHECK (auth.uid() = vendedor_id);

-- ── 4. Trigger de Creación Automática de Perfil ─────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, apellido, email, avatar_color, rol, puntos_total)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nombre', 'Vendedor'),
    COALESCE(new.raw_user_meta_data->>'apellido', ''),
    new.email,
    COALESCE(new.raw_user_meta_data->>'avatar_color', '#ccff00'),
    COALESCE(new.raw_user_meta_data->>'rol', 'vendedor'),
    0
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Borrar trigger previo si existe para evitar duplicación
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 5. Trigger para Cálculo de Rachas (Streaks) ───────────────
CREATE OR REPLACE FUNCTION public.update_vendedor_streak()
RETURNS trigger AS $$
DECLARE
  v_hoy DATE;
  v_ultimo DATE;
  v_racha INTEGER;
  v_racha_max INTEGER;
BEGIN
  v_hoy := NOW()::DATE;
  SELECT ultimo_login, racha_actual, racha_max 
  INTO v_ultimo, v_racha, v_racha_max
  FROM public.profiles 
  WHERE id = new.vendedor_id;

  IF v_ultimo IS NULL THEN
    v_racha := 1;
  ELSIF v_hoy = v_ultimo THEN
    -- ya hizo actividad hoy, no cambia racha
    v_racha := COALESCE(v_racha, 1);
  ELSIF v_hoy = v_ultimo + 1 THEN
    -- actividad el dia siguiente, suma racha
    v_racha := COALESCE(v_racha, 0) + 1;
  ELSE
    -- se rompio la racha, reinicia en 1
    v_racha := 1;
  END IF;

  v_racha_max := COALESCE(v_racha_max, 0);
  IF v_racha > v_racha_max THEN
    v_racha_max := v_racha;
  END IF;

  UPDATE public.profiles 
  SET ultimo_login = v_hoy, 
      racha_actual = v_racha, 
      racha_max = v_racha_max
  WHERE id = new.vendedor_id;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_activity_created_streak ON public.deal_activities;

CREATE TRIGGER on_activity_created_streak
  AFTER INSERT ON public.deal_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_vendedor_streak();

-- ── 6. Función para Resolver Duelos Semanales ───────────────────
CREATE OR REPLACE FUNCTION public.resolver_duelos_semanales(p_semana INTEGER, p_año INTEGER)
RETURNS void AS $$
DECLARE
  r RECORD;
  v_ganador_id UUID;
BEGIN
  FOR r IN 
    SELECT * FROM public.duels 
    WHERE semana = p_semana AND año = p_año AND estado = 'activo'
  LOOP
    IF r.retador_ventas > r.retado_ventas THEN
      v_ganador_id := r.retador_id;
      UPDATE public.profiles 
      SET puntos_total = puntos_total + r.puntos_apuesta 
      WHERE id = r.retador_id;
    ELSIF r.retado_ventas > r.retador_ventas THEN
      v_ganador_id := r.retado_id;
      UPDATE public.profiles 
      SET puntos_total = puntos_total + r.puntos_apuesta 
      WHERE id = r.retado_id;
    ELSE
      v_ganador_id := NULL; -- Empate
    END IF;

    UPDATE public.duels 
    SET estado = 'finalizado', 
        ganador_id = v_ganador_id 
    WHERE id = r.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 7. Misiones Mensuales Semilla ─────────────────────────────
INSERT INTO missions (tipo, titulo, descripcion, tipo_accion, objetivo, puntos_recompensa) VALUES
  ('mensual', 'Tiburón de Ventas', 'Cerrá al menos 5 ventas este mes', 'cierres', 5, 500)
ON CONFLICT DO NOTHING;

