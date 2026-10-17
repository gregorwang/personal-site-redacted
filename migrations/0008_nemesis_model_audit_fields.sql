ALTER TABLE nemesis_guard_events ADD COLUMN model_provider TEXT;
ALTER TABLE nemesis_guard_events ADD COLUMN model_route TEXT;
ALTER TABLE nemesis_guard_events ADD COLUMN model_name TEXT;
ALTER TABLE nemesis_guard_events ADD COLUMN query_type TEXT;
ALTER TABLE nemesis_guard_events ADD COLUMN query_router_confidence REAL;
ALTER TABLE nemesis_guard_events ADD COLUMN fallback_used INTEGER;
ALTER TABLE nemesis_guard_events ADD COLUMN fallback_chain TEXT;

