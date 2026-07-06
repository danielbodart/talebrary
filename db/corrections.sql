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

-- 2026-07-07: archive verify-sweep — disable archive-only games that do not
-- serve a correct single story. Of 1290 archive-linked games: 386 kept
-- (unique archive, extractable); disabled 904 — {"no-story":384,"shared-bundle":451,"not-archive":9,"fetch-fail":60}.
-- shared-bundle = one comp zip shared by many games (cannot disambiguate the
-- specific story from format alone); no-story = archive has no matching story;
-- fetch-fail = dead archive URL; not-archive = URL is not a real archive.
-- Recoverable later via title->member matching inside comp bundles.
UPDATE talebrary_games SET enabled=0 WHERE id IN ('0iyne3m23v5hdcx7','01x9vn9a3qpcz07e','02npov4c6gxghlyu','0gsf65fa0ox4838v','0ao3c7j1rtzsnce6','0jjaahodbd7k8ooc','0lovvsnqq4z7na5j','08cvrv46idil7fth','0mk8nwinte1t02r7','127a6woj3qf2k1fr','0tp5l9ea9zadeyub','14bs7ru8t0r4d60j','1abt2lr5s834iwky','13k4dtxnuksufg8h','1bw4vfchmpztmb7t','1aliwzro4e48mdlt','19fe0wt0mfyz6hez','1f34jxoy8kbwdhdf','1ay55mbn5iasy5h3','1fl6ni6b8yucamm0','1n277q8255ckj5xz','1n36d1snrr6p64xo','1pasgsrjiit7fcid','180nvhpys63a6l3d','1ugd7bxtrg2457y1','1y379i24mnbvgft','1jkbbgyvk7gyg0v','1yog2s0zb1il24gi','1r7zi13bit9wc15','1zsxds2vm1vqg20a','1985kxxeze4f2r77','1yfr1be87z9wqez','211ygg1zxd598c07','23412ve392nz3zpf','25kq81lxm8iefgjg','271fmvmfdomv79ei','20ze7zlh96ge87dr','2ad9ic3dzn0hrxa1','2fl14wjyoar8n1p4','2gh8bselanlyh6g','2gtmtipbp4ubygtr','2j4y45dbfdqvfru7','2l8rc0c5ncu3ddeg','2maagiwhao4ony8p','2mbhpd08j9hjtkfh','2n6vrsmrn310mucc','2o4zo6m9yawgrmk0','2oyji57hfl4brqvc','2izj2y1jraoyzqev','2qq2xdnq8rrz59zx','2rm73rof6whfmy6','2sccnsskwtu3jn68','1mn18bh1s38tw9bp','2ungxx2lyy5sob4g','2pdvzl4wlmq14gq7','2vckwrsfqe6n5b8c','2xromutmokvujyiw','2xly3ppsqa7khom','31vomc2704khkqb','322cyez8rtuisx2v','2drqudrt67exut8d','327b20emhqc097qj','333or4311dyxpdgs','34cibr58tb5g4ulc','35lhw7heoug2z2xn','36js02hgz2yk10to','381xbl4vr2tlyukg','382pj7ce9z1hr84j','39aonvkrzc0kmie2','39wyzsxaba5yeybi','3a2hle932ml26m1','3axzc1llbtu5rqit','3ayn54ep27rhf8xs','3d4jyitc5a5l5i3m','3dffyc96swn7hjgo','14bcaej7pniv1z1','1e4xk2vgfjmh57h4','1f9c9h40j1d8x4h','1lxrhw9107rt6oiz','3ik7zphktc3cz0vk','3jvvc6bicf3tvs04','3kb9mycmr3h4ztsk','3khux34zggxkenqa','3lz1s53eij17fi11','1u0purqymtppbv4k','3m3uq4nd1rzvcyyd','3olpnfygoj5tfttf','3o6pakoxb7cy3cd5','3l73pkt3g127dqf6','3dq6d1flnt2u5llh','3sgyiom83muxjmu4','3vxw00hhrqwhrlke','3w1jrjvmk4f9gazy','3x2sojljv04qni8i','1yti1am4l16mjkti','42h356yel4occbjf','44bos8he8k1bsl5s','48h5xf5bnu6cn20g','3g3xyyfb5ydyod','492lcn0sjg591szu','4b05hyk9ycbx2tc0','45bx8jg85ujj5g5q','4dzl5wzog6k6xtr6','4d98f650jpom846k','4hmgcwho6v19weyw','4gvxr278ukyobiy','4l33jjysofp3very','3pfco8kg9xs3ahil','4np21bl7mr02wsk2','4p09q2k5em5lhr90','4poj7n7j7wtphju8','4pte94z2fzfjv5ah','4uimsc6i8a0rabki','4wo2z4hj7zxbwon5','509vwuo8k9fb63vi','4ouw9si1fhanlen8','533eq7dub31vlgck','5230wsgz1pgjfdgu','55yhssxbcci6854y','574yp5ttl1jzfrf5','4vps5zcbx33xy76j','59g5czw7izz7aoip','54lndxkl3rs7yjm4','5c0aqpcpbe37c5yx','59xa3rxg0lu5bo6e','5db3ldo0anwfhpk2','5ej0jiw99wqhzxsh','5jaqfvh3b07bevfw','5k0i3orsrbswt2q4','5iztuxwskbjiktqu','5lplw3nz5mtk3ngv','3c4wki6qemylk14u','3r63uvc82jnvpjj1','5ijday9f6jren7k1','5mwsd31guqlqj0kl','5meth6b5imxzleu','5ncrpicdbccorgon','5r7yqtmyeqnjx88h','5wmixcr4p6m9w90o','5t1frgm954xg9s8a','600lvxkowqxuybdc','63k4bs7hb4wwjvpn','60nlqgh2iuawafoi','664silnoknm3nd70','5iigy5owa6mc3vsd','67el9ly7rgjue4n9','66tu4tq5bd8jgu0h','6amosv8uii9tq5s9','6bghk9o6czulp8io','6c0vljle73717wig');
UPDATE talebrary_games SET enabled=0 WHERE id IN ('6durptkxdbferhg4','6f55jwyznpebps3e','6fgbrgrviwlrlahy','6e7qdsz34tqnemrv','6hmsok8t6tboia86','6iryw3dde7jmvvu8','6fc7zdj4qxfq74hz','6mncn610cyw5ig73','40r2yynsg3usy7uj','2ya9pmsvvfpsuh67','6rhf7eaywwh2bv4q','6iu24kn058gni3j4','6ohqprhv2n592s17','6tlsv79zs2xq9ecs','6ni8g0uhnl44sc7','6czlo7m6yl74d4l4','4f1m8tui5k2btmhm','6yacvo40x2x8h94p','6z25yl4e0xfoou38','3342rncu14tnbsg1','705ry2wk972im4n1','71k08wjqtltl03gn','72csh9i76scwn6na','755aehgukt6v8t80','77s2sbu5vrwx1a9j','78j0cj40r9hu0aiw','7bptvi6o2p9de3li','7c1hob5xlmxeyxcl','7c65y7tvm1471udl','76ecmby2q849qlsl','7c7iuhyg0mb49gs0','7datxqc6cdlj3p6u','7h96z0tk66m5b0cy','7fb7juy235c0vut2','7efmw1y686b9e486','7ig0kv8t4mdidt1n','6t7reqb9bvw4wcu','7l9a2sljit7vdo7f','7nzaezbhsdpxdf56','7p0ni7z39u9zatwu','7qh1pq8a39hlxoa3','7pdwfhc4n95dqf43','73cbfktx8r8a1fxx','7sr1v9vb9r4ansq5','7rizl3hfksujejbf','7m6expdcixbo6sy','7vced6ujtrekmoib','7yk9gme40f0a03w1','7t22wbllftv7nuiw','5yqi40zktmm89qik','83ik1gsm6zq7o3gj','85mcun0sz31q21ld','861zb69c0eofo3ye','830bqs4rzktlkc9','89jx8elud9uqilqj','895qx01ri6rvj1hd','8b4m9vkft3qmuazd','7qmcyfbz8oo1hy92','8bdwbmkius8qv8c','8gax2mzliangyo35','8e1v6jfzud5exkjg','87kh7s3bczbdi1i','8i7hq6gdo677mzm1','8jpejjg1ouqk88zg','8hhjm6cul2qtxim','8ithpr6yhbhhb6fe','8k5oebzksncg10v1','8kkzc6v475s3lcea','8mwv5zkvt4o3pl8e','8o4lnoya4kg6ud7h','8s3tsviwlp45ekad','8ffkew39abmgnhkx','91aufk8ccxypak5r','92vokas1u5y5ms8n','91pic47tqqqf79w','8b0w6eukwpeyvgue','93qxk4ujela67jf6','8upuvdnsk4sho6ac','96ggafrpoktxiej1','96wguzzgxlz4iqsp','95mwg8tdzcst289c','72sn7wkuew6579u4','8u6m0cofv7m7pn5u','98i732gbb6igseoc','99hicyvv3hnaa1gs','98edv3t5g2ubu47','9bn7pkna93ct7r8s','9dule5mxqkp54j4c','9chn7mk6h69nvku7','9aq6smj7drxmvgsm','9hoinnjdbywv83yp','9hpl6jujhjhl92tk','94vyohlxpwgwwl39','9mhpwzpljyifgw5v','9n2ep3rbby520xjr','9jnfxi7aqr47bd5i','9l4qyjdnphghcs0','9pmpq8dyzriqc10i','9qbja52m0h9dnfsk','9pzxnionaukagaoh','9s8wfj7oyxghhkxp','9chg1cyv3xssz0ae','9s66qxkt22kq5wv9','9spbj1n6yurq06gr','9stigmpa7rktdw54','9vlqvkglsb07ap0q','9vo08lfea4ocpzxq','9wn0d2414996labv','9wgsn43vhwki2p6h','9wwtbw8obabzeerf','9snv8d7zq7rvjpzv','9zx8c3ubf925avzc','a06ferur26ck4ely','a087n3nte3qszah6','9xzmtd5ud44kvjz6','a3oyllfupt2l8lvi','a3uc6felhugn9olb','a5kfsqvq6e18ycil','a62pc618qtrx9kpp','a6yp4tnt4l3iohxu','a5pmazy8j0huzgvz','a8lmfdn2s385mxg','a97qy3b88dq4pped','9ult5oz52vbudyyy','aaugurj6ob8rpll7','ad24faqoyr3q9f12','af5avho6z6u7hgnu','af9uszi0e50k06mc','5u649bpw10gempo8','ak40klis5cy2erje','aixamxezzos7b4e6','akz0ydrzpp4pp1ag','an8l1mskve07ispa','an7ll2j4kupi2zl','aqd90c2ot0zkxe88','98h95pbbpidt4d12','apm4h7hyglopbcg','aunxx2vihq2isf1f','ad9pg0ycxat2sqt7','atwgzo3q82ugw605','b1s1g450d4qmq6y8','avte6y9jgb5xih4n','ax7dianyhormuuf','b1zu4mfrt4k0r6','b8mch546senyh6yo','ba1b5asqbjgvy54w','bbywumouctsr5oku','b9jk5z45rjjt6i3p','bhipn1557th408kd','bcfzgcptagp2p2zw');
UPDATE talebrary_games SET enabled=0 WHERE id IN ('bkc9ldw3ub4w9ofc','bkbn567ib6e00dt8','bi8rb6cieq8p05wl','bl6ofv1g86vw2hgt','9g7e1p3tyeyoiivq','bn6ouxsb2dcpzw99','bns5rmwepnwlxrl7','bo1damdgdg4oy554','bw0obfyooi5s8e9f','bup6t8xr4inqhb67','bzr8gdc2jhzm1yiz','c0gb9dob40jnuz4t','c0oc30iqdeafrkow','c3kat8jmjgckx09v','c61pczikwgn5cpyq','c732j851vvxopz3s','c78x4kx1wu8ycpv5','c7dydbtxh1hmmgkn','c7fyxlt5qeeganl3','6xbqnmlxvkju2n04','c896g2rtsope497w','c8d8ddrr94ypcm34','c98if3sibiezq6na','7hrjcihg46sckudh','c95zi71i86rm6etd','casmrq2x2yct71m0','cax9oo2leu5yw8bt','ceu605apdq2utrq4','cic260su6jmkpjt3','chz7cze9qxckgwsy','cm51y3d4iwcf8fuv','cq4brf7veenvjfdx','cowzsvttwn8qr08s','ar5x88sqx6qvef7g','ctrwd117p4tvkpdh','ctx4je15y3895dpw','bf68dbypvpmgi7ia','d47ggt0sp9qotqwd','d3g4ygvj01y24f23','czai0qjnsjffx5c1','bkct2lhv4u5z818a','cimgcdu82gj2otap','d8t6uzsd8hjov2ag','denbn2zshbex2yl2','dib4ohnm0bm37pjp','d7c2s41j13eii49j','dig1eifen5rp7sih','dj4i80i11qrh7wk3','diziwpamsxpbkzxg','dkf7mx266v3znuhz','dp5ve3wb20xhmmbh','dl5yv451iqmzku8o','drcgmnc2ayb3bgtd','drsi3d1e0yz0nls0','ds5ik3pompttfa7n','dt7tt5c1avba9oqo','dtqe9satgsco6xm9','cjsvhlsg328la8','db0so0d3t5hv5rea','dv4fwfkw21xm555l','dl0istovf2smb74','e0y9b89vfv70y6pu','dujhpaco04vwepvq','e0fk84f68z5pw9rl','dx88h4cgr50zavt2','e1r92owhpj5rcac0','e6vqb5qeu25czrq2','ddlf93z4rlhahkjf','e7vbue8beg5a6rzm','ebsa2kzl21bwebec','e9vf72qxjk48rlat','e1h13jfibs5arm09','eg8mzazb9yt3d16w','ekqke64ou9icte9k','et60g5yvv1cob3sp','enxypty26tac7p75','eu4wiii5kc01q54j','eegjmrx92od392jb','exkyy9h5x90n0poz','f2oyetp93zdpg4k4','8ibiopqhu9pd6qhv','f2iamffmmzso7xzz','f6o3ur38czzrlfim','f9lgeek9vcyivh5r','e5l1y8t4yov9y94','f9l40w4tsbnkwply','f9sydfatib2kady1','fadlp5v4tx3pqczu','f9smtlstlpa1gnzz','f9xvyj311uabnjbx','etul31tqgl3n22nl','fdfooesx4n9bovg8','fcas37p9u01i2sij','fdspaurq4w5hhtwd','fhr5r8i9ix961y3y','fsawry3lnp2yn04e','f7q834ckxullzlly','ftw7b8zk4uyyofcd','fwb597ih79a7w33a','fxa2vldxtsjsa7vh','fwc9pt95wnnxrraf','fwqdyh6p8c5nwfyz','fhiv54qp0hbswwf1','ej1ojzk3h40ao1md','fxnlf44opezdtlvp','fk4m3022wxy5z3vc','g198rwyxu7vfrxte','g4bppjzcsezfuwah','g5dnuooup5gvp7u0','g3qv8rgscg4vqkni','ga98ooeyzrjvd2nb','gctnbl7y7rjbkvyu','fsa1bze0pnwqmm4z','ggdxsqyzos753507','g6h1glu4zeds6sec','gdpzsvrw8osj2d4i','ggtuiuhb4ccinr69','gonczpz4imoek4do','gqgurglncygeh4jw','gjvqzy2pjuwxru2','glu1fghszffu7c7h','gg9bv0rkdth7d1zb','gr0f9vad94p0uyaw','gv75aryoisbln9bw','gu7s5f0e3yqlqrnb','gwkjkwueqnb3dlf5','h183ccbpfw361347','h1dpowqb07z7y0sr','h4uwyctp4rtlmo64','h59mnn480ouc2fn8','fxcq9pchj9hfm5g','h96reria59cunaa3','h02tsgevtuhycaxe','hbff7jmjux8enzcg','hdgyw9qysboy2eoa','hemcc9wc6vhouir8','h2j4m8rzqzrksen','hf4d13wf13wlnm31','hf66hugnpskikmyv','hf79ae7hc3w9hk71','hfxfsc1iyb4bv0ke','hmws2bkb41rh3wsq','hlwxa7usxs5rhlcq','hoterf7hb68xeakm','hql7lozn6l9rmdhj','ht359g3r99j6ajth','htfueyo5y7xe53cc','hx8538przft6g0uj','i06bhxtc8memjq54','i0pm45fnkxt8totr');
UPDATE talebrary_games SET enabled=0 WHERE id IN ('i43ytbq9fvab8074','i4bgzu0puoxr2li','i4imsiyzgvoduzqj','i5zsretaa91gqsw7','i4ozk7jjbz0kvss2','i61ldwzmh7leojcx','i6qwjami3es2sx09','fdrmqtk9j9bsmef9','gwe8psqhkakmciu1','i9vnsyd2fmlagojb','i9ghjrbb2vhtpi00','if84udctcyya3aww','iio542r45seje190','ip5icl7u62xc7tjr','im759y80pvh8al63','iqyrku8zxjfzfqkk','iplxpg0d1bgdlbdx','irzhe88d72p2ky06','hyyml070qmjnny3e','h6yj013xuhioseik','iu94sqv7nr99pu98','gef0dt70fih3zft','bgzdh0efni3tt2ly','izocnc9ta54msoej','j233niwbwbcna8c0','j2b4zq833rpnc1yy','j768t3mb3xikxh2b','j5f8bmtnd3cih7un','j6re8xkf2vbcbfo1','jawdo36ohg0br4mx','j88uqlwgs24tkaws','iksbtn1l4wpryu7','jg21py29vp32f9uo','jg2idmjncvd66hki','jd79rqenllnxny3','j7bqfkj1t4jq5bnl','jkxswibxv90elfg9','jnfxm3hl4o61qiqv','jds9mku1qtpwa4mg','jidi0szfjzkr97q','jrlj3y9zgmxulzci','jv44vefxfo77yfep','jwwys4s6tap8ijtg','jrmn0xwy79vb873g','k0t3wq9f0o3awns9','k0wm8gknj8nymlpv','k235may8cvejhgg2','jephaktzt5svmav1','k33sud8fhm0crwds','k2iy848xjf3ch6uf','k4kpb3lmfoym18gb','hcw18vhnf8obgbay','k4wgf9wqz1pk3fvu','k2gw5ehk9d6f1lvz','jrj39372zyg531r8','k6a9374jhsdgqcsr','kcvhjut44t3p8e6k','kdre0bb9d6t9lt3f','kh57ljvskzpcscqm','ki5pi6jdn5wvq2uq','jwe1v7bh1evehrq','ko02mwv9oi52qsmm','kqj9zdnubfmfu1cp','krlb7jc547nsz40y','kqmxyybs0nh9d71m','jwnr28pfb53u1jtw','k3hdjj6vo9y17ytf','kty1kbnmqmwk32f','kvz1qgaspmsn35zy','kw2hx366nwvjn03l','kxc7cih23ylk15ee','kyz1yk5k5zutk7un','kzb35z8hc5w51gcw','kynj8q54we2f8xxw','kzlwkkir4kp3it6d','khclq55krtwb5ruy','kszv99z9a2eas65m','l29tpws3utzm65js','l16znuku8w920nic','l8g79u3ornkvzykl','l32mp18nbq23mbcb','l7o4aomivynoft17','l9aafzj5c16khn8c','ld1l0p3sz2t46ywe','l8q0qigf162vp1zo','ktt1r3e1qfhg7xiz','lfa6drsu9qlc4uha','lhhf1b0brec3wbg4','lmhl8ipoqjizx3qh','l1ma82zqb5w80d5','lt0mr9kswy38kty8','kzsk12xpgzepywqv','lucpekxbt54t0loq','kthdccxtld9agum2','lckqxohonrcvh4nt','lxzvjggw0zmocle','m8zhthj0gj2mkc63','lruouzo06d0ktul','maup7brn89am2ab4','lxy7h4dph7979wfe','mcap0dgcutsi2rk','mdt4k0dahnoh6dkb','mefysxk3up0oypcp','mihogokehk75gw3i','mh0w8gpfj11cnfuc','mjuv7t96iuaz47vz','mlngu7kjq3uvm1yy','mmo6gsldzks4k2xc','meshth9smof7y8tj','ms67a2hds1t2swti','msi8ksprteqcu4wv','lxm31wy59an0vs0','mtglkpecro1rq2mp','mom3zbtso4xadex4','mr3afem4kaqroce6','mt2cck6os45v1pgr','mv72u7es48wzw04s','mvt4utxzhufhzhdt','myejb4ual3rfi9gj','n1769lbr7bt016fa','mzawg3zqq4urfjkl','mziqfn78iaytu5uf','n3sy6kjl6l8ul9qg','n3l8m7p8i9evycoc','n7qavgsmxn8pmnlx','n5i618v5xowmum91','ndsp2xjj2aifh30h','narh8d4zgv7fa9is','nlb5cxhdabfkn0zz','nkz7z040sdfa5agn','nmsg9oxxc1cxp5kk','h7384u8jehwex5pk','nn1jhhhsl8ovfmjj','n984c6iwadr9slkj','nmr68r3c6jja244q','npdcwwefdp105cfr','nv4pezgf17ma9me6','nwxi6reml171cr0','nqxyd4y4hguo1zml','o1jg8fa0g2t7tohg','o4aewhygsdax7fwe','o4y5ghnjvm62k1pb','o1u8axwyir8bzqee','lv6k3ucfvf5v6ehq','o6p56hbcwsgchebe','o5u7eqvers8w9wvf','o2we7uevn94xps5u','o8kfj26cpot69mrt','o9y4e4d66o8uf5g7','oaskp9o0zwn56hql');
UPDATE talebrary_games SET enabled=0 WHERE id IN ('ob6vkdjwdf3rtknv','o8crmfrqgl4t5awz','ocxkusipxh6uszzc','ockmkhd7gblowdfr','o3crh1f9rmli24o9','oi8xz4jj6fpqh5y6','ogkbvh7c4k43picy','lqic15xzdndvn41','ojp9uarmyuw4eusj','on4dniu7o3jdaj3j','opn5cybh92j0599t','oh8wpldas9q1wcv4','m8bc6g3wglbrese','or362l4tugg19ae2','opz1y9r0yk3lmx5l','ovpw2r459umw15qc','ovun34wzmcgbua1c','ovvjh6d0pqg00aav','m92r7ml5ozfix62','oqrltgvudzy3n4u1','os0pfvpcgubbxf','n8ngm7hx5z5e9csz','oy2hoke5poiyvq6d','p21izscoaytbbq7z','oy6ld63a47b9vn1x','p4g3v0e31gpk0cg0','oe62obqziewqgik','p3rd5133qm5cwfd','pcprb1wdtn9ez7km','pckwnoe5jd6s7zqa','oxl762a8sad3swbz','p9721y8wl37duxik','p7emrrts07gbvhis','pfduieqez88c7675','pbb43k2b4z2mbz5x','phtdyp2jrd98wr7o','pgklownuffqn25nh','p9tsgfkal8l9yjs5','pmg3lt3wxdgqdsor','ppdyrr4bcytc2boj','pl3vd1t864vw7czy','pez0vjtde03926pv','ps7ak62p0bkmo0nq','ptgdgv61nhygqio1','psixlzehl65348ic','pn191jd9gfpnwbi9','pskuuml9cr7tohew','pw5icj8mnlqszk68','pwq3ko5bv4mj2fj2','pvhcdsvpf29gdr9s','pyuu6dl4xf7jw6mj','pwn78xztd3r0ktmp','pyzjpyqgtknzpd8w','q2fl1x6z5z9ghvg7','qfy5yg9hsvjqsv86','qdtzzfsauppodqap','po87b9xhzxf9ouox','i6zudmmce7c5je1','qiuxwq9hgtkwi15x','qhbztyhhlvjdry7b','qgz3f290qxbp1k85','qmm7d4vvatzqqvav','qp0i457yr5v4t74k','qpd3rf8p0memzoil','qpk9q65fave3wed0','qretewgb3e9sf2sn','qo74vsi4sa44yaov','qtb5hu2huk1w96no','qwhdy69c0czgyfm3','qx6qh4ryv8qswocr','pu1w7xb9dnon8jnu','r1ydpbnko04kilj9','r6b01060gcw6vrhn','r37zinsfehvr1b75','r7gsw9b3icy1su4g','qqd3wtpwbislbvr9','pye1ft3llnblgm3w','r93wnqjc44juw85g','r8x83gdub9wvgfdv','qgl16vvzh6n8c5kc','r86cepgeir9gg0du','rbz9kl3nhstq20p3','reze7qojz248xzp0','ro4v5d5qvejma7b5','rnsj9vbk0ewwip61','rqe2d3sltz5dlj2','rvgl3zto9wbo3pd0','rurv9kv8vm3rve4r','riv2ic6fioxsgw6w','s30tnv8buahsgn9','s3ufsiaj5rpmquts','rz4x0k74vdsw9l2m','s4t10m801v9bjeti','qyzybg5jryrfb4as','s5o4sp68ytqotdwa','s4pky8pxqf0vhz7w','sbtxacglhpr3dxnb','sc9qfq1k945o51ak','s6uduk5gw5kru7gi','o7nq769ihazfchxu','shallhqrgg8apzi5','shpvofikzubh8o3b','rlbajfbb0r8snap0','sim9bfnyrsbilnt','sicva377zqygxcq2','r76xars2xn8jn8j7','sj50m4kkwxu1273f','sm0f8g92ufcims9y','smguzq2slc2oa1wa','smrd2i9ktmkuyyy0','sj5tq6paj6eogluj','s7hvl6vcmhnd4yaw','sou1wyn2aay360e9','sp7yrctn99uy103','sshanopxskbpccm4','st8wnd4uji6ef128','q9fg1a0eebygvjha','scrpg07v9i8046u9','sufyz4k4tohxt73j','svslp7lp8l61pxpu','sz8q7j4f02mm7qz4','t33jbup1xnl0w2us','sy26iywfm3mbao0r','t0fqtq0u3uc327nq','t44v6axdfbgit7qd','t6lk8c2wktxjnod6','t7sqpwsj4xtgrn35','tb7j3ct61toznbjy','t76u91xhxz1bxppf','tcqyq1jxi1zl9exh','t2sezaqjx8j89nnx','td8yhkctp6vdizo2','tb4zcnikdtbxstf','tdn7hwex6toro68a','t83w2pv5komm12fx','scdsw9o3gajgm8h8','teobgg6ythmhfx1q','tpxys0qv1iho5m9m','tlyk69fz5pmbwhbp','tqw1b8t45mdolj4g','ttyu7bo0zz7mexio','twwcuwa12h89djec','tyvg1wik0flgy0g2','tl477wxyspity51i','sqlumvhrrz5v8c41','u0usxxifrhqhey4i','tyu4zalevqkvujk4','tvfat6qghhdduddk','u2uyjoccrl3awz2v','ucsem758qia1dwjt');
UPDATE talebrary_games SET enabled=0 WHERE id IN ('ua3ivof4tv28ephg','tq8wrqw823fafohp','uedis82y8lmbgglb','u73rmw1qfiu62etl','u0fzm0lxlt9vb4fi','tfqbi3re9qajuui','ujzsjpvaiq8tplcn','ud0ihoxc3jfstt50','un3udc3a1n337j45','unsfnkzsj6bxu4ju','uq0wyolbxfhxtfoj','usdy3xjxvvk9t8yw','uszmamdsm653gwbw','uqy4x2pm6cslbrs0','uq1rwidpqanywymi','uxki9uhnrhs5sdpa','uosd87jw66kcrax5','uzojmvhnvlt65z7f','uyqf32uc3f6alrpp','r97fmw7jjh11sfdk','v09ttagwibc4xgma','v07htx7abi08hb73','v14iv84rqbwwiayc','ui8eocl25bju3zbv','v3fbrr6q0jb4o12l','v585s10uh18kkswb','uwt5wif5zkoiljos','v5t42htq1g9n5fxi','v7ef2smynv4uqrnc','via9hvv89gfcucnf','vjbejtmwqb6yhrvu','vkq2m2wnpza4u08v','vlsvsfinckq930o5','vobqsvl1a2cxikmu','vkz4n14j8yy7ioyi','vr8zdr9k7iunx60j','vqxi4r7h6jrfnrpg','vk4j4zp5slsh9jyp','vto3t4q6c44wzt4','uv7zle9662t1n69l','vy3x71efi2owus0z','uxs2s81b63bfygxr','vbxw799h62j4j7pq','w3oa02owtrpx3a4v','w2so59lanzm9tgh4','vxo3qla50p55a5ye','w5fe1obyl3qjyrqo','w7t7jkqk458b8ssv','w4pkrecmrf1wpyg2','w6cpxr0pi5awvonm','wceeesnpko5hcydg','vv5mzdx8a4w6joyi','w5qzp6mzuqstyiwz','we9i181ad9aepque','wiky28kwr2un88hn','wio7esv6474kvx6d','wls1zahs5c6kcbxt','wqknebimxd7u447p','wlxcfeipjhtgpt8w','wqr7i8vjr8p1c28i','wav3v8zive29bczk','wuw8ag487i3vr4dr','wve169z977ih7o9f','wv5ua3x6b9du3mzp','wxco53fk2aa4pwm6','x33bcsynxsjqlbte','x14kvpjpv4uosqc7','x3wcrapu08ztd061','wj79te72mruhbnni','x4fyoyg69j6dbr2e','x58egcac5q2uwrcw','x8e5w2bahwy5j22x','x8toy0ku3y2af6se','wys2xz7kpxl0tevh','x9pkxzkp5eq68vu','x75hgrg57kiay247','xibfgjxiwl3v6vis','xclicgz9z79nzblt','xkbs28fxks78fjcu','xmiz86oso6afh7ny','xll5odiydidjnktm','x77qzlprmvrtqktp','u3dd6j9aldwyuuhk','xobo7b2ejm245mbc','xqg8xyjzdwgxgnvd','xpswefohn5e4sk16','xtlsfvmug23b7ypn','xquv0l1lpts7s58u','xncozmg01k6gjn5k','xw4s837omeopp8z8','xvhyzcol9t0e9bx','xwmvgjxla20hrkze','xu6iw0chqts54vgc','xvhcf5jhdxkgfq5k','xzmg5u6ky2ooinp','y49j52jxdi5b3nbn','xi761vyx9lhi6v2v','y5ui14n1q6gkuuvq','y82h0tvixm54283d','y3dyfqgy5iolrjjs','yc5gepwod2bhb3bp','y7gdf3671h662253','ydpzujvvatlukt9','ydcgk75cqx86opwt','ybxxoxn4i4jqv0a','v5axn7tkg52m9g1a','yfar3tr3uk4k38uq','ygbe1rezyq2ny1av','yi5bx2tt5eienu74','yenxdiw2d9sooe9','yghs5x72086bkewt','yo7axrrxq5h3q42x','ypsjk6l0yep49kot','wxps464qkde0chmq','yh4zsq3mq4fykxh5','ysyvsvl0ci7uq6nh','yz8d5lo7ep80a4o4','yutkd9u0oeog4br1','z4w2a1sinm82dysm','z83vnbuya68liwbt','z9eepw8uxafh1nvg','z66uiemcszslw0sg','zahn0ux2vkkvnu45','zc6v3lovr4s6o30z','zebrt3hvk6u98nls','yfkjxddt20mkzu3j','zg8p9khmmhtqwavu','yl9dnwe1kmpo5m9x','zh9iakbsnk9tab0j','zaxy9k3pbyy86e0g','zi3q0i7gofzr4hh7','zgv52ny1u1ufu86f','yohzklspqd8rmzt','zkbp7ygz2uafxr1c','zkpn8rw1sr6hhy5i','zm6x1libxhi57tl3','zktrhw7mqt0s7ii6','zpeuwgz70k1qzrj','zn4vo1bdjesa1ph0','zmlwdgbkvii201q','zhntazkr5tsgziik','ztxh0dxd609vg95h','zsole7usixgh2uxr','ztuq8vgplpgcmox6','zuterdvl8vy4uow','zuv4tdyvel6l8w9s','zx8yugby6rc5clf7','zz69axowzyl0htmh','zr1khxl255lrku78','y3njzbvdp6zyike5');
UPDATE talebrary_games SET enabled=0 WHERE id IN ('s89mwimo0eebq3p0','zt66jzjxkd8ptin4','w8bhj8sydzd3ypl','uaxh30z0kh7n8nt3');
