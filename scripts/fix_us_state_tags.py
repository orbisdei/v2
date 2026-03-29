import json

STATE_NAMES = {
    'us-al': 'Alabama', 'us-ak': 'Alaska', 'us-az': 'Arizona', 'us-ar': 'Arkansas',
    'us-ca': 'California', 'us-co': 'Colorado', 'us-ct': 'Connecticut', 'us-de': 'Delaware',
    'us-fl': 'Florida', 'us-ga': 'Georgia', 'us-hi': 'Hawaii', 'us-id': 'Idaho',
    'us-il': 'Illinois', 'us-in': 'Indiana', 'us-ia': 'Iowa', 'us-ks': 'Kansas',
    'us-ky': 'Kentucky', 'us-la': 'Louisiana', 'us-me': 'Maine', 'us-md': 'Maryland',
    'us-ma': 'Massachusetts', 'us-mi': 'Michigan', 'us-mn': 'Minnesota', 'us-ms': 'Mississippi',
    'us-mo': 'Missouri', 'us-mt': 'Montana', 'us-ne': 'Nebraska', 'us-nv': 'Nevada',
    'us-nh': 'New Hampshire', 'us-nj': 'New Jersey', 'us-nm': 'New Mexico', 'us-ny': 'New York',
    'us-nc': 'North Carolina', 'us-nd': 'North Dakota', 'us-oh': 'Ohio', 'us-ok': 'Oklahoma',
    'us-or': 'Oregon', 'us-pa': 'Pennsylvania', 'us-ri': 'Rhode Island', 'us-sc': 'South Carolina',
    'us-sd': 'South Dakota', 'us-tn': 'Tennessee', 'us-tx': 'Texas', 'us-ut': 'Utah',
    'us-vt': 'Vermont', 'us-va': 'Virginia', 'us-wa': 'Washington', 'us-wv': 'West Virginia',
    'us-wi': 'Wisconsin', 'us-wy': 'Wyoming',
}

with open(r'C:\Users\User\Documents\orbis-dei\data\sites.json', encoding='utf-8') as f:
    data = json.load(f)

updated = 0
for tag in data['tags']:
    if tag['id'] in STATE_NAMES:
        tag['name'] = STATE_NAMES[tag['id']]
        tag['description'] = f'Catholic places of interest in {STATE_NAMES[tag["id"]]}.'
        updated += 1

with open(r'C:\Users\User\Documents\orbis-dei\data\sites.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Updated {updated} state tags")
