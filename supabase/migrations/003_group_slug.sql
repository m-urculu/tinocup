-- Add slug column to groups for human-readable URLs
alter table groups add column slug text unique;

-- Backfill existing group
update groups set slug = 'tinocup' where id = '00000000-0000-0000-0000-000000000001';

-- Make slug required for future inserts
alter table groups alter column slug set not null;
