import json, re

with open(r'C:\Users\User\Documents\orbis-dei\data\sites.json', encoding='utf-8') as f:
    current = json.load(f)

with open(r'C:\Users\User\Documents\orbis-dei\scripts\import_output.json', encoding='utf-8') as f:
    imported = json.load(f)

# Existing tag IDs
existing_tag_ids = {t['id'] for t in current['tags']}

# Merge tags - add new ones, avoid duplicates
new_tags = [t for t in imported['new_tags'] if t['id'] not in existing_tag_ids]
current['tags'].extend(new_tags)

# Append new sites (existing sites stay at top)
current['sites'].extend(imported['new_sites'])

with open(r'C:\Users\User\Documents\orbis-dei\data\sites.json', 'w', encoding='utf-8') as f:
    json.dump(current, f, indent=2, ensure_ascii=False)

print(f"Total sites: {len(current['sites'])}")
print(f"Total tags:  {len(current['tags'])}")

# Report sites needing Google Maps verification (no city in ID)
print("\n=== Sites without city in ID (verify Google Maps) ===")
for s in imported['new_sites']:
    parts = s['id'].split('-')
    # If third segment doesn't match a known city pattern, flag it
    # Simple check: no city was embedded (id is cc-title, not cc-city-title)
    # We detect by checking if 2nd segment is the start of the title slug
    title_start = re.sub(r"[^a-z0-9]", '', s['name'][:6].lower())
    second_seg = parts[1] if len(parts) > 1 else ''
    # A "city" segment would typically not appear in the title
    title_slug_start = s['id'][3:].split('-')[0] if len(s['id']) > 3 else ''
    # Reliable flag: was a city set? Check if 2nd slug segment matches beginning of title
    name_slug = re.sub(r"[^a-z0-9 ]", '', s['name'].lower()).split()[0] if s['name'] else ''
    if second_seg == name_slug[:len(second_seg)]:
        print(f"  {s['id']}")
        print(f"    Name: {s['name']}")
        print(f"    Maps: {s['google_maps_url']}")
