import requests
import time

GEOCODE_URL = "https://data.geopf.fr/geocodage/search"

CITY = "Bourg-la-Reine"
POSTAL_CODE = "92340"

places = [
    # Écoles vérifiées Bourg-la-Reine
    ("École Étienne Thieulin - La Faïencerie", "school", "20-22 rue Jean-Roger Thorelle"),
    ("École République", "school", "18 boulevard Carnot"),
    ("École Pierre-Loti", "school", "38 rue de Fontenay"),
    ("École Fontaine-Grelot", "school", "13 rue de la Fontaine Grelot"),
    ("École maternelle des Bas-Coquarts", "school", "12 rue de la Sarrazine"),
    ("École Institution privée Notre-Dame", "school", "2 rue de la Bièvre"),
    ("École Saint-Roch", "school", "17 avenue de Montrouge"),

    # Crèches / enfance
    ("Crèche collective municipale Les Rosiers", "activity", "1 bis rue des Rosiers"),
    ("Crèche familiale Les Rosiers", "activity", "18 rue des Rosiers"),
    ("Crèche multi-accueil Joffre", "activity", "108 boulevard du Maréchal Joffre"),
    ("Crèche Leclerc", "activity", "47 avenue du Général Leclerc"),
    ("Crèche Hoffmann", "activity", "34 rue Hoffmann"),

    # Sport
    ("Complexe sportif des Bas-Coquarts", "activity", "8 avenue de Montrouge"),
    ("Gymnase des Bas-Coquarts", "activity", "8 avenue de Montrouge"),
    ("Halle des Sports", "activity", "8 avenue de Montrouge"),
    ("Salle d'Armes", "activity", "8 avenue de Montrouge"),
    ("Stade municipal", "activity", "16 rue Charpentier"),
    ("Tennis club de Bourg-la-Reine", "activity", "16 rue Charpentier"),

    # Culture / services
    ("Conservatoire de Bourg-la-Reine", "activity", "11 boulevard Carnot"),
    ("Mairie de Bourg-la-Reine", "other", "6 boulevard Carnot"),
    ("Gare RER B Bourg-la-Reine", "other", "Place de la Gare"),
    ("Médiathèque de Bourg-la-Reine", "other", "2-4 Rue le Bouvier"),
]

def escape_sql(s):
    return s.replace("'", "''")

def geocode(address):
    query = f"{address}, {POSTAL_CODE} {CITY}"

    params = {
        "q": query,
        "limit": 1,
        "autocomplete": 0,
    }

    r = requests.get(GEOCODE_URL, params=params, timeout=20)
    r.raise_for_status()

    data = r.json()

    if not data.get("features"):
        return None

    feature = data["features"][0]
    lon, lat = feature["geometry"]["coordinates"]
    props = feature["properties"]

    return {
        "lat": lat,
        "lng": lon,
        "label": props.get("label"),
        "score": props.get("score"),
    }

rows = []
failed = []

for name, kind, address in places:
    result = geocode(address)

    if result is None:
        failed.append((name, address, "not_found"))
        continue

    if result["score"] is not None and result["score"] < 0.65:
        failed.append((name, address, f"low_score={result['score']}"))
        continue

    print(
        f"{name} -> lat={result['lat']}, lng={result['lng']} | "
        f"{result['label']} | score={result['score']}"
    )

    rows.append(f"""(
  '{escape_sql(name)}',
  '{escape_sql(kind)}',
  '{CITY}',
  '{escape_sql(address)}',
  '{POSTAL_CODE}',
  {result["lat"]},
  {result["lng"]},
  true
)""")

    time.sleep(0.2)

if not rows:
    raise RuntimeError("Aucun lieu géocodé. Aucun fichier SQL généré.")

sql = f"""
-- Réinitialisation complète des trajets et lieux
-- À utiliser uniquement si le site est encore vierge

delete from public.trips;
delete from public.places;

insert into public.places (
  name,
  kind,
  city,
  exact_address,
  postal_code,
  lat,
  lng,
  is_active
)
values
{",\n".join(rows)};
"""

with open("import_places_bourg_la_reine.sql", "w", encoding="utf-8") as f:
    f.write(sql)

print("\\nFichier généré : import_places_bourg_la_reine.sql")

if failed:
    print("\\nLieux non géocodés ou score faible :")
    for item in failed:
        print(item)