ALTER TABLE incidents
ADD COLUMN analysis_source TEXT CHECK (
  analysis_source IS NULL OR analysis_source IN ('workers_ai', 'fallback')
);
