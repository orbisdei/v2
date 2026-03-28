-- ============================================================
-- ORBIS DEI: sites table update script (final)
-- 145 records | 86 ID renames | 59 field-only updates
-- ============================================================

BEGIN;

-- Suspend FK trigger checks for this transaction (transaction-scoped).
-- Re-enabled automatically on COMMIT. Requires service_role/postgres.
SET LOCAL session_replication_role = 'replica';

-- ar-lujan-basilica-of-our-lady-of-lujan
UPDATE sites SET
  name = 'Basilica of Our Lady of Lujan',
  short_description = 'In 1630, a statue of the Immaculate Conception was being transported inland when its couriers overnighted near the Lujan River. The following morning, the wagon became unexplainably heavy and immovable until the statue was unloaded. Interpreting this as a sign, the patron and drivers left the statue there, where a chapel was built for pilgrims. Over time and with many healings, Lujan has become one of the most frequented pilgrimage destinations in the world.',
  latitude = -34.5641985133718,
  longitude = -59.1214082314216,
  google_maps_url = 'https://maps.app.goo.gl/js7cmFEX4iz8g7UN7',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Basílica Nuestra Señora de Luján',
  country = 'AR',
  municipality = 'Lujan',
  updated_at = now()
WHERE id = 'ar-lujan-basilica-of-our-lady-of-lujan';

-- ── ID RENAME: be-brussels-st-catherine-s-church
--              → be-brussels-st-catherines-church
UPDATE sites SET
  id = 'be-brussels-st-catherines-church',
  name = 'St. Catherine''s Church',
  short_description = 'Historic church in the former Port of Brussels, before the docks were covered over.',
  latitude = 50.8506899525108,
  longitude = 4.34804927612854,
  google_maps_url = 'https://maps.app.goo.gl/4dJJfUQwxM1Ue47y8',
  featured = FALSE,
  interest = 'local',
  contributor = 'JPY',
  native_name = 'Église Sainte-Catherine',
  country = 'BE',
  municipality = 'Brussels',
  updated_at = now()
WHERE id = 'be-brussels-st-catherine-s-church';
UPDATE site_images SET site_id = 'be-brussels-st-catherines-church' WHERE site_id = 'be-brussels-st-catherine-s-church';
UPDATE site_links SET site_id = 'be-brussels-st-catherines-church' WHERE site_id = 'be-brussels-st-catherine-s-church';
UPDATE site_tag_assignments SET site_id = 'be-brussels-st-catherines-church' WHERE site_id = 'be-brussels-st-catherine-s-church';
UPDATE site_contributor_notes SET site_id = 'be-brussels-st-catherines-church' WHERE site_id = 'be-brussels-st-catherine-s-church';
UPDATE site_edits SET site_id = 'be-brussels-st-catherines-church' WHERE site_id = 'be-brussels-st-catherine-s-church';
UPDATE pending_submissions SET site_id = 'be-brussels-st-catherines-church' WHERE site_id = 'be-brussels-st-catherine-s-church';

-- be-brussels-st-michael-and-st-gudula-cathedral
UPDATE sites SET
  name = 'St. Michael and St. Gudula Cathedral',
  short_description = 'National church of Belgium. St. Gudula''s relics were kept here until they were destroyed during the Reformation.',
  latitude = 50.8478744506604,
  longitude = 4.35897312161425,
  google_maps_url = 'https://maps.app.goo.gl/fCNwADr26azNqpor7',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JPY',
  native_name = 'Cathédrale Saints-Michel-et-Gudule',
  country = 'BE',
  municipality = 'Brussels',
  updated_at = now()
WHERE id = 'be-brussels-st-michael-and-st-gudula-cathedral';

-- ── ID RENAME: co-potosi-national-shrine-basilica-of-our-lady-of-las-lajas
--              → co-potosi-basilica-of-our-lady-of-las-lajas
UPDATE sites SET
  id = 'co-potosi-basilica-of-our-lady-of-las-lajas',
  name = 'Basilica of Our Lady of Las Lajas',
  short_description = 'In 1754, an Indian mother and her deaf-mute daughter Rosa were caught in a strong storm and sought refuge in a canyon between the lajas.  Rosa exclaimed with her first words "the mestiza is calling me," describing the figures of a woman and child.  When returning later, the mother saw an apparition of Our Lady and Child.

Some months later, Rosa died but returned to life when her mother prayed again at the cave. When the townspeople came to see, a miraculous image was burned into the rocks.

In the image, the Madonna presents a rosary to St. Dominic, keeling at her right.  Jesus gives a cord to St. Francis, kneeling to his left.

Testing has shown the image to be of indeterminate origin. Geologists from Germany bored core samples from several spots in the image.  There is no paint, no dye, nor any other pigment on the surface of the rock.  The colors are the colors of the rock itself and run uniformly to a depth of several feet.',
  latitude = 0.805324865882345,
  longitude = -77.5859226762825,
  google_maps_url = 'https://maps.app.goo.gl/tNJviJWJggHiRVdj6',
  featured = TRUE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Santuario de Nuestra Señora del Rosario de Las Lajas',
  country = 'CO',
  municipality = 'Potosi',
  updated_at = now()
WHERE id = 'co-potosi-national-shrine-basilica-of-our-lady-of-las-lajas';
UPDATE site_images SET site_id = 'co-potosi-basilica-of-our-lady-of-las-lajas' WHERE site_id = 'co-potosi-national-shrine-basilica-of-our-lady-of-las-lajas';
UPDATE site_links SET site_id = 'co-potosi-basilica-of-our-lady-of-las-lajas' WHERE site_id = 'co-potosi-national-shrine-basilica-of-our-lady-of-las-lajas';
UPDATE site_tag_assignments SET site_id = 'co-potosi-basilica-of-our-lady-of-las-lajas' WHERE site_id = 'co-potosi-national-shrine-basilica-of-our-lady-of-las-lajas';
UPDATE site_contributor_notes SET site_id = 'co-potosi-basilica-of-our-lady-of-las-lajas' WHERE site_id = 'co-potosi-national-shrine-basilica-of-our-lady-of-las-lajas';
UPDATE site_edits SET site_id = 'co-potosi-basilica-of-our-lady-of-las-lajas' WHERE site_id = 'co-potosi-national-shrine-basilica-of-our-lady-of-las-lajas';
UPDATE pending_submissions SET site_id = 'co-potosi-basilica-of-our-lady-of-las-lajas' WHERE site_id = 'co-potosi-national-shrine-basilica-of-our-lady-of-las-lajas';

-- ── ID RENAME: cz-jirikov-basilica-of-our-lady-help-of-christians
--              → cz-filipov-basilica-of-our-lady-help-of-christians
UPDATE sites SET
  id = 'cz-filipov-basilica-of-our-lady-help-of-christians',
  name = 'Basilica of Our Lady Help of Christians',
  short_description = 'In 1866, Magdalene Kade, an orphaned 31 year woman bedridden due to many illnesses, received a vision of the Blessed Virgin Mary, who immediately cured her.  A bishop''s commission examined the miraculous event and recognized the healing and supernatural character.  A church was built by 1885 and elevated to a minor basilica by Pope Leo XIII, who officially consecrated it and dedicated to Mary, "Help of Christians."',
  latitude = 50.9806857,
  longitude = 14.5973499,
  google_maps_url = 'https://maps.app.goo.gl/yCMVSMj51i2veNMu6',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Bazilika Panny Marie Pomocnice Křesťanů',
  country = 'CZ',
  municipality = 'Filipov',
  updated_at = now()
WHERE id = 'cz-jirikov-basilica-of-our-lady-help-of-christians';
UPDATE site_images SET site_id = 'cz-filipov-basilica-of-our-lady-help-of-christians' WHERE site_id = 'cz-jirikov-basilica-of-our-lady-help-of-christians';
UPDATE site_links SET site_id = 'cz-filipov-basilica-of-our-lady-help-of-christians' WHERE site_id = 'cz-jirikov-basilica-of-our-lady-help-of-christians';
UPDATE site_tag_assignments SET site_id = 'cz-filipov-basilica-of-our-lady-help-of-christians' WHERE site_id = 'cz-jirikov-basilica-of-our-lady-help-of-christians';
UPDATE site_contributor_notes SET site_id = 'cz-filipov-basilica-of-our-lady-help-of-christians' WHERE site_id = 'cz-jirikov-basilica-of-our-lady-help-of-christians';
UPDATE site_edits SET site_id = 'cz-filipov-basilica-of-our-lady-help-of-christians' WHERE site_id = 'cz-jirikov-basilica-of-our-lady-help-of-christians';
UPDATE pending_submissions SET site_id = 'cz-filipov-basilica-of-our-lady-help-of-christians' WHERE site_id = 'cz-jirikov-basilica-of-our-lady-help-of-christians';

-- ── ID RENAME: de-augsburg-augsburg-cathedral-augsburgur-dom
--              → de-augsburg-augsburg-cathedral
UPDATE sites SET
  id = 'de-augsburg-augsburg-cathedral',
  name = 'Augsburg Cathedral',
  short_description = 'Cathedral of the Diocese of Augsburg.  St. Peter Canisius was appointed the "cathedral preacher" here in 1559.',
  latitude = 48.3726562248586,
  longitude = 10.8969802045589,
  google_maps_url = 'https://maps.app.goo.gl/2wRrPW3Pruz3WmJM7',
  featured = FALSE,
  interest = 'local',
  contributor = 'JPY',
  native_name = 'Augsburger Dom, Hoher Dom Mariä Heimsuchung',
  country = 'DE',
  municipality = 'Augsburg',
  updated_at = now()
WHERE id = 'de-augsburg-augsburg-cathedral-augsburgur-dom';
UPDATE site_images SET site_id = 'de-augsburg-augsburg-cathedral' WHERE site_id = 'de-augsburg-augsburg-cathedral-augsburgur-dom';
UPDATE site_links SET site_id = 'de-augsburg-augsburg-cathedral' WHERE site_id = 'de-augsburg-augsburg-cathedral-augsburgur-dom';
UPDATE site_tag_assignments SET site_id = 'de-augsburg-augsburg-cathedral' WHERE site_id = 'de-augsburg-augsburg-cathedral-augsburgur-dom';
UPDATE site_contributor_notes SET site_id = 'de-augsburg-augsburg-cathedral' WHERE site_id = 'de-augsburg-augsburg-cathedral-augsburgur-dom';
UPDATE site_edits SET site_id = 'de-augsburg-augsburg-cathedral' WHERE site_id = 'de-augsburg-augsburg-cathedral-augsburgur-dom';
UPDATE pending_submissions SET site_id = 'de-augsburg-augsburg-cathedral' WHERE site_id = 'de-augsburg-augsburg-cathedral-augsburgur-dom';

-- de-augsburg-basilica-of-sts-ulrich-and-afra
UPDATE sites SET
  name = 'Basilica of Sts. Ulrich and Afra',
  short_description = 'Site of the martyrdom of St. Afra and burial place of Sts. Afra, Ulrich (the first canonized saint) and Simpert (778-807).',
  latitude = 48.3614792393351,
  longitude = 10.9000712149692,
  google_maps_url = 'https://maps.app.goo.gl/qZrxQNmD7emBmJF48',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JPY',
  native_name = 'Basilika St. Ulrich und Afra',
  country = 'DE',
  municipality = 'Augsburg',
  updated_at = now()
WHERE id = 'de-augsburg-basilica-of-sts-ulrich-and-afra';

-- de-augsburg-diocesan-museum-of-st-afra
UPDATE sites SET
  name = 'Diocesan Museum of St. Afra',
  short_description = 'Museum of the Diocese of Augsburg, featuring vestments and other items owned by St. Ulrich.  Also presents history of Sts. Afra and Simpert, also of the Diocese of Augsburg.',
  latitude = 48.3733418136289,
  longitude = 10.8960887661434,
  google_maps_url = 'https://maps.app.goo.gl/JZvdD9FpgkF55awY7',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JPY',
  native_name = 'Diözesanmuseum St. Afra',
  country = 'DE',
  municipality = 'Augsburg',
  updated_at = now()
WHERE id = 'de-augsburg-diocesan-museum-of-st-afra';

-- de-augsburg-former-residence-of-the-prince-bishop-of-augsburg
UPDATE sites SET
  name = 'Former Residence of the Prince-Bishop of Augsburg',
  short_description = 'This building is on the site where the Diet of Augsburg in 1530 took place, where the Augsburg Confession was presented.',
  latitude = 48.3723371083759,
  longitude = 10.8944612321084,
  google_maps_url = 'https://maps.app.goo.gl/tSobmy41GDWVmHbs7',
  featured = FALSE,
  interest = 'local',
  contributor = 'JPY',
  native_name = NULL,
  country = 'DE',
  municipality = 'Augsburg',
  updated_at = now()
WHERE id = 'de-augsburg-former-residence-of-the-prince-bishop-of-augsburg';

-- ── ID RENAME: eg-cairo-virgin-mary-church-in-zeitoun-our-lady-of-zeitoun-our-lady-of-light
--              → eg-cairo-virgin-mary-church-in-zeitoun
UPDATE sites SET
  id = 'eg-cairo-virgin-mary-church-in-zeitoun',
  name = 'Virgin Mary Church in Zeitoun',
  short_description = 'In 1968 Our Lady began appearing over St. Mary''s Coptic Orthodox church in Zeitoun, Egypt.  The church lies on the Matariya Road through which the Holy Family is traditionally known to have passed during their stay in Egypt.

For three years Our Lady appeared on many occasions, taking many forms and sometimes accompanied by doves and other phenomena. It is estimated that 40 million people across a variety of faiths witnessed these events. In addition to Our Lady of Zeitoun, here she also goes by the title "Our Lady of Light."

The apparitions have been verified by both the Coptic Orthodox Church and the Roman Catholic Church through the Papal Residence in Cairo.',
  latitude = 30.1046229269409,
  longitude = 31.3155447438101,
  google_maps_url = 'https://maps.app.goo.gl/rPUPwJvyMjHASg4B8',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'كنيسة السيدة العذراء مريم بالزيتون',
  country = 'EG',
  municipality = 'Cairo',
  updated_at = now()
WHERE id = 'eg-cairo-virgin-mary-church-in-zeitoun-our-lady-of-zeitoun-our-lady-of-light';
UPDATE site_images SET site_id = 'eg-cairo-virgin-mary-church-in-zeitoun' WHERE site_id = 'eg-cairo-virgin-mary-church-in-zeitoun-our-lady-of-zeitoun-our-lady-of-light';
UPDATE site_links SET site_id = 'eg-cairo-virgin-mary-church-in-zeitoun' WHERE site_id = 'eg-cairo-virgin-mary-church-in-zeitoun-our-lady-of-zeitoun-our-lady-of-light';
UPDATE site_tag_assignments SET site_id = 'eg-cairo-virgin-mary-church-in-zeitoun' WHERE site_id = 'eg-cairo-virgin-mary-church-in-zeitoun-our-lady-of-zeitoun-our-lady-of-light';
UPDATE site_contributor_notes SET site_id = 'eg-cairo-virgin-mary-church-in-zeitoun' WHERE site_id = 'eg-cairo-virgin-mary-church-in-zeitoun-our-lady-of-zeitoun-our-lady-of-light';
UPDATE site_edits SET site_id = 'eg-cairo-virgin-mary-church-in-zeitoun' WHERE site_id = 'eg-cairo-virgin-mary-church-in-zeitoun-our-lady-of-zeitoun-our-lady-of-light';
UPDATE pending_submissions SET site_id = 'eg-cairo-virgin-mary-church-in-zeitoun' WHERE site_id = 'eg-cairo-virgin-mary-church-in-zeitoun-our-lady-of-zeitoun-our-lady-of-light';

-- ── ID RENAME: es-alba-de-tormes-convent-of-the-anunciation-convento-de-la-anunciacion-alba-de-tormes
--              → es-alba-de-tormes-convent-of-the-anunciation
UPDATE sites SET
  id = 'es-alba-de-tormes-convent-of-the-anunciation',
  name = 'Convent of the Anunciation',
  short_description = 'The eigth of 17 communities founded by St. Teresa of Avila, in 1571, and also the place of her death in 1582.  Today the main altarpiece houses St. Teresa''s incorrupt heart and arm.',
  latitude = 40.8265328359173,
  longitude = -5.51440563553813,
  google_maps_url = 'https://maps.app.goo.gl/RJKnziExV128to537',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JMM',
  native_name = 'Convento y Basílica de la Anunciación',
  country = 'ES',
  municipality = 'Alba de Tormes',
  updated_at = now()
WHERE id = 'es-alba-de-tormes-convent-of-the-anunciation-convento-de-la-anunciacion-alba-de-tormes';
UPDATE site_images SET site_id = 'es-alba-de-tormes-convent-of-the-anunciation' WHERE site_id = 'es-alba-de-tormes-convent-of-the-anunciation-convento-de-la-anunciacion-alba-de-tormes';
UPDATE site_links SET site_id = 'es-alba-de-tormes-convent-of-the-anunciation' WHERE site_id = 'es-alba-de-tormes-convent-of-the-anunciation-convento-de-la-anunciacion-alba-de-tormes';
UPDATE site_tag_assignments SET site_id = 'es-alba-de-tormes-convent-of-the-anunciation' WHERE site_id = 'es-alba-de-tormes-convent-of-the-anunciation-convento-de-la-anunciacion-alba-de-tormes';
UPDATE site_contributor_notes SET site_id = 'es-alba-de-tormes-convent-of-the-anunciation' WHERE site_id = 'es-alba-de-tormes-convent-of-the-anunciation-convento-de-la-anunciacion-alba-de-tormes';
UPDATE site_edits SET site_id = 'es-alba-de-tormes-convent-of-the-anunciation' WHERE site_id = 'es-alba-de-tormes-convent-of-the-anunciation-convento-de-la-anunciacion-alba-de-tormes';
UPDATE pending_submissions SET site_id = 'es-alba-de-tormes-convent-of-the-anunciation' WHERE site_id = 'es-alba-de-tormes-convent-of-the-anunciation-convento-de-la-anunciacion-alba-de-tormes';

-- ── ID RENAME: es-avila-avila-cathedral-catedral-del-salvador
--              → es-avila-avila-cathedral
UPDATE sites SET
  id = 'es-avila-avila-cathedral',
  name = 'Avila Cathedral',
  short_description = 'Construction on the cathedral first began in the 12th century and continued up until the 17th century.  As part of the Old Town of Avila, it was inscribed as a UNESCO World Heritage site in 1985.',
  latitude = 40.6557376338577,
  longitude = -4.69703687109845,
  google_maps_url = 'https://maps.app.goo.gl/CkFc7xKYCjV7YT676',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JMM',
  native_name = 'Catedral de Ávila',
  country = 'ES',
  municipality = 'Avila',
  updated_at = now()
WHERE id = 'es-avila-avila-cathedral-catedral-del-salvador';
UPDATE site_images SET site_id = 'es-avila-avila-cathedral' WHERE site_id = 'es-avila-avila-cathedral-catedral-del-salvador';
UPDATE site_links SET site_id = 'es-avila-avila-cathedral' WHERE site_id = 'es-avila-avila-cathedral-catedral-del-salvador';
UPDATE site_tag_assignments SET site_id = 'es-avila-avila-cathedral' WHERE site_id = 'es-avila-avila-cathedral-catedral-del-salvador';
UPDATE site_contributor_notes SET site_id = 'es-avila-avila-cathedral' WHERE site_id = 'es-avila-avila-cathedral-catedral-del-salvador';
UPDATE site_edits SET site_id = 'es-avila-avila-cathedral' WHERE site_id = 'es-avila-avila-cathedral-catedral-del-salvador';
UPDATE pending_submissions SET site_id = 'es-avila-avila-cathedral' WHERE site_id = 'es-avila-avila-cathedral-catedral-del-salvador';

-- ── ID RENAME: es-avila-basilica-of-sts-vincent-sabina-and-cristeta-san-vicente-de-avila
--              → es-avila-basilica-of-sts-vincent-sabina-and-cristeta
UPDATE sites SET
  id = 'es-avila-basilica-of-sts-vincent-sabina-and-cristeta',
  name = 'Basilica of Sts. Vincent, Sabina and Cristeta',
  short_description = 'This basilica is built on traditional burial site of St. Vincent, a young deacon martyred for his faith in the 4th century under the reign of Diocletian.  The church houses his relics and those of fellow martyrs Sts. Sabina and Cristeta.',
  latitude = 40.6579352089861,
  longitude = -4.69603908933598,
  google_maps_url = 'https://maps.app.goo.gl/2gmuLRyLWzffoTS86',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JMM',
  native_name = 'Basílica de los santos Vicente, Sabina y Cristeta',
  country = 'ES',
  municipality = 'Avila',
  updated_at = now()
WHERE id = 'es-avila-basilica-of-sts-vincent-sabina-and-cristeta-san-vicente-de-avila';
UPDATE site_images SET site_id = 'es-avila-basilica-of-sts-vincent-sabina-and-cristeta' WHERE site_id = 'es-avila-basilica-of-sts-vincent-sabina-and-cristeta-san-vicente-de-avila';
UPDATE site_links SET site_id = 'es-avila-basilica-of-sts-vincent-sabina-and-cristeta' WHERE site_id = 'es-avila-basilica-of-sts-vincent-sabina-and-cristeta-san-vicente-de-avila';
UPDATE site_tag_assignments SET site_id = 'es-avila-basilica-of-sts-vincent-sabina-and-cristeta' WHERE site_id = 'es-avila-basilica-of-sts-vincent-sabina-and-cristeta-san-vicente-de-avila';
UPDATE site_contributor_notes SET site_id = 'es-avila-basilica-of-sts-vincent-sabina-and-cristeta' WHERE site_id = 'es-avila-basilica-of-sts-vincent-sabina-and-cristeta-san-vicente-de-avila';
UPDATE site_edits SET site_id = 'es-avila-basilica-of-sts-vincent-sabina-and-cristeta' WHERE site_id = 'es-avila-basilica-of-sts-vincent-sabina-and-cristeta-san-vicente-de-avila';
UPDATE pending_submissions SET site_id = 'es-avila-basilica-of-sts-vincent-sabina-and-cristeta' WHERE site_id = 'es-avila-basilica-of-sts-vincent-sabina-and-cristeta-san-vicente-de-avila';

-- ── ID RENAME: es-avila-church-and-birthplace-of-st-teresa-of-jesus-casa-natal-santa-teresa-de-jesus
--              → es-avila-church-and-birthplace-of-st-teresa-of-jesus
UPDATE sites SET
  id = 'es-avila-church-and-birthplace-of-st-teresa-of-jesus',
  name = 'Church and Birthplace of St. Teresa of Jesus',
  short_description = 'This 17th-century church, run by the Discalced Carmelites, marks the spot where St. Teresa of Avila is believed to have been born. The church houses a museum dedicated to her life and works.',
  latitude = 40.6554939834928,
  longitude = -4.70275600839255,
  google_maps_url = 'https://maps.app.goo.gl/j8Xc7LDc2FvpPMG19',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = 'Basílica y Casa Natal de Santa Teresa de Jesús',
  country = 'ES',
  municipality = 'Avila',
  updated_at = now()
WHERE id = 'es-avila-church-and-birthplace-of-st-teresa-of-jesus-casa-natal-santa-teresa-de-jesus';
UPDATE site_images SET site_id = 'es-avila-church-and-birthplace-of-st-teresa-of-jesus' WHERE site_id = 'es-avila-church-and-birthplace-of-st-teresa-of-jesus-casa-natal-santa-teresa-de-jesus';
UPDATE site_links SET site_id = 'es-avila-church-and-birthplace-of-st-teresa-of-jesus' WHERE site_id = 'es-avila-church-and-birthplace-of-st-teresa-of-jesus-casa-natal-santa-teresa-de-jesus';
UPDATE site_tag_assignments SET site_id = 'es-avila-church-and-birthplace-of-st-teresa-of-jesus' WHERE site_id = 'es-avila-church-and-birthplace-of-st-teresa-of-jesus-casa-natal-santa-teresa-de-jesus';
UPDATE site_contributor_notes SET site_id = 'es-avila-church-and-birthplace-of-st-teresa-of-jesus' WHERE site_id = 'es-avila-church-and-birthplace-of-st-teresa-of-jesus-casa-natal-santa-teresa-de-jesus';
UPDATE site_edits SET site_id = 'es-avila-church-and-birthplace-of-st-teresa-of-jesus' WHERE site_id = 'es-avila-church-and-birthplace-of-st-teresa-of-jesus-casa-natal-santa-teresa-de-jesus';
UPDATE pending_submissions SET site_id = 'es-avila-church-and-birthplace-of-st-teresa-of-jesus' WHERE site_id = 'es-avila-church-and-birthplace-of-st-teresa-of-jesus-casa-natal-santa-teresa-de-jesus';

-- ── ID RENAME: es-avila-convento-de-san-jose-avila
--              → es-avila-convent-of-st-joseph
UPDATE sites SET
  id = 'es-avila-convent-of-st-joseph',
  name = 'Convent of St. Joseph',
  short_description = 'The first of 17 communities founded by St. Teresa of Avila, in 1562. Visitors can explore the church, cloister, and St. Teresa''s cell, now a chapel dedicated to prayer.',
  latitude = 40.6550979257916,
  longitude = -4.69193607128771,
  google_maps_url = 'https://maps.app.goo.gl/gWHs19wM5J1RGE3r9',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = 'Convento de San José',
  country = 'ES',
  municipality = 'Avila',
  updated_at = now()
WHERE id = 'es-avila-convento-de-san-jose-avila';
UPDATE site_images SET site_id = 'es-avila-convent-of-st-joseph' WHERE site_id = 'es-avila-convento-de-san-jose-avila';
UPDATE site_links SET site_id = 'es-avila-convent-of-st-joseph' WHERE site_id = 'es-avila-convento-de-san-jose-avila';
UPDATE site_tag_assignments SET site_id = 'es-avila-convent-of-st-joseph' WHERE site_id = 'es-avila-convento-de-san-jose-avila';
UPDATE site_contributor_notes SET site_id = 'es-avila-convent-of-st-joseph' WHERE site_id = 'es-avila-convento-de-san-jose-avila';
UPDATE site_edits SET site_id = 'es-avila-convent-of-st-joseph' WHERE site_id = 'es-avila-convento-de-san-jose-avila';
UPDATE pending_submissions SET site_id = 'es-avila-convent-of-st-joseph' WHERE site_id = 'es-avila-convento-de-san-jose-avila';

-- ── ID RENAME: es-avila-monastery-of-the-incarnation-monasterio-de-la-encarnacion
--              → es-avila-monastery-of-the-incarnation
UPDATE sites SET
  id = 'es-avila-monastery-of-the-incarnation',
  name = 'Monastery of the Incarnation',
  short_description = 'Founded in 1478, this Carmelite convent in Avila was where St. Teresa entered as a young woman and lived for 27 years. She took her vows here and began her journey as a mystic and reformer. The monastery features her cell, the Chapel of Transverberation and a museum dedicated to her life.

St. John of the Cross spent notable amounts of time here as well, and during one session of prayer, received a vision of Christ on the Cross from "above."  The saint''s drawing remains at the museum.',
  latitude = 40.6628280445414,
  longitude = -4.6997760138996,
  google_maps_url = 'https://maps.app.goo.gl/zEoRRf38j76sQ9r37',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = 'Monasterio de la Encarnación',
  country = 'ES',
  municipality = 'Avila',
  updated_at = now()
WHERE id = 'es-avila-monastery-of-the-incarnation-monasterio-de-la-encarnacion';
UPDATE site_images SET site_id = 'es-avila-monastery-of-the-incarnation' WHERE site_id = 'es-avila-monastery-of-the-incarnation-monasterio-de-la-encarnacion';
UPDATE site_links SET site_id = 'es-avila-monastery-of-the-incarnation' WHERE site_id = 'es-avila-monastery-of-the-incarnation-monasterio-de-la-encarnacion';
UPDATE site_tag_assignments SET site_id = 'es-avila-monastery-of-the-incarnation' WHERE site_id = 'es-avila-monastery-of-the-incarnation-monasterio-de-la-encarnacion';
UPDATE site_contributor_notes SET site_id = 'es-avila-monastery-of-the-incarnation' WHERE site_id = 'es-avila-monastery-of-the-incarnation-monasterio-de-la-encarnacion';
UPDATE site_edits SET site_id = 'es-avila-monastery-of-the-incarnation' WHERE site_id = 'es-avila-monastery-of-the-incarnation-monasterio-de-la-encarnacion';
UPDATE pending_submissions SET site_id = 'es-avila-monastery-of-the-incarnation' WHERE site_id = 'es-avila-monastery-of-the-incarnation-monasterio-de-la-encarnacion';

-- ── ID RENAME: es-beas-de-segura-monasterio-de-san-jose-del-salvador-beas
--              → es-beas-de-segura-monastery-of-st-joseph-the-savior
UPDATE sites SET
  id = 'es-beas-de-segura-monastery-of-st-joseph-the-savior',
  name = 'Monastery of St. Joseph the Savior',
  short_description = 'The tenth of 17 communities founded by St. Teresa of Avila, in 1575.',
  latitude = 38.2510429491708,
  longitude = -2.88706618465537,
  google_maps_url = 'https://maps.app.goo.gl/8aEufe3e9kogXAUq7',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = 'Monasterio de San José del Salvador',
  country = 'ES',
  municipality = 'Beas de Segura',
  updated_at = now()
WHERE id = 'es-beas-de-segura-monasterio-de-san-jose-del-salvador-beas';
UPDATE site_images SET site_id = 'es-beas-de-segura-monastery-of-st-joseph-the-savior' WHERE site_id = 'es-beas-de-segura-monasterio-de-san-jose-del-salvador-beas';
UPDATE site_links SET site_id = 'es-beas-de-segura-monastery-of-st-joseph-the-savior' WHERE site_id = 'es-beas-de-segura-monasterio-de-san-jose-del-salvador-beas';
UPDATE site_tag_assignments SET site_id = 'es-beas-de-segura-monastery-of-st-joseph-the-savior' WHERE site_id = 'es-beas-de-segura-monasterio-de-san-jose-del-salvador-beas';
UPDATE site_contributor_notes SET site_id = 'es-beas-de-segura-monastery-of-st-joseph-the-savior' WHERE site_id = 'es-beas-de-segura-monasterio-de-san-jose-del-salvador-beas';
UPDATE site_edits SET site_id = 'es-beas-de-segura-monastery-of-st-joseph-the-savior' WHERE site_id = 'es-beas-de-segura-monasterio-de-san-jose-del-salvador-beas';
UPDATE pending_submissions SET site_id = 'es-beas-de-segura-monastery-of-st-joseph-the-savior' WHERE site_id = 'es-beas-de-segura-monasterio-de-san-jose-del-salvador-beas';

-- ── ID RENAME: es-blascomillan-monastery-of-duruelo
--              → es-duruelo-monastery-of-duruelo
UPDATE sites SET
  id = 'es-duruelo-monastery-of-duruelo',
  name = 'Monastery of Duruelo',
  short_description = 'The first monastery established by St. John of the Cross and Fr. Antonio of Jesus in 1568, using a small farmhouse which had been donated to St. Teresa of Avila.  Soon the community outgrew the building, and moved to Mancera de Abajo in 1570, then Avila in 1600.',
  latitude = 40.8341063720703,
  longitude = -5.13013812791797,
  google_maps_url = 'https://maps.app.goo.gl/2UqmiAhkS7MBMmJw6',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = 'Monasterio de Santa Teresa de Jesús y San Juan de la Cruz',
  country = 'ES',
  municipality = 'Duruelo',
  updated_at = now()
WHERE id = 'es-blascomillan-monastery-of-duruelo';
UPDATE site_images SET site_id = 'es-duruelo-monastery-of-duruelo' WHERE site_id = 'es-blascomillan-monastery-of-duruelo';
UPDATE site_links SET site_id = 'es-duruelo-monastery-of-duruelo' WHERE site_id = 'es-blascomillan-monastery-of-duruelo';
UPDATE site_tag_assignments SET site_id = 'es-duruelo-monastery-of-duruelo' WHERE site_id = 'es-blascomillan-monastery-of-duruelo';
UPDATE site_contributor_notes SET site_id = 'es-duruelo-monastery-of-duruelo' WHERE site_id = 'es-blascomillan-monastery-of-duruelo';
UPDATE site_edits SET site_id = 'es-duruelo-monastery-of-duruelo' WHERE site_id = 'es-blascomillan-monastery-of-duruelo';
UPDATE pending_submissions SET site_id = 'es-duruelo-monastery-of-duruelo' WHERE site_id = 'es-blascomillan-monastery-of-duruelo';

-- ── ID RENAME: es-burgos-convento-de-san-jose-y-santa-ana-burgos
--              → es-burgos-convent-of-st-joseph-and-st-anne
UPDATE sites SET
  id = 'es-burgos-convent-of-st-joseph-and-st-anne',
  name = 'Convent of St. Joseph and St. Anne',
  short_description = 'The last of 17 communities founded by St. Teresa of Avila, in 1582.',
  latitude = 42.340120675583,
  longitude = -3.6942737,
  google_maps_url = 'https://maps.app.goo.gl/wdpqhM1X4xndGPJg6',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = 'Convento de San José y Santa Ana',
  country = 'ES',
  municipality = 'Burgos',
  updated_at = now()
WHERE id = 'es-burgos-convento-de-san-jose-y-santa-ana-burgos';
UPDATE site_images SET site_id = 'es-burgos-convent-of-st-joseph-and-st-anne' WHERE site_id = 'es-burgos-convento-de-san-jose-y-santa-ana-burgos';
UPDATE site_links SET site_id = 'es-burgos-convent-of-st-joseph-and-st-anne' WHERE site_id = 'es-burgos-convento-de-san-jose-y-santa-ana-burgos';
UPDATE site_tag_assignments SET site_id = 'es-burgos-convent-of-st-joseph-and-st-anne' WHERE site_id = 'es-burgos-convento-de-san-jose-y-santa-ana-burgos';
UPDATE site_contributor_notes SET site_id = 'es-burgos-convent-of-st-joseph-and-st-anne' WHERE site_id = 'es-burgos-convento-de-san-jose-y-santa-ana-burgos';
UPDATE site_edits SET site_id = 'es-burgos-convent-of-st-joseph-and-st-anne' WHERE site_id = 'es-burgos-convento-de-san-jose-y-santa-ana-burgos';
UPDATE pending_submissions SET site_id = 'es-burgos-convent-of-st-joseph-and-st-anne' WHERE site_id = 'es-burgos-convento-de-san-jose-y-santa-ana-burgos';

-- ── ID RENAME: es-caravaca-de-la-cruz-convento-de-san-jose-caravaca-de-la-cruz
--              → es-caravaca-de-la-cruz-convent-of-st-joseph
UPDATE sites SET
  id = 'es-caravaca-de-la-cruz-convent-of-st-joseph',
  name = 'Convent of St. Joseph',
  short_description = 'The twelvth of 17 communities founded by St. Teresa of Avila, in 1576.',
  latitude = 38.1067192842424,
  longitude = -1.8610296,
  google_maps_url = 'https://maps.app.goo.gl/ynTt685g99qC7orcA',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = 'Convento de San José',
  country = 'ES',
  municipality = 'Caravaca de la Cruz',
  updated_at = now()
WHERE id = 'es-caravaca-de-la-cruz-convento-de-san-jose-caravaca-de-la-cruz';
UPDATE site_images SET site_id = 'es-caravaca-de-la-cruz-convent-of-st-joseph' WHERE site_id = 'es-caravaca-de-la-cruz-convento-de-san-jose-caravaca-de-la-cruz';
UPDATE site_links SET site_id = 'es-caravaca-de-la-cruz-convent-of-st-joseph' WHERE site_id = 'es-caravaca-de-la-cruz-convento-de-san-jose-caravaca-de-la-cruz';
UPDATE site_tag_assignments SET site_id = 'es-caravaca-de-la-cruz-convent-of-st-joseph' WHERE site_id = 'es-caravaca-de-la-cruz-convento-de-san-jose-caravaca-de-la-cruz';
UPDATE site_contributor_notes SET site_id = 'es-caravaca-de-la-cruz-convent-of-st-joseph' WHERE site_id = 'es-caravaca-de-la-cruz-convento-de-san-jose-caravaca-de-la-cruz';
UPDATE site_edits SET site_id = 'es-caravaca-de-la-cruz-convent-of-st-joseph' WHERE site_id = 'es-caravaca-de-la-cruz-convento-de-san-jose-caravaca-de-la-cruz';
UPDATE pending_submissions SET site_id = 'es-caravaca-de-la-cruz-convent-of-st-joseph' WHERE site_id = 'es-caravaca-de-la-cruz-convento-de-san-jose-caravaca-de-la-cruz';

-- ── ID RENAME: es-fontiveros-church-of-the-birthplace-of-st-john-of-the-cross-iglesia-casa-natal-de-san-juan-de-la-cruz
--              → es-fontiveros-church-of-the-birthplace-of-st-john-of-the-cross
UPDATE sites SET
  id = 'es-fontiveros-church-of-the-birthplace-of-st-john-of-the-cross',
  name = 'Church of the Birthplace of St. John of the Cross',
  short_description = 'Church in the town of St. John of the Cross''s birth',
  latitude = 40.9317870668416,
  longitude = -4.9646371,
  google_maps_url = 'https://maps.app.goo.gl/QvzHHaaGTupUY2aKA',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = 'Iglesia Casa Natal de San Juan de la Cruz',
  country = 'ES',
  municipality = 'Fontiveros',
  updated_at = now()
WHERE id = 'es-fontiveros-church-of-the-birthplace-of-st-john-of-the-cross-iglesia-casa-natal-de-san-juan-de-la-cruz';
UPDATE site_images SET site_id = 'es-fontiveros-church-of-the-birthplace-of-st-john-of-the-cross' WHERE site_id = 'es-fontiveros-church-of-the-birthplace-of-st-john-of-the-cross-iglesia-casa-natal-de-san-juan-de-la-cruz';
UPDATE site_links SET site_id = 'es-fontiveros-church-of-the-birthplace-of-st-john-of-the-cross' WHERE site_id = 'es-fontiveros-church-of-the-birthplace-of-st-john-of-the-cross-iglesia-casa-natal-de-san-juan-de-la-cruz';
UPDATE site_tag_assignments SET site_id = 'es-fontiveros-church-of-the-birthplace-of-st-john-of-the-cross' WHERE site_id = 'es-fontiveros-church-of-the-birthplace-of-st-john-of-the-cross-iglesia-casa-natal-de-san-juan-de-la-cruz';
UPDATE site_contributor_notes SET site_id = 'es-fontiveros-church-of-the-birthplace-of-st-john-of-the-cross' WHERE site_id = 'es-fontiveros-church-of-the-birthplace-of-st-john-of-the-cross-iglesia-casa-natal-de-san-juan-de-la-cruz';
UPDATE site_edits SET site_id = 'es-fontiveros-church-of-the-birthplace-of-st-john-of-the-cross' WHERE site_id = 'es-fontiveros-church-of-the-birthplace-of-st-john-of-the-cross-iglesia-casa-natal-de-san-juan-de-la-cruz';
UPDATE pending_submissions SET site_id = 'es-fontiveros-church-of-the-birthplace-of-st-john-of-the-cross' WHERE site_id = 'es-fontiveros-church-of-the-birthplace-of-st-john-of-the-cross-iglesia-casa-natal-de-san-juan-de-la-cruz';

-- ── ID RENAME: es-granada-convento-de-san-jose-granada
--              → es-granada-convent-of-st-joseph
UPDATE sites SET
  id = 'es-granada-convent-of-st-joseph',
  name = 'Convent of St. Joseph',
  short_description = 'The sixteenth of 17 communities founded by St. Teresa of Avila, in 1582.  Co-founded with St. John of the Cross.',
  latitude = 37.1750625813513,
  longitude = -3.5968725,
  google_maps_url = 'https://maps.app.goo.gl/zn3fiPwZ7TKSCTAi9',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = 'Convento de San José',
  country = 'ES',
  municipality = 'Granada',
  updated_at = now()
WHERE id = 'es-granada-convento-de-san-jose-granada';
UPDATE site_images SET site_id = 'es-granada-convent-of-st-joseph' WHERE site_id = 'es-granada-convento-de-san-jose-granada';
UPDATE site_links SET site_id = 'es-granada-convent-of-st-joseph' WHERE site_id = 'es-granada-convento-de-san-jose-granada';
UPDATE site_tag_assignments SET site_id = 'es-granada-convent-of-st-joseph' WHERE site_id = 'es-granada-convento-de-san-jose-granada';
UPDATE site_contributor_notes SET site_id = 'es-granada-convent-of-st-joseph' WHERE site_id = 'es-granada-convento-de-san-jose-granada';
UPDATE site_edits SET site_id = 'es-granada-convent-of-st-joseph' WHERE site_id = 'es-granada-convento-de-san-jose-granada';
UPDATE pending_submissions SET site_id = 'es-granada-convent-of-st-joseph' WHERE site_id = 'es-granada-convento-de-san-jose-granada';

-- ── ID RENAME: es-la-alberca-monasterio-de-las-batuecas
--              → es-la-alberca-monastery-of-st-joseph-in-las-bautecas
UPDATE sites SET
  id = 'es-la-alberca-monastery-of-st-joseph-in-las-bautecas',
  name = 'Monastery of St. Joseph in Las Bautecas',
  short_description = 'The seventh of 17 communities founded by St. Teresa of Avila in 1578.  Its secluded setting reflects her desire for a life dedicated to prayer and contemplation.  As noted on the official site - the Carmelite Desert, more than a geographical place, is an interior experience of solitude and contemplation.

The monastery accepts pilgrims looking for a contemplative retreat.  Guests are invited to participate in community prayers.',
  latitude = 40.4611684740194,
  longitude = -6.14685648465537,
  google_maps_url = 'https://maps.app.goo.gl/D8sC9cWgNAcZ4cQZA',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = 'Monasterio de San José de las Batuecas',
  country = 'ES',
  municipality = 'La Alberca',
  updated_at = now()
WHERE id = 'es-la-alberca-monasterio-de-las-batuecas';
UPDATE site_images SET site_id = 'es-la-alberca-monastery-of-st-joseph-in-las-bautecas' WHERE site_id = 'es-la-alberca-monasterio-de-las-batuecas';
UPDATE site_links SET site_id = 'es-la-alberca-monastery-of-st-joseph-in-las-bautecas' WHERE site_id = 'es-la-alberca-monasterio-de-las-batuecas';
UPDATE site_tag_assignments SET site_id = 'es-la-alberca-monastery-of-st-joseph-in-las-bautecas' WHERE site_id = 'es-la-alberca-monasterio-de-las-batuecas';
UPDATE site_contributor_notes SET site_id = 'es-la-alberca-monastery-of-st-joseph-in-las-bautecas' WHERE site_id = 'es-la-alberca-monasterio-de-las-batuecas';
UPDATE site_edits SET site_id = 'es-la-alberca-monastery-of-st-joseph-in-las-bautecas' WHERE site_id = 'es-la-alberca-monasterio-de-las-batuecas';
UPDATE pending_submissions SET site_id = 'es-la-alberca-monastery-of-st-joseph-in-las-bautecas' WHERE site_id = 'es-la-alberca-monasterio-de-las-batuecas';

-- ── ID RENAME: es-malagon-convento-de-san-jose-malagon
--              → es-malagon-convent-of-st-joseph
UPDATE sites SET
  id = 'es-malagon-convent-of-st-joseph',
  name = 'Convent of St. Joseph',
  short_description = 'The third of 17 communities founded by St. Teresa of Avila, in 1568.',
  latitude = 39.1728365063378,
  longitude = -3.85185117116384,
  google_maps_url = 'https://maps.app.goo.gl/GmPLL4ULVAuPzNi79',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = 'Convento de San José de Malagón',
  country = 'ES',
  municipality = 'Malagon',
  updated_at = now()
WHERE id = 'es-malagon-convento-de-san-jose-malagon';
UPDATE site_images SET site_id = 'es-malagon-convent-of-st-joseph' WHERE site_id = 'es-malagon-convento-de-san-jose-malagon';
UPDATE site_links SET site_id = 'es-malagon-convent-of-st-joseph' WHERE site_id = 'es-malagon-convento-de-san-jose-malagon';
UPDATE site_tag_assignments SET site_id = 'es-malagon-convent-of-st-joseph' WHERE site_id = 'es-malagon-convento-de-san-jose-malagon';
UPDATE site_contributor_notes SET site_id = 'es-malagon-convent-of-st-joseph' WHERE site_id = 'es-malagon-convento-de-san-jose-malagon';
UPDATE site_edits SET site_id = 'es-malagon-convent-of-st-joseph' WHERE site_id = 'es-malagon-convento-de-san-jose-malagon';
UPDATE pending_submissions SET site_id = 'es-malagon-convent-of-st-joseph' WHERE site_id = 'es-malagon-convento-de-san-jose-malagon';

-- ── ID RENAME: es-medina-del-campo-convento-de-san-jose-medina-del-campo
--              → es-medina-del-campo-convent-of-st-joseph
UPDATE sites SET
  id = 'es-medina-del-campo-convent-of-st-joseph',
  name = 'Convent of St. Joseph',
  short_description = 'The second of 17 communities founded by St. Teresa of Avila, in 1567, and also where she met and influenced St. John of the Cross.

Now houses a museum.',
  latitude = 41.3113998473347,
  longitude = -4.91932488465537,
  google_maps_url = 'https://maps.app.goo.gl/g24x13T571igu5eH7',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = 'Convento de San José',
  country = 'ES',
  municipality = 'Medina del Campo',
  updated_at = now()
WHERE id = 'es-medina-del-campo-convento-de-san-jose-medina-del-campo';
UPDATE site_images SET site_id = 'es-medina-del-campo-convent-of-st-joseph' WHERE site_id = 'es-medina-del-campo-convento-de-san-jose-medina-del-campo';
UPDATE site_links SET site_id = 'es-medina-del-campo-convent-of-st-joseph' WHERE site_id = 'es-medina-del-campo-convento-de-san-jose-medina-del-campo';
UPDATE site_tag_assignments SET site_id = 'es-medina-del-campo-convent-of-st-joseph' WHERE site_id = 'es-medina-del-campo-convento-de-san-jose-medina-del-campo';
UPDATE site_contributor_notes SET site_id = 'es-medina-del-campo-convent-of-st-joseph' WHERE site_id = 'es-medina-del-campo-convento-de-san-jose-medina-del-campo';
UPDATE site_edits SET site_id = 'es-medina-del-campo-convent-of-st-joseph' WHERE site_id = 'es-medina-del-campo-convento-de-san-jose-medina-del-campo';
UPDATE pending_submissions SET site_id = 'es-medina-del-campo-convent-of-st-joseph' WHERE site_id = 'es-medina-del-campo-convento-de-san-jose-medina-del-campo';

-- ── ID RENAME: es-palencia-st-bernard-church-iglesia-de-san-bernardo-palencia
--              → es-palencia-church-of-st-bernard
UPDATE sites SET
  id = 'es-palencia-church-of-st-bernard',
  name = 'Church of St. Bernard',
  short_description = 'The fourteenth of 17 communities founded by St. Teresa of Avila, in 1580.  It is likely the original convent is no longer in existence, though a church remains.',
  latitude = 42.0076724799919,
  longitude = -4.53147064662605,
  google_maps_url = 'https://maps.app.goo.gl/QGSiuTmxvKVYcmnp7',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = 'Iglesia de San Bernardo',
  country = 'ES',
  municipality = 'Palencia',
  updated_at = now()
WHERE id = 'es-palencia-st-bernard-church-iglesia-de-san-bernardo-palencia';
UPDATE site_images SET site_id = 'es-palencia-church-of-st-bernard' WHERE site_id = 'es-palencia-st-bernard-church-iglesia-de-san-bernardo-palencia';
UPDATE site_links SET site_id = 'es-palencia-church-of-st-bernard' WHERE site_id = 'es-palencia-st-bernard-church-iglesia-de-san-bernardo-palencia';
UPDATE site_tag_assignments SET site_id = 'es-palencia-church-of-st-bernard' WHERE site_id = 'es-palencia-st-bernard-church-iglesia-de-san-bernardo-palencia';
UPDATE site_contributor_notes SET site_id = 'es-palencia-church-of-st-bernard' WHERE site_id = 'es-palencia-st-bernard-church-iglesia-de-san-bernardo-palencia';
UPDATE site_edits SET site_id = 'es-palencia-church-of-st-bernard' WHERE site_id = 'es-palencia-st-bernard-church-iglesia-de-san-bernardo-palencia';
UPDATE pending_submissions SET site_id = 'es-palencia-church-of-st-bernard' WHERE site_id = 'es-palencia-st-bernard-church-iglesia-de-san-bernardo-palencia';

-- ── ID RENAME: es-pastrana-convento-del-carmen-pastrana
--              → es-pastrana-convent-of-carmel
UPDATE sites SET
  id = 'es-pastrana-convent-of-carmel',
  name = 'Convent of Carmel',
  short_description = 'The sixth of 17 communities founded by St. Teresa of Avila, in 1569.  St. John of the Cross may have written his *Dark Night of the Soul* and *Ascent of Mount Carmel* here.

In 1836 the convent was confiscated by the Spanish government, but in 1855 was reoccupied by Conceptionist Franciscan nuns.  Today it serves as a Conceptionist convent and Teresan museum.',
  latitude = 40.4050876865406,
  longitude = -2.91725329352686,
  google_maps_url = 'https://maps.app.goo.gl/qrjL4k6VdsJmEtF57',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = 'Convento del Carmen',
  country = 'ES',
  municipality = 'Pastrana',
  updated_at = now()
WHERE id = 'es-pastrana-convento-del-carmen-pastrana';
UPDATE site_images SET site_id = 'es-pastrana-convent-of-carmel' WHERE site_id = 'es-pastrana-convento-del-carmen-pastrana';
UPDATE site_links SET site_id = 'es-pastrana-convent-of-carmel' WHERE site_id = 'es-pastrana-convento-del-carmen-pastrana';
UPDATE site_tag_assignments SET site_id = 'es-pastrana-convent-of-carmel' WHERE site_id = 'es-pastrana-convento-del-carmen-pastrana';
UPDATE site_contributor_notes SET site_id = 'es-pastrana-convent-of-carmel' WHERE site_id = 'es-pastrana-convento-del-carmen-pastrana';
UPDATE site_edits SET site_id = 'es-pastrana-convent-of-carmel' WHERE site_id = 'es-pastrana-convento-del-carmen-pastrana';
UPDATE pending_submissions SET site_id = 'es-pastrana-convent-of-carmel' WHERE site_id = 'es-pastrana-convento-del-carmen-pastrana';

-- ── ID RENAME: es-santiago-de-compostela-metropolitan-archcathedral-basilica-of-santiago-de-compostela-catedral-de-santiago
--              → es-santiago-de-compostela-metropolitan-archcathedral-basilica-of-santiago-de-compostela
UPDATE sites SET
  id = 'es-santiago-de-compostela-metropolitan-archcathedral-basilica-of-santiago-de-compostela',
  name = 'Metropolitan Archcathedral Basilica of Santiago de Compostela',
  short_description = 'This cathedral is the reputed burial place of St. James the Great, one of the twelve apostles.  According to tradition, his tomb was rediscovered in 814 AD by St. Pelagius the Hermit.

One of the most famous pilgrimage destinations in the world, it lies at the end of the Camino de Santiago, or Way of St. James.  Today the church is the centerpiece of the larger Santiago de Compostela UNESCO World Heritage Site.',
  latitude = 42.8806093820127,
  longitude = -8.5443954,
  google_maps_url = 'https://maps.app.goo.gl/KvKB4tYxpqkPaWUa6',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Catedral de Santiago de Compostela',
  country = 'ES',
  municipality = 'Santiago de Compostela',
  updated_at = now()
WHERE id = 'es-santiago-de-compostela-metropolitan-archcathedral-basilica-of-santiago-de-compostela-catedral-de-santiago';
UPDATE site_images SET site_id = 'es-santiago-de-compostela-metropolitan-archcathedral-basilica-of-santiago-de-compostela' WHERE site_id = 'es-santiago-de-compostela-metropolitan-archcathedral-basilica-of-santiago-de-compostela-catedral-de-santiago';
UPDATE site_links SET site_id = 'es-santiago-de-compostela-metropolitan-archcathedral-basilica-of-santiago-de-compostela' WHERE site_id = 'es-santiago-de-compostela-metropolitan-archcathedral-basilica-of-santiago-de-compostela-catedral-de-santiago';
UPDATE site_tag_assignments SET site_id = 'es-santiago-de-compostela-metropolitan-archcathedral-basilica-of-santiago-de-compostela' WHERE site_id = 'es-santiago-de-compostela-metropolitan-archcathedral-basilica-of-santiago-de-compostela-catedral-de-santiago';
UPDATE site_contributor_notes SET site_id = 'es-santiago-de-compostela-metropolitan-archcathedral-basilica-of-santiago-de-compostela' WHERE site_id = 'es-santiago-de-compostela-metropolitan-archcathedral-basilica-of-santiago-de-compostela-catedral-de-santiago';
UPDATE site_edits SET site_id = 'es-santiago-de-compostela-metropolitan-archcathedral-basilica-of-santiago-de-compostela' WHERE site_id = 'es-santiago-de-compostela-metropolitan-archcathedral-basilica-of-santiago-de-compostela-catedral-de-santiago';
UPDATE pending_submissions SET site_id = 'es-santiago-de-compostela-metropolitan-archcathedral-basilica-of-santiago-de-compostela' WHERE site_id = 'es-santiago-de-compostela-metropolitan-archcathedral-basilica-of-santiago-de-compostela-catedral-de-santiago';

-- ── ID RENAME: es-segovia-convent-of-st-john-of-the-cross-convento-de-san-juan-de-la-cruz
--              → es-segovia-convent-of-st-john-of-the-cross
UPDATE sites SET
  id = 'es-segovia-convent-of-st-john-of-the-cross',
  name = 'Convent of St. John of the Cross',
  short_description = 'St. John of the Cross founded the convent in 1588 and led the community as prior until 1591.  His head and body are located in a side chapel.

Although no longer an active monastery, the site serves as a sanctuary for spiritual exercises.  Pope St. John Paul II visited the site in 1982.',
  latitude = 40.955391357159,
  longitude = -4.13347186323157,
  google_maps_url = 'https://maps.app.goo.gl/Ah77UgAkmbUHvKR98',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JMM',
  native_name = 'Convento de San Juan de la Cruz',
  country = 'ES',
  municipality = 'Segovia',
  updated_at = now()
WHERE id = 'es-segovia-convent-of-st-john-of-the-cross-convento-de-san-juan-de-la-cruz';
UPDATE site_images SET site_id = 'es-segovia-convent-of-st-john-of-the-cross' WHERE site_id = 'es-segovia-convent-of-st-john-of-the-cross-convento-de-san-juan-de-la-cruz';
UPDATE site_links SET site_id = 'es-segovia-convent-of-st-john-of-the-cross' WHERE site_id = 'es-segovia-convent-of-st-john-of-the-cross-convento-de-san-juan-de-la-cruz';
UPDATE site_tag_assignments SET site_id = 'es-segovia-convent-of-st-john-of-the-cross' WHERE site_id = 'es-segovia-convent-of-st-john-of-the-cross-convento-de-san-juan-de-la-cruz';
UPDATE site_contributor_notes SET site_id = 'es-segovia-convent-of-st-john-of-the-cross' WHERE site_id = 'es-segovia-convent-of-st-john-of-the-cross-convento-de-san-juan-de-la-cruz';
UPDATE site_edits SET site_id = 'es-segovia-convent-of-st-john-of-the-cross' WHERE site_id = 'es-segovia-convent-of-st-john-of-the-cross-convento-de-san-juan-de-la-cruz';
UPDATE pending_submissions SET site_id = 'es-segovia-convent-of-st-john-of-the-cross' WHERE site_id = 'es-segovia-convent-of-st-john-of-the-cross-convento-de-san-juan-de-la-cruz';

-- ── ID RENAME: es-segovia-convento-de-san-jose-segovia
--              → es-segovia-convent-of-st-joseph
UPDATE sites SET
  id = 'es-segovia-convent-of-st-joseph',
  name = 'Convent of St. Joseph',
  short_description = 'The ninth of 17 communities founded by St. Teresa of Avila, in 1574.',
  latitude = 40.9511969074217,
  longitude = -4.12682272001028,
  google_maps_url = 'https://maps.app.goo.gl/wgbu8Ryg6S9CxKYy8',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = 'Convento de San José',
  country = 'ES',
  municipality = 'Segovia',
  updated_at = now()
WHERE id = 'es-segovia-convento-de-san-jose-segovia';
UPDATE site_images SET site_id = 'es-segovia-convent-of-st-joseph' WHERE site_id = 'es-segovia-convento-de-san-jose-segovia';
UPDATE site_links SET site_id = 'es-segovia-convent-of-st-joseph' WHERE site_id = 'es-segovia-convento-de-san-jose-segovia';
UPDATE site_tag_assignments SET site_id = 'es-segovia-convent-of-st-joseph' WHERE site_id = 'es-segovia-convento-de-san-jose-segovia';
UPDATE site_contributor_notes SET site_id = 'es-segovia-convent-of-st-joseph' WHERE site_id = 'es-segovia-convento-de-san-jose-segovia';
UPDATE site_edits SET site_id = 'es-segovia-convent-of-st-joseph' WHERE site_id = 'es-segovia-convento-de-san-jose-segovia';
UPDATE pending_submissions SET site_id = 'es-segovia-convent-of-st-joseph' WHERE site_id = 'es-segovia-convento-de-san-jose-segovia';

-- ── ID RENAME: es-seville-convento-de-san-jose-del-carmen-las-teresas-seville
--              → es-seville-convent-of-st-joseph-of-carmel-las-teresas
UPDATE sites SET
  id = 'es-seville-convent-of-st-joseph-of-carmel-las-teresas',
  name = 'Convent of St. Joseph of Carmel (Las Teresas)',
  short_description = 'The eleventh of 17 communities founded by St. Teresa of Avila, in 1575.  This convent does not appear open to the public.',
  latitude = 37.3858007514651,
  longitude = -5.98899388465537,
  google_maps_url = 'https://maps.app.goo.gl/zdywBW2FHUVccbzE9',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = 'Convento de San José del Carmen',
  country = 'ES',
  municipality = 'Seville',
  updated_at = now()
WHERE id = 'es-seville-convento-de-san-jose-del-carmen-las-teresas-seville';
UPDATE site_images SET site_id = 'es-seville-convent-of-st-joseph-of-carmel-las-teresas' WHERE site_id = 'es-seville-convento-de-san-jose-del-carmen-las-teresas-seville';
UPDATE site_links SET site_id = 'es-seville-convent-of-st-joseph-of-carmel-las-teresas' WHERE site_id = 'es-seville-convento-de-san-jose-del-carmen-las-teresas-seville';
UPDATE site_tag_assignments SET site_id = 'es-seville-convent-of-st-joseph-of-carmel-las-teresas' WHERE site_id = 'es-seville-convento-de-san-jose-del-carmen-las-teresas-seville';
UPDATE site_contributor_notes SET site_id = 'es-seville-convent-of-st-joseph-of-carmel-las-teresas' WHERE site_id = 'es-seville-convento-de-san-jose-del-carmen-las-teresas-seville';
UPDATE site_edits SET site_id = 'es-seville-convent-of-st-joseph-of-carmel-las-teresas' WHERE site_id = 'es-seville-convento-de-san-jose-del-carmen-las-teresas-seville';
UPDATE pending_submissions SET site_id = 'es-seville-convent-of-st-joseph-of-carmel-las-teresas' WHERE site_id = 'es-seville-convento-de-san-jose-del-carmen-las-teresas-seville';

-- ── ID RENAME: es-soria-convent-of-our-lady-of-carmen-convento-de-nuestra-senora-del-carmen-soria
--              → es-soria-convent-of-our-lady-of-carmel
UPDATE sites SET
  id = 'es-soria-convent-of-our-lady-of-carmel',
  name = 'Convent of Our Lady of Carmel',
  short_description = 'The fifteenth of 17 communities founded by St. Teresa of Avila, in 1581.',
  latitude = 41.7646254483495,
  longitude = -2.46296793728833,
  google_maps_url = 'https://maps.app.goo.gl/o3dHxc9Y3FTbXt4W8',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = 'Convento de Nuestra Señora del Carmen',
  country = 'ES',
  municipality = 'Soria',
  updated_at = now()
WHERE id = 'es-soria-convent-of-our-lady-of-carmen-convento-de-nuestra-senora-del-carmen-soria';
UPDATE site_images SET site_id = 'es-soria-convent-of-our-lady-of-carmel' WHERE site_id = 'es-soria-convent-of-our-lady-of-carmen-convento-de-nuestra-senora-del-carmen-soria';
UPDATE site_links SET site_id = 'es-soria-convent-of-our-lady-of-carmel' WHERE site_id = 'es-soria-convent-of-our-lady-of-carmen-convento-de-nuestra-senora-del-carmen-soria';
UPDATE site_tag_assignments SET site_id = 'es-soria-convent-of-our-lady-of-carmel' WHERE site_id = 'es-soria-convent-of-our-lady-of-carmen-convento-de-nuestra-senora-del-carmen-soria';
UPDATE site_contributor_notes SET site_id = 'es-soria-convent-of-our-lady-of-carmel' WHERE site_id = 'es-soria-convent-of-our-lady-of-carmen-convento-de-nuestra-senora-del-carmen-soria';
UPDATE site_edits SET site_id = 'es-soria-convent-of-our-lady-of-carmel' WHERE site_id = 'es-soria-convent-of-our-lady-of-carmen-convento-de-nuestra-senora-del-carmen-soria';
UPDATE pending_submissions SET site_id = 'es-soria-convent-of-our-lady-of-carmel' WHERE site_id = 'es-soria-convent-of-our-lady-of-carmen-convento-de-nuestra-senora-del-carmen-soria';

-- ── ID RENAME: es-toledo-convento-de-san-jose-toledo
--              → es-toledo-convent-of-st-joseph
UPDATE sites SET
  id = 'es-toledo-convent-of-st-joseph',
  name = 'Convent of St. Joseph',
  short_description = 'The fifth of 17 communities founded by St. Teresa of Avila, in 1569.',
  latitude = 39.8603574994518,
  longitude = -4.02473433549618,
  google_maps_url = 'https://maps.app.goo.gl/cbYEidWeuQZdYNPy5',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = 'Convento de San José',
  country = 'ES',
  municipality = 'Toledo',
  updated_at = now()
WHERE id = 'es-toledo-convento-de-san-jose-toledo';
UPDATE site_images SET site_id = 'es-toledo-convent-of-st-joseph' WHERE site_id = 'es-toledo-convento-de-san-jose-toledo';
UPDATE site_links SET site_id = 'es-toledo-convent-of-st-joseph' WHERE site_id = 'es-toledo-convento-de-san-jose-toledo';
UPDATE site_tag_assignments SET site_id = 'es-toledo-convent-of-st-joseph' WHERE site_id = 'es-toledo-convento-de-san-jose-toledo';
UPDATE site_contributor_notes SET site_id = 'es-toledo-convent-of-st-joseph' WHERE site_id = 'es-toledo-convento-de-san-jose-toledo';
UPDATE site_edits SET site_id = 'es-toledo-convent-of-st-joseph' WHERE site_id = 'es-toledo-convento-de-san-jose-toledo';
UPDATE pending_submissions SET site_id = 'es-toledo-convent-of-st-joseph' WHERE site_id = 'es-toledo-convento-de-san-jose-toledo';

-- ── ID RENAME: es-ubeda-oratory-of-st-john-of-the-cross-oratorio-de-san-juan-de-la-cruz
--              → es-ubeda-oratory-of-st-john-of-the-cross
UPDATE sites SET
  id = 'es-ubeda-oratory-of-st-john-of-the-cross',
  name = 'Oratory of St. John of the Cross',
  short_description = 'In 1591, St. John of the Cross died here, the site of a former monastery.  Today, there is a chapel housing his relics (a hand and leg) and a museum related to his life.',
  latitude = 38.0097164534484,
  longitude = -3.36573704226182,
  google_maps_url = 'https://maps.app.goo.gl/TqAqX6N8ZHy2Wsvo7',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JMM',
  native_name = 'Oratorio de San Juan de la Cruz',
  country = 'ES',
  municipality = 'Ubeda',
  updated_at = now()
WHERE id = 'es-ubeda-oratory-of-st-john-of-the-cross-oratorio-de-san-juan-de-la-cruz';
UPDATE site_images SET site_id = 'es-ubeda-oratory-of-st-john-of-the-cross' WHERE site_id = 'es-ubeda-oratory-of-st-john-of-the-cross-oratorio-de-san-juan-de-la-cruz';
UPDATE site_links SET site_id = 'es-ubeda-oratory-of-st-john-of-the-cross' WHERE site_id = 'es-ubeda-oratory-of-st-john-of-the-cross-oratorio-de-san-juan-de-la-cruz';
UPDATE site_tag_assignments SET site_id = 'es-ubeda-oratory-of-st-john-of-the-cross' WHERE site_id = 'es-ubeda-oratory-of-st-john-of-the-cross-oratorio-de-san-juan-de-la-cruz';
UPDATE site_contributor_notes SET site_id = 'es-ubeda-oratory-of-st-john-of-the-cross' WHERE site_id = 'es-ubeda-oratory-of-st-john-of-the-cross-oratorio-de-san-juan-de-la-cruz';
UPDATE site_edits SET site_id = 'es-ubeda-oratory-of-st-john-of-the-cross' WHERE site_id = 'es-ubeda-oratory-of-st-john-of-the-cross-oratorio-de-san-juan-de-la-cruz';
UPDATE pending_submissions SET site_id = 'es-ubeda-oratory-of-st-john-of-the-cross' WHERE site_id = 'es-ubeda-oratory-of-st-john-of-the-cross-oratorio-de-san-juan-de-la-cruz';

-- ── ID RENAME: es-valladolid-convento-de-santa-teresa-valladolid
--              → es-valladolid-convent-of-st-teresa
UPDATE sites SET
  id = 'es-valladolid-convent-of-st-teresa',
  name = 'Convent of St. Teresa',
  short_description = 'The fourth of 17 communities founded by St. Teresa of Avila, in 1568.',
  latitude = 41.6598863777792,
  longitude = -4.72687771534462,
  google_maps_url = 'https://maps.app.goo.gl/pp7pyPitP3SE4NZN7',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = 'Convento de Santa Teresa',
  country = 'ES',
  municipality = 'Valladolid',
  updated_at = now()
WHERE id = 'es-valladolid-convento-de-santa-teresa-valladolid';
UPDATE site_images SET site_id = 'es-valladolid-convent-of-st-teresa' WHERE site_id = 'es-valladolid-convento-de-santa-teresa-valladolid';
UPDATE site_links SET site_id = 'es-valladolid-convent-of-st-teresa' WHERE site_id = 'es-valladolid-convento-de-santa-teresa-valladolid';
UPDATE site_tag_assignments SET site_id = 'es-valladolid-convent-of-st-teresa' WHERE site_id = 'es-valladolid-convento-de-santa-teresa-valladolid';
UPDATE site_contributor_notes SET site_id = 'es-valladolid-convent-of-st-teresa' WHERE site_id = 'es-valladolid-convento-de-santa-teresa-valladolid';
UPDATE site_edits SET site_id = 'es-valladolid-convent-of-st-teresa' WHERE site_id = 'es-valladolid-convento-de-santa-teresa-valladolid';
UPDATE pending_submissions SET site_id = 'es-valladolid-convent-of-st-teresa' WHERE site_id = 'es-valladolid-convento-de-santa-teresa-valladolid';

-- ── ID RENAME: es-villanueva-de-la-jara-convento-de-santa-ana-villanueva-de-la-jara
--              → es-villanueva-de-la-jara-convent-of-st-anne
UPDATE sites SET
  id = 'es-villanueva-de-la-jara-convent-of-st-anne',
  name = 'Convent of St. Anne',
  short_description = 'The thirteenth of 17 communities founded by St. Teresa of Avila, in 1580.',
  latitude = 39.4396102153669,
  longitude = -1.95650919993269,
  google_maps_url = 'https://maps.app.goo.gl/YUpoSZLPQwtT4u2X9',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = 'Convento de Santa Ana',
  country = 'ES',
  municipality = 'Villanueva de la Jara',
  updated_at = now()
WHERE id = 'es-villanueva-de-la-jara-convento-de-santa-ana-villanueva-de-la-jara';
UPDATE site_images SET site_id = 'es-villanueva-de-la-jara-convent-of-st-anne' WHERE site_id = 'es-villanueva-de-la-jara-convento-de-santa-ana-villanueva-de-la-jara';
UPDATE site_links SET site_id = 'es-villanueva-de-la-jara-convent-of-st-anne' WHERE site_id = 'es-villanueva-de-la-jara-convento-de-santa-ana-villanueva-de-la-jara';
UPDATE site_tag_assignments SET site_id = 'es-villanueva-de-la-jara-convent-of-st-anne' WHERE site_id = 'es-villanueva-de-la-jara-convento-de-santa-ana-villanueva-de-la-jara';
UPDATE site_contributor_notes SET site_id = 'es-villanueva-de-la-jara-convent-of-st-anne' WHERE site_id = 'es-villanueva-de-la-jara-convento-de-santa-ana-villanueva-de-la-jara';
UPDATE site_edits SET site_id = 'es-villanueva-de-la-jara-convent-of-st-anne' WHERE site_id = 'es-villanueva-de-la-jara-convento-de-santa-ana-villanueva-de-la-jara';
UPDATE pending_submissions SET site_id = 'es-villanueva-de-la-jara-convent-of-st-anne' WHERE site_id = 'es-villanueva-de-la-jara-convento-de-santa-ana-villanueva-de-la-jara';

-- es-zaragoza-cathedral-basilica-of-our-lady-of-the-pillar
UPDATE sites SET
  name = 'Cathedral-Basilica of Our Lady of the Pillar',
  short_description = 'According to ancient Christian tradition, Mary appeared to the apostle James the Greater as he was preaching in Spain.  In 40 AD, while facing severe discouragement, St. James was praying on the banks of the Ebro River when the Blessed Mother appeared to him on a column, encouraging him to persevere in his missionary efforts.  This apparition is unique because Mary would have bilocated while still alive in Jerusalem or Ephesus.',
  latitude = 41.6566567693307,
  longitude = -0.878240620546361,
  google_maps_url = 'https://maps.app.goo.gl/JuYhPiw2NEccphcH7',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Catedral-Basílica de Nuestra Señora del Pilar',
  country = 'ES',
  municipality = 'Zaragoza',
  updated_at = now()
WHERE id = 'es-zaragoza-cathedral-basilica-of-our-lady-of-the-pillar';

-- fr-alencon-birthplace-of-st-therese
UPDATE sites SET
  name = 'Birthplace of St. Therese',
  short_description = 'The family home in AlenÃ§on where St. Therese was born in 1873, and where the Martin family lived.  Today it is the focal point of the Sanctuary of Louis and Zelie.',
  latitude = 48.4323326,
  longitude = 0.0916869,
  google_maps_url = 'https://maps.app.goo.gl/fR2tak4YDvUFKTMF7',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = 'Maison Natale de Sainte Therese',
  country = 'FR',
  municipality = 'Alencon',
  updated_at = now()
WHERE id = 'fr-alencon-birthplace-of-st-therese';

-- fr-la-salette-fallavaux-sanctuary-of-our-lady-of-la-salette
UPDATE sites SET
  name = 'Sanctuary of Our Lady of La Salette',
  short_description = 'In 1846, the Blessed Virgin Mary appeared to 11-year-old Maximin Giraud and 14-year-old Melanie Calvat-Mathieu while they tended sheep in a small French Alpine village.  Her appearance in sorrow and tears called for conversion and repentance.',
  latitude = 44.8586296,
  longitude = 5.9788044,
  google_maps_url = 'https://maps.app.goo.gl/Nz5GoFMxGqfD8KkZ8',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Sanctuaire Notre-Dame de la Salette',
  country = 'FR',
  municipality = 'La Salette-Fallavaux',
  updated_at = now()
WHERE id = 'fr-la-salette-fallavaux-sanctuary-of-our-lady-of-la-salette';

-- fr-le-puy-en-velay-cathedral-of-our-lady-of-puy
UPDATE sites SET
  name = 'Cathedral of Our Lady of Puy',
  short_description = 'In 47 AD, Our Lady appeared to a recent Christian convert, in a chapel built few years before on a high mountain. This woman was plagued by a serious illness and no doctor had been able to help.  The Blessed Mother, during her appearance, completely cured her.',
  latitude = 45.0456296446269,
  longitude = 3.88463383893332,
  google_maps_url = 'https://maps.app.goo.gl/7VtcwmudYzNpZ6Fy8',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Cathédrale Notre-Dame-du-Puy',
  country = 'FR',
  municipality = 'Le Puy-en-Velay',
  updated_at = now()
WHERE id = 'fr-le-puy-en-velay-cathedral-of-our-lady-of-puy';

-- ── ID RENAME: fr-lisieux-basilica-st-therese-lisieux
--              → fr-lisieux-basilica-of-st-therese-of-lisieux
UPDATE sites SET
  id = 'fr-lisieux-basilica-of-st-therese-of-lisieux',
  name = 'Basilica of St. Therese of Lisieux',
  short_description = 'The Basilica of St. Therese of Lisieux is the second-largest pilgrimage site in France after Lourdes, dedicated to one of the most popular saints of modern times.',
  latitude = 49.1414,
  longitude = 0.2271,
  google_maps_url = 'https://maps.app.goo.gl/ZqawMA9FUKwtCBp88',
  featured = TRUE,
  interest = 'regional',
  contributor = 'JMM',
  native_name = 'Basilique Sainte-Thérèse de Lisieux',
  country = 'FR',
  municipality = 'Lisieux',
  updated_at = now()
WHERE id = 'fr-lisieux-basilica-st-therese-lisieux';
UPDATE site_images SET site_id = 'fr-lisieux-basilica-of-st-therese-of-lisieux' WHERE site_id = 'fr-lisieux-basilica-st-therese-lisieux';
UPDATE site_links SET site_id = 'fr-lisieux-basilica-of-st-therese-of-lisieux' WHERE site_id = 'fr-lisieux-basilica-st-therese-lisieux';
UPDATE site_tag_assignments SET site_id = 'fr-lisieux-basilica-of-st-therese-of-lisieux' WHERE site_id = 'fr-lisieux-basilica-st-therese-lisieux';
UPDATE site_contributor_notes SET site_id = 'fr-lisieux-basilica-of-st-therese-of-lisieux' WHERE site_id = 'fr-lisieux-basilica-st-therese-lisieux';
UPDATE site_edits SET site_id = 'fr-lisieux-basilica-of-st-therese-of-lisieux' WHERE site_id = 'fr-lisieux-basilica-st-therese-lisieux';
UPDATE pending_submissions SET site_id = 'fr-lisieux-basilica-of-st-therese-of-lisieux' WHERE site_id = 'fr-lisieux-basilica-st-therese-lisieux';

-- fr-lourdes-sanctuary-of-our-lady-of-lourdes
UPDATE sites SET
  name = 'Sanctuary of Our Lady of Lourdes',
  short_description = 'In a series of apparitions in 1858, the Virgin Mary appeared to St. Bernadette Soubirous.  The stream of holy water which St. Bernadette uncovered has become a well-known source of healing, and Lourdes is now a major pilgrimage destination.',
  latitude = 43.0974206,
  longitude = -0.0582611,
  google_maps_url = 'https://maps.app.goo.gl/mjXUkxVaTHc6utbD6',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Sanctuaire Notre-Dame de Lourdes',
  country = 'FR',
  municipality = 'Lourdes',
  updated_at = now()
WHERE id = 'fr-lourdes-sanctuary-of-our-lady-of-lourdes';

-- fr-paris-chapel-of-our-lady-of-the-miraculous-medal
UPDATE sites SET
  name = 'Chapel of Our Lady of the Miraculous Medal',
  short_description = 'Catherine Laboure, a novitiate in the order of the Sisters of Charity, received various visions of St. Vincent de Paul and of Jesus present in the Eucharist, before also experiencing two apparitions of the Blessed Virgin Mary.  In the first vision, 1830, Catherine was told of the impending travails of France and of an unspecified future mission.  Several months later she received a message detailing the designs for a medal, later known as the Miraculous Medal, now reproduced over a billion times and distributed around the world.  The apparition was investigated in 1836 and later approved.  St. Catherine worked for 46 more years in hospices of her Order tending to the aged and infirmed, and is now known as the patroness of seniors.  Her body currently lies incorrupt at the site of the apparition in Paris (immediate right side of the altar), alongside St. Louise de Marillac (left of the altar) and the heart of St. Vincent de Paul (furthest right).',
  latitude = 48.8507859,
  longitude = 2.3229912,
  google_maps_url = 'https://maps.app.goo.gl/gR5AXTsyiQMuoXSWA',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Chapelle Notre-Dame-de-la-Médaille-Miraculeuse',
  country = 'FR',
  municipality = 'Paris',
  updated_at = now()
WHERE id = 'fr-paris-chapel-of-our-lady-of-the-miraculous-medal';

-- fr-paris-st-vincent-de-paul-chapel
UPDATE sites SET
  name = 'St. Vincent De Paul Chapel',
  short_description = 'Vincentian church housing the relics of Sts. Vincent de Paul and Jean-Gabriel Perboyre.  St. Vincent de Paul''s heart is nearby at the more famous Miraculous Medal Chapel.',
  latitude = 48.8488573825124,
  longitude = 2.32163111226356,
  google_maps_url = 'https://maps.app.goo.gl/3rsiW6ABvcXZnRm19',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JMM',
  native_name = 'Chapelle Saint-Vincent-de-Paul',
  country = 'FR',
  municipality = 'Paris',
  updated_at = now()
WHERE id = 'fr-paris-st-vincent-de-paul-chapel';

-- ── ID RENAME: fr-pontmain-sanctuary-of-pontmain-mother-of-hope
--              → fr-pontmain-basilica-of-pontmain
UPDATE sites SET
  id = 'fr-pontmain-basilica-of-pontmain',
  name = 'Basilica of Pontmain',
  short_description = 'In 1871, during the Franco-Prussian War, Mary appeared on a farm to students at the nearby convent school.  Her message was written on a banner that unfurled from her feet: "But pray my children. God will hear you in a short time. My Son allows Himself to be moved by compassion." Because of this message, Our Lady of Pontmain is also knows as "Mother of Hope."',
  latitude = 48.4396021,
  longitude = -1.0592325,
  google_maps_url = 'https://maps.app.goo.gl/dJPAVW13MGv1xPrJ7',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Basilique Notre-Dame de Pontmain',
  country = 'FR',
  municipality = 'Pontmain',
  updated_at = now()
WHERE id = 'fr-pontmain-sanctuary-of-pontmain-mother-of-hope';
UPDATE site_images SET site_id = 'fr-pontmain-basilica-of-pontmain' WHERE site_id = 'fr-pontmain-sanctuary-of-pontmain-mother-of-hope';
UPDATE site_links SET site_id = 'fr-pontmain-basilica-of-pontmain' WHERE site_id = 'fr-pontmain-sanctuary-of-pontmain-mother-of-hope';
UPDATE site_tag_assignments SET site_id = 'fr-pontmain-basilica-of-pontmain' WHERE site_id = 'fr-pontmain-sanctuary-of-pontmain-mother-of-hope';
UPDATE site_contributor_notes SET site_id = 'fr-pontmain-basilica-of-pontmain' WHERE site_id = 'fr-pontmain-sanctuary-of-pontmain-mother-of-hope';
UPDATE site_edits SET site_id = 'fr-pontmain-basilica-of-pontmain' WHERE site_id = 'fr-pontmain-sanctuary-of-pontmain-mother-of-hope';
UPDATE pending_submissions SET site_id = 'fr-pontmain-basilica-of-pontmain' WHERE site_id = 'fr-pontmain-sanctuary-of-pontmain-mother-of-hope';

-- fr-saint-etienne-le-laus-sanctuary-of-our-lady-of-laus
UPDATE sites SET
  name = 'Sanctuary of Our Lady of Laus',
  short_description = 'Benoite Rencurel, a poor shepherdess, received apparitions from the Virgin Mary from 1664 until her death in 1718.  During the apparitions, the Blessed Mother asked for a church and a house for priests to be built, with the intent of drawing people to greater conversion, especially through the sacrament of penance.  The holy site now draws 120,000 pilgrims annually, and is associated with numerous physical healings.',
  latitude = 44.5212016,
  longitude = 6.152116,
  google_maps_url = 'https://maps.app.goo.gl/Xnq7wtijV9YHtZ2N7',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Sanctuaire Notre-Dame du Laus',
  country = 'FR',
  municipality = 'Saint-Etienne-le-Laus',
  updated_at = now()
WHERE id = 'fr-saint-etienne-le-laus-sanctuary-of-our-lady-of-laus';

-- ── ID RENAME: gb-city-of-london-marker-of-birth-street-of-st-thomas-more
--              → gb-london-marker-of-birth-street-of-st-thomas-more
UPDATE sites SET
  id = 'gb-london-marker-of-birth-street-of-st-thomas-more',
  name = 'Marker of Birth Street of St. Thomas More',
  short_description = 'Marker to commemorate that St. Thomas More was born near this spot.',
  latitude = 51.5153128613725,
  longitude = -0.0935019757929467,
  google_maps_url = 'https://maps.app.goo.gl/82tdoRLYn6G7X6vKA',
  featured = FALSE,
  interest = 'local',
  contributor = 'JPY',
  native_name = NULL,
  country = 'GB',
  municipality = 'London',
  updated_at = now()
WHERE id = 'gb-city-of-london-marker-of-birth-street-of-st-thomas-more';
UPDATE site_images SET site_id = 'gb-london-marker-of-birth-street-of-st-thomas-more' WHERE site_id = 'gb-city-of-london-marker-of-birth-street-of-st-thomas-more';
UPDATE site_links SET site_id = 'gb-london-marker-of-birth-street-of-st-thomas-more' WHERE site_id = 'gb-city-of-london-marker-of-birth-street-of-st-thomas-more';
UPDATE site_tag_assignments SET site_id = 'gb-london-marker-of-birth-street-of-st-thomas-more' WHERE site_id = 'gb-city-of-london-marker-of-birth-street-of-st-thomas-more';
UPDATE site_contributor_notes SET site_id = 'gb-london-marker-of-birth-street-of-st-thomas-more' WHERE site_id = 'gb-city-of-london-marker-of-birth-street-of-st-thomas-more';
UPDATE site_edits SET site_id = 'gb-london-marker-of-birth-street-of-st-thomas-more' WHERE site_id = 'gb-city-of-london-marker-of-birth-street-of-st-thomas-more';
UPDATE pending_submissions SET site_id = 'gb-london-marker-of-birth-street-of-st-thomas-more' WHERE site_id = 'gb-city-of-london-marker-of-birth-street-of-st-thomas-more';

-- ── ID RENAME: gb-city-of-westminster-corpus-christi-catholic-church
--              → gb-london-corpus-christi-catholic-church
UPDATE sites SET
  id = 'gb-london-corpus-christi-catholic-church',
  name = 'Corpus Christi Catholic Church',
  short_description = 'The oldest church operating as a Catholic Church in the heart of London.  This church was built as an act of reparation for the sins against the Sacrament that had been committed in the time of persecution, and was opened in 1874.  Msgr. Ronald Knox preached here.',
  latitude = 51.5109140070444,
  longitude = -0.122552299990965,
  google_maps_url = 'https://maps.app.goo.gl/8RvGzgr3CAPMTus19',
  featured = FALSE,
  interest = 'local',
  contributor = 'JPY',
  native_name = NULL,
  country = 'GB',
  municipality = 'London',
  updated_at = now()
WHERE id = 'gb-city-of-westminster-corpus-christi-catholic-church';
UPDATE site_images SET site_id = 'gb-london-corpus-christi-catholic-church' WHERE site_id = 'gb-city-of-westminster-corpus-christi-catholic-church';
UPDATE site_links SET site_id = 'gb-london-corpus-christi-catholic-church' WHERE site_id = 'gb-city-of-westminster-corpus-christi-catholic-church';
UPDATE site_tag_assignments SET site_id = 'gb-london-corpus-christi-catholic-church' WHERE site_id = 'gb-city-of-westminster-corpus-christi-catholic-church';
UPDATE site_contributor_notes SET site_id = 'gb-london-corpus-christi-catholic-church' WHERE site_id = 'gb-city-of-westminster-corpus-christi-catholic-church';
UPDATE site_edits SET site_id = 'gb-london-corpus-christi-catholic-church' WHERE site_id = 'gb-city-of-westminster-corpus-christi-catholic-church';
UPDATE pending_submissions SET site_id = 'gb-london-corpus-christi-catholic-church' WHERE site_id = 'gb-city-of-westminster-corpus-christi-catholic-church';

-- ── ID RENAME: gb-city-of-westminster-site-of-tyburn-tree
--              → gb-london-site-of-tyburn-tree
UPDATE sites SET
  id = 'gb-london-site-of-tyburn-tree',
  name = 'Site of Tyburn Tree',
  short_description = 'Tyburn Tree was the name of the gallows where many Catholic martyrs were hung, drawn, and quartered or hung until dead.

The saints, blesseds, and venerables who died on this site include John Houghton, Robert Lawrence, Augustine Webster, Richard Reynolds, Ralph Sherwin, Alexander Briant, Luke Kirby, Margaret Ward, Eustace White, Polydore Plasden, Thomas Garnet, John Roberts, John Almond, Bartholomew Roe, Henry Morse, John Southworth, Oliver Plunkett, John Haile (or Hale), William Exmew, Humphrey Middlemore, Sebastian Newdigate, Robert Johnson, William Filby, Lawrence Richardson, Thomas Cottam, John Storey, Thomas Woodhouse, John Nelson, Thomas Sherwood, Everard Hanse, William Horne, John Larke and German Gardiner.

Down the street to the west is Tyburn Convent.',
  latitude = 51.5133260560522,
  longitude = -0.160381452351621,
  google_maps_url = 'https://maps.app.goo.gl/YUqPFoeupGSYYsnVA',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JPY',
  native_name = NULL,
  country = 'GB',
  municipality = 'London',
  updated_at = now()
WHERE id = 'gb-city-of-westminster-site-of-tyburn-tree';
UPDATE site_images SET site_id = 'gb-london-site-of-tyburn-tree' WHERE site_id = 'gb-city-of-westminster-site-of-tyburn-tree';
UPDATE site_links SET site_id = 'gb-london-site-of-tyburn-tree' WHERE site_id = 'gb-city-of-westminster-site-of-tyburn-tree';
UPDATE site_tag_assignments SET site_id = 'gb-london-site-of-tyburn-tree' WHERE site_id = 'gb-city-of-westminster-site-of-tyburn-tree';
UPDATE site_contributor_notes SET site_id = 'gb-london-site-of-tyburn-tree' WHERE site_id = 'gb-city-of-westminster-site-of-tyburn-tree';
UPDATE site_edits SET site_id = 'gb-london-site-of-tyburn-tree' WHERE site_id = 'gb-city-of-westminster-site-of-tyburn-tree';
UPDATE pending_submissions SET site_id = 'gb-london-site-of-tyburn-tree' WHERE site_id = 'gb-city-of-westminster-site-of-tyburn-tree';

-- ── ID RENAME: gb-city-of-westminster-tyburn-convent
--              → gb-london-tyburn-convent
UPDATE sites SET
  id = 'gb-london-tyburn-convent',
  name = 'Tyburn Convent',
  short_description = 'Convent near Tyburn Tree, containing the relics of dozens of English martyrs.  The order is Foundress of the Adorers of the Sacred Heart of Jesus of Montmartre, Order of St. Benedict, who are dedicated to perpetual adoration.  The foundress of the order, Servant of God Mother Marie Adele Garnier (1838-1924), is also buried here.',
  latitude = 51.5129913325463,
  longitude = -0.163508089325755,
  google_maps_url = 'https://maps.app.goo.gl/CodCST5BzKNTqNwu9',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JPY',
  native_name = NULL,
  country = 'GB',
  municipality = 'London',
  updated_at = now()
WHERE id = 'gb-city-of-westminster-tyburn-convent';
UPDATE site_images SET site_id = 'gb-london-tyburn-convent' WHERE site_id = 'gb-city-of-westminster-tyburn-convent';
UPDATE site_links SET site_id = 'gb-london-tyburn-convent' WHERE site_id = 'gb-city-of-westminster-tyburn-convent';
UPDATE site_tag_assignments SET site_id = 'gb-london-tyburn-convent' WHERE site_id = 'gb-city-of-westminster-tyburn-convent';
UPDATE site_contributor_notes SET site_id = 'gb-london-tyburn-convent' WHERE site_id = 'gb-city-of-westminster-tyburn-convent';
UPDATE site_edits SET site_id = 'gb-london-tyburn-convent' WHERE site_id = 'gb-city-of-westminster-tyburn-convent';
UPDATE pending_submissions SET site_id = 'gb-london-tyburn-convent' WHERE site_id = 'gb-city-of-westminster-tyburn-convent';

-- ── ID RENAME: gb-city-of-westminster-westminster-hall
--              → gb-london-westminster-hall
UPDATE sites SET
  id = 'gb-london-westminster-hall',
  name = 'Westminster Hall',
  short_description = 'Last remaining part of the medieval Palace of Westminster.  The floor includes a plaque commemorating the trial of St. Thomas More, which took place here.  He also served as a member of parliament in this hall.  Other saints who faced trial and conviction here include Ralph Sherwin, Edmund Campion, Oliver Plunkett, William Exmew, John Shert, and Robert Johnson.',
  latitude = 51.500082458633,
  longitude = -0.125463808057498,
  google_maps_url = 'https://maps.app.goo.gl/TFx7P2ztqkzz23Rz9',
  featured = FALSE,
  interest = 'local',
  contributor = 'JPY',
  native_name = NULL,
  country = 'GB',
  municipality = 'London',
  updated_at = now()
WHERE id = 'gb-city-of-westminster-westminster-hall';
UPDATE site_images SET site_id = 'gb-london-westminster-hall' WHERE site_id = 'gb-city-of-westminster-westminster-hall';
UPDATE site_links SET site_id = 'gb-london-westminster-hall' WHERE site_id = 'gb-city-of-westminster-westminster-hall';
UPDATE site_tag_assignments SET site_id = 'gb-london-westminster-hall' WHERE site_id = 'gb-city-of-westminster-westminster-hall';
UPDATE site_contributor_notes SET site_id = 'gb-london-westminster-hall' WHERE site_id = 'gb-city-of-westminster-westminster-hall';
UPDATE site_edits SET site_id = 'gb-london-westminster-hall' WHERE site_id = 'gb-city-of-westminster-westminster-hall';
UPDATE pending_submissions SET site_id = 'gb-london-westminster-hall' WHERE site_id = 'gb-city-of-westminster-westminster-hall';

-- ── ID RENAME: gb-greater-london-lincoln-s-inn
--              → gb-london-lincolns-inn
UPDATE sites SET
  id = 'gb-london-lincolns-inn',
  name = 'Lincoln''s Inn',
  short_description = 'An inn of court dating back to before 1422.  St. Thomas More was a member of this inn.',
  latitude = 51.5160128872822,
  longitude = -0.113407112359035,
  google_maps_url = 'https://maps.app.goo.gl/YxThCzMxziTKtJfo7',
  featured = FALSE,
  interest = 'local',
  contributor = 'JPY',
  native_name = NULL,
  country = 'GB',
  municipality = 'London',
  updated_at = now()
WHERE id = 'gb-greater-london-lincoln-s-inn';
UPDATE site_images SET site_id = 'gb-london-lincolns-inn' WHERE site_id = 'gb-greater-london-lincoln-s-inn';
UPDATE site_links SET site_id = 'gb-london-lincolns-inn' WHERE site_id = 'gb-greater-london-lincoln-s-inn';
UPDATE site_tag_assignments SET site_id = 'gb-london-lincolns-inn' WHERE site_id = 'gb-greater-london-lincoln-s-inn';
UPDATE site_contributor_notes SET site_id = 'gb-london-lincolns-inn' WHERE site_id = 'gb-greater-london-lincoln-s-inn';
UPDATE site_edits SET site_id = 'gb-london-lincolns-inn' WHERE site_id = 'gb-greater-london-lincoln-s-inn';
UPDATE pending_submissions SET site_id = 'gb-london-lincolns-inn' WHERE site_id = 'gb-greater-london-lincoln-s-inn';

-- ── ID RENAME: gb-greater-london-site-of-marshalsea-prison
--              → gb-london-site-of-marshalsea-prison
UPDATE sites SET
  id = 'gb-london-site-of-marshalsea-prison',
  name = 'Site of Marshalsea Prison',
  short_description = 'Prison that held, among others, Charles Dickens'' father.  Saints and blesseds held here include Ralph Sherwin, John Griffith, Anne Line, William Exmew, John Storey, Everard Hanse, William Filby, and Thomas Cottam.  Today this alley features images and quotes from one of Charles Dickens'' books that featured the prison.',
  latitude = 51.5017256286454,
  longitude = -0.0921699005100171,
  google_maps_url = 'https://maps.app.goo.gl/txGGMLZw326Y5ZiP7',
  featured = FALSE,
  interest = 'local',
  contributor = 'JPY',
  native_name = NULL,
  country = 'GB',
  municipality = 'London',
  updated_at = now()
WHERE id = 'gb-greater-london-site-of-marshalsea-prison';
UPDATE site_images SET site_id = 'gb-london-site-of-marshalsea-prison' WHERE site_id = 'gb-greater-london-site-of-marshalsea-prison';
UPDATE site_links SET site_id = 'gb-london-site-of-marshalsea-prison' WHERE site_id = 'gb-greater-london-site-of-marshalsea-prison';
UPDATE site_tag_assignments SET site_id = 'gb-london-site-of-marshalsea-prison' WHERE site_id = 'gb-greater-london-site-of-marshalsea-prison';
UPDATE site_contributor_notes SET site_id = 'gb-london-site-of-marshalsea-prison' WHERE site_id = 'gb-greater-london-site-of-marshalsea-prison';
UPDATE site_edits SET site_id = 'gb-london-site-of-marshalsea-prison' WHERE site_id = 'gb-greater-london-site-of-marshalsea-prison';
UPDATE pending_submissions SET site_id = 'gb-london-site-of-marshalsea-prison' WHERE site_id = 'gb-greater-london-site-of-marshalsea-prison';

-- ── ID RENAME: gt-santiago-atitlan-church-of-st-james-the-apostle-iglesia-santiago-apostol
--              → gt-santiago-atitlan-church-of-st-james-the-apostle
UPDATE sites SET
  id = 'gt-santiago-atitlan-church-of-st-james-the-apostle',
  name = 'Church of St. James the Apostle',
  short_description = 'Bl. Stanley Rother ministered to the native Tz''utujil people of Guatemala for years at St. James the Apostle church, on the shores of Lake Atitlan.  He was martyred in the rectory on July 28, 1981.',
  latitude = 14.638171,
  longitude = -91.229103,
  google_maps_url = 'https://maps.app.goo.gl/exQpucpyGysSCK8z6',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JMM',
  native_name = 'Iglesia de Santiago Apóstol de Atitlán',
  country = 'GT',
  municipality = 'Santiago Atitlan',
  updated_at = now()
WHERE id = 'gt-santiago-atitlan-church-of-st-james-the-apostle-iglesia-santiago-apostol';
UPDATE site_images SET site_id = 'gt-santiago-atitlan-church-of-st-james-the-apostle' WHERE site_id = 'gt-santiago-atitlan-church-of-st-james-the-apostle-iglesia-santiago-apostol';
UPDATE site_links SET site_id = 'gt-santiago-atitlan-church-of-st-james-the-apostle' WHERE site_id = 'gt-santiago-atitlan-church-of-st-james-the-apostle-iglesia-santiago-apostol';
UPDATE site_tag_assignments SET site_id = 'gt-santiago-atitlan-church-of-st-james-the-apostle' WHERE site_id = 'gt-santiago-atitlan-church-of-st-james-the-apostle-iglesia-santiago-apostol';
UPDATE site_contributor_notes SET site_id = 'gt-santiago-atitlan-church-of-st-james-the-apostle' WHERE site_id = 'gt-santiago-atitlan-church-of-st-james-the-apostle-iglesia-santiago-apostol';
UPDATE site_edits SET site_id = 'gt-santiago-atitlan-church-of-st-james-the-apostle' WHERE site_id = 'gt-santiago-atitlan-church-of-st-james-the-apostle-iglesia-santiago-apostol';
UPDATE pending_submissions SET site_id = 'gt-santiago-atitlan-church-of-st-james-the-apostle' WHERE site_id = 'gt-santiago-atitlan-church-of-st-james-the-apostle-iglesia-santiago-apostol';

-- ── ID RENAME: ie-knock-knock-shrine-our-lady-of-knock
--              → ie-knock-knock-shrine
UPDATE sites SET
  id = 'ie-knock-knock-shrine',
  name = 'Knock Shrine',
  short_description = 'In 1879, 15 individuals witnessed the figures of Mary, Joseph, John the Evangelist, and a lamb and cross atop an altar, all enveloped in a bright light outside the local church.  The imagery of Our Lady of Knock is unique to this apparition and holds eschatological significance for Catholics.',
  latitude = 53.7927562,
  longitude = -8.918981,
  google_maps_url = 'https://maps.app.goo.gl/Ani8d4xWTS8d185f6',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = NULL,
  country = 'IE',
  municipality = 'Knock',
  updated_at = now()
WHERE id = 'ie-knock-knock-shrine-our-lady-of-knock';
UPDATE site_images SET site_id = 'ie-knock-knock-shrine' WHERE site_id = 'ie-knock-knock-shrine-our-lady-of-knock';
UPDATE site_links SET site_id = 'ie-knock-knock-shrine' WHERE site_id = 'ie-knock-knock-shrine-our-lady-of-knock';
UPDATE site_tag_assignments SET site_id = 'ie-knock-knock-shrine' WHERE site_id = 'ie-knock-knock-shrine-our-lady-of-knock';
UPDATE site_contributor_notes SET site_id = 'ie-knock-knock-shrine' WHERE site_id = 'ie-knock-knock-shrine-our-lady-of-knock';
UPDATE site_edits SET site_id = 'ie-knock-knock-shrine' WHERE site_id = 'ie-knock-knock-shrine-our-lady-of-knock';
UPDATE pending_submissions SET site_id = 'ie-knock-knock-shrine' WHERE site_id = 'ie-knock-knock-shrine-our-lady-of-knock';

-- in-cortalim-sanctuary-of-st-joseph-vaz
UPDATE sites SET
  name = 'Sanctuary of St. Joseph Vaz',
  short_description = 'St. Joseph Vaz was a priest form Goa, India, who became a missionary in Ceylon (now Sri Lanka), preaching to the abandoned Catholics in a largely Buddhist country.  This shrine is located in the city of his birth.',
  latitude = 15.3912514402316,
  longitude = 73.903795958225,
  google_maps_url = 'https://maps.app.goo.gl/tBeNbqHYHJo4eNub8',
  featured = FALSE,
  interest = 'local',
  contributor = 'NDS',
  native_name = 'संत जोसफ वाझ सँक्चुरी',
  country = 'IN',
  municipality = 'Cortalim',
  updated_at = now()
WHERE id = 'in-cortalim-sanctuary-of-st-joseph-vaz';

-- in-kuravilangad-major-archiepiscopal-marth-mariam-archdeacon-pilgrim-church-at-kuravilangad
UPDATE sites SET
  name = 'Major Archiepiscopal Marth Mariam Archdeacon Pilgrim Church at Kuravilangad',
  short_description = 'According to tradition, Our Lady appeared to a few shepherd children at Kuravilangad as they were tending their flock.  She asked them to build a church at the place from where a miraculous perpetual spring sprouted, which exists even today.  The children reported this matter to the elders and a church was built there.',
  latitude = 9.754446,
  longitude = 76.56482,
  google_maps_url = 'https://maps.app.goo.gl/fBJPZePTtrMwHLtGA',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'മേജർ ആർക്കിഎപ്പിസ്കോപ്പൽ മർത്ത് മറിയം ആർച്ച് ഡീക്കൻ തീർത്ഥാടന ദൈവാലയം, കുറവിലങ്ങാട്',
  country = 'IN',
  municipality = 'Kuravilangad',
  updated_at = now()
WHERE id = 'in-kuravilangad-major-archiepiscopal-marth-mariam-archdeacon-pilgrim-church-at-kuravilangad';

-- ── ID RENAME: in-velankanni-basilica-of-our-lady-of-good-health-our-lady-of-velankanni
--              → in-velankanni-basilica-of-our-lady-of-good-health
UPDATE sites SET
  id = 'in-velankanni-basilica-of-our-lady-of-good-health',
  name = 'Basilica of Our Lady of Good Health',
  short_description = 'According to tradition, there have been multiple apparitions of the Blessed Virgin Mary at Velankanni, also known as Our Lady of Good Health.  As tradition would have it, the first of many apparitions occured to a young boy who was delivering buttermilk.',
  latitude = 10.6803068,
  longitude = 79.8493137,
  google_maps_url = 'https://maps.app.goo.gl/RkWstMmUp2DwWHLa9',
  featured = FALSE,
  interest = 'global',
  contributor = 'NDS',
  native_name = 'வேளாங்கண்ணி திருத்தல பேராலயம்',
  country = 'IN',
  municipality = 'Velankanni',
  updated_at = now()
WHERE id = 'in-velankanni-basilica-of-our-lady-of-good-health-our-lady-of-velankanni';
UPDATE site_images SET site_id = 'in-velankanni-basilica-of-our-lady-of-good-health' WHERE site_id = 'in-velankanni-basilica-of-our-lady-of-good-health-our-lady-of-velankanni';
UPDATE site_links SET site_id = 'in-velankanni-basilica-of-our-lady-of-good-health' WHERE site_id = 'in-velankanni-basilica-of-our-lady-of-good-health-our-lady-of-velankanni';
UPDATE site_tag_assignments SET site_id = 'in-velankanni-basilica-of-our-lady-of-good-health' WHERE site_id = 'in-velankanni-basilica-of-our-lady-of-good-health-our-lady-of-velankanni';
UPDATE site_contributor_notes SET site_id = 'in-velankanni-basilica-of-our-lady-of-good-health' WHERE site_id = 'in-velankanni-basilica-of-our-lady-of-good-health-our-lady-of-velankanni';
UPDATE site_edits SET site_id = 'in-velankanni-basilica-of-our-lady-of-good-health' WHERE site_id = 'in-velankanni-basilica-of-our-lady-of-good-health-our-lady-of-velankanni';
UPDATE pending_submissions SET site_id = 'in-velankanni-basilica-of-our-lady-of-good-health' WHERE site_id = 'in-velankanni-basilica-of-our-lady-of-good-health-our-lady-of-velankanni';

-- ── ID RENAME: it-biella-sanctuary-of-oropa-black-madonna-of-oropa
--              → it-oropa-sanctuary-of-oropa
UPDATE sites SET
  id = 'it-oropa-sanctuary-of-oropa',
  name = 'Sanctuary of Oropa',
  short_description = 'According to tradition, the statue known as the Black Madonna of Oropa was brought to Italy from the Holy Land by Bishop Eusebius of Vercelli in the fourth century A.D.

Bl. Pier Giorgio Frassati would also hike in this area.  His family villa was nearby, and he would visit the shrine regularly.',
  latitude = 45.6258893442062,
  longitude = 7.98237638465537,
  google_maps_url = 'https://maps.app.goo.gl/hFcR819wJhqP2PWm9',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JPY',
  native_name = 'Santuario di Oropa',
  country = 'IT',
  municipality = 'Oropa',
  updated_at = now()
WHERE id = 'it-biella-sanctuary-of-oropa-black-madonna-of-oropa';
UPDATE site_images SET site_id = 'it-oropa-sanctuary-of-oropa' WHERE site_id = 'it-biella-sanctuary-of-oropa-black-madonna-of-oropa';
UPDATE site_links SET site_id = 'it-oropa-sanctuary-of-oropa' WHERE site_id = 'it-biella-sanctuary-of-oropa-black-madonna-of-oropa';
UPDATE site_tag_assignments SET site_id = 'it-oropa-sanctuary-of-oropa' WHERE site_id = 'it-biella-sanctuary-of-oropa-black-madonna-of-oropa';
UPDATE site_contributor_notes SET site_id = 'it-oropa-sanctuary-of-oropa' WHERE site_id = 'it-biella-sanctuary-of-oropa-black-madonna-of-oropa';
UPDATE site_edits SET site_id = 'it-oropa-sanctuary-of-oropa' WHERE site_id = 'it-biella-sanctuary-of-oropa-black-madonna-of-oropa';
UPDATE pending_submissions SET site_id = 'it-oropa-sanctuary-of-oropa' WHERE site_id = 'it-biella-sanctuary-of-oropa-black-madonna-of-oropa';

-- it-corinaldo-birthplace-of-st-maria-goretti
UPDATE sites SET
  name = 'Birthplace of St. Maria Goretti',
  short_description = 'Here St. Maria Goretti was born on October 16, 1890.',
  latitude = 43.659849,
  longitude = 13.05112,
  google_maps_url = 'https://maps.app.goo.gl/vWjvdCjRDf9EGbZh9',
  featured = FALSE,
  interest = 'local',
  contributor = 'JPY',
  native_name = 'Casa Natale di Santa Maria Goretti',
  country = 'IT',
  municipality = 'Corinaldo',
  updated_at = now()
WHERE id = 'it-corinaldo-birthplace-of-st-maria-goretti';

-- it-corinaldo-church-of-st-francis-corinaldo
UPDATE sites SET
  name = 'Church of St. Francis, Corinaldo',
  short_description = 'This was the Gorettis'' parish church when they lived in Corinaldo.  Here Luigi and Assunta Goretti were married and St. Maria Goretti baptized.  The font where she was baptized is still preserved in the church.',
  latitude = 43.650785,
  longitude = 13.047758,
  google_maps_url = 'https://maps.app.goo.gl/kaQzxGUzP7y4kCet6',
  featured = FALSE,
  interest = 'local',
  contributor = 'JPY',
  native_name = 'Chiesa Collegiata San Francesco di Assisi',
  country = 'IT',
  municipality = 'Corinaldo',
  updated_at = now()
WHERE id = 'it-corinaldo-church-of-st-francis-corinaldo';

-- it-corinaldo-diocesan-sanctuary-of-st-maria-goretti
UPDATE sites SET
  name = 'Diocesan Sanctuary of St. Maria Goretti',
  short_description = 'This church is the final resting place for St. Maria Goretti''s mother, Assunta, and her repentant murderer, Alessandro Serenelli.  There is also a relic of Maria''s arm here.',
  latitude = 43.6493065,
  longitude = 13.0472097,
  google_maps_url = 'https://maps.app.goo.gl/u11Ghgyg69DWxk5q6',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JPY',
  native_name = 'Santuario di Santa Maria Goretti',
  country = 'IT',
  municipality = 'Corinaldo',
  updated_at = now()
WHERE id = 'it-corinaldo-diocesan-sanctuary-of-st-maria-goretti';

-- ── ID RENAME: it-latina-goretti-house
--              → it-le-ferriere-goretti-house
UPDATE sites SET
  id = 'it-le-ferriere-goretti-house',
  name = 'Goretti House',
  short_description = 'Here St. Maria Goretti lived with her family and where she was martyred, stabbed by Alessandro Serenelli.  She died the next day in a hospital in Nettuno.  Today it is a museum.',
  latitude = 41.5161008,
  longitude = 12.7567,
  google_maps_url = 'https://maps.app.goo.gl/JQneDwPiNDGGVQF26',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JPY',
  native_name = 'Casa del Martirio di Santa Maria Goretti',
  country = 'IT',
  municipality = 'Le Ferriere',
  updated_at = now()
WHERE id = 'it-latina-goretti-house';
UPDATE site_images SET site_id = 'it-le-ferriere-goretti-house' WHERE site_id = 'it-latina-goretti-house';
UPDATE site_links SET site_id = 'it-le-ferriere-goretti-house' WHERE site_id = 'it-latina-goretti-house';
UPDATE site_tag_assignments SET site_id = 'it-le-ferriere-goretti-house' WHERE site_id = 'it-latina-goretti-house';
UPDATE site_contributor_notes SET site_id = 'it-le-ferriere-goretti-house' WHERE site_id = 'it-latina-goretti-house';
UPDATE site_edits SET site_id = 'it-le-ferriere-goretti-house' WHERE site_id = 'it-latina-goretti-house';
UPDATE pending_submissions SET site_id = 'it-le-ferriere-goretti-house' WHERE site_id = 'it-latina-goretti-house';

-- it-nettuno-basilica-of-our-lady-of-graces-and-st-maria-goretti
UPDATE sites SET
  name = 'Basilica of Our Lady of Graces and St. Maria Goretti',
  short_description = 'This church houses the remains of St. Maria Goretti, and what is believed to be the statue of Our Lady of Grace.  The remains of St. Maria Goretti lie in the crypt beneath the basilica.  The bones are encased in a wax statue; she is not incorrupt.

The church contains a statue called Our Lady of Grace, which may be the original statue from Ipswich.  Our Lady of Ipswich, along with Our Lady of Walsingham, was one of the largest pilgrimage sites in England up until the Reformation.  During this period, Our Lady of Grace may have been smuggled to Italy.  In modern times, the faithful hold a procession with the statue on the first Saturday each May.',
  latitude = 41.457154,
  longitude = 12.668148,
  google_maps_url = 'https://maps.app.goo.gl/RVjY71eXaJ3vNxwc6',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JPY',
  native_name = 'Santuario di Nostra Signora delle Grazie e di Santa Maria Goretti',
  country = 'IT',
  municipality = 'Nettuno',
  updated_at = now()
WHERE id = 'it-nettuno-basilica-of-our-lady-of-graces-and-st-maria-goretti';

-- ── ID RENAME: it-nettuno-st-maria-goretti-tent-of-pardon-tenda-del-perdono
--              → it-nettuno-st-maria-goretti-tent-of-pardon
UPDATE sites SET
  id = 'it-nettuno-st-maria-goretti-tent-of-pardon',
  name = 'St. Maria Goretti Tent of Pardon',
  short_description = 'The "Tent of Pardon" is the site where, according to the National Catholic Register (see linked article), St. Maria Goretti lay dying in Nettuno.  It was here that she forgave her murderer, and may also be the place of her death.',
  latitude = 41.456946,
  longitude = 12.64985,
  google_maps_url = 'https://maps.app.goo.gl/fEY9AcTBwm5w4fco8',
  featured = FALSE,
  interest = 'local',
  contributor = 'JPY',
  native_name = 'Tenda del Perdono',
  country = 'IT',
  municipality = 'Nettuno',
  updated_at = now()
WHERE id = 'it-nettuno-st-maria-goretti-tent-of-pardon-tenda-del-perdono';
UPDATE site_images SET site_id = 'it-nettuno-st-maria-goretti-tent-of-pardon' WHERE site_id = 'it-nettuno-st-maria-goretti-tent-of-pardon-tenda-del-perdono';
UPDATE site_links SET site_id = 'it-nettuno-st-maria-goretti-tent-of-pardon' WHERE site_id = 'it-nettuno-st-maria-goretti-tent-of-pardon-tenda-del-perdono';
UPDATE site_tag_assignments SET site_id = 'it-nettuno-st-maria-goretti-tent-of-pardon' WHERE site_id = 'it-nettuno-st-maria-goretti-tent-of-pardon-tenda-del-perdono';
UPDATE site_contributor_notes SET site_id = 'it-nettuno-st-maria-goretti-tent-of-pardon' WHERE site_id = 'it-nettuno-st-maria-goretti-tent-of-pardon-tenda-del-perdono';
UPDATE site_edits SET site_id = 'it-nettuno-st-maria-goretti-tent-of-pardon' WHERE site_id = 'it-nettuno-st-maria-goretti-tent-of-pardon-tenda-del-perdono';
UPDATE pending_submissions SET site_id = 'it-nettuno-st-maria-goretti-tent-of-pardon' WHERE site_id = 'it-nettuno-st-maria-goretti-tent-of-pardon-tenda-del-perdono';

-- it-nettuno-statue-of-st-maria-goretti
UPDATE sites SET
  name = 'Statue of St. Maria Goretti',
  short_description = 'A statue of St. Maria Goretti in Nettuno, the town where she died.',
  latitude = 41.45725,
  longitude = 12.65585,
  google_maps_url = 'https://maps.app.goo.gl/mwbtZD2AhwPqELP3A',
  featured = FALSE,
  interest = 'personal',
  contributor = 'JPY',
  native_name = NULL,
  country = 'IT',
  municipality = 'Nettuno',
  updated_at = now()
WHERE id = 'it-nettuno-statue-of-st-maria-goretti';

-- it-rezzato-sanctuary-of-our-lady-of-valverde
UPDATE sites SET
  name = 'Sanctuary of Our Lady of Valverde',
  short_description = 'The Shrine of Our Lady of Valverde dates back to 1399, when Our Lady appeared to a farmer plowing his field.  During the summer of 1711, when the province was hit by a severe epidemic, the inhabitants of Rezzato prayed to Our Lady of Valverde.  On October 1, Our Lady appeared a second time to Paul Ogna, 8, and Francesco Pelizzari, 11, who went to collect chestnuts near the Sanctuary pond.  Our Lady promised the end of the epidemic.',
  latitude = 45.5236738652071,
  longitude = 10.3142692079531,
  google_maps_url = 'https://maps.app.goo.gl/Udxo9ZD3m4qStusm8',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Santuario di Maria Santissima di Valverde di Rezzato',
  country = 'IT',
  municipality = 'Rezzato',
  updated_at = now()
WHERE id = 'it-rezzato-sanctuary-of-our-lady-of-valverde';

-- ── ID RENAME: it-rome-basilica-of-saint-paul-outside-the-walls
--              → it-rome-papal-basilica-of-st-paul-outside-the-walls
UPDATE sites SET
  id = 'it-rome-papal-basilica-of-st-paul-outside-the-walls',
  name = 'Papal Basilica of St. Paul Outside the Walls',
  short_description = 'Magnificent papal basilica dating from the 4th century, with tomb of St. Paul & elegant cloisters.  Destroyed by fire in 1823, it was rebuilt and reconsecrated in 1854.  Portraits of all the popes line the nave.',
  latitude = 41.858785,
  longitude = 12.4761771,
  google_maps_url = 'https://maps.app.goo.gl/eNC3yGkHuv8mU7CB7',
  featured = FALSE,
  interest = 'global',
  contributor = 'JPY',
  native_name = 'Basilica Papale di San Paolo fuori le Mura',
  country = 'IT',
  municipality = 'Rome',
  updated_at = now()
WHERE id = 'it-rome-basilica-of-saint-paul-outside-the-walls';
UPDATE site_images SET site_id = 'it-rome-papal-basilica-of-st-paul-outside-the-walls' WHERE site_id = 'it-rome-basilica-of-saint-paul-outside-the-walls';
UPDATE site_links SET site_id = 'it-rome-papal-basilica-of-st-paul-outside-the-walls' WHERE site_id = 'it-rome-basilica-of-saint-paul-outside-the-walls';
UPDATE site_tag_assignments SET site_id = 'it-rome-papal-basilica-of-st-paul-outside-the-walls' WHERE site_id = 'it-rome-basilica-of-saint-paul-outside-the-walls';
UPDATE site_contributor_notes SET site_id = 'it-rome-papal-basilica-of-st-paul-outside-the-walls' WHERE site_id = 'it-rome-basilica-of-saint-paul-outside-the-walls';
UPDATE site_edits SET site_id = 'it-rome-papal-basilica-of-st-paul-outside-the-walls' WHERE site_id = 'it-rome-basilica-of-saint-paul-outside-the-walls';
UPDATE pending_submissions SET site_id = 'it-rome-papal-basilica-of-st-paul-outside-the-walls' WHERE site_id = 'it-rome-basilica-of-saint-paul-outside-the-walls';

-- it-rome-basilica-of-st-lawrence-outside-the-walls
UPDATE sites SET
  name = 'Basilica of St. Lawrence Outside the Walls',
  short_description = 'Site of the martyrdom of St. Lawrence, grilled to death.  His relics are here, along with the relics of St. Stephen and St. Justin Martyr.  Pope Pius IX is also buried here.  This is one of the seven churches of Rome.',
  latitude = 41.902528,
  longitude = 12.520559,
  google_maps_url = 'https://maps.app.goo.gl/pP35doxep3RZLaNu5',
  featured = FALSE,
  interest = 'global',
  contributor = 'JPY',
  native_name = 'Basilica di San Lorenzo fuori le Mura',
  country = 'IT',
  municipality = 'Rome',
  updated_at = now()
WHERE id = 'it-rome-basilica-of-st-lawrence-outside-the-walls';

-- it-rome-basilica-of-st-sebastian-outside-the-walls
UPDATE sites SET
  name = 'Basilica of St. Sebastian Outside the Walls',
  short_description = 'One of the seven pilgrim churches of Rome, the current church was built in 1714.  The catacombs of St. Sebastian are nearby.  St. Sebastian is below one of the side altars.  One of the arrows that struck him and the column he was tied to are also here.  Christ''s footprints from when he met St. Peter on the Via Appia (Quo Vadis, Domine?) are here, as is a bust of Christ, which was Bernini''s last sculpture.',
  latitude = 41.8558325,
  longitude = 12.5158104,
  google_maps_url = 'https://maps.app.goo.gl/BwZTbucJCeD4vQzR7',
  featured = FALSE,
  interest = 'global',
  contributor = 'JPY',
  native_name = 'Basilica di San Sebastiano fuori le Mura',
  country = 'IT',
  municipality = 'Rome',
  updated_at = now()
WHERE id = 'it-rome-basilica-of-st-sebastian-outside-the-walls';

-- it-rome-catacombs-of-priscilla
UPDATE sites SET
  name = 'Catacombs of Priscilla',
  short_description = '40,000 tombs line the 13km of tunnels in these catacombs.  Some of those buried here include Pope Marcellinus, Pope Marcellus, Pope Sylvester, Felix and Philip, Pudenziana, and Praxedes, and Maurus and Simetrius.  These catacombs also include the oldest depiction of the Virgin and Child, with the prophet Balaam.',
  latitude = 41.9296501999999,
  longitude = 12.5087439,
  google_maps_url = 'https://maps.app.goo.gl/F8a85zr4nuygaq73A',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JPY',
  native_name = 'Catacombe di Priscilla',
  country = 'IT',
  municipality = 'Rome',
  updated_at = now()
WHERE id = 'it-rome-catacombs-of-priscilla';

-- ── ID RENAME: it-rome-catacombs-of-saint-sebastian
--              → it-rome-catacombs-of-st--sebastian
UPDATE sites SET
  id = 'it-rome-catacombs-of-st--sebastian',
  name = 'Catacombs of St.  Sebastian',
  short_description = 'Ancient publicly-accessible catacombs, named after St. Sebastian, who was buried here.',
  latitude = 41.8559245,
  longitude = 12.5161847,
  google_maps_url = 'https://maps.app.goo.gl/BTkAy5idZFzM3cJM7',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JPY',
  native_name = 'Catacombe di San Sebastiano',
  country = 'IT',
  municipality = 'Rome',
  updated_at = now()
WHERE id = 'it-rome-catacombs-of-saint-sebastian';
UPDATE site_images SET site_id = 'it-rome-catacombs-of-st--sebastian' WHERE site_id = 'it-rome-catacombs-of-saint-sebastian';
UPDATE site_links SET site_id = 'it-rome-catacombs-of-st--sebastian' WHERE site_id = 'it-rome-catacombs-of-saint-sebastian';
UPDATE site_tag_assignments SET site_id = 'it-rome-catacombs-of-st--sebastian' WHERE site_id = 'it-rome-catacombs-of-saint-sebastian';
UPDATE site_contributor_notes SET site_id = 'it-rome-catacombs-of-st--sebastian' WHERE site_id = 'it-rome-catacombs-of-saint-sebastian';
UPDATE site_edits SET site_id = 'it-rome-catacombs-of-st--sebastian' WHERE site_id = 'it-rome-catacombs-of-saint-sebastian';
UPDATE pending_submissions SET site_id = 'it-rome-catacombs-of-st--sebastian' WHERE site_id = 'it-rome-catacombs-of-saint-sebastian';

-- ── ID RENAME: it-rome-chiesa-di-sant-ignazio-di-loyola
--              → it-rome-church-of-st-ignatius-of-loyola
UPDATE sites SET
  id = 'it-rome-church-of-st-ignatius-of-loyola',
  name = 'Church of St. Ignatius of Loyola',
  short_description = '17th-century Roman Catholic church with trompe l''oeil ceilings & frescoes depicting St. Ignatius.  The Jesuits did not have enough money for a dome, so there is a fake dome painted on the ceiling.  Sts. Aloysius Gonzaga, John Berchmans, and Robert Bellarmine are all buried here.  From next to St. Aloysius'' altar in the church, there is a stairway leading to his rooms, as well as the rooms of St. John Berchmans.',
  latitude = 41.8991867,
  longitude = 12.4797362,
  google_maps_url = 'https://maps.app.goo.gl/npetND2PYC3hqSiW8',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JPY',
  native_name = 'Chiesa di Sant''Ignazio di Loyola',
  country = 'IT',
  municipality = 'Rome',
  updated_at = now()
WHERE id = 'it-rome-chiesa-di-sant-ignazio-di-loyola';
UPDATE site_images SET site_id = 'it-rome-church-of-st-ignatius-of-loyola' WHERE site_id = 'it-rome-chiesa-di-sant-ignazio-di-loyola';
UPDATE site_links SET site_id = 'it-rome-church-of-st-ignatius-of-loyola' WHERE site_id = 'it-rome-chiesa-di-sant-ignazio-di-loyola';
UPDATE site_tag_assignments SET site_id = 'it-rome-church-of-st-ignatius-of-loyola' WHERE site_id = 'it-rome-chiesa-di-sant-ignazio-di-loyola';
UPDATE site_contributor_notes SET site_id = 'it-rome-church-of-st-ignatius-of-loyola' WHERE site_id = 'it-rome-chiesa-di-sant-ignazio-di-loyola';
UPDATE site_edits SET site_id = 'it-rome-church-of-st-ignatius-of-loyola' WHERE site_id = 'it-rome-chiesa-di-sant-ignazio-di-loyola';
UPDATE pending_submissions SET site_id = 'it-rome-church-of-st-ignatius-of-loyola' WHERE site_id = 'it-rome-chiesa-di-sant-ignazio-di-loyola';

-- ── ID RENAME: it-rome-chiesa-di-santa-maria-maddalena-in-campo-marzio
--              → it-rome-santa-maria-maddalena-campo-marzio
UPDATE sites SET
  id = 'it-rome-santa-maria-maddalena-campo-marzio',
  name = 'Santa Maria Maddalena, Campo Marzio',
  short_description = 'International headquarters of the Congregation of Clerks Regular, Ministers of the Sick also known as Camilliani or Camillians.  St. Camillus de Lellis purchased the property for his new order.  The church, dedicated to St. Mary Magdelene, houses St. Camillus'' relics, as well as the miraculous crucifix that embraced him on his death bed.  Built on the ancient Field of Mars',
  latitude = 41.9001324215348,
  longitude = 12.4767205534292,
  google_maps_url = 'https://maps.app.goo.gl/Re3HaSoU5sxyLdLLA',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JPY',
  native_name = 'Chiesa di Santa Maria Maddalena',
  country = 'IT',
  municipality = 'Rome',
  updated_at = now()
WHERE id = 'it-rome-chiesa-di-santa-maria-maddalena-in-campo-marzio';
UPDATE site_images SET site_id = 'it-rome-santa-maria-maddalena-campo-marzio' WHERE site_id = 'it-rome-chiesa-di-santa-maria-maddalena-in-campo-marzio';
UPDATE site_links SET site_id = 'it-rome-santa-maria-maddalena-campo-marzio' WHERE site_id = 'it-rome-chiesa-di-santa-maria-maddalena-in-campo-marzio';
UPDATE site_tag_assignments SET site_id = 'it-rome-santa-maria-maddalena-campo-marzio' WHERE site_id = 'it-rome-chiesa-di-santa-maria-maddalena-in-campo-marzio';
UPDATE site_contributor_notes SET site_id = 'it-rome-santa-maria-maddalena-campo-marzio' WHERE site_id = 'it-rome-chiesa-di-santa-maria-maddalena-in-campo-marzio';
UPDATE site_edits SET site_id = 'it-rome-santa-maria-maddalena-campo-marzio' WHERE site_id = 'it-rome-chiesa-di-santa-maria-maddalena-in-campo-marzio';
UPDATE pending_submissions SET site_id = 'it-rome-santa-maria-maddalena-campo-marzio' WHERE site_id = 'it-rome-chiesa-di-santa-maria-maddalena-in-campo-marzio';

-- ── ID RENAME: it-rome-our-lady-of-revelation-grotto
--              → it-rome-sanctuary-of-the-virgin-of-the-revelation-tre-fontane-grotto
UPDATE sites SET
  id = 'it-rome-sanctuary-of-the-virgin-of-the-revelation-tre-fontane-grotto',
  name = 'Sanctuary of the Virgin of the Revelation (Tre Fontane Grotto)',
  short_description = 'Our Lady of Revelation appeared in this grotto next to Tre Fontane in the 1947 to Bruno Cornacchiola, a communist, seventh-day adventist, and would-be assasin of Pope Pius XII.',
  latitude = 41.8361172,
  longitude = 12.4800634,
  google_maps_url = 'https://maps.app.goo.gl/FDHwBbny3a8YZw7t5',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JPY',
  native_name = 'Santuario della Vergine della Rivelazione / Grotta delle Tre Fontane',
  country = 'IT',
  municipality = 'Rome',
  updated_at = now()
WHERE id = 'it-rome-our-lady-of-revelation-grotto';
UPDATE site_images SET site_id = 'it-rome-sanctuary-of-the-virgin-of-the-revelation-tre-fontane-grotto' WHERE site_id = 'it-rome-our-lady-of-revelation-grotto';
UPDATE site_links SET site_id = 'it-rome-sanctuary-of-the-virgin-of-the-revelation-tre-fontane-grotto' WHERE site_id = 'it-rome-our-lady-of-revelation-grotto';
UPDATE site_tag_assignments SET site_id = 'it-rome-sanctuary-of-the-virgin-of-the-revelation-tre-fontane-grotto' WHERE site_id = 'it-rome-our-lady-of-revelation-grotto';
UPDATE site_contributor_notes SET site_id = 'it-rome-sanctuary-of-the-virgin-of-the-revelation-tre-fontane-grotto' WHERE site_id = 'it-rome-our-lady-of-revelation-grotto';
UPDATE site_edits SET site_id = 'it-rome-sanctuary-of-the-virgin-of-the-revelation-tre-fontane-grotto' WHERE site_id = 'it-rome-our-lady-of-revelation-grotto';
UPDATE pending_submissions SET site_id = 'it-rome-sanctuary-of-the-virgin-of-the-revelation-tre-fontane-grotto' WHERE site_id = 'it-rome-our-lady-of-revelation-grotto';

-- ── ID RENAME: it-rome-sant-andrea-delle-fratte-shrine-of-our-lady-of-the-miracle-our-lady-of-zion
--              → it-rome-santandrea-delle-fratte-st-andrew-of-the-thickets
UPDATE sites SET
  id = 'it-rome-santandrea-delle-fratte-st-andrew-of-the-thickets',
  name = 'Sant''Andrea delle Fratte (St. Andrew of the Thickets)',
  short_description = 'Marie Alphonse Ratisbonne, an anti-Catholic Jew, befriended a baron in Rome and began wearing the Miraculous Medal as a simple test.  On January 20, 1842, after entering the church of Sant''Andrea delle Fratte, Ratisbonne experienced a vision of the Blessed Virgin Mary.  He converted to Catholicism, joined the priesthood, and began a ministry for the conversion of Jews. Today these apparitions go by the titles of "Our Lady of the Miracle" and "Our Lady of Zion."',
  latitude = 41.9035637,
  longitude = 12.4836739,
  google_maps_url = 'https://maps.app.goo.gl/7GaNx9oxB6wgEGH6A',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Basilica Sant''Andrea delle Fratte',
  country = 'IT',
  municipality = 'Rome',
  updated_at = now()
WHERE id = 'it-rome-sant-andrea-delle-fratte-shrine-of-our-lady-of-the-miracle-our-lady-of-zion';
UPDATE site_images SET site_id = 'it-rome-santandrea-delle-fratte-st-andrew-of-the-thickets' WHERE site_id = 'it-rome-sant-andrea-delle-fratte-shrine-of-our-lady-of-the-miracle-our-lady-of-zion';
UPDATE site_links SET site_id = 'it-rome-santandrea-delle-fratte-st-andrew-of-the-thickets' WHERE site_id = 'it-rome-sant-andrea-delle-fratte-shrine-of-our-lady-of-the-miracle-our-lady-of-zion';
UPDATE site_tag_assignments SET site_id = 'it-rome-santandrea-delle-fratte-st-andrew-of-the-thickets' WHERE site_id = 'it-rome-sant-andrea-delle-fratte-shrine-of-our-lady-of-the-miracle-our-lady-of-zion';
UPDATE site_contributor_notes SET site_id = 'it-rome-santandrea-delle-fratte-st-andrew-of-the-thickets' WHERE site_id = 'it-rome-sant-andrea-delle-fratte-shrine-of-our-lady-of-the-miracle-our-lady-of-zion';
UPDATE site_edits SET site_id = 'it-rome-santandrea-delle-fratte-st-andrew-of-the-thickets' WHERE site_id = 'it-rome-sant-andrea-delle-fratte-shrine-of-our-lady-of-the-miracle-our-lady-of-zion';
UPDATE pending_submissions SET site_id = 'it-rome-santandrea-delle-fratte-st-andrew-of-the-thickets' WHERE site_id = 'it-rome-sant-andrea-delle-fratte-shrine-of-our-lady-of-the-miracle-our-lady-of-zion';

-- it-rome-santa-maria-in-cosmedin
UPDATE sites SET
  name = 'Santa Maria in Cosmedin',
  short_description = 'Home of the Bocca della Verita, which according to popular myth will bite off the hand of any liar who sticks his hand into its mouth.  The relics of a martyr, St. Cyrilla, are here.  There is also a dubious relic of St. Valentine.  The church today belongs to the Melkites.',
  latitude = 41.8880752,
  longitude = 12.4816333,
  google_maps_url = 'https://maps.app.goo.gl/LGnrMWc4EmW15Lyy7',
  featured = FALSE,
  interest = 'local',
  contributor = 'JPY',
  native_name = 'Basilica di Santa Maria in Cosmedin',
  country = 'IT',
  municipality = 'Rome',
  updated_at = now()
WHERE id = 'it-rome-santa-maria-in-cosmedin';

-- ── ID RENAME: it-rome-st-mary-major-s-maria-maggiore-our-lady-of-the-snows
--              → it-rome-papal-basilica-of-st-mary-major
UPDATE sites SET
  id = 'it-rome-papal-basilica-of-st-mary-major',
  name = 'Papal Basilica of St. Mary Major',
  short_description = 'A wealthy but childless Christian Roman couple wanted to appoint the Virgin Mary as heiress of their property. On the night of August 4, Mary appeared simultaneously to the couple and Pope Liberius, expressing the wish that a church be erected on Esquiline Hill.  The morning of August 5, miraculous snow fell on a narrow piece of land, upon which the Church of Liberius was constructed.  This Marian shrine was replaced in the fifth century with a great church named Santa Maria Maggiore, which is now one of the four major basilicas.  Today Mary''s involvement in the original miracle has granted her the title "Our Lady of the Snows."',
  latitude = 41.8972931099639,
  longitude = 12.4989743434214,
  google_maps_url = 'https://maps.app.goo.gl/qFDwiSk8rST5X8946',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Basilica Papale di Santa Maria Maggiore',
  country = 'IT',
  municipality = 'Rome',
  updated_at = now()
WHERE id = 'it-rome-st-mary-major-s-maria-maggiore-our-lady-of-the-snows';
UPDATE site_images SET site_id = 'it-rome-papal-basilica-of-st-mary-major' WHERE site_id = 'it-rome-st-mary-major-s-maria-maggiore-our-lady-of-the-snows';
UPDATE site_links SET site_id = 'it-rome-papal-basilica-of-st-mary-major' WHERE site_id = 'it-rome-st-mary-major-s-maria-maggiore-our-lady-of-the-snows';
UPDATE site_tag_assignments SET site_id = 'it-rome-papal-basilica-of-st-mary-major' WHERE site_id = 'it-rome-st-mary-major-s-maria-maggiore-our-lady-of-the-snows';
UPDATE site_contributor_notes SET site_id = 'it-rome-papal-basilica-of-st-mary-major' WHERE site_id = 'it-rome-st-mary-major-s-maria-maggiore-our-lady-of-the-snows';
UPDATE site_edits SET site_id = 'it-rome-papal-basilica-of-st-mary-major' WHERE site_id = 'it-rome-st-mary-major-s-maria-maggiore-our-lady-of-the-snows';
UPDATE pending_submissions SET site_id = 'it-rome-papal-basilica-of-st-mary-major' WHERE site_id = 'it-rome-st-mary-major-s-maria-maggiore-our-lady-of-the-snows';

-- ── ID RENAME: it-rome-tre-fontane
--              → it-rome-tre-fontane-three-fountains-abbey
UPDATE sites SET
  id = 'it-rome-tre-fontane-three-fountains-abbey',
  name = 'Tre Fontane (Three Fountains) Abbey',
  short_description = 'Officially Church of St. Paul at the Martyrdom, this church is located within a Cistercian (strict observance) abbey.  The name "Tre Fontane" refers to the three fountains the church is built over.  Tradition says that this is the spot where St. Paul was beheaded.  His head bounced three times.  Each place it bounced, a fountain sprang up.  Note that there are three churches at this monastery.  The church of Tre Fontane is the one furthest back.',
  latitude = 41.8339214,
  longitude = 12.4842555,
  google_maps_url = 'https://maps.app.goo.gl/4oRxAHvPbTY3LBXTA',
  featured = FALSE,
  interest = 'global',
  contributor = 'JPY',
  native_name = 'Abbazia delle Tre Fontane',
  country = 'IT',
  municipality = 'Rome',
  updated_at = now()
WHERE id = 'it-rome-tre-fontane';
UPDATE site_images SET site_id = 'it-rome-tre-fontane-three-fountains-abbey' WHERE site_id = 'it-rome-tre-fontane';
UPDATE site_links SET site_id = 'it-rome-tre-fontane-three-fountains-abbey' WHERE site_id = 'it-rome-tre-fontane';
UPDATE site_tag_assignments SET site_id = 'it-rome-tre-fontane-three-fountains-abbey' WHERE site_id = 'it-rome-tre-fontane';
UPDATE site_contributor_notes SET site_id = 'it-rome-tre-fontane-three-fountains-abbey' WHERE site_id = 'it-rome-tre-fontane';
UPDATE site_edits SET site_id = 'it-rome-tre-fontane-three-fountains-abbey' WHERE site_id = 'it-rome-tre-fontane';
UPDATE pending_submissions SET site_id = 'it-rome-tre-fontane-three-fountains-abbey' WHERE site_id = 'it-rome-tre-fontane';

-- ── ID RENAME: jp-akita-seitai-hoshikai-our-lady-of-akita
--              → jp-akita-seitai-hoshikai
UPDATE sites SET
  id = 'jp-akita-seitai-hoshikai',
  name = 'Seitai Hoshikai',
  short_description = 'Sister Agnes Sasagawa received visions of an angel and messages emanating from a wooden statue of Our Lady which wept 101 times, including one instance which was broadcast on Japanese national television in December 1973.  Today, this statue goes by the name "Our Lady of Akita."',
  latitude = 39.7592244041621,
  longitude = 140.14975314135,
  google_maps_url = 'https://maps.app.goo.gl/akzkBTEbCxKsKkqb8',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = '聖体奉仕会',
  country = 'JP',
  municipality = 'Akita',
  updated_at = now()
WHERE id = 'jp-akita-seitai-hoshikai-our-lady-of-akita';
UPDATE site_images SET site_id = 'jp-akita-seitai-hoshikai' WHERE site_id = 'jp-akita-seitai-hoshikai-our-lady-of-akita';
UPDATE site_links SET site_id = 'jp-akita-seitai-hoshikai' WHERE site_id = 'jp-akita-seitai-hoshikai-our-lady-of-akita';
UPDATE site_tag_assignments SET site_id = 'jp-akita-seitai-hoshikai' WHERE site_id = 'jp-akita-seitai-hoshikai-our-lady-of-akita';
UPDATE site_contributor_notes SET site_id = 'jp-akita-seitai-hoshikai' WHERE site_id = 'jp-akita-seitai-hoshikai-our-lady-of-akita';
UPDATE site_edits SET site_id = 'jp-akita-seitai-hoshikai' WHERE site_id = 'jp-akita-seitai-hoshikai-our-lady-of-akita';
UPDATE pending_submissions SET site_id = 'jp-akita-seitai-hoshikai' WHERE site_id = 'jp-akita-seitai-hoshikai-our-lady-of-akita';

-- ── ID RENAME: lt-siluva-basilica-of-the-nativity-of-the-blessed-virgin-mary-our-lady-of-siluva
--              → lt-siluva-basilica-of-the-nativity-of-the-blessed-virgin-mary
UPDATE sites SET
  id = 'lt-siluva-basilica-of-the-nativity-of-the-blessed-virgin-mary',
  name = 'Basilica of the Nativity of the Blessed Virgin Mary',
  short_description = 'One summer day, in 1608, a number of children were playing while tending their sheep in a field on the outskirts of the village of Siluva.  They beheld a beautiful young woman standing on the rock holding a baby in her arms and weeping bitterly.  The apparition of Our Lady of Siluva helped restore the Faith to a town which had lost its Catholic identity to the Calvinists.',
  latitude = 55.5306126,
  longitude = 23.2199252,
  google_maps_url = 'https://maps.app.goo.gl/QztbG4soH6k8BKGt8',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Švč. Mergelės Marijos Gimimo Bazilika',
  country = 'LT',
  municipality = 'Siluva',
  updated_at = now()
WHERE id = 'lt-siluva-basilica-of-the-nativity-of-the-blessed-virgin-mary-our-lady-of-siluva';
UPDATE site_images SET site_id = 'lt-siluva-basilica-of-the-nativity-of-the-blessed-virgin-mary' WHERE site_id = 'lt-siluva-basilica-of-the-nativity-of-the-blessed-virgin-mary-our-lady-of-siluva';
UPDATE site_links SET site_id = 'lt-siluva-basilica-of-the-nativity-of-the-blessed-virgin-mary' WHERE site_id = 'lt-siluva-basilica-of-the-nativity-of-the-blessed-virgin-mary-our-lady-of-siluva';
UPDATE site_tag_assignments SET site_id = 'lt-siluva-basilica-of-the-nativity-of-the-blessed-virgin-mary' WHERE site_id = 'lt-siluva-basilica-of-the-nativity-of-the-blessed-virgin-mary-our-lady-of-siluva';
UPDATE site_contributor_notes SET site_id = 'lt-siluva-basilica-of-the-nativity-of-the-blessed-virgin-mary' WHERE site_id = 'lt-siluva-basilica-of-the-nativity-of-the-blessed-virgin-mary-our-lady-of-siluva';
UPDATE site_edits SET site_id = 'lt-siluva-basilica-of-the-nativity-of-the-blessed-virgin-mary' WHERE site_id = 'lt-siluva-basilica-of-the-nativity-of-the-blessed-virgin-mary-our-lady-of-siluva';
UPDATE pending_submissions SET site_id = 'lt-siluva-basilica-of-the-nativity-of-the-blessed-virgin-mary' WHERE site_id = 'lt-siluva-basilica-of-the-nativity-of-the-blessed-virgin-mary-our-lady-of-siluva';

-- mx-mexico-city-basilica-of-our-lady-of-guadalupe
UPDATE sites SET
  name = 'Basilica of Our Lady of Guadalupe',
  short_description = 'In December 1531, the Virgin Mary appeared to St. Juan Diego and his uncle.  The miraculous image imprinted on Juan Diego''s tilma is on display at the Basilica of Our Lady of Guadalupe, which is the most-visited Catholic shrine in the world.',
  latitude = 19.4834328,
  longitude = -99.1174103,
  google_maps_url = 'https://maps.app.goo.gl/ZmPvrMiJmHiJhjRw9',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Basílica Santa María de Guadalupe',
  country = 'MX',
  municipality = 'Mexico City',
  updated_at = now()
WHERE id = 'mx-mexico-city-basilica-of-our-lady-of-guadalupe';

-- ── ID RENAME: mx-mexico-city-church-of-the-holy-family-la-sagrada-familia-mexico-city
--              → mx-mexico-city-church-of-the-holy-family
UPDATE sites SET
  id = 'mx-mexico-city-church-of-the-holy-family',
  name = 'Church of the Holy Family',
  short_description = 'This church, aside from being incredibly beautiful, is where Bl. Miguel Pro''s remains are kept, to the right of the main altar.  His funeral procession passed in front of this church, though we are not sure if he had a funeral here.',
  latitude = 19.422522,
  longitude = -99.1609427,
  google_maps_url = 'https://maps.app.goo.gl/VafCn2KZ7MfLttVg6',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JPY',
  native_name = 'Parroquia de la Sagrada Familia',
  country = 'MX',
  municipality = 'Mexico City',
  updated_at = now()
WHERE id = 'mx-mexico-city-church-of-the-holy-family-la-sagrada-familia-mexico-city';
UPDATE site_images SET site_id = 'mx-mexico-city-church-of-the-holy-family' WHERE site_id = 'mx-mexico-city-church-of-the-holy-family-la-sagrada-familia-mexico-city';
UPDATE site_links SET site_id = 'mx-mexico-city-church-of-the-holy-family' WHERE site_id = 'mx-mexico-city-church-of-the-holy-family-la-sagrada-familia-mexico-city';
UPDATE site_tag_assignments SET site_id = 'mx-mexico-city-church-of-the-holy-family' WHERE site_id = 'mx-mexico-city-church-of-the-holy-family-la-sagrada-familia-mexico-city';
UPDATE site_contributor_notes SET site_id = 'mx-mexico-city-church-of-the-holy-family' WHERE site_id = 'mx-mexico-city-church-of-the-holy-family-la-sagrada-familia-mexico-city';
UPDATE site_edits SET site_id = 'mx-mexico-city-church-of-the-holy-family' WHERE site_id = 'mx-mexico-city-church-of-the-holy-family-la-sagrada-familia-mexico-city';
UPDATE pending_submissions SET site_id = 'mx-mexico-city-church-of-the-holy-family' WHERE site_id = 'mx-mexico-city-church-of-the-holy-family-la-sagrada-familia-mexico-city';

-- mx-mexico-city-museum-of-bl-miguel-agustin-pro
UPDATE sites SET
  name = 'Museum of Bl. Miguel Agustin Pro',
  short_description = 'This museum contains many of Bl. Miguel Pro''s personal belongings, including cassocks, vestments, the suit he was shot in, and the cot where he slept the night before his martyrdom.

The location of Fr. Pro''s arrest appears to be unknown, but the location of his martyrdom is known.',
  latitude = 19.4224,
  longitude = -99.16095,
  google_maps_url = 'https://maps.app.goo.gl/oWpMG3y1ppczZnBn6',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JPY',
  native_name = 'Museo Padre Pro',
  country = 'MX',
  municipality = 'Mexico City',
  updated_at = now()
WHERE id = 'mx-mexico-city-museum-of-bl-miguel-agustin-pro';

-- ── ID RENAME: mx-mexico-city-site-of-bl-miguel-pro-s-martyrdom
--              → mx-mexico-city-site-of-bl-miguel-pros-martyrdom
UPDATE sites SET
  id = 'mx-mexico-city-site-of-bl-miguel-pros-martyrdom',
  name = 'Site of Bl. Miguel Pro''s Martyrdom',
  short_description = 'At this site, where an outdoor short stairway stands on the lottery building, is the site where Bl. Miguel Pro was martyred by firing squad.  These buildings were all built since that time.',
  latitude = 19.436178,
  longitude = -99.150291,
  google_maps_url = 'https://maps.app.goo.gl/LVrL3fveaMm5XeYF9',
  featured = FALSE,
  interest = 'local',
  contributor = 'JPY',
  native_name = NULL,
  country = 'MX',
  municipality = 'Mexico City',
  updated_at = now()
WHERE id = 'mx-mexico-city-site-of-bl-miguel-pro-s-martyrdom';
UPDATE site_images SET site_id = 'mx-mexico-city-site-of-bl-miguel-pros-martyrdom' WHERE site_id = 'mx-mexico-city-site-of-bl-miguel-pro-s-martyrdom';
UPDATE site_links SET site_id = 'mx-mexico-city-site-of-bl-miguel-pros-martyrdom' WHERE site_id = 'mx-mexico-city-site-of-bl-miguel-pro-s-martyrdom';
UPDATE site_tag_assignments SET site_id = 'mx-mexico-city-site-of-bl-miguel-pros-martyrdom' WHERE site_id = 'mx-mexico-city-site-of-bl-miguel-pro-s-martyrdom';
UPDATE site_contributor_notes SET site_id = 'mx-mexico-city-site-of-bl-miguel-pros-martyrdom' WHERE site_id = 'mx-mexico-city-site-of-bl-miguel-pro-s-martyrdom';
UPDATE site_edits SET site_id = 'mx-mexico-city-site-of-bl-miguel-pros-martyrdom' WHERE site_id = 'mx-mexico-city-site-of-bl-miguel-pro-s-martyrdom';
UPDATE pending_submissions SET site_id = 'mx-mexico-city-site-of-bl-miguel-pros-martyrdom' WHERE site_id = 'mx-mexico-city-site-of-bl-miguel-pro-s-martyrdom';

-- ph-manaoag-minor-basilica-of-our-lady-of-the-rosary-of-manaoag
UPDATE sites SET
  name = 'Minor Basilica of Our Lady of the Rosary of Manaoag',
  short_description = 'Tradition dicates that the Blessed Mother showed herself to a middle-aged farmer and gave him a message on where she wanted her church to be built, appearing to him on a tree amidst a heavenly glow.  Today the center of devotion is the miraculous image of Our Lady of the Holy Rosary (Nuestra Senora de Manaoag, or Apo Baket as known to the local townspeople).',
  latitude = 16.0440593284094,
  longitude = 120.488325579597,
  google_maps_url = 'https://maps.app.goo.gl/5qCmhPnuvyxLkTEQ9',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Basilica Menor ng Birhen ng Santo Rosario ng Manaoag',
  country = 'PH',
  municipality = 'Manaoag',
  updated_at = now()
WHERE id = 'ph-manaoag-minor-basilica-of-our-lady-of-the-rosary-of-manaoag';

-- ── ID RENAME: pl-czestochowa-jasna-gora-monastery-our-lady-of-czestochowa
--              → pl-czestochowa-jasna-gora-monastery
UPDATE sites SET
  id = 'pl-czestochowa-jasna-gora-monastery',
  name = 'Jasna Gora Monastery',
  short_description = 'The Monastery of Jasna Gora in Czestochowa, Poland, is the third-largest Catholic pilgrimage site in the world.  Home to the beloved miraculous icon of Our Lady of Czestochowa, the monastery is also the national shrine of Poland and a pillar of Polish Catholicism.',
  latitude = 50.8127516192911,
  longitude = 19.0966517482729,
  google_maps_url = 'https://maps.app.goo.gl/b5k2yduVx1u7CFnn7',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Jasna Góra',
  country = 'PL',
  municipality = 'Czestochowa',
  updated_at = now()
WHERE id = 'pl-czestochowa-jasna-gora-monastery-our-lady-of-czestochowa';
UPDATE site_images SET site_id = 'pl-czestochowa-jasna-gora-monastery' WHERE site_id = 'pl-czestochowa-jasna-gora-monastery-our-lady-of-czestochowa';
UPDATE site_links SET site_id = 'pl-czestochowa-jasna-gora-monastery' WHERE site_id = 'pl-czestochowa-jasna-gora-monastery-our-lady-of-czestochowa';
UPDATE site_tag_assignments SET site_id = 'pl-czestochowa-jasna-gora-monastery' WHERE site_id = 'pl-czestochowa-jasna-gora-monastery-our-lady-of-czestochowa';
UPDATE site_contributor_notes SET site_id = 'pl-czestochowa-jasna-gora-monastery' WHERE site_id = 'pl-czestochowa-jasna-gora-monastery-our-lady-of-czestochowa';
UPDATE site_edits SET site_id = 'pl-czestochowa-jasna-gora-monastery' WHERE site_id = 'pl-czestochowa-jasna-gora-monastery-our-lady-of-czestochowa';
UPDATE pending_submissions SET site_id = 'pl-czestochowa-jasna-gora-monastery' WHERE site_id = 'pl-czestochowa-jasna-gora-monastery-our-lady-of-czestochowa';

-- ── ID RENAME: pl-gietrzwa-d-sanctuary-of-our-lady-of-gietrzwa-d
--              → pl-giertzwald-sanctuary-of-our-lady-of-gietrzwald
UPDATE sites SET
  id = 'pl-giertzwald-sanctuary-of-our-lady-of-gietrzwald',
  name = 'Sanctuary of Our Lady of Gietrzwald',
  short_description = 'In 1877, Our Lady appeared to Justyna Szafrynska (13) just before receiving her First Holy Communion.  The next day, Barbara Samulowska (12) also saw the "Bright Lady" sitting on the throne with Infant Christ among angels.  The Blessed Mother''s ask of the girls was for them to pray the rosary daily.',
  latitude = 53.7480853,
  longitude = 20.2356024,
  google_maps_url = 'https://maps.app.goo.gl/7KMnov8z4H9dxZRt7',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Sanktuarium Matki Bożej Gietrzwałdzkiej',
  country = 'PL',
  municipality = 'Giertzwald',
  updated_at = now()
WHERE id = 'pl-gietrzwa-d-sanctuary-of-our-lady-of-gietrzwa-d';
UPDATE site_images SET site_id = 'pl-giertzwald-sanctuary-of-our-lady-of-gietrzwald' WHERE site_id = 'pl-gietrzwa-d-sanctuary-of-our-lady-of-gietrzwa-d';
UPDATE site_links SET site_id = 'pl-giertzwald-sanctuary-of-our-lady-of-gietrzwald' WHERE site_id = 'pl-gietrzwa-d-sanctuary-of-our-lady-of-gietrzwa-d';
UPDATE site_tag_assignments SET site_id = 'pl-giertzwald-sanctuary-of-our-lady-of-gietrzwald' WHERE site_id = 'pl-gietrzwa-d-sanctuary-of-our-lady-of-gietrzwa-d';
UPDATE site_contributor_notes SET site_id = 'pl-giertzwald-sanctuary-of-our-lady-of-gietrzwald' WHERE site_id = 'pl-gietrzwa-d-sanctuary-of-our-lady-of-gietrzwa-d';
UPDATE site_edits SET site_id = 'pl-giertzwald-sanctuary-of-our-lady-of-gietrzwald' WHERE site_id = 'pl-gietrzwa-d-sanctuary-of-our-lady-of-gietrzwa-d';
UPDATE pending_submissions SET site_id = 'pl-giertzwald-sanctuary-of-our-lady-of-gietrzwald' WHERE site_id = 'pl-gietrzwa-d-sanctuary-of-our-lady-of-gietrzwa-d';

-- ── ID RENAME: pl-lezajsk-basilica-of-the-annunciation-of-the-blessed-virgin-mary-our-lady-of-lezajsk-lady-of-consolation
--              → pl-lezajsk-sanctuary-of-our-lady-of-consolation-monastery-of-the-bernardine-fathers-in-lezajsk
UPDATE sites SET
  id = 'pl-lezajsk-sanctuary-of-our-lady-of-consolation-monastery-of-the-bernardine-fathers-in-lezajsk',
  name = 'Sanctuary of Our Lady of Consolation (Monastery of the Bernardine Fathers in Lezajsk)',
  short_description = 'In 1578, a pious woodcutter named Tomasz MichaÅ‚ek saw a bright light in the forest.  The Virgin asked him to alert the authorities to build a church.  Thomas, scared, did nothing.  The Virgin appeared again, asking him to take action and ending his silence.  Thomas approached the authorities but was not believed.  Under a subsequent priest, a small chapel was built, then a larger shrine in 1606.  Today the shrine is part of a larger Bernardine monastery, and contains the image of Our Lady of Consolation.',
  latitude = 50.2704677,
  longitude = 22.4080316,
  google_maps_url = 'https://maps.app.goo.gl/tWDrvLevDXb5QqGEA',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Sanktuarium Matki Bożej Pocieszenia',
  country = 'PL',
  municipality = 'Lezajsk',
  updated_at = now()
WHERE id = 'pl-lezajsk-basilica-of-the-annunciation-of-the-blessed-virgin-mary-our-lady-of-lezajsk-lady-of-consolation';
UPDATE site_images SET site_id = 'pl-lezajsk-sanctuary-of-our-lady-of-consolation-monastery-of-the-bernardine-fathers-in-lezajsk' WHERE site_id = 'pl-lezajsk-basilica-of-the-annunciation-of-the-blessed-virgin-mary-our-lady-of-lezajsk-lady-of-consolation';
UPDATE site_links SET site_id = 'pl-lezajsk-sanctuary-of-our-lady-of-consolation-monastery-of-the-bernardine-fathers-in-lezajsk' WHERE site_id = 'pl-lezajsk-basilica-of-the-annunciation-of-the-blessed-virgin-mary-our-lady-of-lezajsk-lady-of-consolation';
UPDATE site_tag_assignments SET site_id = 'pl-lezajsk-sanctuary-of-our-lady-of-consolation-monastery-of-the-bernardine-fathers-in-lezajsk' WHERE site_id = 'pl-lezajsk-basilica-of-the-annunciation-of-the-blessed-virgin-mary-our-lady-of-lezajsk-lady-of-consolation';
UPDATE site_contributor_notes SET site_id = 'pl-lezajsk-sanctuary-of-our-lady-of-consolation-monastery-of-the-bernardine-fathers-in-lezajsk' WHERE site_id = 'pl-lezajsk-basilica-of-the-annunciation-of-the-blessed-virgin-mary-our-lady-of-lezajsk-lady-of-consolation';
UPDATE site_edits SET site_id = 'pl-lezajsk-sanctuary-of-our-lady-of-consolation-monastery-of-the-bernardine-fathers-in-lezajsk' WHERE site_id = 'pl-lezajsk-basilica-of-the-annunciation-of-the-blessed-virgin-mary-our-lady-of-lezajsk-lady-of-consolation';
UPDATE pending_submissions SET site_id = 'pl-lezajsk-sanctuary-of-our-lady-of-consolation-monastery-of-the-bernardine-fathers-in-lezajsk' WHERE site_id = 'pl-lezajsk-basilica-of-the-annunciation-of-the-blessed-virgin-mary-our-lady-of-lezajsk-lady-of-consolation';

-- ── ID RENAME: pl-lichen-stary-basilica-of-our-lady-of-lichen-holy-mother-of-sorrows-queen-of-poland
--              → pl-lichen-sanctuary-of-our-lady-of-lichen
UPDATE sites SET
  id = 'pl-lichen-sanctuary-of-our-lady-of-lichen',
  name = 'Sanctuary of Our Lady of Lichen',
  short_description = 'According to legend, the Virgin Mary appeared in Lichen, Poland to Tomasz Klossowski, a wounded soldier, in 1813 who was healed and discovered a miraculous portrait of Our Lady.  She then appeared to a poor shepherd, Mikolaj Sikatka, in 1850 who promoted her devotion.  She foretold of a cholera epidemic and interceded for the healing of many who sought her help.  Our Lady of Lichen is also known as Our Holy Mother of Sorrows, Queen of Poland.',
  latitude = 52.323705849375,
  longitude = 18.3584325570281,
  google_maps_url = 'https://maps.app.goo.gl/gxVM9hVbKPynuuCC7',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Sanktuarium Matki Bożej Licheńskiej',
  country = 'PL',
  municipality = 'Lichen',
  updated_at = now()
WHERE id = 'pl-lichen-stary-basilica-of-our-lady-of-lichen-holy-mother-of-sorrows-queen-of-poland';
UPDATE site_images SET site_id = 'pl-lichen-sanctuary-of-our-lady-of-lichen' WHERE site_id = 'pl-lichen-stary-basilica-of-our-lady-of-lichen-holy-mother-of-sorrows-queen-of-poland';
UPDATE site_links SET site_id = 'pl-lichen-sanctuary-of-our-lady-of-lichen' WHERE site_id = 'pl-lichen-stary-basilica-of-our-lady-of-lichen-holy-mother-of-sorrows-queen-of-poland';
UPDATE site_tag_assignments SET site_id = 'pl-lichen-sanctuary-of-our-lady-of-lichen' WHERE site_id = 'pl-lichen-stary-basilica-of-our-lady-of-lichen-holy-mother-of-sorrows-queen-of-poland';
UPDATE site_contributor_notes SET site_id = 'pl-lichen-sanctuary-of-our-lady-of-lichen' WHERE site_id = 'pl-lichen-stary-basilica-of-our-lady-of-lichen-holy-mother-of-sorrows-queen-of-poland';
UPDATE site_edits SET site_id = 'pl-lichen-sanctuary-of-our-lady-of-lichen' WHERE site_id = 'pl-lichen-stary-basilica-of-our-lady-of-lichen-holy-mother-of-sorrows-queen-of-poland';
UPDATE pending_submissions SET site_id = 'pl-lichen-sanctuary-of-our-lady-of-lichen' WHERE site_id = 'pl-lichen-stary-basilica-of-our-lady-of-lichen-holy-mother-of-sorrows-queen-of-poland';

-- pl-ludzmierz-sanctuary-of-our-lady-queen-of-podhale
UPDATE sites SET
  name = 'Sanctuary of Our Lady Queen of Podhale',
  short_description = 'This church was originally founded in the 13th century by Cistercians from France.  According to legend, around the year 1400, a merchant lost in the nearby swamps was led to the church by a figure he discerned to be Mary.  Out of gratitude, he commissioned a statue which can be found in the church today.

A regular visitor to the shrine was Karol WojtyÅ‚a, the future Pope St. John Paul II.  In August 1963, in his capacity as Archbishop of KrakÃ³w, the statue slipped during a ceremony and the future pontiff caught the scepter which had fallen out of the statue''s grasp.  This scene was interpreted by many as a prophecy of his upcoming papacy.',
  latitude = 49.4651296551083,
  longitude = 19.9828430570051,
  google_maps_url = 'https://maps.app.goo.gl/V4RNcvBMpbFH4pDT7',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Sanktuarium Maryjne w Ludźmierzu',
  country = 'PL',
  municipality = 'Ludzmierz',
  updated_at = now()
WHERE id = 'pl-ludzmierz-sanctuary-of-our-lady-queen-of-podhale';

-- pl-swieta-lipka-swieta-lipka-sanctuary
UPDATE sites SET
  name = 'Swieta Lipka Sanctuary',
  short_description = 'In the 13th century, Our Blessed Mother appeared to a condemned innocent person in his prison cell. Bringing him a piece of wood and a knife, she told him to carve an image of the Blessed Mother with Child.  When he had done so, the jailers and judge were so moved they gave him back his freedom.  In gratitude for the divine assistance, the man sought to place the sculpture near a linden tree along the road, as Mary had suggested.  The present-day basilica was built next to this great linden tree, which was the site of many miracles and healings over the centuries.

With the Prussian occupation of Poland, the sanctuary was defiled and the linden tree cut down.  Upon Poland''s independence, Jesuits were invited to renew the sanctuary, and it remains in beautiful condition to this day.',
  latitude = 54.0246754900946,
  longitude = 21.2177462726687,
  google_maps_url = 'https://maps.app.goo.gl/FcZTyyUrc8EwF4cw5',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Święta Lipka Bazylika',
  country = 'PL',
  municipality = 'Swieta Lipka',
  updated_at = now()
WHERE id = 'pl-swieta-lipka-swieta-lipka-sanctuary';

-- pt-fatima-sanctuary-of-our-lady-of-the-rosary-of-fatima
UPDATE sites SET
  name = 'Sanctuary of Our Lady of the Rosary of Fatima',
  short_description = 'While tending sheep in a field called the Cova de Iria, Lucia de Santos (aged 10) and her two cousins, Francisco and Jacinta Marto, reported six apparitions of Mary, who identified herself as "Our Lady of the Rosary."  Mary urged prayer of the rosary, penance for the conversion of sinners and consecration of Russia to her Immaculate Heart.',
  latitude = 39.6312638,
  longitude = -8.6731571,
  google_maps_url = 'https://maps.app.goo.gl/e7u1hgL8q6PwdhBf7',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Basílica de Nossa Senhora do Rosário de Fátima',
  country = 'PT',
  municipality = 'Fatima',
  updated_at = now()
WHERE id = 'pt-fatima-sanctuary-of-our-lady-of-the-rosary-of-fatima';

-- ── ID RENAME: rs-doroslovo-diocesan-shrine-of-mary-help-of-christians
--              → rs-doroslovo-church-of-mary-help-of-christians
UPDATE sites SET
  id = 'rs-doroslovo-church-of-mary-help-of-christians',
  name = 'Church of Mary, Help of Christians',
  short_description = 'In 1792, the Virgin Mary appeared to a blind man, advising him to bathe his eyes in a miraculous fountain.  Upon his healing, a chapel was built and was eventually expanded to a larger church.',
  latitude = 45.5929764710798,
  longitude = 19.1905119128275,
  google_maps_url = 'https://maps.app.goo.gl/r4sKVTNCa3utY1pR7',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Црква Водице Марије Помоћнице Кршћана',
  country = 'RS',
  municipality = 'Doroslovo',
  updated_at = now()
WHERE id = 'rs-doroslovo-diocesan-shrine-of-mary-help-of-christians';
UPDATE site_images SET site_id = 'rs-doroslovo-church-of-mary-help-of-christians' WHERE site_id = 'rs-doroslovo-diocesan-shrine-of-mary-help-of-christians';
UPDATE site_links SET site_id = 'rs-doroslovo-church-of-mary-help-of-christians' WHERE site_id = 'rs-doroslovo-diocesan-shrine-of-mary-help-of-christians';
UPDATE site_tag_assignments SET site_id = 'rs-doroslovo-church-of-mary-help-of-christians' WHERE site_id = 'rs-doroslovo-diocesan-shrine-of-mary-help-of-christians';
UPDATE site_contributor_notes SET site_id = 'rs-doroslovo-church-of-mary-help-of-christians' WHERE site_id = 'rs-doroslovo-diocesan-shrine-of-mary-help-of-christians';
UPDATE site_edits SET site_id = 'rs-doroslovo-church-of-mary-help-of-christians' WHERE site_id = 'rs-doroslovo-diocesan-shrine-of-mary-help-of-christians';
UPDATE pending_submissions SET site_id = 'rs-doroslovo-church-of-mary-help-of-christians' WHERE site_id = 'rs-doroslovo-diocesan-shrine-of-mary-help-of-christians';

-- ── ID RENAME: rw-kibeho-shrine-of-our-lady-of-kibeho-mother-of-the-word
--              → rw-kibeho-shrine-of-our-lady-of-kibeho
UPDATE sites SET
  id = 'rw-kibeho-shrine-of-our-lady-of-kibeho',
  name = 'Shrine of Our Lady of Kibeho',
  short_description = 'Between 1981 and 1989, the Virgin Mary appeared to several girls in Rwanda.  She appeared to them with the name "Nyina wa Jambo" ("Mother of the Word"), synonymous with "Umubyeyl W''iamna" ("Mother of God").  Mary emphasized the call to pray the rosary and asked for penance and fasting.  The three girls reported a vision foreshadowing the Rwandan Genocide which would occur just 13 years later, which would claim one of their lives.',
  latitude = -2.6496097,
  longitude = 29.5532812,
  google_maps_url = 'https://maps.app.goo.gl/NVFmDSec36QGBpuH7',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Ingoro ya Bikiramariya Kibeho',
  country = 'RW',
  municipality = 'Kibeho',
  updated_at = now()
WHERE id = 'rw-kibeho-shrine-of-our-lady-of-kibeho-mother-of-the-word';
UPDATE site_images SET site_id = 'rw-kibeho-shrine-of-our-lady-of-kibeho' WHERE site_id = 'rw-kibeho-shrine-of-our-lady-of-kibeho-mother-of-the-word';
UPDATE site_links SET site_id = 'rw-kibeho-shrine-of-our-lady-of-kibeho' WHERE site_id = 'rw-kibeho-shrine-of-our-lady-of-kibeho-mother-of-the-word';
UPDATE site_tag_assignments SET site_id = 'rw-kibeho-shrine-of-our-lady-of-kibeho' WHERE site_id = 'rw-kibeho-shrine-of-our-lady-of-kibeho-mother-of-the-word';
UPDATE site_contributor_notes SET site_id = 'rw-kibeho-shrine-of-our-lady-of-kibeho' WHERE site_id = 'rw-kibeho-shrine-of-our-lady-of-kibeho-mother-of-the-word';
UPDATE site_edits SET site_id = 'rw-kibeho-shrine-of-our-lady-of-kibeho' WHERE site_id = 'rw-kibeho-shrine-of-our-lady-of-kibeho-mother-of-the-word';
UPDATE pending_submissions SET site_id = 'rw-kibeho-shrine-of-our-lady-of-kibeho' WHERE site_id = 'rw-kibeho-shrine-of-our-lady-of-kibeho-mother-of-the-word';

-- ── ID RENAME: si-solkan-basilica-of-the-holy-mother-of-god
--              → si-solkan-basilica-of-the-holy-mother-of-god-sveta-gora
UPDATE sites SET
  id = 'si-solkan-basilica-of-the-holy-mother-of-god-sveta-gora',
  name = 'Basilica of the Holy Mother of God (Sveta Gora)',
  short_description = 'In 1539, Our Blessed Mother appeared to a shepherdess on Mt. Skalnica, now called the Holy Mountain (Sveta Gora), and instructed her: "Tell the people, let them build me a house here and ask me for mercy." The shepherdess was imprisoned by the unbelieving secular authorities several times, but was always miraculously rescued.',
  latitude = 45.9989430444559,
  longitude = 13.6553373449013,
  google_maps_url = 'https://maps.app.goo.gl/HbPjK1jEtPhBt1s6A',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Bazilika Svetogorske Matere Božje',
  country = 'SI',
  municipality = 'Solkan',
  updated_at = now()
WHERE id = 'si-solkan-basilica-of-the-holy-mother-of-god';
UPDATE site_images SET site_id = 'si-solkan-basilica-of-the-holy-mother-of-god-sveta-gora' WHERE site_id = 'si-solkan-basilica-of-the-holy-mother-of-god';
UPDATE site_links SET site_id = 'si-solkan-basilica-of-the-holy-mother-of-god-sveta-gora' WHERE site_id = 'si-solkan-basilica-of-the-holy-mother-of-god';
UPDATE site_tag_assignments SET site_id = 'si-solkan-basilica-of-the-holy-mother-of-god-sveta-gora' WHERE site_id = 'si-solkan-basilica-of-the-holy-mother-of-god';
UPDATE site_contributor_notes SET site_id = 'si-solkan-basilica-of-the-holy-mother-of-god-sveta-gora' WHERE site_id = 'si-solkan-basilica-of-the-holy-mother-of-god';
UPDATE site_edits SET site_id = 'si-solkan-basilica-of-the-holy-mother-of-god-sveta-gora' WHERE site_id = 'si-solkan-basilica-of-the-holy-mother-of-god';
UPDATE pending_submissions SET site_id = 'si-solkan-basilica-of-the-holy-mother-of-god-sveta-gora' WHERE site_id = 'si-solkan-basilica-of-the-holy-mother-of-god';

-- ── ID RENAME: tr-selcuk-basilica-of-st-john
--              → tr-ephesus-basilica-of-st-john
UPDATE sites SET
  id = 'tr-ephesus-basilica-of-st-john',
  name = 'Basilica of St. John',
  short_description = 'Completed in 565 AD, the basilica was built over the believed burial site of St. John the Apostle.  According to legend, St. John (as the Beloved Disciple) took the Virgin Mary to Ephesus in her final years, and her possible house overlooks the ancient city of Ephesus.

Today the ruins are part of the UNESCO World Heritage Site of Ephesus.',
  latitude = 37.9524398007025,
  longitude = 27.3679113460381,
  google_maps_url = 'https://maps.app.goo.gl/VLJhMUgXKFBiKksH7',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Aziz Yohannes Bazilikası',
  country = 'TR',
  municipality = 'Ephesus',
  updated_at = now()
WHERE id = 'tr-selcuk-basilica-of-st-john';
UPDATE site_images SET site_id = 'tr-ephesus-basilica-of-st-john' WHERE site_id = 'tr-selcuk-basilica-of-st-john';
UPDATE site_links SET site_id = 'tr-ephesus-basilica-of-st-john' WHERE site_id = 'tr-selcuk-basilica-of-st-john';
UPDATE site_tag_assignments SET site_id = 'tr-ephesus-basilica-of-st-john' WHERE site_id = 'tr-selcuk-basilica-of-st-john';
UPDATE site_contributor_notes SET site_id = 'tr-ephesus-basilica-of-st-john' WHERE site_id = 'tr-selcuk-basilica-of-st-john';
UPDATE site_edits SET site_id = 'tr-ephesus-basilica-of-st-john' WHERE site_id = 'tr-selcuk-basilica-of-st-john';
UPDATE pending_submissions SET site_id = 'tr-ephesus-basilica-of-st-john' WHERE site_id = 'tr-selcuk-basilica-of-st-john';

-- ── ID RENAME: tr-selcuk-church-of-mary
--              → tr-ephesus-church-of-mary
UPDATE sites SET
  id = 'tr-ephesus-church-of-mary',
  name = 'Church of Mary',
  short_description = 'Built in the 5th centry, possibly for the First Council of Ephesus (the third ecumenical council of the early church).  The Second Council of Ephesus may also have been held here.',
  latitude = 37.9446059640859,
  longitude = 27.3391947153403,
  google_maps_url = 'https://maps.app.goo.gl/hWctfcZ2ymyHs9Gi8',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = 'Meryem Kilisesi',
  country = 'TR',
  municipality = 'Ephesus',
  updated_at = now()
WHERE id = 'tr-selcuk-church-of-mary';
UPDATE site_images SET site_id = 'tr-ephesus-church-of-mary' WHERE site_id = 'tr-selcuk-church-of-mary';
UPDATE site_links SET site_id = 'tr-ephesus-church-of-mary' WHERE site_id = 'tr-selcuk-church-of-mary';
UPDATE site_tag_assignments SET site_id = 'tr-ephesus-church-of-mary' WHERE site_id = 'tr-selcuk-church-of-mary';
UPDATE site_contributor_notes SET site_id = 'tr-ephesus-church-of-mary' WHERE site_id = 'tr-selcuk-church-of-mary';
UPDATE site_edits SET site_id = 'tr-ephesus-church-of-mary' WHERE site_id = 'tr-selcuk-church-of-mary';
UPDATE pending_submissions SET site_id = 'tr-ephesus-church-of-mary' WHERE site_id = 'tr-selcuk-church-of-mary';

-- ── ID RENAME: tr-selcuk-house-of-the-virgin-mary
--              → tr-ephesus-house-of-the-virgin-mary
UPDATE sites SET
  id = 'tr-ephesus-house-of-the-virgin-mary',
  name = 'House of the Virgin Mary',
  short_description = 'This house was discovered in 1881 based on the descriptions of Bl. Anne Catherine Emmerich, a bedridden German nun who had never left her own country.  Among other visions of the lives of Jesus and the Virgin Mary, Bl. Emmerich described the land around the house where the Virgin Mary may have spent her final years before her Assumption into heaven.

The Catholic Church has not issued an opinion on the veracity of the house, but several popes have conveyed blessings and visited the site.',
  latitude = 37.9115960027711,
  longitude = 27.3341418397482,
  google_maps_url = 'https://maps.app.goo.gl/fpS8iUHeFEXtNZs39',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Meryem Ana Evi',
  country = 'TR',
  municipality = 'Ephesus',
  updated_at = now()
WHERE id = 'tr-selcuk-house-of-the-virgin-mary';
UPDATE site_images SET site_id = 'tr-ephesus-house-of-the-virgin-mary' WHERE site_id = 'tr-selcuk-house-of-the-virgin-mary';
UPDATE site_links SET site_id = 'tr-ephesus-house-of-the-virgin-mary' WHERE site_id = 'tr-selcuk-house-of-the-virgin-mary';
UPDATE site_tag_assignments SET site_id = 'tr-ephesus-house-of-the-virgin-mary' WHERE site_id = 'tr-selcuk-house-of-the-virgin-mary';
UPDATE site_contributor_notes SET site_id = 'tr-ephesus-house-of-the-virgin-mary' WHERE site_id = 'tr-selcuk-house-of-the-virgin-mary';
UPDATE site_edits SET site_id = 'tr-ephesus-house-of-the-virgin-mary' WHERE site_id = 'tr-selcuk-house-of-the-virgin-mary';
UPDATE pending_submissions SET site_id = 'tr-ephesus-house-of-the-virgin-mary' WHERE site_id = 'tr-selcuk-house-of-the-virgin-mary';

-- ── ID RENAME: us-auriesville-shrine-of-our-lady-of-martyrs-national-shrine-of-the-north-american-martyrs
--              → us-auriesville-shrine-of-our-lady-of-martyrs
UPDATE sites SET
  id = 'us-auriesville-shrine-of-our-lady-of-martyrs',
  name = 'Shrine of Our Lady of Martyrs',
  short_description = 'Built on the site of the Mohawk village of Ossernenon, where Sts. Isaac Jogues, Rene Goupil, and Jean de Lalande were martyred, and where St. Kateri Tekakwitha was born.',
  latitude = 42.9249911,
  longitude = -74.3022492,
  google_maps_url = 'https://maps.app.goo.gl/bX5LNekc1KiDSnxL7',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JPY',
  native_name = 'National Shrine of the North American Martyrs',
  country = 'US',
  municipality = 'Auriesville',
  updated_at = now()
WHERE id = 'us-auriesville-shrine-of-our-lady-of-martyrs-national-shrine-of-the-north-american-martyrs';
UPDATE site_images SET site_id = 'us-auriesville-shrine-of-our-lady-of-martyrs' WHERE site_id = 'us-auriesville-shrine-of-our-lady-of-martyrs-national-shrine-of-the-north-american-martyrs';
UPDATE site_links SET site_id = 'us-auriesville-shrine-of-our-lady-of-martyrs' WHERE site_id = 'us-auriesville-shrine-of-our-lady-of-martyrs-national-shrine-of-the-north-american-martyrs';
UPDATE site_tag_assignments SET site_id = 'us-auriesville-shrine-of-our-lady-of-martyrs' WHERE site_id = 'us-auriesville-shrine-of-our-lady-of-martyrs-national-shrine-of-the-north-american-martyrs';
UPDATE site_contributor_notes SET site_id = 'us-auriesville-shrine-of-our-lady-of-martyrs' WHERE site_id = 'us-auriesville-shrine-of-our-lady-of-martyrs-national-shrine-of-the-north-american-martyrs';
UPDATE site_edits SET site_id = 'us-auriesville-shrine-of-our-lady-of-martyrs' WHERE site_id = 'us-auriesville-shrine-of-our-lady-of-martyrs-national-shrine-of-the-north-american-martyrs';
UPDATE pending_submissions SET site_id = 'us-auriesville-shrine-of-our-lady-of-martyrs' WHERE site_id = 'us-auriesville-shrine-of-our-lady-of-martyrs-national-shrine-of-the-north-american-martyrs';

-- ── ID RENAME: us-buffalo-our-lady-of-victory-national-shrine-and-basilica
--              → us-lackawanna-our-lady-of-victory-national-shrine-and-basilica
UPDATE sites SET
  id = 'us-lackawanna-our-lady-of-victory-national-shrine-and-basilica',
  name = 'Our Lady of Victory National Shrine and Basilica',
  short_description = 'Basilica dedicated to Our Lady of Victory, built by Venerable Nelson Baker.  His body is kept in the basilica, within the grotto shrine to Our Lady of Lourdes.  The grotto is made out of lava rock from Mount Vesuvius.',
  latitude = 42.8255951721089,
  longitude = -78.8236059560191,
  google_maps_url = 'https://maps.app.goo.gl/RidJAxDH4HrzKB1cA',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JPY',
  native_name = NULL,
  country = 'US',
  municipality = 'Lackawanna',
  updated_at = now()
WHERE id = 'us-buffalo-our-lady-of-victory-national-shrine-and-basilica';
UPDATE site_images SET site_id = 'us-lackawanna-our-lady-of-victory-national-shrine-and-basilica' WHERE site_id = 'us-buffalo-our-lady-of-victory-national-shrine-and-basilica';
UPDATE site_links SET site_id = 'us-lackawanna-our-lady-of-victory-national-shrine-and-basilica' WHERE site_id = 'us-buffalo-our-lady-of-victory-national-shrine-and-basilica';
UPDATE site_tag_assignments SET site_id = 'us-lackawanna-our-lady-of-victory-national-shrine-and-basilica' WHERE site_id = 'us-buffalo-our-lady-of-victory-national-shrine-and-basilica';
UPDATE site_contributor_notes SET site_id = 'us-lackawanna-our-lady-of-victory-national-shrine-and-basilica' WHERE site_id = 'us-buffalo-our-lady-of-victory-national-shrine-and-basilica';
UPDATE site_edits SET site_id = 'us-lackawanna-our-lady-of-victory-national-shrine-and-basilica' WHERE site_id = 'us-buffalo-our-lady-of-victory-national-shrine-and-basilica';
UPDATE pending_submissions SET site_id = 'us-lackawanna-our-lady-of-victory-national-shrine-and-basilica' WHERE site_id = 'us-buffalo-our-lady-of-victory-national-shrine-and-basilica';

-- us-carmel-by-the-sea-mission-san-carlos-borromeo-de-carmelo
UPDATE sites SET
  name = 'Mission San Carlos Borromeo de Carmelo',
  short_description = 'The 2nd of the 21 California missions, founded in 1770, and the site of St. Junipero Serra''s death.  His remains are located southeast of the altar.',
  latitude = 36.5425423059041,
  longitude = -121.919856929485,
  google_maps_url = 'https://maps.app.goo.gl/dSvAFFVQ2nJhtebj7',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'Carmel-by-the-Sea',
  updated_at = now()
WHERE id = 'us-carmel-by-the-sea-mission-san-carlos-borromeo-de-carmelo';

-- ── ID RENAME: us-dallas-blessed-sacrament-catholic-church-dallas-tx
--              → us-dallas-blessed-sacrament-catholic-church
UPDATE sites SET
  id = 'us-dallas-blessed-sacrament-catholic-church',
  name = 'Blessed Sacrament Catholic Church',
  short_description = 'Second oldest parish in the city of Dallas, but established when Oak Cliff was a separate city.',
  latitude = 32.751,
  longitude = -96.8159986,
  google_maps_url = 'https://maps.app.goo.gl/PF7i5c96mUUsAufS9',
  featured = FALSE,
  interest = 'personal',
  contributor = 'JPY',
  native_name = NULL,
  country = 'US',
  municipality = 'Dallas',
  updated_at = now()
WHERE id = 'us-dallas-blessed-sacrament-catholic-church-dallas-tx';
UPDATE site_images SET site_id = 'us-dallas-blessed-sacrament-catholic-church' WHERE site_id = 'us-dallas-blessed-sacrament-catholic-church-dallas-tx';
UPDATE site_links SET site_id = 'us-dallas-blessed-sacrament-catholic-church' WHERE site_id = 'us-dallas-blessed-sacrament-catholic-church-dallas-tx';
UPDATE site_tag_assignments SET site_id = 'us-dallas-blessed-sacrament-catholic-church' WHERE site_id = 'us-dallas-blessed-sacrament-catholic-church-dallas-tx';
UPDATE site_contributor_notes SET site_id = 'us-dallas-blessed-sacrament-catholic-church' WHERE site_id = 'us-dallas-blessed-sacrament-catholic-church-dallas-tx';
UPDATE site_edits SET site_id = 'us-dallas-blessed-sacrament-catholic-church' WHERE site_id = 'us-dallas-blessed-sacrament-catholic-church-dallas-tx';
UPDATE pending_submissions SET site_id = 'us-dallas-blessed-sacrament-catholic-church' WHERE site_id = 'us-dallas-blessed-sacrament-catholic-church-dallas-tx';

-- ── ID RENAME: us-dallas-holy-trinity-catholic-church-dallas-tx
--              → us-dallas-holy-trinity-catholic-church
UPDATE sites SET
  id = 'us-dallas-holy-trinity-catholic-church',
  name = 'Holy Trinity Catholic Church',
  short_description = 'Founded and staffed by the Vincentians, who also staffed Trinity College/Dallas University across the street.',
  latitude = 32.8145708,
  longitude = -96.8028428,
  google_maps_url = 'https://maps.app.goo.gl/zsTW5D5hzh4XvuNg7',
  featured = FALSE,
  interest = 'personal',
  contributor = 'JPY',
  native_name = NULL,
  country = 'US',
  municipality = 'Dallas',
  updated_at = now()
WHERE id = 'us-dallas-holy-trinity-catholic-church-dallas-tx';
UPDATE site_images SET site_id = 'us-dallas-holy-trinity-catholic-church' WHERE site_id = 'us-dallas-holy-trinity-catholic-church-dallas-tx';
UPDATE site_links SET site_id = 'us-dallas-holy-trinity-catholic-church' WHERE site_id = 'us-dallas-holy-trinity-catholic-church-dallas-tx';
UPDATE site_tag_assignments SET site_id = 'us-dallas-holy-trinity-catholic-church' WHERE site_id = 'us-dallas-holy-trinity-catholic-church-dallas-tx';
UPDATE site_contributor_notes SET site_id = 'us-dallas-holy-trinity-catholic-church' WHERE site_id = 'us-dallas-holy-trinity-catholic-church-dallas-tx';
UPDATE site_edits SET site_id = 'us-dallas-holy-trinity-catholic-church' WHERE site_id = 'us-dallas-holy-trinity-catholic-church-dallas-tx';
UPDATE pending_submissions SET site_id = 'us-dallas-holy-trinity-catholic-church' WHERE site_id = 'us-dallas-holy-trinity-catholic-church-dallas-tx';

-- ── ID RENAME: us-dallas-national-shrine-cathedral-of-our-lady-of-guadalupe-dallas-tx
--              → us-dallas-national-shrine-cathedral-of-our-lady-of-guadalupe
UPDATE sites SET
  id = 'us-dallas-national-shrine-cathedral-of-our-lady-of-guadalupe',
  name = 'National Shrine Cathedral of Our Lady of Guadalupe',
  short_description = 'Originally dedicated to the Sacred Heart, this parish is the oldest in the city of Dallas.  The parish merged with Our Lady of Guadalupe in the Little Mexico neighborhood (now Harwood) in 1965, and in 1977 the Cathedral was renamed in honor of Our Lady of Guadalupe.

In 2023 the cathedral was elevated to a National Shrine by the US Conference fo Catholic Bishops.',
  latitude = 32.7885152,
  longitude = -96.7977807,
  google_maps_url = 'https://maps.app.goo.gl/zrxePhCC9MEjgqH5A',
  featured = FALSE,
  interest = 'personal',
  contributor = 'JPY',
  native_name = NULL,
  country = 'US',
  municipality = 'Dallas',
  updated_at = now()
WHERE id = 'us-dallas-national-shrine-cathedral-of-our-lady-of-guadalupe-dallas-tx';
UPDATE site_images SET site_id = 'us-dallas-national-shrine-cathedral-of-our-lady-of-guadalupe' WHERE site_id = 'us-dallas-national-shrine-cathedral-of-our-lady-of-guadalupe-dallas-tx';
UPDATE site_links SET site_id = 'us-dallas-national-shrine-cathedral-of-our-lady-of-guadalupe' WHERE site_id = 'us-dallas-national-shrine-cathedral-of-our-lady-of-guadalupe-dallas-tx';
UPDATE site_tag_assignments SET site_id = 'us-dallas-national-shrine-cathedral-of-our-lady-of-guadalupe' WHERE site_id = 'us-dallas-national-shrine-cathedral-of-our-lady-of-guadalupe-dallas-tx';
UPDATE site_contributor_notes SET site_id = 'us-dallas-national-shrine-cathedral-of-our-lady-of-guadalupe' WHERE site_id = 'us-dallas-national-shrine-cathedral-of-our-lady-of-guadalupe-dallas-tx';
UPDATE site_edits SET site_id = 'us-dallas-national-shrine-cathedral-of-our-lady-of-guadalupe' WHERE site_id = 'us-dallas-national-shrine-cathedral-of-our-lady-of-guadalupe-dallas-tx';
UPDATE pending_submissions SET site_id = 'us-dallas-national-shrine-cathedral-of-our-lady-of-guadalupe' WHERE site_id = 'us-dallas-national-shrine-cathedral-of-our-lady-of-guadalupe-dallas-tx';

-- ── ID RENAME: us-dallas-old-our-lady-of-guadalupe-catholic-church-dallas-tx
--              → us-dallas-old-our-lady-of-guadalupe-catholic-church
UPDATE sites SET
  id = 'us-dallas-old-our-lady-of-guadalupe-catholic-church',
  name = 'Old Our Lady of Guadalupe Catholic Church',
  short_description = 'Established in 1914 in response to the flood of Mexican refugees fleeing the anti-Catholic dictatorship in Mexico, this parish was merged with the cathedral in 1965.  This gentrified neighborhood was once Little Mexico.  All that remains on the site is an image of Our Lady of Gudalaupe.

The church was first served by Vincentians, who staffed Holy Trinity, then by the Carmelites.

St. Ann''s school was located next to the church, and the building still stands today, containing a restaurant and a Japanese samaurai collection.',
  latitude = 32.792159,
  longitude = -96.8064572,
  google_maps_url = 'https://maps.app.goo.gl/4eThLkHKQQNB5r1Y9',
  featured = FALSE,
  interest = 'personal',
  contributor = 'JPY',
  native_name = NULL,
  country = 'US',
  municipality = 'Dallas',
  updated_at = now()
WHERE id = 'us-dallas-old-our-lady-of-guadalupe-catholic-church-dallas-tx';
UPDATE site_images SET site_id = 'us-dallas-old-our-lady-of-guadalupe-catholic-church' WHERE site_id = 'us-dallas-old-our-lady-of-guadalupe-catholic-church-dallas-tx';
UPDATE site_links SET site_id = 'us-dallas-old-our-lady-of-guadalupe-catholic-church' WHERE site_id = 'us-dallas-old-our-lady-of-guadalupe-catholic-church-dallas-tx';
UPDATE site_tag_assignments SET site_id = 'us-dallas-old-our-lady-of-guadalupe-catholic-church' WHERE site_id = 'us-dallas-old-our-lady-of-guadalupe-catholic-church-dallas-tx';
UPDATE site_contributor_notes SET site_id = 'us-dallas-old-our-lady-of-guadalupe-catholic-church' WHERE site_id = 'us-dallas-old-our-lady-of-guadalupe-catholic-church-dallas-tx';
UPDATE site_edits SET site_id = 'us-dallas-old-our-lady-of-guadalupe-catholic-church' WHERE site_id = 'us-dallas-old-our-lady-of-guadalupe-catholic-church-dallas-tx';
UPDATE pending_submissions SET site_id = 'us-dallas-old-our-lady-of-guadalupe-catholic-church' WHERE site_id = 'us-dallas-old-our-lady-of-guadalupe-catholic-church-dallas-tx';

-- ── ID RENAME: us-dallas-old-st-joseph-catholic-church-dallas-tx
--              → us-dallas-old-st-joseph-catholic-church
UPDATE sites SET
  id = 'us-dallas-old-st-joseph-catholic-church',
  name = 'Old St. Joseph Catholic Church',
  short_description = 'The school was founded in 1905 and the present church, the 5th church in Dallas and the 3rd oldest extant one, was built in 1910.  The original 1905 temporary church, later used as a parish hall, stood on the corner of Texas and Floyd and was extant in 2009, though it now appears to be gone.  The church was built by the Oblate fathers for the German population.

From 1977 to 2007, the buildings were used for St. Andrew Kim Korean parish, until that congregation moved to Farmers Branch.

This church is currently not in the possession of the Diocese of Dallas.',
  latitude = 32.7876037,
  longitude = -96.7870118,
  google_maps_url = 'https://maps.app.goo.gl/bn3Ji1zvXryxf4nV7',
  featured = FALSE,
  interest = 'personal',
  contributor = 'JPY',
  native_name = NULL,
  country = 'US',
  municipality = 'Dallas',
  updated_at = now()
WHERE id = 'us-dallas-old-st-joseph-catholic-church-dallas-tx';
UPDATE site_images SET site_id = 'us-dallas-old-st-joseph-catholic-church' WHERE site_id = 'us-dallas-old-st-joseph-catholic-church-dallas-tx';
UPDATE site_links SET site_id = 'us-dallas-old-st-joseph-catholic-church' WHERE site_id = 'us-dallas-old-st-joseph-catholic-church-dallas-tx';
UPDATE site_tag_assignments SET site_id = 'us-dallas-old-st-joseph-catholic-church' WHERE site_id = 'us-dallas-old-st-joseph-catholic-church-dallas-tx';
UPDATE site_contributor_notes SET site_id = 'us-dallas-old-st-joseph-catholic-church' WHERE site_id = 'us-dallas-old-st-joseph-catholic-church-dallas-tx';
UPDATE site_edits SET site_id = 'us-dallas-old-st-joseph-catholic-church' WHERE site_id = 'us-dallas-old-st-joseph-catholic-church-dallas-tx';
UPDATE pending_submissions SET site_id = 'us-dallas-old-st-joseph-catholic-church' WHERE site_id = 'us-dallas-old-st-joseph-catholic-church-dallas-tx';

-- ── ID RENAME: us-dallas-old-st-patrick-catholic-church-dallas-tx
--              → us-dallas-old-st-patrick-catholic-church
UPDATE sites SET
  id = 'us-dallas-old-st-patrick-catholic-church',
  name = 'Old St. Patrick Catholic Church',
  short_description = 'Part of the deal when the first parish in Dallas was named Sacred Heart was that the second church would be named in honor of St. Patrick.  This parish (which became the third oldest in the Dallas city limits once Oak Cliff was annexed) was located across from City Park.  The church was flattened by I-30, and where it once stood is now squarely in the middle of the Canyon.',
  latitude = 32.775131,
  longitude = -96.787789,
  google_maps_url = 'https://maps.app.goo.gl/qhY6Q9Gz8qK7juLh8',
  featured = FALSE,
  interest = 'personal',
  contributor = 'JPY',
  native_name = NULL,
  country = 'US',
  municipality = 'Dallas',
  updated_at = now()
WHERE id = 'us-dallas-old-st-patrick-catholic-church-dallas-tx';
UPDATE site_images SET site_id = 'us-dallas-old-st-patrick-catholic-church' WHERE site_id = 'us-dallas-old-st-patrick-catholic-church-dallas-tx';
UPDATE site_links SET site_id = 'us-dallas-old-st-patrick-catholic-church' WHERE site_id = 'us-dallas-old-st-patrick-catholic-church-dallas-tx';
UPDATE site_tag_assignments SET site_id = 'us-dallas-old-st-patrick-catholic-church' WHERE site_id = 'us-dallas-old-st-patrick-catholic-church-dallas-tx';
UPDATE site_contributor_notes SET site_id = 'us-dallas-old-st-patrick-catholic-church' WHERE site_id = 'us-dallas-old-st-patrick-catholic-church-dallas-tx';
UPDATE site_edits SET site_id = 'us-dallas-old-st-patrick-catholic-church' WHERE site_id = 'us-dallas-old-st-patrick-catholic-church-dallas-tx';
UPDATE pending_submissions SET site_id = 'us-dallas-old-st-patrick-catholic-church' WHERE site_id = 'us-dallas-old-st-patrick-catholic-church-dallas-tx';

-- ── ID RENAME: us-dallas-old-st-paul-sanitarium-dallas-tx
--              → us-dallas-old-st-paul-sanitarium
UPDATE sites SET
  id = 'us-dallas-old-st-paul-sanitarium',
  name = 'Old St. Paul Sanitarium',
  short_description = 'Original site of St. Paul Sanitarium.  The hospital moved to its present location on Harry Hines Blvd in the 1960''s, and the original building was razed.  The Daughters of Charity continued administration of the hospital until it was sold around the year 2000.  Today it is part of UT Southwestern.',
  latitude = 32.7942111,
  longitude = -96.7889278,
  google_maps_url = 'https://maps.app.goo.gl/JcF4uC4Zkq1yn5fC7',
  featured = FALSE,
  interest = 'personal',
  contributor = 'JPY',
  native_name = NULL,
  country = 'US',
  municipality = 'Dallas',
  updated_at = now()
WHERE id = 'us-dallas-old-st-paul-sanitarium-dallas-tx';
UPDATE site_images SET site_id = 'us-dallas-old-st-paul-sanitarium' WHERE site_id = 'us-dallas-old-st-paul-sanitarium-dallas-tx';
UPDATE site_links SET site_id = 'us-dallas-old-st-paul-sanitarium' WHERE site_id = 'us-dallas-old-st-paul-sanitarium-dallas-tx';
UPDATE site_tag_assignments SET site_id = 'us-dallas-old-st-paul-sanitarium' WHERE site_id = 'us-dallas-old-st-paul-sanitarium-dallas-tx';
UPDATE site_contributor_notes SET site_id = 'us-dallas-old-st-paul-sanitarium' WHERE site_id = 'us-dallas-old-st-paul-sanitarium-dallas-tx';
UPDATE site_edits SET site_id = 'us-dallas-old-st-paul-sanitarium' WHERE site_id = 'us-dallas-old-st-paul-sanitarium-dallas-tx';
UPDATE pending_submissions SET site_id = 'us-dallas-old-st-paul-sanitarium' WHERE site_id = 'us-dallas-old-st-paul-sanitarium-dallas-tx';

-- us-dallas-old-trinity-college-dallas-university-jesuit-dallas
UPDATE sites SET
  name = 'Old Trinity College, Dallas University, Jesuit Dallas',
  short_description = 'Original site of Holy Trinity College, the Vincentian college.  The school was later renamed to Dallas University/University of Dallas.  The school closed in 1929 and its charter was reused for the current University of Dlalas.

The building later housed Jesuit Prepatory School until it moved next to St. Rita and this building was sadly razed.',
  latitude = 32.814343,
  longitude = -96.8018151,
  google_maps_url = 'https://maps.app.goo.gl/DRZU2PuSJEuk94zbA',
  featured = FALSE,
  interest = 'personal',
  contributor = 'JPY',
  native_name = NULL,
  country = 'US',
  municipality = 'Dallas',
  updated_at = now()
WHERE id = 'us-dallas-old-trinity-college-dallas-university-jesuit-dallas';

-- ── ID RENAME: us-dallas-old-ursuline-academy-dallas-tx
--              → us-dallas-old-ursuline-academy
UPDATE sites SET
  id = 'us-dallas-old-ursuline-academy',
  name = 'Old Ursuline Academy',
  short_description = 'Original site of Ursuline Academy and the Ursuline Convent.  It is unclear why this building was demolished.',
  latitude = 32.795627,
  longitude = -96.782279,
  google_maps_url = 'https://maps.app.goo.gl/M9M7FYxFqHtszZWR7',
  featured = FALSE,
  interest = 'personal',
  contributor = 'JPY',
  native_name = NULL,
  country = 'US',
  municipality = 'Dallas',
  updated_at = now()
WHERE id = 'us-dallas-old-ursuline-academy-dallas-tx';
UPDATE site_images SET site_id = 'us-dallas-old-ursuline-academy' WHERE site_id = 'us-dallas-old-ursuline-academy-dallas-tx';
UPDATE site_links SET site_id = 'us-dallas-old-ursuline-academy' WHERE site_id = 'us-dallas-old-ursuline-academy-dallas-tx';
UPDATE site_tag_assignments SET site_id = 'us-dallas-old-ursuline-academy' WHERE site_id = 'us-dallas-old-ursuline-academy-dallas-tx';
UPDATE site_contributor_notes SET site_id = 'us-dallas-old-ursuline-academy' WHERE site_id = 'us-dallas-old-ursuline-academy-dallas-tx';
UPDATE site_edits SET site_id = 'us-dallas-old-ursuline-academy' WHERE site_id = 'us-dallas-old-ursuline-academy-dallas-tx';
UPDATE pending_submissions SET site_id = 'us-dallas-old-ursuline-academy' WHERE site_id = 'us-dallas-old-ursuline-academy-dallas-tx';

-- ── ID RENAME: us-dallas-st-edward-the-confessor-catholic-church-dallas-tx
--              → us-dallas-st-edward-the-confessor-catholic-church
UPDATE sites SET
  id = 'us-dallas-st-edward-the-confessor-catholic-church',
  name = 'St. Edward the Confessor Catholic Church',
  short_description = 'Founded by the Rt. Rev. Edward Joseph Dunne, bishop of Dallas, on Oct. 13, 1903, as the fourth parish in Dallas (Oak Cliff had just been annexed, so Blessed Sacrament was now in the Dallas city limits).  The name of the parish and the name of the bishop are not coincidence.

The founding pastor was the Rev. Joseph P. Lynch, who had been a priest for just 3 years.  Within a few years he would become bishop of Dallas.',
  latitude = 32.788721,
  longitude = -96.7726526,
  google_maps_url = 'https://maps.app.goo.gl/LCohKcxVE9YbJamp9',
  featured = FALSE,
  interest = 'personal',
  contributor = 'JPY',
  native_name = NULL,
  country = 'US',
  municipality = 'Dallas',
  updated_at = now()
WHERE id = 'us-dallas-st-edward-the-confessor-catholic-church-dallas-tx';
UPDATE site_images SET site_id = 'us-dallas-st-edward-the-confessor-catholic-church' WHERE site_id = 'us-dallas-st-edward-the-confessor-catholic-church-dallas-tx';
UPDATE site_links SET site_id = 'us-dallas-st-edward-the-confessor-catholic-church' WHERE site_id = 'us-dallas-st-edward-the-confessor-catholic-church-dallas-tx';
UPDATE site_tag_assignments SET site_id = 'us-dallas-st-edward-the-confessor-catholic-church' WHERE site_id = 'us-dallas-st-edward-the-confessor-catholic-church-dallas-tx';
UPDATE site_contributor_notes SET site_id = 'us-dallas-st-edward-the-confessor-catholic-church' WHERE site_id = 'us-dallas-st-edward-the-confessor-catholic-church-dallas-tx';
UPDATE site_edits SET site_id = 'us-dallas-st-edward-the-confessor-catholic-church' WHERE site_id = 'us-dallas-st-edward-the-confessor-catholic-church-dallas-tx';
UPDATE pending_submissions SET site_id = 'us-dallas-st-edward-the-confessor-catholic-church' WHERE site_id = 'us-dallas-st-edward-the-confessor-catholic-church-dallas-tx';

-- ── ID RENAME: us-dallas-st-peter-catholic-church-dallas-tx
--              → us-dallas-st-peter-catholic-church
UPDATE sites SET
  id = 'us-dallas-st-peter-catholic-church',
  name = 'St. Peter Catholic Church',
  short_description = 'The first black parish in Dallas, founded in 1905, is now home to the area''s Polish community.',
  latitude = 32.7950372,
  longitude = -96.7950317,
  google_maps_url = 'https://maps.app.goo.gl/Ps1edC2QjwSEJLDV7',
  featured = FALSE,
  interest = 'personal',
  contributor = 'JPY',
  native_name = NULL,
  country = 'US',
  municipality = 'Dallas',
  updated_at = now()
WHERE id = 'us-dallas-st-peter-catholic-church-dallas-tx';
UPDATE site_images SET site_id = 'us-dallas-st-peter-catholic-church' WHERE site_id = 'us-dallas-st-peter-catholic-church-dallas-tx';
UPDATE site_links SET site_id = 'us-dallas-st-peter-catholic-church' WHERE site_id = 'us-dallas-st-peter-catholic-church-dallas-tx';
UPDATE site_tag_assignments SET site_id = 'us-dallas-st-peter-catholic-church' WHERE site_id = 'us-dallas-st-peter-catholic-church-dallas-tx';
UPDATE site_contributor_notes SET site_id = 'us-dallas-st-peter-catholic-church' WHERE site_id = 'us-dallas-st-peter-catholic-church-dallas-tx';
UPDATE site_edits SET site_id = 'us-dallas-st-peter-catholic-church' WHERE site_id = 'us-dallas-st-peter-catholic-church-dallas-tx';
UPDATE pending_submissions SET site_id = 'us-dallas-st-peter-catholic-church' WHERE site_id = 'us-dallas-st-peter-catholic-church-dallas-tx';

-- ── ID RENAME: us-emmitsburg-mount-st-mary-s-seminary
--              → us-emmitsburg-mount-st-marys-seminary
UPDATE sites SET
  id = 'us-emmitsburg-mount-st-marys-seminary',
  name = 'Mount St. Mary''s Seminary',
  short_description = 'Bl. Stanley Rother completed his studies at Mount St. Mary''s Seminary and was ordained a priest on May 25, 1963.',
  latitude = 39.6799879929785,
  longitude = -77.3549241077855,
  google_maps_url = 'https://maps.app.goo.gl/ZU179uXF8BxiC1w6A',
  featured = FALSE,
  interest = 'local',
  contributor = 'JPY',
  native_name = NULL,
  country = 'US',
  municipality = 'Emmitsburg',
  updated_at = now()
WHERE id = 'us-emmitsburg-mount-st-mary-s-seminary';
UPDATE site_images SET site_id = 'us-emmitsburg-mount-st-marys-seminary' WHERE site_id = 'us-emmitsburg-mount-st-mary-s-seminary';
UPDATE site_links SET site_id = 'us-emmitsburg-mount-st-marys-seminary' WHERE site_id = 'us-emmitsburg-mount-st-mary-s-seminary';
UPDATE site_tag_assignments SET site_id = 'us-emmitsburg-mount-st-marys-seminary' WHERE site_id = 'us-emmitsburg-mount-st-mary-s-seminary';
UPDATE site_contributor_notes SET site_id = 'us-emmitsburg-mount-st-marys-seminary' WHERE site_id = 'us-emmitsburg-mount-st-mary-s-seminary';
UPDATE site_edits SET site_id = 'us-emmitsburg-mount-st-marys-seminary' WHERE site_id = 'us-emmitsburg-mount-st-mary-s-seminary';
UPDATE pending_submissions SET site_id = 'us-emmitsburg-mount-st-marys-seminary' WHERE site_id = 'us-emmitsburg-mount-st-mary-s-seminary';

-- us-fremont-mission-san-jose
UPDATE sites SET
  name = 'Mission San Jose',
  short_description = 'The 14th of the 21 California missions, founded in 1797.',
  latitude = 37.5334036374493,
  longitude = -121.919695300919,
  google_maps_url = 'https://maps.app.goo.gl/nQZwkbWpaygnudJG9',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'Fremont',
  updated_at = now()
WHERE id = 'us-fremont-mission-san-jose';

-- us-hulbert-our-lady-of-clear-creek-abbey
UPDATE sites SET
  name = 'Our Lady of Clear Creek Abbey',
  short_description = 'Benedictine abbey in the Solesmes Congregation, founded in 1999.  The main church and abbey are still under construction.  Men visiting the abbey can join the monks for meals and manual work in addition to Mass and the Divine Office.  Women can also make retreats at the house on the abbey grounds.',
  latitude = 36.0340226020418,
  longitude = -95.1958272067643,
  google_maps_url = 'https://maps.app.goo.gl/XjTrbtPBPhyckc7V7',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JPY',
  native_name = NULL,
  country = 'US',
  municipality = 'Hulbert',
  updated_at = now()
WHERE id = 'us-hulbert-our-lady-of-clear-creek-abbey';

-- us-los-angeles-mission-san-fernando-rey-de-espana
UPDATE sites SET
  name = 'Mission San Fernando Rey de Espana',
  short_description = 'The 17th of the 21 California missions, founded in 1797.',
  latitude = 34.2728717819309,
  longitude = -118.461632373847,
  google_maps_url = 'https://maps.app.goo.gl/ZzE2QhTnk2Be5WVD7',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'Los Angeles',
  updated_at = now()
WHERE id = 'us-los-angeles-mission-san-fernando-rey-de-espana';

-- us-monterey-county-mission-san-antonio-de-padua
UPDATE sites SET
  name = 'Mission San Antonio de Padua',
  short_description = 'The 3rd of the 21 California missions, founded in 1771.',
  latitude = 36.0153800162529,
  longitude = -121.250314673798,
  google_maps_url = 'https://maps.app.goo.gl/sCyecLWsfowqFvCU9',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'Monterey County',
  updated_at = now()
WHERE id = 'us-monterey-county-mission-san-antonio-de-padua';

-- us-oceanside-mission-san-luis-rey-de-francia
UPDATE sites SET
  name = 'Mission San Luis Rey de Francia',
  short_description = 'The 18th of the 21 California missions, founded in 1798.  It is attached to the Franciscan community of the same name.',
  latitude = 33.2321695508642,
  longitude = -117.319756402711,
  google_maps_url = 'https://maps.app.goo.gl/ciqBWfoqZnrEcPc78',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'Oceanside',
  updated_at = now()
WHERE id = 'us-oceanside-mission-san-luis-rey-de-francia';

-- us-okarche-holy-trinity-catholic-church-okarche-ok
UPDATE sites SET
  name = 'Holy Trinity Catholic Church, Okarche, OK',
  short_description = 'Bl. Stanley Rother was a parishioner at Holy Trinity Catholic Church, where he received his sacraments and studied at Holy Trinity Catholic School.',
  latitude = 35.7284903,
  longitude = -97.975802,
  google_maps_url = 'https://maps.app.goo.gl/35BZ67c8HMbeK29C9',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'Okarche',
  updated_at = now()
WHERE id = 'us-okarche-holy-trinity-catholic-church-okarche-ok';

-- us-oklahoma-city-blessed-stanley-rother-shrine
UPDATE sites SET
  name = 'Blessed Stanley Rother Shrine',
  short_description = 'The shrine was dedicated on February 17, 2023 with the Most Rev. Paul S. Coakley, Archbishop of Oklahoma City presiding. The service was attended by 37 bishops, 147 priests, and hundreds of other religious and pilgrims.',
  latitude = 35.3758,
  longitude = -97.4975,
  google_maps_url = 'https://maps.app.goo.gl/232dvtuSiFs88auZ8',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'Oklahoma City',
  updated_at = now()
WHERE id = 'us-oklahoma-city-blessed-stanley-rother-shrine';

-- us-pine-bluff-st-mary-catholic-church
UPDATE sites SET
  name = 'St. Mary Catholic Church',
  short_description = 'Oldest Catholic church in Arkansas, originally built on a barge in the Arkansas River in 1782 to combat the threat of flooding by the river.  The cemetery behind the church is the final resting place for Mother Agnes Hart, a nun whose body was later found to be incorrupt.',
  latitude = 34.3246561,
  longitude = -91.9426947,
  google_maps_url = 'https://maps.app.goo.gl/XLh3bppeSczpyvmK8',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JPY',
  native_name = NULL,
  country = 'US',
  municipality = 'Pine Bluff',
  updated_at = now()
WHERE id = 'us-pine-bluff-st-mary-catholic-church';

-- us-san-antonio-assumption-seminary
UPDATE sites SET
  name = 'Assumption Seminary',
  short_description = 'Bl. Stanley Rother was accepted as a seminarian and began his studies at Assumption Seminary.',
  latitude = 29.454204,
  longitude = -98.54519,
  google_maps_url = 'https://maps.app.goo.gl/XnHQq9Gpuzg56MHG7',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'San Antonio',
  updated_at = now()
WHERE id = 'us-san-antonio-assumption-seminary';

-- us-san-diego-mission-san-diego-de-alcala
UPDATE sites SET
  name = 'Mission San Diego de Alcala',
  short_description = 'The 1st of the 21 California missions, founded in 1769.',
  latitude = 32.7844544140364,
  longitude = -117.106379960395,
  google_maps_url = 'https://maps.app.goo.gl/6orTKh88FWS2Vsv38',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'San Diego',
  updated_at = now()
WHERE id = 'us-san-diego-mission-san-diego-de-alcala';

-- us-san-francisco-mission-san-francisco-de-asis-mission-dolores
UPDATE sites SET
  name = 'Mission San Francisco de Asis (Mission Dolores)',
  short_description = 'The 6th of the 21 California missions, founded in 1776.',
  latitude = 37.7643787904628,
  longitude = -122.426918360256,
  google_maps_url = 'https://maps.app.goo.gl/ern1c5g5kTKgDUMe6',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'San Francisco',
  updated_at = now()
WHERE id = 'us-san-francisco-mission-san-francisco-de-asis-mission-dolores';

-- us-san-gabriel-mission-san-gabriel-arcangel
UPDATE sites SET
  name = 'Mission San Gabriel Arcangel',
  short_description = 'The 4th of the 21 California missions, founded in 1771.',
  latitude = 34.0966596731449,
  longitude = -118.106841102688,
  google_maps_url = 'https://maps.app.goo.gl/gPzFRaZGrTeRGud59',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'San Gabriel',
  updated_at = now()
WHERE id = 'us-san-gabriel-mission-san-gabriel-arcangel';

-- us-san-juan-bautista-mission-san-juan-bautista
UPDATE sites SET
  name = 'Mission San Juan Bautista',
  short_description = 'The 15th of the 21 California missions, founded in 1797.',
  latitude = 36.8458910149476,
  longitude = -121.535752689119,
  google_maps_url = 'https://maps.app.goo.gl/QkQ2Nocp9bQbHbGa8',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'San Juan Bautista',
  updated_at = now()
WHERE id = 'us-san-juan-bautista-mission-san-juan-bautista';

-- us-san-juan-capistrano-mission-san-juan-capistrano
UPDATE sites SET
  name = 'Mission San Juan Capistrano',
  short_description = 'The 7th of the 21 California missions, founded in 1776.',
  latitude = 33.5020282662047,
  longitude = -117.662690902704,
  google_maps_url = 'https://maps.app.goo.gl/W2tCx2FEtZPKiYMz9',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'San Juan Capistrano',
  updated_at = now()
WHERE id = 'us-san-juan-capistrano-mission-san-juan-capistrano';

-- us-san-luis-obispo-mission-san-luis-obispo-de-tolosa
UPDATE sites SET
  name = 'Mission San Luis Obispo de Tolosa',
  short_description = 'The 5th of the 21 California missions, founded in 1772.',
  latitude = 35.2809991057781,
  longitude = -120.664704058475,
  google_maps_url = 'https://maps.app.goo.gl/YCmArrDTd6GrfP347',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'San Luis Obispo',
  updated_at = now()
WHERE id = 'us-san-luis-obispo-mission-san-luis-obispo-de-tolosa';

-- us-san-miguel-mission-san-miguel-arcangel
UPDATE sites SET
  name = 'Mission San Miguel Arcangel',
  short_description = 'The 16th of the 21 California missions, founded in 1797.',
  latitude = 35.7449345413861,
  longitude = -120.69716204497,
  google_maps_url = 'https://maps.app.goo.gl/5Li9NFGj8nVxzjSQ9',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'San Miguel',
  updated_at = now()
WHERE id = 'us-san-miguel-mission-san-miguel-arcangel';

-- us-san-rafael-mission-san-rafael-arcangel
UPDATE sites SET
  name = 'Mission San Rafael Arcangel',
  short_description = 'The 20th of the 21 California missions, founded in 1817.',
  latitude = 37.974237142319,
  longitude = -122.527974573741,
  google_maps_url = 'https://maps.app.goo.gl/BGxHPWo5R5ZGxwqm9',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'San Rafael',
  updated_at = now()
WHERE id = 'us-san-rafael-mission-san-rafael-arcangel';

-- ── ID RENAME: us-santa-barbara-county-mission-la-purisima-concepcion
--              → us-lompoc-mission-la-purisima-concepcion
UPDATE sites SET
  id = 'us-lompoc-mission-la-purisima-concepcion',
  name = 'Mission La Purisima Concepcion',
  short_description = 'The 11th of the 21 California missions, founded in 1787.  The mission is no longer an active church, but part of a state park which seeks to accurately replicate mission life.',
  latitude = 34.6697435013219,
  longitude = -120.420619002672,
  google_maps_url = 'https://maps.app.goo.gl/GYsZmXdzTvvwHfDR7',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'Lompoc',
  updated_at = now()
WHERE id = 'us-santa-barbara-county-mission-la-purisima-concepcion';
UPDATE site_images SET site_id = 'us-lompoc-mission-la-purisima-concepcion' WHERE site_id = 'us-santa-barbara-county-mission-la-purisima-concepcion';
UPDATE site_links SET site_id = 'us-lompoc-mission-la-purisima-concepcion' WHERE site_id = 'us-santa-barbara-county-mission-la-purisima-concepcion';
UPDATE site_tag_assignments SET site_id = 'us-lompoc-mission-la-purisima-concepcion' WHERE site_id = 'us-santa-barbara-county-mission-la-purisima-concepcion';
UPDATE site_contributor_notes SET site_id = 'us-lompoc-mission-la-purisima-concepcion' WHERE site_id = 'us-santa-barbara-county-mission-la-purisima-concepcion';
UPDATE site_edits SET site_id = 'us-lompoc-mission-la-purisima-concepcion' WHERE site_id = 'us-santa-barbara-county-mission-la-purisima-concepcion';
UPDATE pending_submissions SET site_id = 'us-lompoc-mission-la-purisima-concepcion' WHERE site_id = 'us-santa-barbara-county-mission-la-purisima-concepcion';

-- us-santa-barbara-mission-santa-barbara
UPDATE sites SET
  name = 'Mission Santa Barbara',
  short_description = 'The 10th of the 21 California missions, founded in 1786.',
  latitude = 34.4382907792083,
  longitude = -119.714078531515,
  google_maps_url = 'https://maps.app.goo.gl/vF4nVPGx6nLbCqNE6',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'Santa Barbara',
  updated_at = now()
WHERE id = 'us-santa-barbara-mission-santa-barbara';

-- us-santa-clara-mission-santa-clara-de-asis
UPDATE sites SET
  name = 'Mission Santa Clara de Asis',
  short_description = 'The 8th of the 21 California missions, founded in 1777.',
  latitude = 37.3491892853456,
  longitude = -121.941511544924,
  google_maps_url = 'https://maps.app.goo.gl/SwLETTtMiP5E41n46',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'Santa Clara',
  updated_at = now()
WHERE id = 'us-santa-clara-mission-santa-clara-de-asis';

-- us-santa-cruz-mission-santa-cruz
UPDATE sites SET
  name = 'Mission Santa Cruz',
  short_description = 'The 12th of the 21 California missions, founded in 1791.',
  latitude = 36.9781412595296,
  longitude = -122.029494075624,
  google_maps_url = 'https://maps.app.goo.gl/Kc7ZYah3qJiL6B6v6',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'Santa Cruz',
  updated_at = now()
WHERE id = 'us-santa-cruz-mission-santa-cruz';

-- ── ID RENAME: us-santa-fe-county-sanctuary-of-chimayo-santuario-de-chimayo
--              → us-santa-fe-county-sanctuary-of-chimayo
UPDATE sites SET
  id = 'us-santa-fe-county-sanctuary-of-chimayo',
  name = 'Sanctuary of Chimayo',
  short_description = 'A miraculous crucifix appearing in a field resulted in the construction of a chapel on this spot.  The hole where the crucifix appeared is said to contain dirt that has healing properties similar to the water at Lourdes.  Hundreds of thousands of pilgrims visit the shrine annually, which, according to Catholic World Report, makes it the most popular pilgrimage site in the United States.',
  latitude = 35.989201,
  longitude = -105.9318022,
  google_maps_url = 'https://maps.app.goo.gl/E1aWKnozGn5Tpkq97',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JPY',
  native_name = 'Santuario Chimayo',
  country = 'US',
  municipality = 'Santa Fe County',
  updated_at = now()
WHERE id = 'us-santa-fe-county-sanctuary-of-chimayo-santuario-de-chimayo';
UPDATE site_images SET site_id = 'us-santa-fe-county-sanctuary-of-chimayo' WHERE site_id = 'us-santa-fe-county-sanctuary-of-chimayo-santuario-de-chimayo';
UPDATE site_links SET site_id = 'us-santa-fe-county-sanctuary-of-chimayo' WHERE site_id = 'us-santa-fe-county-sanctuary-of-chimayo-santuario-de-chimayo';
UPDATE site_tag_assignments SET site_id = 'us-santa-fe-county-sanctuary-of-chimayo' WHERE site_id = 'us-santa-fe-county-sanctuary-of-chimayo-santuario-de-chimayo';
UPDATE site_contributor_notes SET site_id = 'us-santa-fe-county-sanctuary-of-chimayo' WHERE site_id = 'us-santa-fe-county-sanctuary-of-chimayo-santuario-de-chimayo';
UPDATE site_edits SET site_id = 'us-santa-fe-county-sanctuary-of-chimayo' WHERE site_id = 'us-santa-fe-county-sanctuary-of-chimayo-santuario-de-chimayo';
UPDATE pending_submissions SET site_id = 'us-santa-fe-county-sanctuary-of-chimayo' WHERE site_id = 'us-santa-fe-county-sanctuary-of-chimayo-santuario-de-chimayo';

-- ── ID RENAME: us-santa-fe-loretto-chapel-santa-fe-nm
--              → us-santa-fe-loretto-chapel
UPDATE sites SET
  id = 'us-santa-fe-loretto-chapel',
  name = 'Loretto Chapel',
  short_description = 'According to tradition, when the architect failed to provide a way to get to the new choir loft, the architecturally-impressive spiral staircase was built by St. Joseph himself.',
  latitude = 35.6856315,
  longitude = -105.9376593,
  google_maps_url = 'https://maps.app.goo.gl/n2bzqrZJDPWXTjN39',
  featured = FALSE,
  interest = 'regional',
  contributor = 'JPY',
  native_name = NULL,
  country = 'US',
  municipality = 'Santa Fe',
  updated_at = now()
WHERE id = 'us-santa-fe-loretto-chapel-santa-fe-nm';
UPDATE site_images SET site_id = 'us-santa-fe-loretto-chapel' WHERE site_id = 'us-santa-fe-loretto-chapel-santa-fe-nm';
UPDATE site_links SET site_id = 'us-santa-fe-loretto-chapel' WHERE site_id = 'us-santa-fe-loretto-chapel-santa-fe-nm';
UPDATE site_tag_assignments SET site_id = 'us-santa-fe-loretto-chapel' WHERE site_id = 'us-santa-fe-loretto-chapel-santa-fe-nm';
UPDATE site_contributor_notes SET site_id = 'us-santa-fe-loretto-chapel' WHERE site_id = 'us-santa-fe-loretto-chapel-santa-fe-nm';
UPDATE site_edits SET site_id = 'us-santa-fe-loretto-chapel' WHERE site_id = 'us-santa-fe-loretto-chapel-santa-fe-nm';
UPDATE pending_submissions SET site_id = 'us-santa-fe-loretto-chapel' WHERE site_id = 'us-santa-fe-loretto-chapel-santa-fe-nm';

-- us-soledad-mission-nuestra-senora-de-la-soledad-mission-soledad
UPDATE sites SET
  name = 'Mission Nuestra Senora de la Soledad (Mission Soledad)',
  short_description = 'The 13th of the 21 California missions, founded in 1791.',
  latitude = 36.4048390825981,
  longitude = -121.355761573787,
  google_maps_url = 'https://maps.app.goo.gl/Xqn2vfUBqzH9CQ6BA',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'Soledad',
  updated_at = now()
WHERE id = 'us-soledad-mission-nuestra-senora-de-la-soledad-mission-soledad';

-- us-solvang-mission-santa-ines
UPDATE sites SET
  name = 'Mission Santa Ines',
  short_description = 'The 19th of the 21 California missions, founded in 1804.  In 1924 the Capucin Friars were given responsibility of this mission.',
  latitude = 34.5947305774003,
  longitude = -120.136405258494,
  google_maps_url = 'https://maps.app.goo.gl/5GmotuSL113AEJoY6',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'Solvang',
  updated_at = now()
WHERE id = 'us-solvang-mission-santa-ines';

-- us-sonoma-mission-san-francisco-solano
UPDATE sites SET
  name = 'Mission San Francisco Solano',
  short_description = 'The 21st of the 21 California missions, founded in 1823.  The mission only remained so for 11 years before being secularized.  The Bear Flag Revolt of June 14, 1816 occurred directly across from the mission, declaring California a republic.  Today the mission is part of a public park.',
  latitude = 38.2936930309277,
  longitude = -122.455888502567,
  google_maps_url = 'https://maps.app.goo.gl/2s6R92MbthaAjkdo8',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'Sonoma',
  updated_at = now()
WHERE id = 'us-sonoma-mission-san-francisco-solano';

-- us-stevenson-don-brown-rosary-collection
UPDATE sites SET
  name = 'Don Brown Rosary Collection',
  short_description = 'The world''s largest rosary collection is housed in the Columbia Gorge Interpretive Center Museum, collected over decades by a Catholic convert.',
  latitude = 45.6854710141072,
  longitude = -121.899194869222,
  google_maps_url = 'https://maps.app.goo.gl/U4VgjkBsiwLWADMt5',
  featured = FALSE,
  interest = 'personal',
  contributor = 'JPY',
  native_name = NULL,
  country = 'US',
  municipality = 'Stevenson',
  updated_at = now()
WHERE id = 'us-stevenson-don-brown-rosary-collection';

-- us-ventura-mission-san-buenaventura
UPDATE sites SET
  name = 'Mission San Buenaventura',
  short_description = 'The 9th of the 21 California missions, founded in 1782.',
  latitude = 34.281052108005,
  longitude = -119.298020331519,
  google_maps_url = 'https://maps.app.goo.gl/h6U1Skm6Y52WtW8j6',
  featured = FALSE,
  interest = 'local',
  contributor = 'JMM',
  native_name = NULL,
  country = 'US',
  municipality = 'Ventura',
  updated_at = now()
WHERE id = 'us-ventura-mission-san-buenaventura';

-- va-vatican-city-st-peters-basilica
UPDATE sites SET
  name = 'St. Peter''s Basilica',
  short_description = 'Possibly the most famous church in the world, and one of the four papal basilicas, the current building was built between 1506 and 1626, replacing the original from the time of Constantine in the 4th century.

St. Peter''s tomb lies beneath the high altar of the basilica, and the church continues to be a place of interment for popes, cardinals and bishops.',
  latitude = 41.9021187880293,
  longitude = 12.4539366999999,
  google_maps_url = 'https://maps.app.goo.gl/PK3UFw2JVFz8knAf8',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Basilica Sancti Petri',
  country = 'VA',
  municipality = 'Vatican City',
  updated_at = now()
WHERE id = 'va-vatican-city-st-peters-basilica';

-- ── ID RENAME: vn-hai-lang-commune-basilica-of-our-lady-of-la-vang
--              → vn-hai-lang-basilica-of-our-lady-of-la-vang
UPDATE sites SET
  id = 'vn-hai-lang-basilica-of-our-lady-of-la-vang',
  name = 'Basilica of Our Lady of La Vang',
  short_description = 'In 1798, many Christians took refuge in the Vietnamese jungle and prepared themselves for martyrdom.  At night, they often gathered in small groups to pray the rosary.  Unexpectedly, one night they were visited by an apparition of Our Blessed Mother in a long cape, holding a child in her arms, with two angels at her sides.  She comforted them and told them to boil the leaves from the surrounding trees to use as medicine.  She also told them that from that day on, all those who came to this place to pray, would have their prayers heard and answered.  All those who were present witnessed this miracle.',
  latitude = 16.7054910999221,
  longitude = 107.196010823597,
  google_maps_url = 'https://maps.app.goo.gl/Mfba8uoNH897FUfV7',
  featured = FALSE,
  interest = 'global',
  contributor = 'JMM',
  native_name = 'Đền Thánh Đức Mẹ La Vang: Trung tâm Hành hương Quốc gia',
  country = 'VN',
  municipality = 'Hai Lang',
  updated_at = now()
WHERE id = 'vn-hai-lang-commune-basilica-of-our-lady-of-la-vang';
UPDATE site_images SET site_id = 'vn-hai-lang-basilica-of-our-lady-of-la-vang' WHERE site_id = 'vn-hai-lang-commune-basilica-of-our-lady-of-la-vang';
UPDATE site_links SET site_id = 'vn-hai-lang-basilica-of-our-lady-of-la-vang' WHERE site_id = 'vn-hai-lang-commune-basilica-of-our-lady-of-la-vang';
UPDATE site_tag_assignments SET site_id = 'vn-hai-lang-basilica-of-our-lady-of-la-vang' WHERE site_id = 'vn-hai-lang-commune-basilica-of-our-lady-of-la-vang';
UPDATE site_contributor_notes SET site_id = 'vn-hai-lang-basilica-of-our-lady-of-la-vang' WHERE site_id = 'vn-hai-lang-commune-basilica-of-our-lady-of-la-vang';
UPDATE site_edits SET site_id = 'vn-hai-lang-basilica-of-our-lady-of-la-vang' WHERE site_id = 'vn-hai-lang-commune-basilica-of-our-lady-of-la-vang';
UPDATE pending_submissions SET site_id = 'vn-hai-lang-basilica-of-our-lady-of-la-vang' WHERE site_id = 'vn-hai-lang-commune-basilica-of-our-lady-of-la-vang';

-- ── ID RENAME: vn-thanh-nam-ward-basilica-of-the-immaculate-conception-at-ha-nam
--              → vn-kien-khe-basilica-of-the-immaculate-conception-so-kien-basilica
UPDATE sites SET
  id = 'vn-kien-khe-basilica-of-the-immaculate-conception-so-kien-basilica',
  name = 'Basilica of the Immaculate Conception (So Kien Basilica)',
  short_description = 'This Basilica is a shrine in rememberance of the Vietnamese Martyrs, St. Andrew Dung-Lac and Companions killed during the persecution of the Christians in Vietnam in the 18th and 19th century.',
  latitude = 20.4247269,
  longitude = 106.1588304,
  google_maps_url = 'https://maps.app.goo.gl/YDh98dACbEXW9XhGA',
  featured = FALSE,
  interest = 'regional',
  contributor = 'NDS',
  native_name = 'Vương cung Thánh đường Sở Kiện',
  country = 'VN',
  municipality = 'Kien Khe',
  updated_at = now()
WHERE id = 'vn-thanh-nam-ward-basilica-of-the-immaculate-conception-at-ha-nam';
UPDATE site_images SET site_id = 'vn-kien-khe-basilica-of-the-immaculate-conception-so-kien-basilica' WHERE site_id = 'vn-thanh-nam-ward-basilica-of-the-immaculate-conception-at-ha-nam';
UPDATE site_links SET site_id = 'vn-kien-khe-basilica-of-the-immaculate-conception-so-kien-basilica' WHERE site_id = 'vn-thanh-nam-ward-basilica-of-the-immaculate-conception-at-ha-nam';
UPDATE site_tag_assignments SET site_id = 'vn-kien-khe-basilica-of-the-immaculate-conception-so-kien-basilica' WHERE site_id = 'vn-thanh-nam-ward-basilica-of-the-immaculate-conception-at-ha-nam';
UPDATE site_contributor_notes SET site_id = 'vn-kien-khe-basilica-of-the-immaculate-conception-so-kien-basilica' WHERE site_id = 'vn-thanh-nam-ward-basilica-of-the-immaculate-conception-at-ha-nam';
UPDATE site_edits SET site_id = 'vn-kien-khe-basilica-of-the-immaculate-conception-so-kien-basilica' WHERE site_id = 'vn-thanh-nam-ward-basilica-of-the-immaculate-conception-at-ha-nam';
UPDATE pending_submissions SET site_id = 'vn-kien-khe-basilica-of-the-immaculate-conception-so-kien-basilica' WHERE site_id = 'vn-thanh-nam-ward-basilica-of-the-immaculate-conception-at-ha-nam';

COMMIT;
-- Done: 145 sites updated