# research_backlog Triage — Proposed lead/backlog split

Covers all 92 open, seeded `research_backlog` rows as of 2026-08-08. **Nothing has been
written yet** — this is the proposal for review. The `research_findings.status = 'lead'`
constraint migration is now live (2026-08-08, `add_lead_status_to_research_findings`) —
execution is unblocked on that front. Still waiting on your confirmation of the
**uncertain**-flagged calls before anything gets written.

Rule applied throughout (from the v19 Verify & Stage prompt, Step 5.4): **a specific site
name in hand → becomes a `research_findings` lead row. A bare topic with no specific site
in hand → stays in `research_backlog` only if it plausibly has independent geographic/
devotional spread** (order founder, Doctor of the Church, missionary "Apostle of X"
title, open canonization cause, multi-site cultus) — otherwise close the row with nothing
further queued.

Real caveat: several of these calls (marked **uncertain**) depend on how much appetite you
have for a real search turning up more sites vs. treating the one already-known
connection as sufficient. I'm not running fresh research to settle these — that would
defeat the point of a cheap triage — so where my own background knowledge is thin, I've
said so rather than guessing confidently.

---

## Section A — "Marian Sites" / country rows: 25 rows, ~68 named leads to extract

These are overwhelmingly the dominant case, and the one your Alsace example describes
exactly: a curator already consolidated specific, named, dated apparition-claim leads into
a country-level backlog row "to reduce redundant per-run overhead." None of these need a
Discovery sweep — every lead below already has a name; **every one becomes its own
`research_findings` lead row.** For the parent row, my default is **close** (the leads were
deliberately curated, not a byproduct of an open-ended search) unless noted otherwise —
flag if you'd rather keep any of these open for a broader "anything else in this country"
sweep later.

| Region | Named leads (→ individual `research_findings` leads) | Parent row |
|---|---|---|
| Alsace | Walbach (Apr 14, 1873); Wittelsheim (Mar 1873) | Close |
| Bolivia | Chaguaya, Tarija (1750); Quillacollo, Cochabamba (1700?) | Close |
| Spain | Guadalajara (Aug 31, 1831); Sallent (1829); Our Lady of Covadonga; Alexos/Casita, Castile (undated, possible dup of Alaexos 1490 — verify at extraction); Azagna (1496); Alaexos, Castile (1490); Córdoba (Sept 8, 1420); Cubas de la Sagra (Mar 3, 1449 — possible dup of Madrid Mar 1449, verify); Jaén (1430); Lepe, Huelva (Aug 15, 1484); Madrid (1443); Madrid (Mar 3–19, 1449); Our Lady of Light, Liébana (1487, canonically crowned 1991 — strong candidate); Peñafrancia (1429) | **Uncertain** — 13 leads is a lot of independent Marian activity for one country; may be worth keeping open for a real sweep alongside extracting the leads. Your call. |
| Israel | Jerusalem (1874); Saint John of Acre/Akko (c. 1850) | Close |
| Russia | Sarov (1779); Słowczyk (1712) | Close |
| Egypt | Edfu (1982); Gabal Dronka (2001); Shentena Al-Hagger, Menoufiya (1997); Shoubra (1986); Warraq el-Hadar (2009); Our Lady of Assiut; Deir Al-Maghtas, Lower Egypt (c. 1400) | **Keep** (confirmed) — parent row stays open for a broader sweep alongside extracting the 7 named leads |
| United Kingdom | Our Lady of Mount Carmel, Aylesford; Holywell, Gainsborough (1880, visionary Teresa Higginson) | Close |
| Philippines | Our Lady of Lipa | Close |
| Netherlands | Our Lady of All Nations, Amsterdam; Schiedam (1413, St. Lidwina) | Close |
| Ecuador | Our Lady of Good Success, Quito (confirmed not yet published) | Close |
| Nicaragua | Our Lady of Cuapa | Close |
| Venezuela | Our Lady of Betania | Close |
| South Africa | Our Lady of Ngome | Close |
| Argentina | Our Lady of the Rosary, San Nicolás | Close |
| Balkans (Croatia leads) | ILAC (1865); Sinj (Aug 14, 1715) | Keep open — row is explicitly scoped to catch future Serbia/Bosnia/Slovenia/Montenegro/Albania/N. Macedonia leads too, not just Croatia's two |
| Greece | Tinos (1821–22, Panagia icon, well-documented); Rhodes (1480 — flagged in the row itself as possibly Orthodox/out-of-scope, verify Catholic significance at extraction) | Close |
| Vatican City | Vatican City (Apr 1850, French Protestant officer's wife) | Close |
| Senegal | Popenguine (c. 1700) | Close |
| Slovakia | Peterwardein (1716) — note: Petrovaradin is actually in Serbia/Vojvodina, not Slovakia; flag for correction at extraction | Close |
| Sri Lanka | Madhu (1859/60, source flagged as "unverifiable" in the row itself) | Close |
| Vietnam | Buu Chau, Quang Nam (1855) | Close |
| Palestine | Abellin (Sept 18, 1858, visionary Bl. Mirijam Baouardy — well-documented, beatified) | Close |
| Poland | Matemblewo (1790); Albendorf (c. 1400); Kraków (1471, Isaiah Boner) | Close |
| Portugal | Casal Santa Maria (c. 1400, near Fátima) | Close |
| Morocco | Fez (1443, Prince Ferdinand of Portugal) | Close |
| Serbia | Doroslovo/Doroszló (1792) — mislocated from a Hungary run, verified to actually be in Serbia | Close |

---

## Section B — Saint rows with multiple named candidate sites needing disambiguation: 6 rows

Not simple single-site seeds — each already names 2+ specific unverified candidate sites.
Every named site becomes its own lead; the topic itself is a real candidate for staying
open too, noted per row.

| Topic | Named leads (→ individual leads) | Parent row |
|---|---|---|
| St. Opportuna of Montreuil | Priory of Moussy (body); Abbey of Almenêches (arm/skull); Priory of Saint-Chrodegang, l'Isle-Adam (jaw); a church in Paris (rib/arm) | **Keep** (confirmed, overriding my close recommendation) — leads still get extracted regardless |
| St. Hildegard of Bingen | Disibodenberg ruins; Rupertsberg ruins; Eibingen Abbey (still active, most promising) | **Keep** (confirmed) |
| St. Peter Celestine | Monte Morrone hermitage; Maiella hermitage | **Keep** (confirmed) |
| St. Philip Neri | Chiesa Nuova (Santa Maria in Vallicella), Rome | **Keep** (confirmed) |
| St. Thomas Becket | (no new site named yet — Canterbury already captured) | **Keep** |
| St. Peter Canisius | (no specific site named — Fribourg/Cologne/Ingolstadt/Vienna mentioned generically) | **Keep** |

**Confirmed 2026-08-08: all six of these stay open in `research_backlog`**, regardless of
my per-row close/keep split above — every named site above still gets extracted as a
`research_findings` lead either way; the topic staying open just means a future run also
does the broader search on top of those leads.

---

## Section C — Saint rows whose one known site is already fully captured: recommend CLOSE (no lead needed — nothing left to point at)

These already have their one associated site written into `research_findings`/`sites`
under the run that found them. The only open question is the *person* as a topic, and my
read is these don't clear the "independent spread" bar on their own. No `research_findings`
lead needed for any of these — closing just means no further action, ever, unless you
override.

Bartolo Longo · Meinrad of Einsiedeln · Ildefonso of Toledo · Gabriele Mattei · Bl. Peter
Monoculus · St. Hermann Joseph · St. Andrew Corsini · St. Peter, Metropolitan of Moscow ·
St. Elizabeth of Portugal · St. Clare of Montefalco · St. Matilda of Hackeborn · St.
Gertrude the Great (same Helfta site as Matilda above — consider merging these two topics'
tags on that one row rather than treating separately) · St. Zita · St. Margaret of Hungary
· St. Rose of Viterbo · St. Agnes of Montepulciano · Bl. Jordan of Saxony (row itself notes
the tag `jordan-of-saxony` already exists on the matching site — this backlog row may be
pure leftover cruft; recommend closing regardless) · St. John of Matera · St. Accursius and
Companions · St. Mary Magdalene de'Pazzi · St. Pellegrino Laziosi · St. Nicholas of
Tolentino · Bl. Angela of Foligno · St. Lutgardis of Tongeren · St. Elizabeth of Schönau ·
St. Godric of Finchale · Bl. Adam of Loccum · St. Guidon of Anderlecht · Fr. Jakob Rem, SJ

**Uncertain, lean close but flag:** William of Vercelli (order founder, but order long
since absorbed/defunct) · Simon Stock (Scapular devotion is huge, but cultus is genuinely
centered on the one site) · St. Anselm of Canterbury (Bec Abbey in Normandy is a real
second site — plausible lead, but not named in the row) · St. Dunstan (Glastonbury Abbey
similarly plausible, not named) · St. Sergius of Radonezh (the Lavra is thoroughly *the*
site, but he founded satellite hermitages)

**Recommend KEEP open instead (clears the spread bar despite one site already captured):**
Peter Nolasco (founder, Mercedarian Order) · Francis of Assisi (founder, Franciscans —
obviously more sites) · Martin of Tours (major early saint, multiple French sites) ·
Boniface (missionary "Apostle of the Germans," multiple mission sites) · Hubert of Liège
(bishop, conversion-site plausible) · Ansgar (missionary "Apostle of the North") · St.
Elizabeth of Thuringia (Marburg is her actual primary shrine, not Wartburg) · St. Bridget of
Sweden (founder, Bridgettine Order) · Seven Holy Founders of the Servite Order (founders,
multiple houses) · St. Catherine of Siena (Doctor of the Church) · St. Norbert of Xanten
(founder, Premonstratensians) · St. Bernard of Clairvaux (Doctor of the Church, prolific
founder) · St. Anthony of Padua (Doctor of the Church) · St. Vincent Ferrer (extensive
preaching tour across Europe) · St. Jerome Emiliani (founder, Somaschi Fathers) ·
St. Sylvester Guzzolini (founder, Silvestrine Benedictines — **verified 2026-08-08:** both
candidate sites named in this row, Cathedral of Osimo and Abbey of Monte Fano, are already
fully researched and staged in `research_findings` at `status = 'candidate'`, both correctly
tagged `sylvester-guzzolini`. No lead extraction needed here — struck the earlier note
suggesting otherwise; this row is pure topic judgment like the rest of this list)

---

## Section D — Rows pointing at excluded/non-locatable sites: 21 rows, no lead extractable

The one lead each of these was seeded from turned out to have no locatable site at all.
Nothing to extract; the only choice is keep (real search, ignoring the dead first lead) vs.
close (drop it).

**Recommend KEEP** (stature/order-founder status makes a real search worth running despite
the false start): St. Hyacinth of Poland (major missionary, multiple countries) · St.
Peter Thomas (Latin Patriarch, traveled Cyprus/Crete/Constantinople) · St. Stanislaus
Kostka (well-known Jesuit patron of youth — his actual shrine, Sant'Andrea al Quirinale
Rome, just wasn't what this pass found) · St. Peter of Alcantara (founder, Alcantarine
Franciscans) · St. John of God (founder, Hospitaller Order — major) · St. Aloysius Gonzaga
(major Jesuit patron, well-documented sites exist) · St. Cajetan of Thiene (co-founder,
Theatines) · St. Basil the Great (Doctor of the Church, Cappadocian Father — though
Caesarea itself is a dead end, other Cappadocian sites plausible)

**CLOSE — confirmed 2026-08-08** (weak/obscure, no order-founder or major-figure signal):
St. Philip Benizi (checked the overlap concern — his excluded "Florence" row carries only
`philip-benizi`/`marian-sites`, no overlap with the separately-tagged `servite-seven-founders`
sites, so closing loses nothing) · Bl. John Piccolomini · St. Aldobrandesca of Siena · St.
Paschal Baylon · St. Felix of Cantalice · Bl. Henry Suso (tomb literally destroyed — genuine
dead end) · Bl. Alphonsus de Orozco · Bl. Maddalena Panattieri · Bl. Eskil · St. Abraham of
Gorodetsk · St. Aibert of Crespin · St. Ermengarde of Champagne · St. Marino of Savoy

**Needs manual resolution before any call, not a real backlog candidate as-is:** St. Hugh
(Cistercian, Mazières) — the row itself flags identity/disambiguation needed among several
St. Hughs; recommend closing this row and, if you want to pursue it, re-queuing under the
correctly identified Hugh.

---

## Section E — No site information at all: 11 rows — **resolved 2026-08-08**

All created in one batch, 2026-08-06, "surfaced during MiracleHunter 1600-1699 AD
re-audit," with zero site/context captured in the backlog row itself. Per your
direction, fetched https://miraclehunter.com/marian_apparitions/approved_apparitions/apparitions_1600-1699.html
directly and matched all 11 names against it — found every one — then checked each
against `research_findings`/`sites`. Turns out the missing context wasn't a data-entry
gap: a prior run (2026-08-06, same day) had already worked this exact page, correctly
excluded the apparition claims themselves as non-qualifying, and queued each saint
separately as a holy-person topic — which *is* these 11 backlog rows. Nothing was
dropped; the audit trail just isn't visible from the backlog row alone.

**8 of 11 — apparition claim already excluded, nothing further to extract:** Bl. Marie
of the Incarnation (Barbe Acarie, Paris 1614), St. Alphonsus Rodriguez (Palma de Mallorca
1600), St. Margaret Mary Alacoque (private childhood vision predates her Paray-le-Monial
years — her real sites there, Chapel of the Visitation and Basilica of the Sacred Heart,
are already published under the Christological Sacred Heart topic, not Marian), St.
Joseph Calasanz (Rome 1610), Ven. Agnes Galand of Langeac (1627), St. Jean de Brébeuf
(Lake Huron 1633), Bl. Julien Maunoir (Paris 1625), Ven. Orsola Benincasa (Naples 1617)
— all correctly excluded as personal mystical visions with no distinct built site. These
rows should simply stay in `research_backlog` as topic_discovery — exactly what the prior
run already set them up to be.

**1 of 11 — already fully resolved, redundant row:** St. Veronica Giuliani — "Monastery of
St. Veronica Giuliani" already exists in `research_findings` at `status = 'candidate'`,
tagged `veronica-giuliani`. **Recommend closing this backlog row outright** — there's
nothing left for a future run to do.

**2 of 11 — genuinely open, real leads identified:** Ven. Maria de Jesus de Agreda (Convent
of the Immaculate Conception, Ágreda, Spain — her family home turned Franciscan convent
where she lived and served as abbess; body reportedly still incorrupt there) and St. Rose
of Lima (the text specifically names "Our Lady of the Rosary Church, Lima," where she
prayed before the image daily — likely the Convent/Basilica of Santo Domingo, Lima, where
her relics now rest; needs confirming which of the two is the right site to point at).
Neither has any prior `research_findings`/`sites` row. **Ready to write as `research_findings`
leads** once you confirm.

**2 bonus leads, beyond strictly what the MiracleHunter page says** — flagging rather than
assuming, since these come from general knowledge, not the source you pointed me at: St.
Jean de Brébeuf's actual relics/martyrdom are venerated at the Martyrs' Shrine, Midland,
Ontario (distinct from the excluded Lake Huron vision claim), and Ven. Orsola Benincasa's
own foundation, the Monastero delle Trentatré ("Convent of the Thirty-Three") in Naples,
still exists. Want these written as leads too, or held for whenever the full topic search
for each saint runs?

---

## Summary — as originally proposed

- **~90 individual leads** ready to extract into `research_findings` (`status = 'lead'`)
  across Sections A and B, once the constraint migration is live.
- **~35 rows** recommended to close outright (no further action).
- **~25 rows** recommended to stay in `research_backlog` as real topic_discovery jobs.
- **11 rows** (Section E) can't be triaged without more context — left as-is either way.
- **~10 items** flagged **uncertain** for your own call rather than my guessing.

---

## Executed (2026-08-08)

All decisions above confirmed and written. Final tallies: **68 `research_findings` leads**
written (Section A: 52, Section B: 10, Section E: 4, St. Hugh correction: 2), **73
`research_backlog` rows closed**, **50 rows remain open** (down from 122, matches
122 − 72 net closures exactly). Dedup-checked every lead against `research_findings`/
`sites` before writing — caught and skipped 3 already-existing sites in the process
(Aylesford, already tagged `simon-stock`; Shrine of Our Lady of Madhu, already a
candidate; Church of Our Lady of Good Success, already a candidate despite the original
row's note that it wasn't yet in `sites` — it was already staged in `research_findings`,
just not published). Ecuador's and Sri Lanka's backlog rows closed as "already resolved"
rather than "leads extracted" accordingly.

One error caught and corrected during execution: St. Elizabeth of Thuringia was
accidentally swept into the Section C close batch (she belongs in the keep list — Marburg,
her real primary shrine, isn't captured yet, only Wartburg Castle is). Reopened
immediately; the `research_backlog` row's status log carries both the erroneous close and
the correction for the audit trail.

St. Hugh (Cistercian, Mazières) resolved per your identity-research input: correctly
identified as St. Hugh of Bonnevaux; the Mazières connection is a documented chronicler
error (Hélinand of Froidmont). Original row closed with the correction noted;
`research_findings` exclusion reason updated; two corrected leads (Bonnevaux Abbey,
Léoncel Abbey) written under the corrected name.

---

## Verification pass (2026-08-08)

Spot-checked all 51 Section C "already captured" saint/site pairs against
`research_findings.tags` directly. All 51 confirmed correctly tagged with their secondary
topic alongside `marian-sites` — Step 5.2's tagging instruction held up in practice. One
correction made above (St. Sylvester Guzzolini).

Also surfaced a real, live gap: 3 of the 51 (Prémontré, Convento de la Encarnación, and a
Santa Cruz naming variant) were invisible to a first-pass plain `ILIKE` search purely
because of their accented characters — exactly the `'%gesu%'`-doesn't-match-`'Gesù'`
problem the discovery prompt already documents. The Postgres `unaccent` extension was not
installed on this project, so the prompt's own fallback ("wrap both sides in `unaccent()`
if the extension is enabled") was silently unavailable. **Fixed 2026-08-08:** `unaccent`
is now enabled (migration `enable_unaccent_extension`) and verified working. Prompt 2's
Step 3/Database Interaction accent-insensitivity guidance should now say to actually use
`unaccent()` rather than hedging on whether it's available.
