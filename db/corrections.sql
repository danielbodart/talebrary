-- Manual data corrections, replayed on every rebuild.
--
-- IFDB owns talebrary_gamelinks: sync.sql does a full DELETE + re-INSERT of
-- that table from the IFDB dump (step 4). Any hand-fix to a URL there is
-- therefore wiped on the next `./db/run sync`. This file re-applies those
-- fixes AFTER sync.sql, so corrections survive rebuilds and stay recorded.
--
-- Story/cover-art fetches route through BucketCachingHandler, which copies
-- the fetched bytes into R2 keyed on the request path. So a corrected URL
-- just needs to point at any live copy of the file; first request caches it.
--
-- Convention: one block per correction — date, why, source verified.

-- 2026-07-06: "Eggstraordinary Adventure" (zugc8pqfu64ozeht)
-- Author site (genericgeekgirl.com, now GitHub Pages) removed the .zblorb:
-- http:// 301s to https:// which 404s. IFDB lists only that dead URL; no IF
-- Archive mirror exists. Point at the Internet Archive Wayback capture
-- (2017-03-19, verified 200, 293528-byte Blorb, FORM/IFRS magic).
UPDATE talebrary_gamelinks
SET url = 'https://web.archive.org/web/20170319212947id_/http://genericgeekgirl.com/games/eggstraordinary-adventure/Eggstraordinary%20Adventure.zblorb'
WHERE game_id = 'zugc8pqfu64ozeht'
  AND url = 'http://genericgeekgirl.com/games/eggstraordinary-adventure/Eggstraordinary%20Adventure.zblorb';


-- 2026-07-06: bulk dead-link remediation (58 playable stories).
-- Each fix verified 200 + real story magic bytes.
-- UPDATE: repoint the dead URL to a live copy (Wayback capture, or https-flip
--   where the host refused http). DELETE: the dead row's game already has a
--   live playable sibling link in the DB, so drop the dead row and the sibling
--   (ifarchive canonical etc) becomes get()'s pick.
-- Sources: 53 URL-repoint, 5 sibling (DELETE dead row).

-- Empty Rooms — Kevin Lovegreen [wayback]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20110409233433id_/http://dl.dropbox.com/u/3168842/INFORM/Emptyrooms/Empty%20rooms.zblorb'
  WHERE game_id = '1cxkfxqeyxxxfr' AND url = 'http://dl.dropbox.com/u/3168842/INFORM/Emptyrooms/Empty%20rooms.zblorb';
-- Redención Momificada — Godokoro [wayback]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20230131095036id_/http://www.caad.es/sites/default/files/descargas/Juegos/Glulx/RedencionMomificada-5.z5'
  WHERE game_id = '2juuzoc0bz47k3lb' AND url = 'http://www.caad.es/sites/default/files/descargas/Juegos/Glulx/RedencionMomificada-5.z5';
-- Let Us Burn Down Science — Mike Martens [wayback]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20130510232220id_/http://www.brandonblatcher.com/meficommunity/metafict/stories/BurnDownScience.zblorb'
  WHERE game_id = '1n36d1snrr6p64xo' AND url = 'http://www.brandonblatcher.com/meficommunity/metafict/stories/BurnDownScience.zblorb';
-- The Whispered World — Daedalic Entertainment [wayback]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20130512072756id_/http://www.daedalic.de/tww/april/twwonline.z5'
  WHERE game_id = '2n17ziwqidyz5mn8' AND url = 'http://www.daedalic.de/tww/april/twwonline.z5';
-- Spring Cleaning — Roger Carbol [wayback]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20090710000158id_/http://roger.carbol.com/int-fiction/Spring_Cleaning/Spring%20Cleaning.zblorb'
  WHERE game_id = '13saf297yzgx9byz' AND url = 'http://roger.carbol.com/int-fiction/Spring_Cleaning/Spring%20Cleaning.zblorb';
-- Monster Maker — Adri ("Erin Gigglecreek") [wayback]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20170319024340id_/http://genericgeekgirl.com/games/monster-maker/monster-maker.z8'
  WHERE game_id = '2s5t0432kt1llzz9' AND url = 'http://genericgeekgirl.com/games/monster-maker/monster-maker.z8';
-- Casi Muerto — Juan Antonio Paz Salgado [wayback]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20221213184613id_/http://www.caad.es/sites/default/files/descargas/Juegos/Maquina-Z/casi.z5'
  WHERE game_id = '5wq7700gnnvonbzb' AND url = 'http://www.caad.es/sites/default/files/descargas/Juegos/Maquina-Z/casi.z5';
-- Cramming — Chuck Bartholomew [wayback]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20130511083943id_/http://www.chuckbartholomew.com/file_download/5/Cramming.z8'
  WHERE game_id = '1dfuvc0yr2hgs43' AND url = 'http://www.chuckbartholomew.com/file_download/5/Cramming.z8';
-- The Paper Bag Princess — Adri [wayback]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20210419015436id_/http://genericgeekgirl.com/games/paper-bag-princess/The%20Paper%20Bag%20Princess.z8'
  WHERE game_id = '4hxafaltfdegrx2x' AND url = 'http://genericgeekgirl.com/games/paper-bag-princess/The%20Paper%20Bag%20Princess.z8';
-- The Hugo Clock — Jason McWright [sibling]
DELETE FROM talebrary_gamelinks
  WHERE game_id = '8iw44v7wzo90wumh' AND url = 'http://www.joltcountry.com/downloads/HugoComp/clock.hex';  -- live sibling: http://ifarchive.org/if-archive/games/hugo/clock.hex
-- Spinning — Rob O'Hara [wayback]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20250417020550id_/https://www.joltcountry.com/downloads/HugoComp/spinning.hex'
  WHERE game_id = '7ajjwkqi54wcb1u' AND url = 'https://www.joltcountry.com/downloads/HugoComp/spinning.hex';
-- Apocolyptica — Jake Wildstrom [wayback]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20130511102430id_/http://www.crochetgeek.net/IF/apoc.z5'
  WHERE game_id = '7c7iuhyg0mb49gs0' AND url = 'http://www.crochetgeek.net/IF/apoc.z5';
-- Orfeo en los Infiernos — Javier Carrascosa [wayback]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20221213202121id_/http://www.caad.es/sites/default/files/descargas/Juegos/Glulx/Orfeoenlosinfiernos.blb'
  WHERE game_id = '9hs4k1kiqfsudi0f' AND url = 'http://www.caad.es/sites/default/files/descargas/Juegos/Glulx/Orfeoenlosinfiernos.blb';
-- Apollo 11 — Brooke Heinichen [sibling]
DELETE FROM talebrary_gamelinks
  WHERE game_id = '83ct0elfhzeqfuwl' AND url = 'http://www.historicalsimulations.net/inform/studentsims/Apollo%2011.zblorb';  -- live sibling: https://web.archive.org/web/20090417032443/http://www.historicalsimulations.net/inform/studentsims/Apollo%2011.zblorb
-- Color the Truth — mathbrush [sibling]
DELETE FROM talebrary_gamelinks
  WHERE game_id = 'a746d3agtfizlx0x' AND url = 'http://www.ifarchive.org/if-archive/games/glulx/Color_the_Truth.gblorb';  -- live sibling: http://ifarchive.org/if-archive/games/competition2016/Color%20the%20Truth/Color%20the%20Truth.gblorb
-- The Gay Science — Capricorn van Knapp [wayback]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20240513075843id_/https://rcveeder.net/expo/event1/capricornvanknapp1/capricornvanknapp1.gblorb'
  WHERE game_id = '49l2xkz5rqro6x12' AND url = 'https://rcveeder.net/expo/event1/capricornvanknapp1/capricornvanknapp1.gblorb';
-- Phantom of the Arcade — Susan Arendt, John Moulton, an [wayback]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20181201214008id_/http://static.escapistmagazine.com/media/global/misc/inform/Phantom.z8'
  WHERE game_id = '7ylhba37cfbks70' AND url = 'http://static.escapistmagazine.com/media/global/misc/inform/Phantom.z8';
-- You Have To BURN ROPE WITH TORCH — Michael Cook [wayback]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20090710060453id_/http://www.effseven.co.uk/rope/You%20Have%20To%20Burn%20The%20Rope.ulx'
  WHERE game_id = '8bdnbe9hbryftlwd' AND url = 'http://www.effseven.co.uk/rope/You%20Have%20To%20Burn%20The%20Rope.ulx';
-- Rockrider — David Mear [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20130511072353id_/http://www.brandonblatcher.com/meficommunity/metafict/stories/Rockrider.zblorb'
  WHERE game_id = '91pic47tqqqf79w' AND url = 'http://www.brandonblatcher.com/meficommunity/metafict/stories/Rockrider.zblorb';
-- Caduceus — Sarah Willson (as Mala Costrac [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20240513080142id_/https://rcveeder.net/expo/event1/malacostraca1/malacostraca1.gblorb'
  WHERE game_id = '5z1avk9srfvgme1s' AND url = 'https://rcveeder.net/expo/event1/malacostraca1/malacostraca1.gblorb';
-- Alien Extraction — Michael Rubino, Karissa Kilgor [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20240503233319id_/https://blogs.setonhill.edu/DennisJerz/EL405/Elian.z5'
  WHERE game_id = '6secl4dir11omn4b' AND url = 'http://blogs.setonhill.edu/DennisJerz/EL405/Elian.z5';
-- The Little Match Girl, by Hans Christian Andersen — Ryan Veeder [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20240513134008id_/https://rcveeder.net/matchgirl/The%20Little%20Match%20Girl.gblorb'
  WHERE game_id = 'ahy26o7rp6nqp6ve' AND url = 'https://rcveeder.net/matchgirl/The%20Little%20Match%20Girl.gblorb';
-- Fingertips: Please Pass the Milk Please — Adri [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20220120103514id_/http://genericgeekgirl.com/games/please-pass-the-milk-please/Fingertips%20-%20Please%20Pass%20the%20Milk%20Please.z8'
  WHERE game_id = 'bl5mt8ug8i6uquh3' AND url = 'http://genericgeekgirl.com/games/please-pass-the-milk-please//Fingertips%20-%20Please%20Pass%20the%20Milk%20Please.z8';
-- A Fly On the Wall — Nigel Jayne [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20200715200812id_/http://www.nigeljayne.ca/AFOTW.gblorb'
  WHERE game_id = 'b853fqjlwgmpwrce' AND url = 'https://www.nigeljayne.ca/AFOTW.gblorb';
-- An Informal Time — Anonymous [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20130510214025id_/http://matthewja.webs.com/An%20Informal%20Time.zblorb'
  WHERE game_id = '5gsim8smp5snvb09' AND url = 'http://matthewja.webs.com/An%20Informal%20Time.zblorb';
-- Supermarket Robbery — Mister Nose [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20100109232716id_/http://s2.webstarts.com/ZMachineTaro/uploads/Supermarket_Robbery_Last.z5'
  WHERE game_id = 'ddfjdi6lceupgcn' AND url = 'http://s2.webstarts.com/ZMachineTaro/uploads/Supermarket_Robbery_Last.z5';
-- Hotel Tutorial — Leandro Ribeiro [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20140926035753id_/http://www.ifarchive.org/if-archive/games/zcode/TutorialHotel.zblorb'
  WHERE game_id = 'fpg8obr5lzenkpu1' AND url = 'http://www.ifarchive.org/if-archive/games/zcode/TutorialHotel.zblorb';
-- Party Arty, Man of La Munchies — Jonathan Blask [sibling]
DELETE FROM talebrary_gamelinks
  WHERE game_id = 'ht6lb6z7qnklrv4q' AND url = 'http://www.joltcountry.com/downloads/HugoComp/party.hex';  -- live sibling: http://www.ifarchive.org/if-archive/games/hugo/party.hex
-- Le Temple Nâga — Nathanaël Marion [sibling]
DELETE FROM talebrary_gamelinks
  WHERE game_id = 'm5fagfysu668zfnq' AND url = 'http://ulukos.com/wp-content/uploads/2013/02/Le-Temple-naga.zblorb';  -- live sibling: http://ifiction.free.fr/jeux/templenaga/templenaga.z5
-- The Little Match Girl 3: The Escalus Manifold — Ryan Veeder [rescue-https]
UPDATE talebrary_gamelinks SET url = 'https://rcveeder.net/littlematchgirl/finland/The%20Little%20Match%20Girl%203.gblorb'
  WHERE game_id = 'n1958wool1gqepb' AND url = 'http://rcveeder.net/littlematchgirl/finland/The%20Little%20Match%20Girl%203.gblorb';
-- The Little Match Girl 2: Annus Evertens — Ryan Veeder [rescue-https]
UPDATE talebrary_gamelinks SET url = 'https://rcveeder.net/littlematchgirl/celavizze/The%20Little%20Match%20Girl%202.gblorb'
  WHERE game_id = 'p2lenxwzh2dbgy9m' AND url = 'http://rcveeder.net/littlematchgirl/celavizze/The%20Little%20Match%20Girl%202.gblorb';
-- When the Land Goes Under the Water — Bruno Dias (as Nikephoros De K [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20150522024516id_/http://www.nigeljayne.ca:80/scd2downloads/When%20the%20Land%20Goes%20Under%20the%20Wa.gblorb'
  WHERE game_id = 'v5axn7tkg52m9g1a' AND url = 'http://www.nigeljayne.ca/scd2downloads/When%20the%20Land%20Goes%20Under%20the%20Wa.gblorb';
-- Phantom of the Arcade 2: Shadows, Darkness, and Dread — Susan Arendt, John Moulton [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20211204190204id_/http://static.escapistmagazine.com/media/global/misc/inform/POTA2.z8'
  WHERE game_id = 'vgtc3lf4bqap9oym' AND url = 'http://static.escapistmagazine.com/media/global/misc/inform/POTA2.z8';
-- Kii!Wii! — Adri [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20211129024000id_/http://genericgeekgirl.com/games/kiiwii/kiiwii.z5'
  WHERE game_id = 'vyhpiu9vlxf64nn0' AND url = 'http://genericgeekgirl.com/games/kiiwii/kiiwii.z5';
-- How the Little Match Girl Got Her Colt Paterson Revolver, an — Ryan Veeder [rescue-https]
UPDATE talebrary_gamelinks SET url = 'https://rcveeder.net/littlematchgirl/paterson/How%20the%20Little%20Match%20Girl%20Got%20H.gblorb'
  WHERE game_id = 'voxabj5jxaq9qqmw' AND url = 'http://rcveeder.net/littlematchgirl/paterson/How%20the%20Little%20Match%20Girl%20Got%20H.gblorb';
-- The Quidditch Final of 1954 — Joseph Miller [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20130511092445id_/http://irapt.org/jmillz/r6_The%20Quidditch%20Final%20of%201954.zblorb'
  WHERE game_id = 'vwomwgu95qrqntac' AND url = 'http://irapt.org/jmillz/r6_The%20Quidditch%20Final%20of%201954.zblorb';
-- THE EXIGENT SEASONS — Jason Love [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20241127231436id_/https://www.ifarchive.org/if-archive/games/glulx/The_Exigent_Seasons.gblorb'
  WHERE game_id = 'x5ueu1q2uryz2x4w' AND url = 'http://www.ifarchive.org/if-archive/games/glulx/The_Exigent_Seasons.gblorb';
-- World Builder — Paul Lee [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20250417020646id_/https://www.joltcountry.com/downloads/HugoComp/worldbuilder.hex'
  WHERE game_id = 'yq9cjco9088howgp' AND url = 'http://www.joltcountry.com/downloads/HugoComp/worldbuilder.hex';
-- La Pequeña Cerillera — J. Francisco Martín [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20221213191150id_/http://www.caad.es/sites/default/files/descargas/Juegos/Maquina-Z/cerillera.z5'
  WHERE game_id = 'y5wn1icbseie71ct' AND url = 'http://www.caad.es/sites/default/files/descargas/Juegos/Maquina-Z/cerillera.z5';
-- The Cavern of the Morlocks/La caverne des Morlocks — François Coulon [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20220118072544id_/http://auraes.free.fr/tmp/la_caverne_des_morlocks.z5'
  WHERE game_id = 'yern8xmey2e5dcwj' AND url = 'http://auraes.free.fr/tmp/la_caverne_des_morlocks.z5';
-- Once upon a winter night, the ragman came singing under your — Expio [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20201030023343id_/https://v6p9d9t4.ssl.hwcdn.net/html/1745423/Once%20upon%20a%20winter%20night,%20the%20r.zblorb'
  WHERE game_id = 'xe5kgu2835eyak8' AND url = 'https://v6p9d9t4.ssl.hwcdn.net/html/1745423/Once%20upon%20a%20winter%20night,%20the%20r.zblorb';
-- 43 — Jack Welch [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20250119190422id_/http://templaro.com/games/43.z5'
  WHERE game_id = 'yam36bzdijywxok9' AND url = 'http://templaro.com/games/43.z5';
-- The Bony King of Nowhere — Luke A. Jones [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20250928091331id_/https://media.textadventures.co.uk/games/uwovSJ_3DEuGpPKRETJPiQ/bonyking-release8-informport/The%20Bony%20King%20of%20Nowhere.gblorb'
  WHERE game_id = 'ymezzicbqtryc34j' AND url = 'http://media.textadventures.co.uk/games/uwovSJ_3DEuGpPKRETJPiQ/bonyking-release8-informport/The%20Bony%20King%20of%20Nowhere.gblorb';
-- Comrade — Roger Carbol (as Urist Uristso [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20150522024446id_/http://www.nigeljayne.ca:80/scd2downloads/Comrade.gblorb'
  WHERE game_id = 'xljv83chcql6ck' AND url = 'http://www.nigeljayne.ca/scd2downloads/Comrade.gblorb';
-- Samurai Tea Room — Ricardo Signes [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20250925191317id_/https://rjbs.manxome.org/writing/if/samurai/samurai.z5'
  WHERE game_id = 'yal7mklv8lc4cglc' AND url = 'http://rjbs.manxome.org/writing/if/samurai/samurai.z5';
-- Eric's Bender — uncleozzy [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20130511072332id_/http://www.brandonblatcher.com/meficommunity/metafict/stories/EricsBender.zblorb'
  WHERE game_id = 'wv5ua3x6b9du3mzp' AND url = 'http://www.brandonblatcher.com/meficommunity/metafict/stories/EricsBender.zblorb';
-- Hippo on Elm Street — Adri ("Erin Gigglecreek") [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20161010012308id_/http://genericgeekgirl.com:80/games/hippo-on-elm-street/hippo-on-elm-street.z8'
  WHERE game_id = 'zjlhfdjjb3dmhij' AND url = 'http://genericgeekgirl.com/games/hippo-on-elm-street/hippo-on-elm-street.z8';
-- The Nemean Lion — Anonymous [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20110107082627id_/http://adamcadre.ac:80/temp/lion.z5'
  WHERE game_id = 'z69xitgxqpj96jwx' AND url = 'http://adamcadre.ac/temp/lion.z5';
-- Down with the Underpig — R Monty [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20130511072327id_/http://www.brandonblatcher.com/meficommunity/metafict/stories/underpig.z5'
  WHERE game_id = 'zgv52ny1u1ufu86f' AND url = 'http://www.brandonblatcher.com/meficommunity/metafict/stories/underpig.z5';
-- Captain Cumshot's Second Adventure: The Rim Job — Jake Wildstrom [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20210507221325id_/http://crochetgeek.net/IF/hentai2.zblorb'
  WHERE game_id = 'zkpn8rw1sr6hhy5i' AND url = 'http://www.crochetgeek.net/IF/hentai2.zblorb';
-- It Is Your Responsibility — Tom McLean [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20150915044444id_/http://frezned.com/responsibility/It%20Is%20Your%20Responsibility.gblorb'
  WHERE game_id = 'ma18zfc2slr86nvl' AND url = 'http://frezned.com/responsibility/It%20Is%20Your%20Responsibility.gblorb';
-- The Lighthouse — Marius Müller [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20250125125829id_/https://dist.saugus.net/IF/Lighthouse.z8'
  WHERE game_id = '1mspez4pljruogux' AND url = 'http://dist.saugus.net/IF/Lighthouse.z8';
-- Awakening — Pete Gardner [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20240509025921id_/https://dist.saugus.net/IF/Awakening.z8'
  WHERE game_id = '7w4byew43sgkwj2' AND url = 'http://dist.saugus.net/IF/Awakening.z8';
-- Below the First Parish Cemetery — Eric W. Brown [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20240510183744id_/https://www.saugus.net/Contests/Halloween/2003/IF/FirstParishCemetery.z5'
  WHERE game_id = 'fw41ixm13p3wl20u' AND url = 'http://www.saugus.net/Contests/Halloween/2003/IF/FirstParishCemetery.z5';
-- Late Night in the Saugus Public Library — Eric W. Brown [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20240510183557id_/https://www.saugus.net/Contests/Halloween/2002/IF/SaugusLibrary.z5'
  WHERE game_id = 'j1l6trv70ny9bgrh' AND url = 'http://www.saugus.net/Contests/Halloween/2002/IF/SaugusLibrary.z5';
-- The Gateway of the Ferrets — Feneric [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20250417043720id_/https://games.saugus.net/GatewayOfTheFerrets/Gateway%20of%20the%20Ferrets.gblorb'
  WHERE game_id = 'l2hqc5pozy26cwn' AND url = 'https://games.saugus.net/GatewayOfTheFerrets/Gateway%20of%20the%20Ferrets.gblorb';
-- Pirates of the Caribou — Jeremy Thurgood [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20190720020546id_/http://www.jerith.za.net/files/if/Pirates%20of%20the%20Caribou.zblorb'
  WHERE game_id = 'rj1q360xkyejqemx' AND url = 'http://www.jerith.za.net/files/if/Pirates%20of%20the%20Caribou.zblorb';
-- Lieux Communs — FibreTigre, Samuel Verschelde, [wayback-repass]
UPDATE talebrary_gamelinks SET url = 'https://web.archive.org/web/20240511065508id_/https://download.tuxfamily.org/informfr/lieuxcommuns/lieuxcommuns.blb'
  WHERE game_id = 'utd2or64zwqfaa7' AND url = 'https://download.tuxfamily.org/informfr/lieuxcommuns/lieuxcommuns.blb';
