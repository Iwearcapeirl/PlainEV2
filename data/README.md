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

Used prices are **typical asking prices** for an average-mileage example, estimated from the car's price when new, its age and its make (`lib/market.ts`). The curve was fitted in October 2026 to the median asking price of the first page of AutoTrader results (about 20 listings, Cat S/N excluded) for 27 popular model years, checked by hand in a browser. Only the medians below were recorded. Budget checks use the typical price; the range shown is ±12%, about where most listings sat.

| Model | Year | Median asking price | New estimate | Old estimate (low end, used for budgets) |
|---|---|---|---|---|
| Nissan Leaf | 2017 | £4,995 | £5,900 | £3,400 |
| Nissan Leaf | 2019 | £8,100 | £8,200 | £6,100 |
| Nissan Leaf | 2021 | £9,490 | £9,500 | £8,400 |
| Nissan Leaf | 2023 | £11,944 | £12,200 | £12,100 |
| Renault Zoe | 2020 | £8,995 | £10,000 | £6,900 |
| Tesla Model 3 | 2019 | £16,000 | £15,700 | £9,300 |
| Tesla Model 3 | 2021 | £18,249 | £18,000 | £12,800 |
| Tesla Model 3 | 2023 | £21,995 | £23,300 | £18,400 |
| Tesla Model Y | 2022 | £23,449 | £20,500 | £15,700 |
| Volkswagen ID.3 | 2021 | £13,350 | £11,100 | £8,400 |
| Volkswagen ID.3 | 2023 | £17,295 | £19,500 | £17,600 |
| Volkswagen ID.4 | 2022 | £16,930 | £16,900 | £14,600 |
| MG4 | 2023 | £12,799 | £12,800 | £12,600 |
| MG4 | 2024 | £15,370 | £15,300 | £15,800 |
| Kia e-Niro | 2020 | £13,820 | £11,000 | £7,700 |
| Hyundai Kona Electric | 2020 | £12,618 | £11,500 | £8,100 |
| Hyundai Ioniq 5 | 2022 | £18,495 | £17,000 | £14,700 |
| Hyundai Ioniq 5 | 2024 | £22,099 | £23,500 | £22,300 |
| Kia EV6 | 2022 | £19,029 | £18,800 | £16,700 |
| Škoda Enyaq | 2021 | £15,220 | £14,700 | £11,800 |
| Polestar 2 | 2021 | £17,227 | £16,100 | £13,200 |
| BMW i3 | 2018 | £10,990 | £9,700 | £5,600 |
| Audi e-tron | 2020 | £17,699 | £20,000 | £16,900 |
| Jaguar I-Pace | 2019 | £12,800 | £17,300 | £12,800 |
| Peugeot e-208 | 2021 | £11,950 | £10,700 | £8,100 |
| Cupra Born | 2022 | £16,250 | £13,800 | £11,300 |
| BYD Atto 3 | 2023 | £17,490 | £16,400 | £14,100 |

Recheck every six months or so (same searches: make, model, single year, electric, national), and refit if the medians drift by more than about 10%.
