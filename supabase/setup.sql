
-- ============================================================
-- FreeBees Sales CRM
-- Standalone Supabase bootstrap for a FRESH project only.
-- Do not run against the existing production database.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Tables
-- ------------------------------------------------------------

CREATE TABLE public.customer_brands (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT customer_brands_name_check
        CHECK (length(trim(name)) > 0)
);

CREATE TABLE public.customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    phone text,
    email text,
    created_at timestamptz NOT NULL DEFAULT now(),
    brand_id uuid,
    location text,

    CONSTRAINT customers_name_check
        CHECK (
            length(trim(name)) >= 1
            AND length(trim(name)) <= 120
        ),

    CONSTRAINT customers_brand_id_fkey
        FOREIGN KEY (brand_id)
        REFERENCES public.customer_brands(id)
);

CREATE TABLE public.activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name text NOT NULL,
    activity_type text NOT NULL,
    status text NOT NULL DEFAULT 'PENDING',
    notes text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    customer_id uuid,
    customer_phone text,
    customer_email text,

    CONSTRAINT activities_activity_type_check
        CHECK (
            activity_type IN (
                'CALL',
                'RESTAURANT_VISIT',
                'MEETING',
                'EMAIL'
            )
        ),

    CONSTRAINT activities_status_check
        CHECK (
            status IN (
                'PENDING',
                'COMPLETED',
                'FOLLOW_UP_REQUIRED'
            )
        ),

    CONSTRAINT activities_customer_name_check
        CHECK (
            char_length(trim(customer_name)) >= 1
            AND char_length(trim(customer_name)) <= 120
        ),

    CONSTRAINT activities_customer_phone_length
        CHECK (
            customer_phone IS NULL
            OR char_length(customer_phone) <= 30
        ),

    CONSTRAINT activities_customer_email_length
        CHECK (
            customer_email IS NULL
            OR char_length(customer_email) <= 254
        ),

    CONSTRAINT activities_notes_check
        CHECK (char_length(notes) <= 2000),

    CONSTRAINT activities_customer_id_fkey
        FOREIGN KEY (customer_id)
        REFERENCES public.customers(id)
);

CREATE TABLE public.team_members (
    user_id uuid PRIMARY KEY,
    role text NOT NULL DEFAULT 'member',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    full_name text,

    CONSTRAINT team_members_role_check
        CHECK (role IN ('admin', 'member')),

    CONSTRAINT team_members_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 2. Indexes
-- ------------------------------------------------------------

CREATE INDEX activities_created_at_idx
    ON public.activities (created_at DESC);

CREATE INDEX activities_dashboard_status_idx
    ON public.activities (status)
    WHERE status IN (
        'PENDING',
        'COMPLETED',
        'FOLLOW_UP_REQUIRED'
    );

CREATE INDEX customer_brands_name_lower_idx
    ON public.customer_brands (lower(name));

CREATE INDEX customers_brand_id_idx
    ON public.customers (brand_id);

-- ------------------------------------------------------------
-- 3. Row Level Security
-- ------------------------------------------------------------

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 4. Security helper functions
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_active_team_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.team_members AS tm
        WHERE tm.user_id = (SELECT auth.uid())
          AND tm.is_active = true
    );
$function$;

CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.team_members AS tm
        WHERE tm.user_id = (SELECT auth.uid())
          AND tm.role = 'admin'
          AND tm.is_active = true
    );
$function$;

-- ------------------------------------------------------------
-- 5. Activities policies
-- ------------------------------------------------------------

CREATE POLICY "Active team members can read activities"
ON public.activities
FOR SELECT
TO authenticated
USING ((SELECT public.is_active_team_member()));

CREATE POLICY "Active team members can create activities"
ON public.activities
FOR INSERT
TO authenticated
WITH CHECK ((SELECT public.is_active_team_member()));

CREATE POLICY "Active admins can update activities"
ON public.activities
FOR UPDATE
TO authenticated
USING ((SELECT public.is_active_admin()))
WITH CHECK ((SELECT public.is_active_admin()));

CREATE POLICY "Active admins can delete activities"
ON public.activities
FOR DELETE
TO authenticated
USING ((SELECT public.is_active_admin()));

-- ------------------------------------------------------------
-- 6. Customer brand policies
-- ------------------------------------------------------------

CREATE POLICY "Active team members can read customer brands"
ON public.customer_brands
FOR SELECT
TO authenticated
USING ((SELECT public.is_active_team_member()));

CREATE POLICY "Active team members can create customer brands"
ON public.customer_brands
FOR INSERT
TO authenticated
WITH CHECK ((SELECT public.is_active_team_member()));

CREATE POLICY "Active admins can update customer brands"
ON public.customer_brands
FOR UPDATE
TO authenticated
USING ((SELECT public.is_active_admin()))
WITH CHECK ((SELECT public.is_active_admin()));

CREATE POLICY "Active admins can delete customer brands"
ON public.customer_brands
FOR DELETE
TO authenticated
USING ((SELECT public.is_active_admin()));

-- ------------------------------------------------------------
-- 7. Customer / branch policies
-- ------------------------------------------------------------

CREATE POLICY "Active team members can read customers"
ON public.customers
FOR SELECT
TO authenticated
USING ((SELECT public.is_active_team_member()));

CREATE POLICY "Active team members can create customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK ((SELECT public.is_active_team_member()));

CREATE POLICY "Active admins can update customers"
ON public.customers
FOR UPDATE
TO authenticated
USING ((SELECT public.is_active_admin()))
WITH CHECK ((SELECT public.is_active_admin()));

CREATE POLICY "Active admins can delete customers"
ON public.customers
FOR DELETE
TO authenticated
USING ((SELECT public.is_active_admin()));

-- ------------------------------------------------------------
-- 8. Team membership policy
-- ------------------------------------------------------------

CREATE POLICY "Team members can read their own membership"
ON public.team_members
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- No client-side INSERT, UPDATE or DELETE policies for team_members.
-- Team administration must use the verified server-side admin client.

-- ------------------------------------------------------------
-- 9. Table privileges
-- ------------------------------------------------------------

-- Start with no anonymous access to application tables.
REVOKE ALL PRIVILEGES ON TABLE
    public.activities,
    public.customer_brands,
    public.customers,
    public.team_members
FROM PUBLIC, anon, authenticated, service_role;

-- Authenticated users have table privileges; RLS decides which
-- rows and operations they are actually allowed to access.
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE
    public.activities,
    public.customer_brands,
    public.customers
TO authenticated;

GRANT SELECT
ON TABLE public.team_members
TO authenticated;

-- The server-side service-role client handles team administration.
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE
    public.activities,
    public.customer_brands,
    public.customers,
    public.team_members
TO service_role;

-- ------------------------------------------------------------
-- 10. Function execution privileges
-- ------------------------------------------------------------

REVOKE ALL ON FUNCTION public.is_active_team_member()
FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.is_active_admin()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_active_team_member()
TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.is_active_admin()
TO authenticated, service_role;

-- ------------------------------------------------------------
-- 11. Dashboard trend RPC
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_activity_trend(
    p_start_date date,
    p_end_date date,
    p_granularity text
)
RETURNS TABLE (
    period_start date,
    activity_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
    v_start timestamptz;
    v_end timestamptz;
BEGIN
    IF p_start_date IS NULL OR p_end_date IS NULL THEN
        RAISE EXCEPTION 'Start date and end date are required';
    END IF;

    IF p_end_date < p_start_date THEN
        RAISE EXCEPTION 'End date must not precede start date';
    END IF;

    IF p_end_date - p_start_date >= 1830 THEN
        RAISE EXCEPTION 'Date range must be shorter than 1830 days';
    END IF;

    IF p_end_date > (now() AT TIME ZONE 'UTC')::date THEN
        RAISE EXCEPTION 'End date must not be in the future';
    END IF;

IF p_granularity IS NULL
   OR p_granularity NOT IN ('day', 'week', 'month') THEN
    RAISE EXCEPTION 'Unsupported granularity';
END IF;

    v_start := p_start_date::timestamp AT TIME ZONE 'UTC';
    v_end := (p_end_date + 1)::timestamp AT TIME ZONE 'UTC';

    IF p_granularity = 'day' THEN
        RETURN QUERY
        SELECT
            (a.created_at AT TIME ZONE 'UTC')::date,
            count(*)::bigint
        FROM public.activities AS a
        WHERE a.created_at >= v_start
          AND a.created_at < v_end
        GROUP BY 1
        ORDER BY 1;

    ELSIF p_granularity = 'week' THEN
        RETURN QUERY
        SELECT
            date_trunc(
                'week',
                a.created_at AT TIME ZONE 'UTC'
            )::date,
            count(*)::bigint
        FROM public.activities AS a
        WHERE a.created_at >= v_start
          AND a.created_at < v_end
        GROUP BY 1
        ORDER BY 1;

    ELSE
        RETURN QUERY
        SELECT
            date_trunc(
                'month',
                a.created_at AT TIME ZONE 'UTC'
            )::date,
            count(*)::bigint
        FROM public.activities AS a
        WHERE a.created_at >= v_start
          AND a.created_at < v_end
        GROUP BY 1
        ORDER BY 1;
    END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_activity_trend(date, date, text)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_activity_trend(date, date, text)
TO authenticated, service_role;

COMMIT;
