import json
import urllib.request
import os

os.makedirs('public/presets', exist_ok=True)

# 1. Process Taiwan GeoJSON
tw_moi_codes = {
    "Taipei City": ("63000", "臺北市"),
    "New Taipei City": ("65000", "新北市"),
    "Taoyuan County": ("68000", "桃園市"),
    "Taichung City": ("66000", "臺中市"),
    "Tainan City": ("67000", "臺南市"),
    "Kaohsiung City": ("64000", "高雄市"),
    "Keelung City": ("10017", "基隆市"),
    "Hsinchu City": ("10018", "新竹市"),
    "Hsinchu County": ("10004", "新竹縣"),
    "Miaoli County": ("10005", "苗栗縣"),
    "Changhua County": ("10007", "彰化縣"),
    "Nantou County": ("10008", "南投縣"),
    "Yunlin County": ("10009", "雲林縣"),
    "Chiayi City": ("10020", "嘉義市"),
    "Chiayi County": ("10010", "嘉義縣"),
    "Pingtung County": ("10013", "屏東縣"),
    "Yilan County": ("10002", "宜蘭縣"),
    "Hualien County": ("10015", "花蓮縣"),
    "Taitung County": ("10014", "臺東縣"),
    "Penghu County": ("10016", "澎湖縣"),
    "Kinmen County": ("09020", "金門縣"),
    "Lienchiang County": ("09007", "連江縣"),
}

req = urllib.request.Request(
    'https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/taiwan.geojson',
    headers={'User-Agent': 'Mozilla/5.0'}
)
with urllib.request.urlopen(req) as resp:
    tw_data = json.loads(resp.read().decode('utf-8'))

for feat in tw_data['features']:
    name = feat['properties'].get('name', '').strip()
    code, cname = tw_moi_codes.get(name, ('00000', name))
    feat['properties'] = {
        'COUNTYCODE': code,
        'COUNTYNAME': cname,
        'COUNTYENG': name,
        'id': code
    }

with open('public/presets/taiwan-counties.geojson', 'w', encoding='utf-8') as f:
    json.dump(tw_data, f, ensure_ascii=False)
print("Taiwan GeoJSON saved, features:", len(tw_data['features']))

# Taiwan metrics multi-year (2020 - 2024)
# Real baseline data with progression
base_tw_stats = {
    "63000": ("臺北市", 2500000, 1080, 172.5, 45.2, 75.8),
    "65000": ("新北市", 4030000, 890, 155.0, 85.0, 42.5),
    "68000": ("桃園市", 2310000, 920, 108.5, 380.0, 31.0),
    "66000": ("臺中市", 2840000, 860, 122.0, 460.0, 32.5),
    "67000": ("臺南市", 1860000, 830, 168.0, 1920.0, 24.5),
    "64000": ("高雄市", 2730000, 850, 175.0, 1150.0, 25.8),
    "10017": ("基隆市", 362000, 780, 195.0, 18.5, 21.0),
    "10018": ("新竹市", 454000, 1290, 98.0, 45.0, 43.5),
    "10004": ("新竹縣", 588000, 1150, 95.0, 68.0, 39.8),
    "10005": ("苗栗縣", 535000, 790, 178.0, 310.0, 19.5),
    "10007": ("彰化縣", 1240000, 770, 182.0, 1350.0, 21.5),
    "10008": ("南投縣", 478000, 740, 208.0, 280.0, 18.5),
    "10009": ("雲林縣", 66000, 720, 215.0, 1750.0, 16.5),
    "10020": ("嘉義市", 263000, 790, 186.0, 52.0, 21.8),
    "10010": ("嘉義縣", 488000, 710, 235.0, 1620.0, 15.5),
    "10013": ("屏東縣", 795000, 720, 210.0, 1420.0, 17.2),
    "10002": ("宜蘭縣", 449000, 760, 198.0, 125.0, 23.0),
    "10015": ("花蓮縣", 318000, 730, 205.0, 195.0, 19.8),
    "10014": ("臺東縣", 212000, 710, 212.0, 165.0, 18.2),
    "10016": ("澎湖縣", 107000, 730, 202.0, 45.0, 18.0),
    "09020": ("金門縣", 141000, 810, 165.0, 35.0, 22.5),
    "09007": ("連江縣", 14000, 840, 135.0, 12.0, 20.0),
}

csv_lines = [
    "county_code,county_name,year,population,median_income_thousand_twd,ageing_index,solar_capacity_mw,housing_price_per_ping_thousand_twd"
]

for year in [2020, 2021, 2022, 2023, 2024]:
    year_diff = year - 2020
    for code, (cname, pop, inc, age, sol, price) in base_tw_stats.items():
        # realistic yearly growth
        cur_pop = int(pop * (1 + (0.005 if "新竹" in cname or "桃園" in cname else -0.003) * year_diff))
        cur_inc = round(inc * (1 + 0.032 * year_diff), 1)
        cur_age = round(age + 4.2 * year_diff, 1)
        cur_sol = round(sol * (1 + 0.18 * year_diff), 1)
        cur_price = round(price * (1 + 0.065 * year_diff), 1)
        csv_lines.append(f"{code},{cname},{year},{cur_pop},{cur_inc},{cur_age},{cur_sol},{cur_price}")

# Intentionally append 2 unmatched records without coordinates
csv_lines.append("99999,南沙太平島特定保護區,2024,215,820.0,120.5,12.4,0.0")
csv_lines.append("88888,東沙環礁海洋研究站,2024,180,850.0,110.2,15.8,0.0")

with open('public/presets/taiwan-metrics.csv', 'w', encoding='utf-8') as f:
    f.write("\n".join(csv_lines))
print("Taiwan CSV saved, lines:", len(csv_lines))

# 2. Process World Countries GeoJSON
req_w = urllib.request.Request(
    'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson',
    headers={'User-Agent': 'Mozilla/5.0'}
)
with urllib.request.urlopen(req_w) as resp:
    world_data = json.loads(resp.read().decode('utf-8'))

for feat in world_data['features']:
    props = feat['properties']
    iso3 = props.get('ISO3166-1-Alpha-3', '')
    iso2 = props.get('ISO3166-1-Alpha-2', '')
    name = props.get('name', '')
    feat['properties'] = {
        'iso3': iso3,
        'iso2': iso2,
        'name': name,
        'id': iso3
    }

with open('public/presets/world-countries.geojson', 'w', encoding='utf-8') as f:
    json.dump(world_data, f, ensure_ascii=False)
print("World GeoJSON saved, features:", len(world_data['features']))

# World sample CSV
world_base = {
    "TWN": ("Taiwan", 33500, 80.8, 11.5, 92.5),
    "USA": ("United States", 76300, 77.5, 22.4, 91.8),
    "JPN": ("Japan", 39200, 84.6, 21.6, 93.0),
    "DEU": ("Germany", 51200, 80.9, 46.2, 91.5),
    "GBR": ("United Kingdom", 46100, 81.0, 42.1, 95.0),
    "FRA": ("France", 43600, 82.5, 26.5, 91.2),
    "KOR": ("South Korea", 34900, 83.5, 8.9, 97.2),
    "CAN": ("Canada", 54900, 82.0, 68.0, 93.8),
    "AUS": ("Australia", 65100, 83.2, 32.5, 91.0),
    "NOR": ("Norway", 89200, 83.2, 98.5, 98.0),
    "SWE": ("Sweden", 58900, 83.0, 64.0, 96.5),
    "SGP": ("Singapore", 82800, 83.8, 4.2, 96.0),
    "NZL": ("New Zealand", 48500, 82.4, 82.0, 94.0),
    "NLD": ("Netherlands", 57900, 81.5, 41.5, 95.5),
    "CHE": ("Switzerland", 92100, 84.0, 75.0, 96.2),
    "DNK": ("Denmark", 68300, 81.4, 80.2, 97.0),
    "FIN": ("Finland", 53700, 82.0, 53.0, 96.0),
    "ITA": ("Italy", 35600, 82.9, 36.5, 86.0),
    "ESP": ("Spain", 30100, 83.3, 46.8, 93.2),
    "BRA": ("Brazil", 8900, 76.0, 83.0, 80.5),
    "IND": ("India", 2400, 70.4, 21.5, 52.0),
    "IDN": ("Indonesia", 4700, 71.9, 14.2, 73.0),
    "MEX": ("Mexico", 10900, 75.1, 26.0, 75.6),
    "ZAF": ("South Africa", 6700, 65.3, 11.2, 72.0),
    "ARG": ("Argentina", 10600, 76.5, 30.5, 87.0),
    "CHL": ("Chile", 15400, 80.2, 55.4, 90.5),
    "VNM": ("Vietnam", 4100, 75.4, 28.5, 78.5),
    "THA": ("Thailand", 7600, 78.7, 14.8, 85.0),
    "MYS": ("Malaysia", 12500, 76.2, 18.5, 96.8),
    "PHL": ("Philippines", 3600, 72.1, 22.0, 73.0),
    "ISL": ("Iceland", 73500, 83.2, 99.8, 99.0),
    "IRL": ("Ireland", 104000, 82.0, 39.5, 94.5),
    "AUT": ("Austria", 53500, 81.6, 78.0, 93.0),
    "BEL": ("Belgium", 50100, 81.9, 28.0, 94.0),
    "POL": ("Poland", 18500, 77.5, 21.0, 87.0),
    "PRT": ("Portugal", 24500, 81.7, 61.0, 84.5),
    "GRC": ("Greece", 20900, 81.0, 39.0, 82.0),
    "TUR": ("Turkey", 10600, 77.7, 42.0, 83.0),
    "EGY": ("Egypt", 3700, 72.0, 11.5, 72.0),
    "KEN": ("Kenya", 2100, 66.5, 89.0, 42.0),
}

w_lines = ["country_code,country_name,year,gdp_per_capita_usd,life_expectancy,renewable_energy_pct,internet_penetration_pct"]
for yr in [2020, 2021, 2022, 2023, 2024]:
    dy = yr - 2020
    for code, (cname, gdp, le, re, inet) in world_base.items():
        cgdp = round(gdp * (1 + 0.038 * dy))
        cle = round(le + 0.15 * dy, 1)
        cre = round(min(99.9, re * (1 + 0.06 * dy)), 1)
        cinet = round(min(99.9, inet + 0.8 * dy), 1)
        w_lines.append(f"{code},{cname},{yr},{cgdp},{cle},{cre},{cinet}")

# Add intentionally unmatched rows
w_lines.append("UN001,深海國際科學考察站,2024,45000,79.0,85.0,99.0")
w_lines.append("ISS99,低地軌道科研站,2024,120000,80.0,100.0,100.0")

with open('public/presets/world-metrics.csv', 'w', encoding='utf-8') as f:
    f.write("\n".join(w_lines))
print("World CSV saved, lines:", len(w_lines))
