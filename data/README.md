# data/

## cars.json

This file lists the electric cars that are currently on sale and have a UK price, sorted by real-world range from longest to shortest. It has 471 cars.

**Source:** `ev-database-cars.xlsx`, "All cars" sheet. The data was taken from [EV Database](https://ev-database.org/) on 9 October 2026, using the site's overview listing rather than each car's full spec page.

**Range is EV Database's real-world range, not WLTP.** `Real range km` is EV Database's estimate of range in mixed real-world driving. It is usually well below the official WLTP figure. `Efficiency Wh/km` uses the same standardised conditions.

### How it was built
1. Kept only rows where `Status` = "Available". That left 661 of 1,493 cars.
2. Dropped cars with no `Price UK GBP` (190 cars) or no `Real range km` (none).
3. Sorted by `Real range km`, highest first. Ties are broken by `Price UK GBP`, cheapest first.

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
- `URL` links to the car's page on EV Database.

### Photos (`image`, `imageCredit`)

- `image` is a 960px-wide photo URL from **Wikimedia Commons**, or `null` when no suitable free photo exists. 435 of the 471 cars have one, using 161 different photos.
- `imageCredit` holds `author`, `license`, `licenseUrl`, `source` (the Commons file page) and `subject` (the model the photo shows). Every photo is CC BY, CC BY-SA or CC0. The site shows the author and licence on each photo, which is the attribution these licences require.
- Photos are matched by **model family**, not by exact trim. A photo of a Kia EV4 GT-Line is used for every EV4. Every photo was checked by eye. 17 model families (36 cars) have no photo because no freely licensed picture of the correct badge, body style or generation could be found.
- **EV Database images are not used.** Their data-services page says: "Hot linking to, or direct use of, any images on EV Database's servers is not allowed".
- `interiors` is a list of up to 2 interior photos from Wikimedia Commons, each with `image`, `width`, `height` and the same credit fields as `imageCredit`. 219 cars have at least one. They were found with the Commons search API, checked by eye, and are listed in `scripts/interiors.py`. Some show a closely related version with the same cabin (for example a petrol Astra for the Astra Electric); `subject` says which, and the car page notes it.
- `family` is the model family shared by every version of a model (for example "Hyundai Ioniq 5"). The car pages use it for the "Other versions" list.
- How to rebuild: `scripts/families.py` maps each car to a model family and a Wikipedia article. `scripts/photos.py` lists the accepted exterior Commons files (`PHOTOS` by Wikipedia article, plus `FAMILY_PHOTOS` picked by hand) and the families rejected for showing the wrong car. Run `python3 scripts/build.py data/cars.json data/cars.json` to apply them.

