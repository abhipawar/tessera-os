create type "public"."user_role" as enum ('admin', 'tenant');


  create table "public"."profiles" (
    "id" uuid not null,
    "email" text not null,
    "role" public.user_role not null default 'tenant'::public.user_role,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."profiles" enable row level security;

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'tenant');
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.protect_role_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Privilege Escalation Blocked: You cannot modify your own role.';
    END IF;
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";


  create policy "Users can view own profile"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() = id));


CREATE TRIGGER enforce_role_protection BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_role_column();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


