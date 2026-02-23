-- Remove the ability for standard authenticated users to update the role column
REVOKE UPDATE (role) ON public.profiles FROM authenticated;