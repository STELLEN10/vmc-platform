-- Assign a bike to a driver securely
create or replace function public.assign_bike_to_driver(p_driver_profile_id uuid, p_bike_id uuid)
returns void
language plpgsql security definer
as $$
declare
  v_driver_id uuid;
  v_assigned_by uuid;
begin
  -- Only management can assign bikes
  if not public.is_management() then
    raise exception 'Unauthorized';
  end if;

  v_assigned_by := auth.uid();

  -- Get driver ID
  select id into v_driver_id from public.drivers where profile_id = p_driver_profile_id;
  if v_driver_id is null then
    raise exception 'Driver record not found';
  end if;

  -- Ensure bike is available
  if exists (select 1 from public.bikes where id = p_bike_id and status <> 'available') then
    raise exception 'Bike is not available';
  end if;

  -- Create assignment
  insert into public.bike_assignments (bike_id, driver_id, status, assigned_by)
  values (p_bike_id, v_driver_id, 'assigned', v_assigned_by);

  -- Update driver and bike
  update public.drivers set bike_id = p_bike_id where id = v_driver_id;
  update public.bikes set status = 'assigned' where id = p_bike_id;
end;
$$;

create or replace function public.unassign_bike_from_driver(p_driver_profile_id uuid)
returns void
language plpgsql security definer
as $$
declare
  v_driver_id uuid;
  v_bike_id uuid;
begin
  -- Only management can unassign bikes
  if not public.is_management() then
    raise exception 'Unauthorized';
  end if;

  select id, bike_id into v_driver_id, v_bike_id from public.drivers where profile_id = p_driver_profile_id;
  if v_driver_id is null or v_bike_id is null then
    raise exception 'Driver or assigned bike not found';
  end if;

  -- End assignment
  update public.bike_assignments
  set status = 'ended', ended_at = current_date
  where driver_id = v_driver_id and status = 'assigned';

  -- Update driver and bike
  update public.drivers set bike_id = null where id = v_driver_id;
  update public.bikes set status = 'available' where id = v_bike_id;
end;
$$;
