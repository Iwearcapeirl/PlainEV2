# data/

## cars.json

This file lists every electric car in the spreadsheet: 1,533 cars (687 on sale, 838 no longer sold new, 8 coming soon), sorted by real-world range from longest to shortest. It is built by `scripts/build.py`, which also writes:

- `cars.min.json`: the same cars for the browser, as `columns` + `rows` arrays with photo credits listed once, and without `interiors` and `Full name`.
- `car-extras.json`: `{ID: {interiors}}`, read only by car pages on the server.

**Source:** `ev-database-cars.csv` (October 2026 export, with dimensions; earlier exports were `ev-database-cars.xlsx`, "All cars" sheet). The data was taken from [EV Database](https://ev-database.org/) on 18 October 2026, using the site's overview listing rather than each car's full spec page.

**Range is EV Database's real-world range, not WLTP.** `Real range km` is EV Database's estimate of range in mixed real-world driving. It is usually well below the official WLTP figure. `Efficiency Wh/km` uses the same standardised conditions.

### How it was built
1. Kept every row. `Price UK GBP`, `Price Germany EUR` and `Price Netherlands EUR` are null when the car wasn't sold there (for cars no longer sold, the last new price). Every car has at least one.
2. Added `family` and `variant` (the model name without "(MY..)" tags, used to group the same version across years).
3. Sorted by `Real range km`, highest first. Ties are broken by UK price (or German price), cheapest first.

### Field notes
- `ID`, `Seats`, ranges, `Efficiency Wh/km`, `Usable battery kWh`, `Fastcharge kW`, `Price per km EUR` and `Price UK GBP` are all numbers. `Price UK GBP` is the UK starting price including VAT.
- `Heat pump` and `V2L` are true or false. The source sheet stores them as Yes/No.
- `Full name` is built from `Make` + " " + `Model`. In the source sheet, the Full name column holds battery chemistry codes (NCM, LFP and so on) instead of car names, so it was not used.
- `Battery chemistry` is null for 20 cars because the source sheet has it blank.
- `1-stop range km` is the total range at highway speed with one 15-minute charging stop.
- `Fastcharge kW` is the average power from 10% to 80% charge, not the peak.
- Every other column from the sheet's "All cars" tab is also included, under its original name: `Status`, `Availability`, `Available from` / `Available to` (ISO dates; `Available to` is null unless an end of sales is announced), `Year from` / `Year to`, `Segment` (A city car to F luxury, N van-based people carrier, S sports car), `Towbar possible`, `Euro NCAP stars` (null when not tested), `V2H`, `V2G`, `AC charge kW`, `Charge plug`, `Weight kg`, `Towing kg` (0 = not approved for towing), `Cargo L` (boot space), `Price Germany EUR` and `Price Netherlands EUR` (null when not listed), and the four "estimated" flags (`Range estimated`, `Efficiency estimated`, `Battery estimated`, `Price/km estimated`). Yes/No columns are true/false.
- `0-100 km/h s` is the 0–100 km/h time in seconds, added later from the same sheet's `0-100 km/h s` column. Every car has one. The site shows it as 0–62 mph, which is the same measure.
- `Price per km EUR` is EV Database's value-for-money figure: the price in EUR for each km of real range. Lower is better.
- The sheet's `URL` column (EV Database page links) is not copied into the site's data.

### Photos (`image`, `imageCredit`)

- `image` is a 960px-wide photo URL from **Wikimedia Commons**, or `null` when no suitable free photo exists. Every car has one. Cars no longer sold only reuse their model's current photo when they are the same generation; older generations and models with no photo in `photos.py` get one from `scripts/more_photos.py` (rules by family, model name and year). When the photo isn't of this exact car (a twin, a concept, the previous generation, or as a last resort a similar car from the same make), `imageCredit.note` says what it shows, and the site prints it on the photo.
- `imageCredit` holds `author`, `license`, `licenseUrl`, `source` (the Commons file page) and `subject` (the model the photo shows). Every photo is CC BY, CC BY-SA or CC0. The site shows the author and licence on each photo, which is the attribution these licences require.
- Photos are matched by **model family**, not by exact trim. A photo of a Kia EV4 GT-Line is used for every EV4. Every photo was checked by eye. 17 model families (36 cars) have no photo because no freely licensed picture of the correct badge, body style or generation could be found.
- **EV Database images are not used.** Their data-services page says: "Hot linking to, or direct use of, any images on EV Database's servers is not allowed".
- `interiors` is a list of up to 2 interior photos from Wikimedia Commons, each with `image`, `width`, `height` and the same credit fields as `imageCredit`. Interiors follow the same generation rule. They were found with the Commons search API, checked by eye, and are listed in `scripts/interiors.py`. Some show a closely related version with the same cabin (for example a petrol Astra for the Astra Electric); `subject` says which, and the car page notes it.
- `family` is the model family shared by every version of a model (for example "Hyundai Ioniq 5"). The car pages use it for the "Other versions" list.
- How to rebuild: `scripts/families.py` maps each car to a model family and a Wikipedia article. `scripts/photos.py` lists the accepted exterior Commons files (`PHOTOS` by Wikipedia article, plus `FAMILY_PHOTOS` picked by hand) and the families rejected for showing the wrong car. Run `python3 scripts/build.py ev-database-cars.xlsx data/cars.json` to apply them.

## Changes from EV Database

A few names and body styles are changed in `scripts/build.py` (`UK_NAMES`, `BODY_OVERRIDES`) so the site matches how cars are sold and described in the UK (checked October 2026):

- **Geely E5 → EX5, Geely E2 → EX2** (their UK names). The E5 versions take the UK trim names they match by price and battery: E5 Pro = **EX5 SE** (£31,990, 60 kWh) and E5 Max+ = **EX5 Ultra** (£38,990, 68 kWh). The E5 Pro+ isn't sold in the UK and is shown as **EX5 Pro+**. The E2 keeps its battery-size names (EX2 35 kWh, EX2 47 kWh).
- **Hyundai Inster: SUV → Hatchback.** EV Database lists it as an SUV, but it's a city car (size class A, where it was the only "SUV"), so it no longer comes up for people looking for an SUV.

All figures are unchanged.

## Warranties (`warranty.json`)

UK maker warranties by make, checked on each maker's official UK website or warranty documents on 18 October 2026 (the source link is stored with each make and shown on car pages). `car` and `battery` give years and miles ("unlimited" = no mileage limit, null = not stated); `capacity` is the share of battery capacity guaranteed; `transfer` is yes / conditions / unknown; `models` overrides terms for some models (e.g. Tesla's longer battery cover on Long Range and Performance versions). Not yet confirmed from an official source: Alpine, Bentley, Changan, GAC, GWM, Maserati, Maxus, Mitsubishi, ORA, Omoda, Rolls-Royce, Skywell, SsangYong. Fisker and Lightyear have closed down.

## Used prices

Used prices are a **likely price band** for an average-mileage example of each model year, estimated from the car's price when new, its age, its make and (for a few models) the model itself (`lib/market.ts`). The curve was fitted in October 2026 to asking prices on AutoTrader for 51 model years, from nearly new to nine years old, checked by hand in a browser: for each, the median of the first page of results (about 20 listings, Cat S/N write-offs excluded) and, for newer cars, the cheaper end (10th percentile). Only those summary figures were recorded.

- The band is the estimate ±15%: in the check, nine in ten medians were within 15% of the curve, and the cheaper normal listings sat about 15% under the median. The band never goes above the price new.
- Budget checks ("in your budget used", the used rankings, the used price filter) use the **top** of the band, so a car only counts as affordable if a typical example is.
- Every used price links to live listings for that model and year (AutoTrader in the UK, AutoScout24 in Germany and the Netherlands).

| Model | Year | Median asking price | Cheaper listings (10%) | Band now | Median vs band |
|---|---|---|---|---|---|
| Nissan Leaf | 2017 | £4,995 | – | £5,000–£6,700 | below |
| Nissan Leaf | 2019 | £8,100 | – | £6,700–£9,000 | in |
| Nissan Leaf | 2021 | £9,490 | – | £7,900–£10,700 | in |
| Nissan Leaf | 2023 | £11,944 | – | £10,500–£14,300 | in |
| Renault Zoe | 2020 | £8,995 | – | £9,600–£12,900 | below |
| Tesla Model 3 | 2019 | £16,000 | – | £13,900–£18,800 | in |
| Tesla Model 3 | 2021 | £18,249 | – | £16,900–£22,900 | in |
| Tesla Model 3 | 2023 | £21,995 | – | £21,700–£29,400 | in |
| Tesla Model Y | 2022 | £23,449 | – | £19,300–£26,100 | in |
| Volkswagen ID.3 | 2021 | £13,350 | – | £10,600–£14,400 | in |
| Volkswagen ID.3 | 2023 | £17,295 | – | £17,600–£23,900 | below |
| Volkswagen ID.4 | 2022 | £16,930 | – | £15,100–£20,500 | in |
| MG4 | 2023 | £12,799 | – | £11,000–£14,900 | in |
| MG4 | 2024 | £15,370 | – | £13,300–£17,900 | in |
| Kia e-Niro | 2020 | £13,820 | – | £11,600–£15,700 | in |
| Hyundai Kona Electric | 2020 | £12,618 | – | £11,300–£15,300 | in |
| Hyundai Ioniq 5 | 2022 | £18,495 | – | £15,000–£20,300 | in |
| Hyundai Ioniq 5 | 2024 | £22,099 | – | £21,100–£28,600 | in |
| Kia EV6 | 2022 | £19,029 | – | £18,300–£24,700 | in |
| Škoda Enyaq | 2021 | £15,220 | – | £13,100–£17,700 | in |
| Polestar 2 | 2021 | £17,227 | – | £14,100–£19,000 | in |
| BMW i3 | 2018 | £10,990 | – | £9,700–£13,200 | in |
| Audi e-tron | 2020 | £17,699 | – | £14,200–£19,200 | in |
| Jaguar I-Pace | 2019 | £12,800 | – | £11,600–£15,700 | in |
| Peugeot e-208 | 2021 | £11,950 | – | £10,800–£14,700 | in |
| Cupra Born | 2022 | £16,250 | – | £13,000–£17,500 | in |
| BYD Atto 3 | 2023 | £17,490 | – | £15,400–£20,900 | in |
| Kia EV4 | 2025 | £28,894 | £25,120 | £25,400–£33,200 | in |
| Kia EV3 | 2024 | £30,315 | £25,370 | £20,200–£27,300 | above |
| Kia EV3 | 2025 | £29,995 | £24,750 | £26,400–£34,600 | in |
| Škoda Elroq | 2025 | £27,847 | £23,970 | £23,900–£32,300 | in |
| Tesla Model Y | 2025 | £43,999 | £36,997 | £34,200–£46,300 | in |
| Tesla Model 3 | 2024 | £31,800 | £26,989 | £26,100–£35,300 | in |
| BYD Dolphin | 2024 | £16,990 | £16,100 | £15,100–£20,400 | in |
| Volkswagen ID.3 | 2024 | £22,444 | £20,050 | £20,700–£27,900 | in |
| Hyundai Kona Electric | 2024 | £20,950 | £17,200 | £17,900–£24,200 | in |
| Ford Explorer EV | 2025 | £28,498 | £24,310 | £27,600–£37,400 | in |
| Volvo EX30 | 2024 | £25,499 | £23,258 | £18,600–£25,100 | above |
| MG4 | 2025 | £17,495 | £15,450 | £17,500–£23,700 | below |
| Hyundai Ioniq 5 | 2025 | £33,495 | £25,995 | £29,100–£39,300 | in |
| Škoda Enyaq | 2024 | £26,898 | £21,700 | £21,500–£29,100 | in |
| Nissan Leaf | 2024 | £12,799 | £12,040 | £12,700–£17,100 | in |
| Kia EV6 | 2024 | £26,684 | £18,230 | £25,200–£34,100 | in |
| Cupra Born | 2024 | £21,999 | £17,950 | £19,300–£26,100 | in |
| Polestar 2 | 2024 | £25,290 | £23,495 | £22,300–£30,200 | in |
| Nissan Ariya | 2023 | £21,400 | £17,400 | £17,300–£23,400 | in |
| BMW i4 | 2022 | £25,349 | £19,628 | £18,300–£24,800 | above |
| Mercedes-Benz EQE | 2022 | £29,295 | £23,000 | £23,900–£32,300 | in |
| BMW iX | 2022 | £30,989 | £26,350 | £31,800–£43,000 | below |
| Audi Q4 e-tron | 2022 | £21,570 | £16,673 | £16,100–£21,700 | in |

Recheck every six months or so with the same searches (make, model, single year, electric, national), and refit if medians drift out of the bands.
