"""Add Wikimedia Commons photos (exterior + interior) to cars.json. Usage: python3 scripts/build.py data/cars.json data/cars.json"""
import json, hashlib, os, sys, urllib.parse, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from families import family_of
from photos import PHOTOS, REJECT_FAMILIES, FAMILY_PHOTOS
from interiors import INTERIORS, SHOWN_AS

def enc(f): return urllib.parse.quote(f, safe="")
def thumb(f):
    h = hashlib.md5(f.encode()).hexdigest()
    return f"https://thumb.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{enc(f)}/960px-{enc(f)}"
def page(f): return "https://commons.wikimedia.org/wiki/File:" + enc(f)

src, out = sys.argv[1], sys.argv[2]
cars = json.load(open(src))
fams = {family_of(c["Make"], c["Model"])[0] for c in cars}
assert REJECT_FAMILIES <= fams, REJECT_FAMILIES - fams
assert set(FAMILY_PHOTOS) <= fams, set(FAMILY_PHOTOS) - fams
assert set(INTERIORS) <= fams, set(INTERIORS) - fams
stats = collections.Counter()
for c in cars:
    fam, title = family_of(c["Make"], c["Model"])
    p = FAMILY_PHOTOS.get(fam) or (PHOTOS.get(title) if fam not in REJECT_FAMILIES else None)
    if p:
        f, author, lic, licurl = p
        c["image"] = thumb(f)
        c["imageCredit"] = {"author": author, "license": lic, "licenseUrl": licurl, "source": page(f), "subject": fam}
        stats["with"] += 1
    else:
        c["image"] = None
        c["imageCredit"] = None
        stats["without"] += 1
    c["family"] = fam
    c["interiors"] = [
        {"image": thumb(f.replace(" ", "_")), "width": w, "height": h, "author": author, "license": lic, "licenseUrl": licurl,
         "source": page(f.replace(" ", "_")), "subject": SHOWN_AS.get(fam, fam)}
        for f, w, h, author, lic, licurl in INTERIORS.get(fam, [])
    ]
    stats["with interior"] += bool(c["interiors"])
json.dump(cars, open(out, "w"), ensure_ascii=False, indent=2)
print(dict(stats))
print(len({c["image"] for c in cars if c["image"]}), "distinct images")
