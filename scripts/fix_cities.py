import json, re

CITY_FIXES = {
    'co-national-shrine-basilica-of-our-lady-of-las-lajas':
        ('ipiales',     'Ipiales',              'Colombia'),
    'cz-basilica-of-our-lady-help-of-christians':
        ('filipov',     'Filipov',              'Czechia'),
    'eg-virgin-mary-church-in-zeitoun-our-lady-of-zeitoun-our-lady-of-light':
        ('zeitoun',     'Zeitoun',              'Egypt'),
    'fr-cathedral-of-our-lady-of-puy':
        ('le-puy-en-velay', 'Le Puy-en-Velay', 'France'),
    'fr-sanctuary-of-our-lady-of-laus':
        ('saint-etienne-le-laus', 'Saint-Étienne-le-Laus', 'France'),
    'fr-sanctuary-of-our-lady-of-la-salette':
        ('corps',       'Corps',                'France'),
    'fr-sanctuary-of-our-lady-of-lourdes':
        ('lourdes',     'Lourdes',              'France'),
    'fr-sanctuary-of-pontmain-mother-of-hope':
        ('pontmain',    'Pontmain',             'France'),
    'in-major-archiepiscopal-marth-mariam-archdeacon-pilgrim-church-at-kuravilangad':
        ('kuravilangad', 'Kuravilangad',        'India'),
    'in-basilica-of-our-lady-of-good-health-our-lady-of-velankanni':
        ('velankanni',  'Velankanni',           'India'),
    'ie-knock-shrine-our-lady-of-knock':
        ('knock',       'Knock',                'Ireland'),
    'it-sanctuary-of-our-lady-of-valverde':
        ('valverde',    'Valverde',             'Italy'),
    'it-sanctuary-of-oropa-black-madonna-of-oropa':
        ('oropa',       'Oropa',                'Italy'),
    'jp-seitai-hoshikai-our-lady-of-akita':
        ('akita',       'Akita',                'Japan'),
    'lt-basilica-of-the-nativity-of-the-blessed-virgin-mary-our-lady-of-siluva':
        ('siluva',      'Šiluva',               'Lithuania'),
    'ph-minor-basilica-of-our-lady-of-the-rosary-of-manaoag':
        ('manaoag',     'Manaoag',              'Philippines'),
    'pl-swieta-lipka-sanctuary':
        ('swieta-lipka', 'Święta Lipka',        'Poland'),
    'pl-sanctuary-of-our-lady-queen-of-podhale':
        ('ludzimierz',  'Ludźmierz',            'Poland'),
    'pl-basilica-of-the-annunciation-of-the-blessed-virgin-mary-our-lady-of-lezajsk-l':
        ('lezajsk',     'Leżajsk',              'Poland'),
    'pl-basilica-of-our-lady-of-liche-holy-mother-of-sorrows-queen-of-poland':
        ('lichen',      'Licheń',               'Poland'),
    'pl-sanctuary-of-our-lady-of-gietrzwad':
        ('gietrzwald',  'Gietrzwałd',           'Poland'),
    'rw-shrine-of-our-lady-of-kibeho-mother-of-the-word':
        ('kibeho',      'Kibeho',               'Rwanda'),
    'vn-basilica-of-our-lady-of-la-vang':
        ('la-vang',     'La Vang',              'Vietnam'),
}

def make_id(old_id, city_slug):
    cc = old_id[:2]
    title_part = old_id[3:]  # strip "cc-"
    new_id = f"{cc}-{city_slug}-{title_part}"
    if len(new_id) > 80:
        new_id = new_id[:80].rstrip('-')
    return new_id

def maps_url(name, city_display, country):
    clean_name = re.sub(r'\s*\(.*?\)', '', name).strip()
    q = '+'.join(p.replace(' ', '+') for p in [clean_name, city_display, country] if p)
    return f'https://maps.google.com/?q={q}'

with open(r'C:\Users\User\Documents\orbis-dei\data\sites.json', encoding='utf-8') as f:
    data = json.load(f)

existing_tag_ids = {t['id'] for t in data['tags']}
new_local_tags = []

for site in data['sites']:
    if site['id'] not in CITY_FIXES:
        continue
    city_slug, city_display, country = CITY_FIXES[site['id']]
    new_id = make_id(site['id'], city_slug)
    site['id'] = new_id
    site['google_maps_url'] = maps_url(site['name'], city_display, country)
    # Add city tag to tag_ids if not already there
    if city_slug not in site['tag_ids']:
        site['tag_ids'].insert(1, city_slug)  # after country code tag
    # Queue new local tag if needed
    if city_slug not in existing_tag_ids:
        new_local_tags.append({
            'id': city_slug,
            'name': city_display,
            'description': f'Catholic places of interest in {city_display} and its surroundings.',
            'featured': False
        })
        existing_tag_ids.add(city_slug)

data['tags'].extend(new_local_tags)

with open(r'C:\Users\User\Documents\orbis-dei\data\sites.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Updated {len(CITY_FIXES)} sites")
print(f"Added {len(new_local_tags)} new local tags")
print(f"Total sites: {len(data['sites'])}, Total tags: {len(data['tags'])}")
