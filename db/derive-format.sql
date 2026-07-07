-- Resolve talebrary_gamelinks.format from the actual story filename when
-- IFDB tagged it generically (storyfile/*) or as an ADRIFT version variant.
-- Also sets the extension list so the playable filter's extension match passes
-- for bare links (generic links carry no extension metadata from IFDB).
-- Shared by sync.sql (.read) and applied standalone after a rebuild.
-- name = the archive's inner story file if present, else the URL itself.
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
END,
extension = CASE
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.zblorb' OR lower(coalesce(nullif(primary_file,''), url)) LIKE '%.zlb'  THEN '.zblorb .zlb'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.gblorb' OR lower(coalesce(nullif(primary_file,''), url)) LIKE '%.blb'  THEN '.gblorb .blb'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.ulx'    THEN '.ulx'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.z3' OR lower(coalesce(nullif(primary_file,''), url)) LIKE '%.z4' OR lower(coalesce(nullif(primary_file,''), url)) LIKE '%.z5' OR lower(coalesce(nullif(primary_file,''), url)) LIKE '%.z7' OR lower(coalesce(nullif(primary_file,''), url)) LIKE '%.z8'  THEN '.z3 .z4 .z5 .z6 .z7 .z8'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.taf'    THEN '.taf'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.gam'    THEN '.gam'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.t3'     THEN '.t3'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.hex'    THEN '.hex'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.agx'    THEN '.agx'
    WHEN lower(coalesce(nullif(primary_file,''), url)) LIKE '%.acd' OR lower(coalesce(nullif(primary_file,''), url)) LIKE '%.a3c'  THEN '.acd .a3c'
    ELSE extension
END;
