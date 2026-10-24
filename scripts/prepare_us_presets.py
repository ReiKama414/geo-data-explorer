import json
import urllib.request

req = urllib.request.Request(
    'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json',
    headers={'User-Agent': 'Mozilla/5.0'}
)
with urllib.request.urlopen(req) as resp:
    us_data = json.loads(resp.read().decode('utf-8'))

state_abbrev = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'District of Columbia': 'DC',
    'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL',
    'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA',
    'Maine': 'ME', 'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN',
    'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
    'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
    'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK', 'Oregon': 'OR',
    'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD',
    'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA',
    'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY', 'Puerto Rico': 'PR'
}

for feat in us_data['features']:
    name = feat['properties'].get('name', '')
    abbrev = state_abbrev.get(name, name[:2].upper())
    feat['properties'] = {
        'state_code': abbrev,
        'name': name,
        'id': abbrev
    }

with open('public/presets/us-states.geojson', 'w', encoding='utf-8') as f:
    json.dump(us_data, f, ensure_ascii=False)

# US metrics CSV
us_lines = ["state_code,state_name,year,median_household_income,ev_adoption_pct,green_energy_pct"]
state_samples = {
    'CA': ('California', 85000, 21.5, 38.0),
    'NY': ('New York', 78000, 8.2, 29.0),
    'TX': ('Texas', 67000, 5.8, 32.5),
    'FL': ('Florida', 63000, 7.1, 14.5),
    'WA': ('Washington', 84000, 18.2, 75.0),
    'OR': ('Oregon', 73000, 14.8, 68.0),
    'MA': ('Massachusetts', 89000, 11.2, 22.0),
    'CO': ('Colorado', 82000, 13.5, 35.0),
    'IL': ('Illinois', 72000, 6.5, 18.0),
    'NC': ('North Carolina', 61000, 5.2, 19.5),
    'VA': ('Virginia', 80000, 7.8, 17.0),
    'GA': ('Georgia', 66000, 6.2, 15.0),
    'AZ': ('Arizona', 69000, 7.9, 18.2),
    'NJ': ('New Jersey', 92000, 9.4, 16.5),
    'NV': ('Nevada', 68000, 12.1, 38.0),
    'MI': ('Michigan', 64000, 4.2, 16.0),
    'OH': ('Ohio', 62000, 3.8, 11.0),
    'PA': ('Pennsylvania', 68000, 4.5, 13.5),
    'UT': ('Utah', 79000, 8.6, 21.0),
    'MN': ('Minnesota', 77000, 5.9, 28.0),
}
for yr in [2021, 2022, 2023, 2024]:
    dy = yr - 2021
    for code, (sname, inc, ev, ge) in state_samples.items():
        cinc = round(inc * (1 + 0.04 * dy))
        cev = round(ev * (1 + 0.25 * dy), 1)
        cge = round(ge * (1 + 0.05 * dy), 1)
        us_lines.append(f"{code},{sname},{yr},{cinc},{cev},{cge}")

us_lines.append("GU,關島外圍科研基地,2024,62000,3.2,15.0")

with open('public/presets/us-states-metrics.csv', 'w', encoding='utf-8') as f:
    f.write("\n".join(us_lines))
print("US States presets saved!")
