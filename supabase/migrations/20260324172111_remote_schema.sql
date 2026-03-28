drop extension if exists "pg_net";

create extension if not exists "pg_trgm" with schema "public";

create extension if not exists "unaccent" with schema "public";


  create table "public"."admin_contact_messages" (
    "id" uuid not null default gen_random_uuid(),
    "parent_first_name" text,
    "parent_last_name" text,
    "email" text not null,
    "subject" text not null,
    "message" text not null,
    "status" text not null default 'new'::text,
    "created_at" timestamp with time zone not null default now(),
    "handled_at" timestamp with time zone,
    "handled_by" uuid,
    "admin_note" text
      );


alter table "public"."admin_contact_messages" enable row level security;


  create table "public"."admin_users" (
    "user_id" uuid not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."admin_users" enable row level security;


  create table "public"."children" (
    "id" uuid not null default gen_random_uuid(),
    "family_id" uuid not null,
    "first_name" text not null,
    "level" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."children" enable row level security;


  create table "public"."contact_request_trips" (
    "id" uuid not null default gen_random_uuid(),
    "contact_request_id" uuid not null,
    "requester_trip_id" uuid not null,
    "target_trip_id" uuid not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."contact_request_trips" enable row level security;


  create table "public"."contact_requests" (
    "id" uuid not null default gen_random_uuid(),
    "requester_family_id" uuid not null,
    "target_family_id" uuid not null,
    "status" text not null,
    "request_message" text,
    "created_at" timestamp with time zone not null default now(),
    "expires_at" timestamp with time zone not null,
    "responded_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "close_reason" text
      );


alter table "public"."contact_requests" enable row level security;


  create table "public"."deleted_children_archive" (
    "id" uuid not null default gen_random_uuid(),
    "deletion_request_id" uuid not null,
    "original_child_id" uuid,
    "archived_data" jsonb not null,
    "deleted_at" timestamp with time zone not null default now()
      );


alter table "public"."deleted_children_archive" enable row level security;


  create table "public"."deleted_contact_request_trips_archive" (
    "id" uuid not null default gen_random_uuid(),
    "deletion_request_id" uuid not null,
    "original_contact_request_trip_id" uuid,
    "archived_data" jsonb not null,
    "deleted_at" timestamp with time zone not null default now()
      );


alter table "public"."deleted_contact_request_trips_archive" enable row level security;


  create table "public"."deleted_contact_requests_archive" (
    "id" uuid not null default gen_random_uuid(),
    "deletion_request_id" uuid not null,
    "original_contact_request_id" uuid,
    "archived_data" jsonb not null,
    "deleted_at" timestamp with time zone not null default now()
      );


alter table "public"."deleted_contact_requests_archive" enable row level security;


  create table "public"."deleted_families_archive" (
    "id" uuid not null default gen_random_uuid(),
    "deletion_request_id" uuid not null,
    "original_family_id" uuid,
    "archived_data" jsonb not null,
    "deleted_at" timestamp with time zone not null default now()
      );


alter table "public"."deleted_families_archive" enable row level security;


  create table "public"."deleted_place_suggestions_archive" (
    "id" uuid not null default gen_random_uuid(),
    "deletion_request_id" uuid not null,
    "original_place_suggestion_id" uuid,
    "archived_data" jsonb not null,
    "deleted_at" timestamp with time zone not null default now()
      );


alter table "public"."deleted_place_suggestions_archive" enable row level security;


  create table "public"."deleted_trips_archive" (
    "id" uuid not null default gen_random_uuid(),
    "deletion_request_id" uuid not null,
    "original_trip_id" uuid,
    "archived_data" jsonb not null,
    "deleted_at" timestamp with time zone not null default now()
      );


alter table "public"."deleted_trips_archive" enable row level security;


  create table "public"."deletion_requests" (
    "id" uuid not null default gen_random_uuid(),
    "email" text not null,
    "token_hash" text not null,
    "status" text not null default 'pending_verification'::text,
    "requested_at" timestamp with time zone not null default now(),
    "verified_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "expires_at" timestamp with time zone not null,
    "matched_family_id" uuid,
    "failure_reason" text
      );


alter table "public"."deletion_requests" enable row level security;


  create table "public"."families" (
    "id" uuid not null default gen_random_uuid(),
    "auth_user_id" uuid not null,
    "email" text not null,
    "parent_first_name" text,
    "parent_last_name" text,
    "phone" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."families" enable row level security;


  create table "public"."place_suggestions" (
    "id" uuid not null default gen_random_uuid(),
    "family_id" uuid not null,
    "suggested_name" text not null,
    "kind" text not null,
    "city" text not null,
    "exact_address" text,
    "postal_code" text,
    "comment" text,
    "status" text not null default 'pending'::text,
    "resolved_place_id" uuid,
    "review_note" text,
    "created_at" timestamp with time zone not null default now(),
    "reviewed_at" timestamp with time zone
      );


alter table "public"."place_suggestions" enable row level security;


  create table "public"."places" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "kind" text not null,
    "city" text not null,
    "exact_address" text,
    "postal_code" text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."places" enable row level security;


  create table "public"."site_events" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "event_type" text not null,
    "page" text,
    "path" text,
    "metadata" jsonb,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."trips" (
    "id" uuid not null default gen_random_uuid(),
    "family_id" uuid not null,
    "child_id" uuid not null,
    "from_place_id" uuid,
    "to_place_id" uuid,
    "from_time" time without time zone not null,
    "to_time" time without time zone,
    "tolerance_min" integer not null default 10,
    "status" text not null default 'searching'::text,
    "accepting_new_children" boolean not null default true,
    "revision" integer not null default 1,
    "created_at" timestamp with time zone not null default now(),
    "from_place_suggestion_id" uuid,
    "to_place_suggestion_id" uuid,
    "day_of_week" integer not null,
    "trip_group_id" uuid not null
      );


alter table "public"."trips" enable row level security;


  create table "public"."trips_backup_20260319" (
    "id" uuid,
    "family_id" uuid,
    "child_id" uuid,
    "from_place_id" uuid,
    "to_place_id" uuid,
    "day_mask" integer,
    "from_time" time without time zone,
    "to_time" time without time zone,
    "tolerance_min" integer,
    "status" text,
    "accepting_new_children" boolean,
    "revision" integer,
    "created_at" timestamp with time zone,
    "from_place_suggestion_id" uuid,
    "to_place_suggestion_id" uuid,
    "day_of_week" integer,
    "trip_group_id" uuid
      );



  create table "public"."trips_expanded_tmp" (
    "family_id" uuid,
    "child_id" uuid,
    "from_place_id" uuid,
    "to_place_id" uuid,
    "from_place_suggestion_id" uuid,
    "to_place_suggestion_id" uuid,
    "day_of_week" integer,
    "from_time" time without time zone,
    "to_time" time without time zone,
    "tolerance_min" integer,
    "status" text,
    "accepting_new_children" boolean,
    "revision" integer,
    "created_at" timestamp with time zone,
    "trip_group_id" uuid
      );


CREATE UNIQUE INDEX admin_contact_messages_pkey ON public.admin_contact_messages USING btree (id);

CREATE UNIQUE INDEX admin_users_pkey ON public.admin_users USING btree (user_id);

CREATE INDEX children_family_id_idx ON public.children USING btree (family_id);

CREATE UNIQUE INDEX children_pkey ON public.children USING btree (id);

CREATE INDEX contact_request_trips_contact_request_id_idx ON public.contact_request_trips USING btree (contact_request_id);

CREATE UNIQUE INDEX contact_request_trips_pkey ON public.contact_request_trips USING btree (id);

CREATE INDEX contact_request_trips_requester_trip_id_idx ON public.contact_request_trips USING btree (requester_trip_id);

CREATE INDEX contact_request_trips_target_trip_id_idx ON public.contact_request_trips USING btree (target_trip_id);

CREATE UNIQUE INDEX contact_requests_pkey ON public.contact_requests USING btree (id);

CREATE INDEX contact_requests_requester_family_id_idx ON public.contact_requests USING btree (requester_family_id);

CREATE INDEX contact_requests_status_idx ON public.contact_requests USING btree (status);

CREATE INDEX contact_requests_target_family_id_idx ON public.contact_requests USING btree (target_family_id);

CREATE UNIQUE INDEX deleted_children_archive_pkey ON public.deleted_children_archive USING btree (id);

CREATE UNIQUE INDEX deleted_contact_request_trips_archive_pkey ON public.deleted_contact_request_trips_archive USING btree (id);

CREATE UNIQUE INDEX deleted_contact_requests_archive_pkey ON public.deleted_contact_requests_archive USING btree (id);

CREATE UNIQUE INDEX deleted_families_archive_pkey ON public.deleted_families_archive USING btree (id);

CREATE UNIQUE INDEX deleted_place_suggestions_archive_pkey ON public.deleted_place_suggestions_archive USING btree (id);

CREATE UNIQUE INDEX deleted_trips_archive_pkey ON public.deleted_trips_archive USING btree (id);

CREATE UNIQUE INDEX deletion_requests_pkey ON public.deletion_requests USING btree (id);

CREATE UNIQUE INDEX families_auth_user_id_key ON public.families USING btree (auth_user_id);

CREATE UNIQUE INDEX families_pkey ON public.families USING btree (id);

CREATE INDEX place_suggestions_family_id_idx ON public.place_suggestions USING btree (family_id);

CREATE UNIQUE INDEX place_suggestions_pkey ON public.place_suggestions USING btree (id);

CREATE INDEX place_suggestions_status_idx ON public.place_suggestions USING btree (status);

CREATE INDEX places_city_idx ON public.places USING btree (city);

CREATE INDEX places_kind_idx ON public.places USING btree (kind);

CREATE INDEX places_name_idx ON public.places USING btree (name);

CREATE UNIQUE INDEX places_pkey ON public.places USING btree (id);

CREATE INDEX site_events_created_at_idx ON public.site_events USING btree (created_at);

CREATE INDEX site_events_event_type_idx ON public.site_events USING btree (event_type);

CREATE INDEX site_events_page_idx ON public.site_events USING btree (page);

CREATE UNIQUE INDEX site_events_pkey ON public.site_events USING btree (id);

CREATE INDEX trips_child_id_idx ON public.trips USING btree (child_id);

CREATE INDEX trips_day_of_week_idx ON public.trips USING btree (day_of_week);

CREATE INDEX trips_family_id_idx ON public.trips USING btree (family_id);

CREATE INDEX trips_from_place_id_idx ON public.trips USING btree (from_place_id);

CREATE UNIQUE INDEX trips_pkey ON public.trips USING btree (id);

CREATE INDEX trips_status_idx ON public.trips USING btree (status);

CREATE INDEX trips_to_place_id_idx ON public.trips USING btree (to_place_id);

CREATE INDEX trips_trip_group_id_idx ON public.trips USING btree (trip_group_id);

alter table "public"."admin_contact_messages" add constraint "admin_contact_messages_pkey" PRIMARY KEY using index "admin_contact_messages_pkey";

alter table "public"."admin_users" add constraint "admin_users_pkey" PRIMARY KEY using index "admin_users_pkey";

alter table "public"."children" add constraint "children_pkey" PRIMARY KEY using index "children_pkey";

alter table "public"."contact_request_trips" add constraint "contact_request_trips_pkey" PRIMARY KEY using index "contact_request_trips_pkey";

alter table "public"."contact_requests" add constraint "contact_requests_pkey" PRIMARY KEY using index "contact_requests_pkey";

alter table "public"."deleted_children_archive" add constraint "deleted_children_archive_pkey" PRIMARY KEY using index "deleted_children_archive_pkey";

alter table "public"."deleted_contact_request_trips_archive" add constraint "deleted_contact_request_trips_archive_pkey" PRIMARY KEY using index "deleted_contact_request_trips_archive_pkey";

alter table "public"."deleted_contact_requests_archive" add constraint "deleted_contact_requests_archive_pkey" PRIMARY KEY using index "deleted_contact_requests_archive_pkey";

alter table "public"."deleted_families_archive" add constraint "deleted_families_archive_pkey" PRIMARY KEY using index "deleted_families_archive_pkey";

alter table "public"."deleted_place_suggestions_archive" add constraint "deleted_place_suggestions_archive_pkey" PRIMARY KEY using index "deleted_place_suggestions_archive_pkey";

alter table "public"."deleted_trips_archive" add constraint "deleted_trips_archive_pkey" PRIMARY KEY using index "deleted_trips_archive_pkey";

alter table "public"."deletion_requests" add constraint "deletion_requests_pkey" PRIMARY KEY using index "deletion_requests_pkey";

alter table "public"."families" add constraint "families_pkey" PRIMARY KEY using index "families_pkey";

alter table "public"."place_suggestions" add constraint "place_suggestions_pkey" PRIMARY KEY using index "place_suggestions_pkey";

alter table "public"."places" add constraint "places_pkey" PRIMARY KEY using index "places_pkey";

alter table "public"."site_events" add constraint "site_events_pkey" PRIMARY KEY using index "site_events_pkey";

alter table "public"."trips" add constraint "trips_pkey" PRIMARY KEY using index "trips_pkey";

alter table "public"."admin_contact_messages" add constraint "admin_contact_messages_handled_by_fkey" FOREIGN KEY (handled_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."admin_contact_messages" validate constraint "admin_contact_messages_handled_by_fkey";

alter table "public"."admin_contact_messages" add constraint "admin_contact_messages_status_check" CHECK ((status = ANY (ARRAY['new'::text, 'in_progress'::text, 'handled'::text]))) not valid;

alter table "public"."admin_contact_messages" validate constraint "admin_contact_messages_status_check";

alter table "public"."admin_users" add constraint "admin_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."admin_users" validate constraint "admin_users_user_id_fkey";

alter table "public"."children" add constraint "children_family_id_fkey" FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE not valid;

alter table "public"."children" validate constraint "children_family_id_fkey";

alter table "public"."contact_request_trips" add constraint "contact_request_trips_contact_request_id_fkey" FOREIGN KEY (contact_request_id) REFERENCES public.contact_requests(id) ON DELETE CASCADE not valid;

alter table "public"."contact_request_trips" validate constraint "contact_request_trips_contact_request_id_fkey";

alter table "public"."contact_request_trips" add constraint "contact_request_trips_requester_trip_id_fkey" FOREIGN KEY (requester_trip_id) REFERENCES public.trips(id) ON DELETE CASCADE not valid;

alter table "public"."contact_request_trips" validate constraint "contact_request_trips_requester_trip_id_fkey";

alter table "public"."contact_request_trips" add constraint "contact_request_trips_target_trip_id_fkey" FOREIGN KEY (target_trip_id) REFERENCES public.trips(id) ON DELETE CASCADE not valid;

alter table "public"."contact_request_trips" validate constraint "contact_request_trips_target_trip_id_fkey";

alter table "public"."contact_requests" add constraint "contact_requests_requester_family_id_fkey" FOREIGN KEY (requester_family_id) REFERENCES public.families(id) ON DELETE CASCADE not valid;

alter table "public"."contact_requests" validate constraint "contact_requests_requester_family_id_fkey";

alter table "public"."contact_requests" add constraint "contact_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'expired'::text, 'cancelled'::text, 'closed_no_agreement'::text, 'closed_with_agreement'::text]))) not valid;

alter table "public"."contact_requests" validate constraint "contact_requests_status_check";

alter table "public"."contact_requests" add constraint "contact_requests_target_family_id_fkey" FOREIGN KEY (target_family_id) REFERENCES public.families(id) ON DELETE CASCADE not valid;

alter table "public"."contact_requests" validate constraint "contact_requests_target_family_id_fkey";

alter table "public"."deleted_children_archive" add constraint "deleted_children_archive_deletion_request_id_fkey" FOREIGN KEY (deletion_request_id) REFERENCES public.deletion_requests(id) ON DELETE CASCADE not valid;

alter table "public"."deleted_children_archive" validate constraint "deleted_children_archive_deletion_request_id_fkey";

alter table "public"."deleted_contact_request_trips_archive" add constraint "deleted_contact_request_trips_archive_deletion_request_id_fkey" FOREIGN KEY (deletion_request_id) REFERENCES public.deletion_requests(id) ON DELETE CASCADE not valid;

alter table "public"."deleted_contact_request_trips_archive" validate constraint "deleted_contact_request_trips_archive_deletion_request_id_fkey";

alter table "public"."deleted_contact_requests_archive" add constraint "deleted_contact_requests_archive_deletion_request_id_fkey" FOREIGN KEY (deletion_request_id) REFERENCES public.deletion_requests(id) ON DELETE CASCADE not valid;

alter table "public"."deleted_contact_requests_archive" validate constraint "deleted_contact_requests_archive_deletion_request_id_fkey";

alter table "public"."deleted_families_archive" add constraint "deleted_families_archive_deletion_request_id_fkey" FOREIGN KEY (deletion_request_id) REFERENCES public.deletion_requests(id) ON DELETE CASCADE not valid;

alter table "public"."deleted_families_archive" validate constraint "deleted_families_archive_deletion_request_id_fkey";

alter table "public"."deleted_place_suggestions_archive" add constraint "deleted_place_suggestions_archive_deletion_request_id_fkey" FOREIGN KEY (deletion_request_id) REFERENCES public.deletion_requests(id) ON DELETE CASCADE not valid;

alter table "public"."deleted_place_suggestions_archive" validate constraint "deleted_place_suggestions_archive_deletion_request_id_fkey";

alter table "public"."deleted_trips_archive" add constraint "deleted_trips_archive_deletion_request_id_fkey" FOREIGN KEY (deletion_request_id) REFERENCES public.deletion_requests(id) ON DELETE CASCADE not valid;

alter table "public"."deleted_trips_archive" validate constraint "deleted_trips_archive_deletion_request_id_fkey";

alter table "public"."deletion_requests" add constraint "deletion_requests_status_check" CHECK ((status = ANY (ARRAY['pending_verification'::text, 'completed'::text, 'failed'::text, 'no_match'::text, 'expired'::text]))) not valid;

alter table "public"."deletion_requests" validate constraint "deletion_requests_status_check";

alter table "public"."families" add constraint "families_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."families" validate constraint "families_auth_user_id_fkey";

alter table "public"."families" add constraint "families_auth_user_id_key" UNIQUE using index "families_auth_user_id_key";

alter table "public"."place_suggestions" add constraint "place_suggestions_family_id_fkey" FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE not valid;

alter table "public"."place_suggestions" validate constraint "place_suggestions_family_id_fkey";

alter table "public"."place_suggestions" add constraint "place_suggestions_kind_check" CHECK ((kind = ANY (ARRAY['school'::text, 'activity'::text, 'other'::text]))) not valid;

alter table "public"."place_suggestions" validate constraint "place_suggestions_kind_check";

alter table "public"."place_suggestions" add constraint "place_suggestions_resolved_place_id_fkey" FOREIGN KEY (resolved_place_id) REFERENCES public.places(id) ON DELETE SET NULL not valid;

alter table "public"."place_suggestions" validate constraint "place_suggestions_resolved_place_id_fkey";

alter table "public"."place_suggestions" add constraint "place_suggestions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved_new_place'::text, 'mapped_to_existing_place'::text, 'rejected'::text]))) not valid;

alter table "public"."place_suggestions" validate constraint "place_suggestions_status_check";

alter table "public"."places" add constraint "places_kind_check" CHECK ((kind = ANY (ARRAY['school'::text, 'activity'::text, 'other'::text]))) not valid;

alter table "public"."places" validate constraint "places_kind_check";

alter table "public"."site_events" add constraint "site_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."site_events" validate constraint "site_events_user_id_fkey";

alter table "public"."trips" add constraint "trips_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."trips" validate constraint "trips_child_id_fkey";

alter table "public"."trips" add constraint "trips_day_of_week_check" CHECK (((day_of_week >= 1) AND (day_of_week <= 7))) not valid;

alter table "public"."trips" validate constraint "trips_day_of_week_check";

alter table "public"."trips" add constraint "trips_family_id_fkey" FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE not valid;

alter table "public"."trips" validate constraint "trips_family_id_fkey";

alter table "public"."trips" add constraint "trips_from_place_choice_check" CHECK ((((from_place_id IS NOT NULL) AND (from_place_suggestion_id IS NULL)) OR ((from_place_id IS NULL) AND (from_place_suggestion_id IS NOT NULL)))) not valid;

alter table "public"."trips" validate constraint "trips_from_place_choice_check";

alter table "public"."trips" add constraint "trips_from_place_id_fkey" FOREIGN KEY (from_place_id) REFERENCES public.places(id) not valid;

alter table "public"."trips" validate constraint "trips_from_place_id_fkey";

alter table "public"."trips" add constraint "trips_from_place_suggestion_id_fkey" FOREIGN KEY (from_place_suggestion_id) REFERENCES public.place_suggestions(id) ON DELETE SET NULL not valid;

alter table "public"."trips" validate constraint "trips_from_place_suggestion_id_fkey";

alter table "public"."trips" add constraint "trips_places_different_check" CHECK ((NOT ((from_place_id IS NOT NULL) AND (to_place_id IS NOT NULL) AND (from_place_id = to_place_id)))) not valid;

alter table "public"."trips" validate constraint "trips_places_different_check";

alter table "public"."trips" add constraint "trips_revision_check" CHECK ((revision >= 1)) not valid;

alter table "public"."trips" validate constraint "trips_revision_check";

alter table "public"."trips" add constraint "trips_status_check" CHECK ((status = ANY (ARRAY['searching'::text, 'resolved'::text, 'paused'::text, 'archived'::text]))) not valid;

alter table "public"."trips" validate constraint "trips_status_check";

alter table "public"."trips" add constraint "trips_to_place_choice_check" CHECK ((((to_place_id IS NOT NULL) AND (to_place_suggestion_id IS NULL)) OR ((to_place_id IS NULL) AND (to_place_suggestion_id IS NOT NULL)))) not valid;

alter table "public"."trips" validate constraint "trips_to_place_choice_check";

alter table "public"."trips" add constraint "trips_to_place_id_fkey" FOREIGN KEY (to_place_id) REFERENCES public.places(id) not valid;

alter table "public"."trips" validate constraint "trips_to_place_id_fkey";

alter table "public"."trips" add constraint "trips_to_place_suggestion_id_fkey" FOREIGN KEY (to_place_suggestion_id) REFERENCES public.place_suggestions(id) ON DELETE SET NULL not valid;

alter table "public"."trips" validate constraint "trips_to_place_suggestion_id_fkey";

alter table "public"."trips" add constraint "trips_tolerance_min_check" CHECK (((tolerance_min >= 0) AND (tolerance_min <= 180))) not valid;

alter table "public"."trips" validate constraint "trips_tolerance_min_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.families (
    auth_user_id,
    email,
    parent_first_name,
    parent_last_name
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'parent_first_name',
    new.raw_user_meta_data ->> 'parent_last_name'
  );

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.search_places(search_query text)
 RETURNS TABLE(id uuid, name text, city text, exact_address text, kind text, score real)
 LANGUAGE sql
 STABLE
AS $function$
  select
    p.id,
    p.name,
    p.city,
    p.exact_address,
    p.kind,
    greatest(
      similarity(unaccent(lower(p.name)), unaccent(lower(search_query))),
      similarity(
        unaccent(lower(coalesce(p.name, '') || ' ' || coalesce(p.city, '') || ' ' || coalesce(p.exact_address, ''))),
        unaccent(lower(search_query))
      )
    )::real as score
  from public.places p
  where
    p.is_active = true
    and (
      unaccent(lower(p.name)) ilike '%' || unaccent(lower(search_query)) || '%'
      or unaccent(lower(p.city)) ilike '%' || unaccent(lower(search_query)) || '%'
      or unaccent(lower(coalesce(p.exact_address, ''))) ilike '%' || unaccent(lower(search_query)) || '%'
      or similarity(unaccent(lower(p.name)), unaccent(lower(search_query))) > 0.2
      or similarity(
        unaccent(lower(coalesce(p.name, '') || ' ' || coalesce(p.city, '') || ' ' || coalesce(p.exact_address, ''))),
        unaccent(lower(search_query))
      ) > 0.2
    )
  order by score desc, p.name asc
  limit 10;
$function$
;

grant delete on table "public"."admin_contact_messages" to "anon";

grant insert on table "public"."admin_contact_messages" to "anon";

grant references on table "public"."admin_contact_messages" to "anon";

grant select on table "public"."admin_contact_messages" to "anon";

grant trigger on table "public"."admin_contact_messages" to "anon";

grant truncate on table "public"."admin_contact_messages" to "anon";

grant update on table "public"."admin_contact_messages" to "anon";

grant delete on table "public"."admin_contact_messages" to "authenticated";

grant insert on table "public"."admin_contact_messages" to "authenticated";

grant references on table "public"."admin_contact_messages" to "authenticated";

grant select on table "public"."admin_contact_messages" to "authenticated";

grant trigger on table "public"."admin_contact_messages" to "authenticated";

grant truncate on table "public"."admin_contact_messages" to "authenticated";

grant update on table "public"."admin_contact_messages" to "authenticated";

grant delete on table "public"."admin_contact_messages" to "service_role";

grant insert on table "public"."admin_contact_messages" to "service_role";

grant references on table "public"."admin_contact_messages" to "service_role";

grant select on table "public"."admin_contact_messages" to "service_role";

grant trigger on table "public"."admin_contact_messages" to "service_role";

grant truncate on table "public"."admin_contact_messages" to "service_role";

grant update on table "public"."admin_contact_messages" to "service_role";

grant delete on table "public"."admin_users" to "anon";

grant insert on table "public"."admin_users" to "anon";

grant references on table "public"."admin_users" to "anon";

grant select on table "public"."admin_users" to "anon";

grant trigger on table "public"."admin_users" to "anon";

grant truncate on table "public"."admin_users" to "anon";

grant update on table "public"."admin_users" to "anon";

grant delete on table "public"."admin_users" to "authenticated";

grant insert on table "public"."admin_users" to "authenticated";

grant references on table "public"."admin_users" to "authenticated";

grant select on table "public"."admin_users" to "authenticated";

grant trigger on table "public"."admin_users" to "authenticated";

grant truncate on table "public"."admin_users" to "authenticated";

grant update on table "public"."admin_users" to "authenticated";

grant delete on table "public"."admin_users" to "service_role";

grant insert on table "public"."admin_users" to "service_role";

grant references on table "public"."admin_users" to "service_role";

grant select on table "public"."admin_users" to "service_role";

grant trigger on table "public"."admin_users" to "service_role";

grant truncate on table "public"."admin_users" to "service_role";

grant update on table "public"."admin_users" to "service_role";

grant delete on table "public"."children" to "anon";

grant insert on table "public"."children" to "anon";

grant references on table "public"."children" to "anon";

grant select on table "public"."children" to "anon";

grant trigger on table "public"."children" to "anon";

grant truncate on table "public"."children" to "anon";

grant update on table "public"."children" to "anon";

grant delete on table "public"."children" to "authenticated";

grant insert on table "public"."children" to "authenticated";

grant references on table "public"."children" to "authenticated";

grant select on table "public"."children" to "authenticated";

grant trigger on table "public"."children" to "authenticated";

grant truncate on table "public"."children" to "authenticated";

grant update on table "public"."children" to "authenticated";

grant delete on table "public"."children" to "service_role";

grant insert on table "public"."children" to "service_role";

grant references on table "public"."children" to "service_role";

grant select on table "public"."children" to "service_role";

grant trigger on table "public"."children" to "service_role";

grant truncate on table "public"."children" to "service_role";

grant update on table "public"."children" to "service_role";

grant delete on table "public"."contact_request_trips" to "anon";

grant insert on table "public"."contact_request_trips" to "anon";

grant references on table "public"."contact_request_trips" to "anon";

grant select on table "public"."contact_request_trips" to "anon";

grant trigger on table "public"."contact_request_trips" to "anon";

grant truncate on table "public"."contact_request_trips" to "anon";

grant update on table "public"."contact_request_trips" to "anon";

grant delete on table "public"."contact_request_trips" to "authenticated";

grant insert on table "public"."contact_request_trips" to "authenticated";

grant references on table "public"."contact_request_trips" to "authenticated";

grant select on table "public"."contact_request_trips" to "authenticated";

grant trigger on table "public"."contact_request_trips" to "authenticated";

grant truncate on table "public"."contact_request_trips" to "authenticated";

grant update on table "public"."contact_request_trips" to "authenticated";

grant delete on table "public"."contact_request_trips" to "service_role";

grant insert on table "public"."contact_request_trips" to "service_role";

grant references on table "public"."contact_request_trips" to "service_role";

grant select on table "public"."contact_request_trips" to "service_role";

grant trigger on table "public"."contact_request_trips" to "service_role";

grant truncate on table "public"."contact_request_trips" to "service_role";

grant update on table "public"."contact_request_trips" to "service_role";

grant delete on table "public"."contact_requests" to "anon";

grant insert on table "public"."contact_requests" to "anon";

grant references on table "public"."contact_requests" to "anon";

grant select on table "public"."contact_requests" to "anon";

grant trigger on table "public"."contact_requests" to "anon";

grant truncate on table "public"."contact_requests" to "anon";

grant update on table "public"."contact_requests" to "anon";

grant delete on table "public"."contact_requests" to "authenticated";

grant insert on table "public"."contact_requests" to "authenticated";

grant references on table "public"."contact_requests" to "authenticated";

grant select on table "public"."contact_requests" to "authenticated";

grant trigger on table "public"."contact_requests" to "authenticated";

grant truncate on table "public"."contact_requests" to "authenticated";

grant update on table "public"."contact_requests" to "authenticated";

grant delete on table "public"."contact_requests" to "service_role";

grant insert on table "public"."contact_requests" to "service_role";

grant references on table "public"."contact_requests" to "service_role";

grant select on table "public"."contact_requests" to "service_role";

grant trigger on table "public"."contact_requests" to "service_role";

grant truncate on table "public"."contact_requests" to "service_role";

grant update on table "public"."contact_requests" to "service_role";

grant delete on table "public"."deleted_children_archive" to "anon";

grant insert on table "public"."deleted_children_archive" to "anon";

grant references on table "public"."deleted_children_archive" to "anon";

grant select on table "public"."deleted_children_archive" to "anon";

grant trigger on table "public"."deleted_children_archive" to "anon";

grant truncate on table "public"."deleted_children_archive" to "anon";

grant update on table "public"."deleted_children_archive" to "anon";

grant delete on table "public"."deleted_children_archive" to "authenticated";

grant insert on table "public"."deleted_children_archive" to "authenticated";

grant references on table "public"."deleted_children_archive" to "authenticated";

grant select on table "public"."deleted_children_archive" to "authenticated";

grant trigger on table "public"."deleted_children_archive" to "authenticated";

grant truncate on table "public"."deleted_children_archive" to "authenticated";

grant update on table "public"."deleted_children_archive" to "authenticated";

grant delete on table "public"."deleted_children_archive" to "service_role";

grant insert on table "public"."deleted_children_archive" to "service_role";

grant references on table "public"."deleted_children_archive" to "service_role";

grant select on table "public"."deleted_children_archive" to "service_role";

grant trigger on table "public"."deleted_children_archive" to "service_role";

grant truncate on table "public"."deleted_children_archive" to "service_role";

grant update on table "public"."deleted_children_archive" to "service_role";

grant delete on table "public"."deleted_contact_request_trips_archive" to "anon";

grant insert on table "public"."deleted_contact_request_trips_archive" to "anon";

grant references on table "public"."deleted_contact_request_trips_archive" to "anon";

grant select on table "public"."deleted_contact_request_trips_archive" to "anon";

grant trigger on table "public"."deleted_contact_request_trips_archive" to "anon";

grant truncate on table "public"."deleted_contact_request_trips_archive" to "anon";

grant update on table "public"."deleted_contact_request_trips_archive" to "anon";

grant delete on table "public"."deleted_contact_request_trips_archive" to "authenticated";

grant insert on table "public"."deleted_contact_request_trips_archive" to "authenticated";

grant references on table "public"."deleted_contact_request_trips_archive" to "authenticated";

grant select on table "public"."deleted_contact_request_trips_archive" to "authenticated";

grant trigger on table "public"."deleted_contact_request_trips_archive" to "authenticated";

grant truncate on table "public"."deleted_contact_request_trips_archive" to "authenticated";

grant update on table "public"."deleted_contact_request_trips_archive" to "authenticated";

grant delete on table "public"."deleted_contact_request_trips_archive" to "service_role";

grant insert on table "public"."deleted_contact_request_trips_archive" to "service_role";

grant references on table "public"."deleted_contact_request_trips_archive" to "service_role";

grant select on table "public"."deleted_contact_request_trips_archive" to "service_role";

grant trigger on table "public"."deleted_contact_request_trips_archive" to "service_role";

grant truncate on table "public"."deleted_contact_request_trips_archive" to "service_role";

grant update on table "public"."deleted_contact_request_trips_archive" to "service_role";

grant delete on table "public"."deleted_contact_requests_archive" to "anon";

grant insert on table "public"."deleted_contact_requests_archive" to "anon";

grant references on table "public"."deleted_contact_requests_archive" to "anon";

grant select on table "public"."deleted_contact_requests_archive" to "anon";

grant trigger on table "public"."deleted_contact_requests_archive" to "anon";

grant truncate on table "public"."deleted_contact_requests_archive" to "anon";

grant update on table "public"."deleted_contact_requests_archive" to "anon";

grant delete on table "public"."deleted_contact_requests_archive" to "authenticated";

grant insert on table "public"."deleted_contact_requests_archive" to "authenticated";

grant references on table "public"."deleted_contact_requests_archive" to "authenticated";

grant select on table "public"."deleted_contact_requests_archive" to "authenticated";

grant trigger on table "public"."deleted_contact_requests_archive" to "authenticated";

grant truncate on table "public"."deleted_contact_requests_archive" to "authenticated";

grant update on table "public"."deleted_contact_requests_archive" to "authenticated";

grant delete on table "public"."deleted_contact_requests_archive" to "service_role";

grant insert on table "public"."deleted_contact_requests_archive" to "service_role";

grant references on table "public"."deleted_contact_requests_archive" to "service_role";

grant select on table "public"."deleted_contact_requests_archive" to "service_role";

grant trigger on table "public"."deleted_contact_requests_archive" to "service_role";

grant truncate on table "public"."deleted_contact_requests_archive" to "service_role";

grant update on table "public"."deleted_contact_requests_archive" to "service_role";

grant delete on table "public"."deleted_families_archive" to "anon";

grant insert on table "public"."deleted_families_archive" to "anon";

grant references on table "public"."deleted_families_archive" to "anon";

grant select on table "public"."deleted_families_archive" to "anon";

grant trigger on table "public"."deleted_families_archive" to "anon";

grant truncate on table "public"."deleted_families_archive" to "anon";

grant update on table "public"."deleted_families_archive" to "anon";

grant delete on table "public"."deleted_families_archive" to "authenticated";

grant insert on table "public"."deleted_families_archive" to "authenticated";

grant references on table "public"."deleted_families_archive" to "authenticated";

grant select on table "public"."deleted_families_archive" to "authenticated";

grant trigger on table "public"."deleted_families_archive" to "authenticated";

grant truncate on table "public"."deleted_families_archive" to "authenticated";

grant update on table "public"."deleted_families_archive" to "authenticated";

grant delete on table "public"."deleted_families_archive" to "service_role";

grant insert on table "public"."deleted_families_archive" to "service_role";

grant references on table "public"."deleted_families_archive" to "service_role";

grant select on table "public"."deleted_families_archive" to "service_role";

grant trigger on table "public"."deleted_families_archive" to "service_role";

grant truncate on table "public"."deleted_families_archive" to "service_role";

grant update on table "public"."deleted_families_archive" to "service_role";

grant delete on table "public"."deleted_place_suggestions_archive" to "anon";

grant insert on table "public"."deleted_place_suggestions_archive" to "anon";

grant references on table "public"."deleted_place_suggestions_archive" to "anon";

grant select on table "public"."deleted_place_suggestions_archive" to "anon";

grant trigger on table "public"."deleted_place_suggestions_archive" to "anon";

grant truncate on table "public"."deleted_place_suggestions_archive" to "anon";

grant update on table "public"."deleted_place_suggestions_archive" to "anon";

grant delete on table "public"."deleted_place_suggestions_archive" to "authenticated";

grant insert on table "public"."deleted_place_suggestions_archive" to "authenticated";

grant references on table "public"."deleted_place_suggestions_archive" to "authenticated";

grant select on table "public"."deleted_place_suggestions_archive" to "authenticated";

grant trigger on table "public"."deleted_place_suggestions_archive" to "authenticated";

grant truncate on table "public"."deleted_place_suggestions_archive" to "authenticated";

grant update on table "public"."deleted_place_suggestions_archive" to "authenticated";

grant delete on table "public"."deleted_place_suggestions_archive" to "service_role";

grant insert on table "public"."deleted_place_suggestions_archive" to "service_role";

grant references on table "public"."deleted_place_suggestions_archive" to "service_role";

grant select on table "public"."deleted_place_suggestions_archive" to "service_role";

grant trigger on table "public"."deleted_place_suggestions_archive" to "service_role";

grant truncate on table "public"."deleted_place_suggestions_archive" to "service_role";

grant update on table "public"."deleted_place_suggestions_archive" to "service_role";

grant delete on table "public"."deleted_trips_archive" to "anon";

grant insert on table "public"."deleted_trips_archive" to "anon";

grant references on table "public"."deleted_trips_archive" to "anon";

grant select on table "public"."deleted_trips_archive" to "anon";

grant trigger on table "public"."deleted_trips_archive" to "anon";

grant truncate on table "public"."deleted_trips_archive" to "anon";

grant update on table "public"."deleted_trips_archive" to "anon";

grant delete on table "public"."deleted_trips_archive" to "authenticated";

grant insert on table "public"."deleted_trips_archive" to "authenticated";

grant references on table "public"."deleted_trips_archive" to "authenticated";

grant select on table "public"."deleted_trips_archive" to "authenticated";

grant trigger on table "public"."deleted_trips_archive" to "authenticated";

grant truncate on table "public"."deleted_trips_archive" to "authenticated";

grant update on table "public"."deleted_trips_archive" to "authenticated";

grant delete on table "public"."deleted_trips_archive" to "service_role";

grant insert on table "public"."deleted_trips_archive" to "service_role";

grant references on table "public"."deleted_trips_archive" to "service_role";

grant select on table "public"."deleted_trips_archive" to "service_role";

grant trigger on table "public"."deleted_trips_archive" to "service_role";

grant truncate on table "public"."deleted_trips_archive" to "service_role";

grant update on table "public"."deleted_trips_archive" to "service_role";

grant delete on table "public"."deletion_requests" to "anon";

grant insert on table "public"."deletion_requests" to "anon";

grant references on table "public"."deletion_requests" to "anon";

grant select on table "public"."deletion_requests" to "anon";

grant trigger on table "public"."deletion_requests" to "anon";

grant truncate on table "public"."deletion_requests" to "anon";

grant update on table "public"."deletion_requests" to "anon";

grant delete on table "public"."deletion_requests" to "authenticated";

grant insert on table "public"."deletion_requests" to "authenticated";

grant references on table "public"."deletion_requests" to "authenticated";

grant select on table "public"."deletion_requests" to "authenticated";

grant trigger on table "public"."deletion_requests" to "authenticated";

grant truncate on table "public"."deletion_requests" to "authenticated";

grant update on table "public"."deletion_requests" to "authenticated";

grant delete on table "public"."deletion_requests" to "service_role";

grant insert on table "public"."deletion_requests" to "service_role";

grant references on table "public"."deletion_requests" to "service_role";

grant select on table "public"."deletion_requests" to "service_role";

grant trigger on table "public"."deletion_requests" to "service_role";

grant truncate on table "public"."deletion_requests" to "service_role";

grant update on table "public"."deletion_requests" to "service_role";

grant delete on table "public"."families" to "anon";

grant insert on table "public"."families" to "anon";

grant references on table "public"."families" to "anon";

grant select on table "public"."families" to "anon";

grant trigger on table "public"."families" to "anon";

grant truncate on table "public"."families" to "anon";

grant update on table "public"."families" to "anon";

grant delete on table "public"."families" to "authenticated";

grant insert on table "public"."families" to "authenticated";

grant references on table "public"."families" to "authenticated";

grant select on table "public"."families" to "authenticated";

grant trigger on table "public"."families" to "authenticated";

grant truncate on table "public"."families" to "authenticated";

grant update on table "public"."families" to "authenticated";

grant delete on table "public"."families" to "service_role";

grant insert on table "public"."families" to "service_role";

grant references on table "public"."families" to "service_role";

grant select on table "public"."families" to "service_role";

grant trigger on table "public"."families" to "service_role";

grant truncate on table "public"."families" to "service_role";

grant update on table "public"."families" to "service_role";

grant delete on table "public"."place_suggestions" to "anon";

grant insert on table "public"."place_suggestions" to "anon";

grant references on table "public"."place_suggestions" to "anon";

grant select on table "public"."place_suggestions" to "anon";

grant trigger on table "public"."place_suggestions" to "anon";

grant truncate on table "public"."place_suggestions" to "anon";

grant update on table "public"."place_suggestions" to "anon";

grant delete on table "public"."place_suggestions" to "authenticated";

grant insert on table "public"."place_suggestions" to "authenticated";

grant references on table "public"."place_suggestions" to "authenticated";

grant select on table "public"."place_suggestions" to "authenticated";

grant trigger on table "public"."place_suggestions" to "authenticated";

grant truncate on table "public"."place_suggestions" to "authenticated";

grant update on table "public"."place_suggestions" to "authenticated";

grant delete on table "public"."place_suggestions" to "service_role";

grant insert on table "public"."place_suggestions" to "service_role";

grant references on table "public"."place_suggestions" to "service_role";

grant select on table "public"."place_suggestions" to "service_role";

grant trigger on table "public"."place_suggestions" to "service_role";

grant truncate on table "public"."place_suggestions" to "service_role";

grant update on table "public"."place_suggestions" to "service_role";

grant delete on table "public"."places" to "anon";

grant insert on table "public"."places" to "anon";

grant references on table "public"."places" to "anon";

grant select on table "public"."places" to "anon";

grant trigger on table "public"."places" to "anon";

grant truncate on table "public"."places" to "anon";

grant update on table "public"."places" to "anon";

grant delete on table "public"."places" to "authenticated";

grant insert on table "public"."places" to "authenticated";

grant references on table "public"."places" to "authenticated";

grant select on table "public"."places" to "authenticated";

grant trigger on table "public"."places" to "authenticated";

grant truncate on table "public"."places" to "authenticated";

grant update on table "public"."places" to "authenticated";

grant delete on table "public"."places" to "service_role";

grant insert on table "public"."places" to "service_role";

grant references on table "public"."places" to "service_role";

grant select on table "public"."places" to "service_role";

grant trigger on table "public"."places" to "service_role";

grant truncate on table "public"."places" to "service_role";

grant update on table "public"."places" to "service_role";

grant delete on table "public"."site_events" to "anon";

grant insert on table "public"."site_events" to "anon";

grant references on table "public"."site_events" to "anon";

grant select on table "public"."site_events" to "anon";

grant trigger on table "public"."site_events" to "anon";

grant truncate on table "public"."site_events" to "anon";

grant update on table "public"."site_events" to "anon";

grant delete on table "public"."site_events" to "authenticated";

grant insert on table "public"."site_events" to "authenticated";

grant references on table "public"."site_events" to "authenticated";

grant select on table "public"."site_events" to "authenticated";

grant trigger on table "public"."site_events" to "authenticated";

grant truncate on table "public"."site_events" to "authenticated";

grant update on table "public"."site_events" to "authenticated";

grant delete on table "public"."site_events" to "service_role";

grant insert on table "public"."site_events" to "service_role";

grant references on table "public"."site_events" to "service_role";

grant select on table "public"."site_events" to "service_role";

grant trigger on table "public"."site_events" to "service_role";

grant truncate on table "public"."site_events" to "service_role";

grant update on table "public"."site_events" to "service_role";

grant delete on table "public"."trips" to "anon";

grant insert on table "public"."trips" to "anon";

grant references on table "public"."trips" to "anon";

grant select on table "public"."trips" to "anon";

grant trigger on table "public"."trips" to "anon";

grant truncate on table "public"."trips" to "anon";

grant update on table "public"."trips" to "anon";

grant delete on table "public"."trips" to "authenticated";

grant insert on table "public"."trips" to "authenticated";

grant references on table "public"."trips" to "authenticated";

grant select on table "public"."trips" to "authenticated";

grant trigger on table "public"."trips" to "authenticated";

grant truncate on table "public"."trips" to "authenticated";

grant update on table "public"."trips" to "authenticated";

grant delete on table "public"."trips" to "service_role";

grant insert on table "public"."trips" to "service_role";

grant references on table "public"."trips" to "service_role";

grant select on table "public"."trips" to "service_role";

grant trigger on table "public"."trips" to "service_role";

grant truncate on table "public"."trips" to "service_role";

grant update on table "public"."trips" to "service_role";

grant delete on table "public"."trips_backup_20260319" to "anon";

grant insert on table "public"."trips_backup_20260319" to "anon";

grant references on table "public"."trips_backup_20260319" to "anon";

grant select on table "public"."trips_backup_20260319" to "anon";

grant trigger on table "public"."trips_backup_20260319" to "anon";

grant truncate on table "public"."trips_backup_20260319" to "anon";

grant update on table "public"."trips_backup_20260319" to "anon";

grant delete on table "public"."trips_backup_20260319" to "authenticated";

grant insert on table "public"."trips_backup_20260319" to "authenticated";

grant references on table "public"."trips_backup_20260319" to "authenticated";

grant select on table "public"."trips_backup_20260319" to "authenticated";

grant trigger on table "public"."trips_backup_20260319" to "authenticated";

grant truncate on table "public"."trips_backup_20260319" to "authenticated";

grant update on table "public"."trips_backup_20260319" to "authenticated";

grant delete on table "public"."trips_backup_20260319" to "service_role";

grant insert on table "public"."trips_backup_20260319" to "service_role";

grant references on table "public"."trips_backup_20260319" to "service_role";

grant select on table "public"."trips_backup_20260319" to "service_role";

grant trigger on table "public"."trips_backup_20260319" to "service_role";

grant truncate on table "public"."trips_backup_20260319" to "service_role";

grant update on table "public"."trips_backup_20260319" to "service_role";

grant delete on table "public"."trips_expanded_tmp" to "anon";

grant insert on table "public"."trips_expanded_tmp" to "anon";

grant references on table "public"."trips_expanded_tmp" to "anon";

grant select on table "public"."trips_expanded_tmp" to "anon";

grant trigger on table "public"."trips_expanded_tmp" to "anon";

grant truncate on table "public"."trips_expanded_tmp" to "anon";

grant update on table "public"."trips_expanded_tmp" to "anon";

grant delete on table "public"."trips_expanded_tmp" to "authenticated";

grant insert on table "public"."trips_expanded_tmp" to "authenticated";

grant references on table "public"."trips_expanded_tmp" to "authenticated";

grant select on table "public"."trips_expanded_tmp" to "authenticated";

grant trigger on table "public"."trips_expanded_tmp" to "authenticated";

grant truncate on table "public"."trips_expanded_tmp" to "authenticated";

grant update on table "public"."trips_expanded_tmp" to "authenticated";

grant delete on table "public"."trips_expanded_tmp" to "service_role";

grant insert on table "public"."trips_expanded_tmp" to "service_role";

grant references on table "public"."trips_expanded_tmp" to "service_role";

grant select on table "public"."trips_expanded_tmp" to "service_role";

grant trigger on table "public"."trips_expanded_tmp" to "service_role";

grant truncate on table "public"."trips_expanded_tmp" to "service_role";

grant update on table "public"."trips_expanded_tmp" to "service_role";


  create policy "admin_contact_messages_no_direct_access"
  on "public"."admin_contact_messages"
  as permissive
  for all
  to public
using (false)
with check (false);



  create policy "admin_users_select_own"
  on "public"."admin_users"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "children_delete_own"
  on "public"."children"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.families f
  WHERE ((f.id = children.family_id) AND (f.auth_user_id = auth.uid())))));



  create policy "children_insert_own"
  on "public"."children"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.families f
  WHERE ((f.id = children.family_id) AND (f.auth_user_id = auth.uid())))));



  create policy "children_select_own"
  on "public"."children"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.families f
  WHERE ((f.id = children.family_id) AND (f.auth_user_id = auth.uid())))));



  create policy "children_update_own"
  on "public"."children"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.families f
  WHERE ((f.id = children.family_id) AND (f.auth_user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.families f
  WHERE ((f.id = children.family_id) AND (f.auth_user_id = auth.uid())))));



  create policy "contact_request_trips_select_own_side"
  on "public"."contact_request_trips"
  as permissive
  for select
  to authenticated
using ((contact_request_id IN ( SELECT cr.id
   FROM public.contact_requests cr
  WHERE ((cr.requester_family_id IN ( SELECT families.id
           FROM public.families
          WHERE (families.auth_user_id = auth.uid()))) OR (cr.target_family_id IN ( SELECT families.id
           FROM public.families
          WHERE (families.auth_user_id = auth.uid())))))));



  create policy "contact_requests_select_own_side"
  on "public"."contact_requests"
  as permissive
  for select
  to authenticated
using (((requester_family_id IN ( SELECT families.id
   FROM public.families
  WHERE (families.auth_user_id = auth.uid()))) OR (target_family_id IN ( SELECT families.id
   FROM public.families
  WHERE (families.auth_user_id = auth.uid())))));



  create policy "deleted_children_archive_no_direct_access"
  on "public"."deleted_children_archive"
  as permissive
  for all
  to public
using (false)
with check (false);



  create policy "deleted_contact_request_trips_archive_no_direct_access"
  on "public"."deleted_contact_request_trips_archive"
  as permissive
  for all
  to public
using (false)
with check (false);



  create policy "deleted_contact_requests_archive_no_direct_access"
  on "public"."deleted_contact_requests_archive"
  as permissive
  for all
  to public
using (false)
with check (false);



  create policy "deleted_families_archive_no_direct_access"
  on "public"."deleted_families_archive"
  as permissive
  for all
  to public
using (false)
with check (false);



  create policy "deleted_place_suggestions_archive_no_direct_access"
  on "public"."deleted_place_suggestions_archive"
  as permissive
  for all
  to public
using (false)
with check (false);



  create policy "deleted_trips_archive_no_direct_access"
  on "public"."deleted_trips_archive"
  as permissive
  for all
  to public
using (false)
with check (false);



  create policy "deletion_requests_no_direct_access"
  on "public"."deletion_requests"
  as permissive
  for all
  to public
using (false)
with check (false);



  create policy "family_insert_own"
  on "public"."families"
  as permissive
  for insert
  to public
with check ((auth.uid() = auth_user_id));



  create policy "family_select_own"
  on "public"."families"
  as permissive
  for select
  to public
using ((auth.uid() = auth_user_id));



  create policy "family_update_own"
  on "public"."families"
  as permissive
  for update
  to public
using ((auth.uid() = auth_user_id))
with check ((auth.uid() = auth_user_id));



  create policy "place_suggestions_insert_own"
  on "public"."place_suggestions"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.families f
  WHERE ((f.id = place_suggestions.family_id) AND (f.auth_user_id = auth.uid())))));



  create policy "place_suggestions_select_authenticated"
  on "public"."place_suggestions"
  as permissive
  for select
  to authenticated
using ((status = ANY (ARRAY['pending'::text, 'approved_new_place'::text, 'mapped_to_existing_place'::text])));



  create policy "places_select_all_authenticated"
  on "public"."places"
  as permissive
  for select
  to authenticated
using ((is_active = true));



  create policy "trips_delete_own"
  on "public"."trips"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.families f
  WHERE ((f.id = trips.family_id) AND (f.auth_user_id = auth.uid())))));



  create policy "trips_insert_own"
  on "public"."trips"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.families f
  WHERE ((f.id = trips.family_id) AND (f.auth_user_id = auth.uid())))));



  create policy "trips_select_own"
  on "public"."trips"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.families f
  WHERE ((f.id = trips.family_id) AND (f.auth_user_id = auth.uid())))));



  create policy "trips_update_own"
  on "public"."trips"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.families f
  WHERE ((f.id = trips.family_id) AND (f.auth_user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.families f
  WHERE ((f.id = trips.family_id) AND (f.auth_user_id = auth.uid())))));


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


