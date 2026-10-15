"""Build data/cars.json from the EV Database spreadsheet: every car (on sale, discontinued and upcoming), with
Wikimedia Commons photos where a matching one has been checked.

Usage: python3 scripts/build.py ev-database-cars.xlsx data/cars.json

Photos are matched by model family (families.py). Discontinued and upcoming cars only reuse a family's photos when
they belong to the same generation as the cars on sale today: they must have gone on sale no more than a year
before the earliest version on sale. Older generations get their own family name and no photo, because a photo of
the current car would show the wrong car.
"""
import collections, hashlib, json, os, re, sys, urllib.parse

import openpyxl

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from families import family_of
from interiors import INTERIORS, SHOWN_AS
from photos import FAMILY_PHOTOS, PHOTOS, REJECT_FAMILIES


def enc(f): return urllib.parse.quote(f, safe="")
def thumb(f):
    h = hashlib.md5(f.encode()).hexdigest()
    return f"https://thumb.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{enc(f)}/960px-{enc(f)}"
def page(f): return "https://commons.wikimedia.org/wiki/File:" + enc(f)


def num(v):
    if v is None or (isinstance(v, str) and not v.strip()):
        return None
    if isinstance(v, str):
        v = v.replace("£", "").replace("€", "").replace(",", "").strip()
    f = float(v)
    return int(f) if f.is_integer() else f


yes_no = lambda v: {"Yes": True, "No": False}.get(v)
text = lambda v: v if v not in (None, "") else None

# Spreadsheet column -> converter. Order is kept in the JSON.
COLUMNS = [
    ("Make", str), ("Model", str), ("Body", str), ("Drive", str), ("Seats", num), ("Heat pump", yes_no), ("V2L", yes_no),
    ("Battery chemistry", text), ("Real range km", num), ("Efficiency Wh/km", num), ("1-stop range km", num),
    ("Usable battery kWh", num), ("Fastcharge kW", num), ("0-100 km/h s", num), ("Price per km EUR", num),
    ("Price UK GBP", num), ("Status", str), ("Availability", str), ("Available from", str), ("Available to", text),
    ("Year from", num), ("Year to", num), ("Segment", str), ("Towbar possible", yes_no), ("Euro NCAP stars", num),
    ("V2H", yes_no), ("V2G", yes_no), ("AC charge kW", num), ("Charge plug", lambda v: v or "Not listed"),
    ("Range estimated", yes_no), ("Efficiency estimated", yes_no), ("Weight kg", num), ("Battery estimated", yes_no),
    ("Towing kg", num), ("Cargo L", num), ("Price/km estimated", yes_no), ("Price Germany EUR", num),
    ("Price Netherlands EUR", num), ("URL", str),
]

# Model-year and generation tags that don't make a different car: "(MY24-27)", "(MY22)".
MY_TAG = re.compile(r"\s*\(MY[\d\-–]+\)")


def variant_name(model: str) -> str:
    """The model name without model-year tags, so the same version sold across several years groups together."""
    return MY_TAG.sub("", model).strip()


def base_name(make: str, model: str) -> str:
    """A model family name for cars no rule covers: the first word, plus a short second word that is part of the
    name ("Model 3", "IONIQ 5", "ID. Buzz", "Kona Electric")."""
    words = variant_name(model).split()
    if not words:
        return make
    name = words[0]
    if len(words) > 1 and (words[0].endswith(".") or re.fullmatch(r"\d|[A-Z]|Electric|EV|e", words[1])):
        name += " " + words[1]
    return f"{make} {name}"


src, out = sys.argv[1], sys.argv[2]
wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
rows = list(wb["All cars"].iter_rows(values_only=True))
head = rows[0]
raw = [dict(zip(head, r)) for r in rows[1:]]

cars = []
for r in raw:
    c = {"ID": int(r["ID"])}
    for col, conv in COLUMNS:
        c[col] = conv(r[col])
    c["Full name"] = f"{c['Make']} {c['Model']}"  # the sheet's own Full name column holds chemistry codes
    cars.append(c)

# Earliest model year of each rule family among the cars on sale: the start of the current generation.
gen_start = {}
for c in cars:
    m = family_of(c["Make"], c["Model"])
    if m and c["Status"] == "Available":
        gen_start[m[0]] = min(gen_start.get(m[0], 9999), c["Year from"])

# Versions on sale today, per rule family, by name without model-year tags.
on_sale_variants = collections.defaultdict(set)
for c in cars:
    m = family_of(c["Make"], c["Model"])
    if m and c["Status"] == "Available":
        on_sale_variants[m[0]].add(variant_name(c["Model"]))

# Tidier or merged names for families of older cars that no rule covers.
FAMILY_ALIASES = {
    "BMW i3s": "BMW i3",
    "MG MG5 Electric": "MG MG5 EV",
    "Smart ForTwo Electric": "Smart ForTwo",
    "Mercedes-Benz B": "Mercedes-Benz B 250 e",
}

# Earlier generations that the rules above would otherwise treat as current (checked by hand).
EARLIER_GENERATION = {("Mini", "Cooper SE Convertible")}

stats = collections.Counter()
for c in cars:
    m = family_of(c["Make"], c["Model"])
    variant = variant_name(c["Model"])
    same_generation = bool(m) and (c["Make"], variant) not in EARLIER_GENERATION and (
        c["Status"] == "Available"
        # A model-year update of a version still on sale, e.g. "Countryman E (MY24-25)" next to "Countryman E (MY26)".
        or (bool(MY_TAG.search(c["Model"])) and variant in on_sale_variants[m[0]])
        # Or launched no more than a year before the current generation.
        or c["Year from"] >= gen_start.get(m[0], 9999) - 1
    )
    if m:
        # Older generations stay in the model's family (so they're listed as versions of it), without its photos.
        fam = m[0] if same_generation else re.sub(r"\s*\(\d{4}\)$", "", m[0])
    else:
        fam = base_name(c["Make"], c["Model"])
        fam = FAMILY_ALIASES.get(fam, fam)
    if same_generation:
        title = m[1]
        p = FAMILY_PHOTOS.get(fam) or (PHOTOS.get(title) if fam not in REJECT_FAMILIES else None)
        interiors = INTERIORS.get(fam, [])
    else:
        p, interiors = None, []
        stats["older generation" if m else "no family rule"] += 1
    if p:
        f, author, lic, licurl = p
        c["image"] = thumb(f)
        c["imageCredit"] = {"author": author, "license": lic, "licenseUrl": licurl, "source": page(f), "subject": fam}
        stats[f"photo {c['Status']}"] += 1
    else:
        c["image"] = None
        c["imageCredit"] = None
    c["interiors"] = [
        {"image": thumb(f.replace(" ", "_")), "width": w, "height": h, "author": author, "license": lic, "licenseUrl": licurl,
         "source": page(f.replace(" ", "_")), "subject": SHOWN_AS.get(fam, fam)}
        for f, w, h, author, lic, licurl in interiors
    ]
    c["family"] = fam
    c["variant"] = variant_name(c["Model"])
    stats[c["Status"]] += 1

# Longest real-world range first, then cheapest (UK price, then German), then ID.
cars.sort(key=lambda c: (-c["Real range km"], c["Price UK GBP"] or c["Price Germany EUR"] or 0, c["ID"]))
json.dump(cars, open(out, "w"), ensure_ascii=False, indent=2)
open(out, "a").write("\n")
print(dict(stats))
print(len(cars), "cars,", len({c["family"] for c in cars}), "families,", len({c["image"] for c in cars if c["image"]}), "distinct photos")

# Compact copy for the browser (quiz, search, results): columns once, rows as arrays, photo credits listed once.
# Interior photos and source links are only needed on car pages, so they go in a separate file the server reads.
min_out = os.path.join(os.path.dirname(out), "cars.min.json")
extras_out = os.path.join(os.path.dirname(out), "car-extras.json")
SERVER_ONLY = {"interiors", "URL", "Full name"}
columns = [k for k in cars[0] if k not in SERVER_ONLY]
credits, credit_index, rows = [], {}, []
for c in cars:
    row = []
    for k in columns:
        v = c[k]
        if k == "imageCredit" and v is not None:
            key = json.dumps(v, sort_keys=True)
            if key not in credit_index:
                credit_index[key] = len(credits)
                credits.append(v)
            v = credit_index[key]
        row.append(v)
    rows.append(row)
json.dump({"columns": columns, "credits": credits, "rows": rows}, open(min_out, "w"), ensure_ascii=False, separators=(",", ":"))
json.dump({str(c["ID"]): {"url": c["URL"], "interiors": c["interiors"]} for c in cars}, open(extras_out, "w"), ensure_ascii=False, separators=(",", ":"))
print("wrote", min_out, os.path.getsize(min_out) // 1024, "KB and", extras_out, os.path.getsize(extras_out) // 1024, "KB")
