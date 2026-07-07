-- Resolve talebrary_gamelinks.format from the actual story filename when
-- IFDB tagged it generically (storyfile/*) or as an ADRIFT version variant.
-- Shared by sync.sql (.read) and applied standalone after a rebuild.
UPDATE talebrary_gamelinks
SET format = CASE
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.zblorb' OR lower(coalesce(nullif(primary_file,''), url)) LIKE '%.zlb'  THEN 'blorb/zcode'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.gblorb' OR lower(coalesce(nullif(primary_file,''), url)) LIKE '%.blb'  THEN 'blorb/glulx'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.ulx'    THEN 'glulx'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.z3' OR lower(coalesce(nullif(primary_file,''), url)) LIKE '%.z4' OR lower(coalesce(nullif(primary_file,''), url)) LIKE '%.z5' OR lower(coalesce(nullif(primary_file,''), url)) LIKE '%.z7' OR lower(coalesce(nullif(primary_file,''), url)) LIKE '%.z8'  THEN 'zcode'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.taf'    THEN 'adrift'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.gam'    THEN 'tads2'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.t3'     THEN 'tads3'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.hex'    THEN 'hugo'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.agx'    THEN 'agt'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.acd' OR lower(coalesce(nullif(primary_file,''), url)) LIKE '%.a3c'  THEN 'alan3'
    ELSE format
END
WHERE format NOT IN ('zcode','blorb/zcode','glulx','blorb/glulx','hugo','adrift','alan2','alan3','agt','advsys','tads2','tads3');