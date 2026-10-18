# PlainEV

Recommends electric cars to buy new or used, in the UK, Germany or the Netherlands, from a typed description or a short quiz (five questions plus optional filters). Built with Next.js (App Router), TypeScript and Tailwind CSS v4. All filtering happens in the browser, using `data/cars.min.json` (a compact copy of `data/cars.json`).

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Requires Node 20.9 or later.

To let Claude read typed searches, set `ANTHROPIC_API_KEY` on the server (e.g. in `.env.local`, or your host's environment settings). Without it, search still works using the built-in rules.

## How it works

| Route | What it does |
|---|---|
| `/` | Homepage: "Find the right electric car, new or used." Hero with Find your match / Browse all cars / Rankings / Compare cars, four ways to start, the budget picker (counts new and used), a "Thinking of buying used?" section with the three longest-range used picks under £15k, real-world range vs WLTP, the range dial (new cars on sale in the UK) and 6 featured rankings (`FEATURED` in `app/page.tsx`). |
| `/quiz` | Opens on a search box: describe the car you want in your own words and get the top 5. "Answer questions instead" switches to the quiz: five core questions (new/used, budget, minimum range, body style, ranking priority), one per screen, then an optional "More filters" step. A live count shows how many cars still match. |
| `/results?budget=…&range=…&body=…&priority=…` | The top 5 matches, at most one per model. `country=de|nl` and `condition=new|used` are added when not the default (UK, new or used). Optional filters are added only when set (`seats`, `drive`, `battery`, `heatpump`, `v2l`, `eff`, `onestop`). Answers are kept in the URL, so you can share or bookmark results. "Edit answers" takes you back to the quiz with your answers filled in. Results from a typed search also carry `q=` (the text), shown above the answer chips; "Edit search" returns to the search box with it filled in. Older links using `features=` and the old range values still work. Not indexed by search engines (noindex, and blocked in robots.txt). |
| `/cars` | All cars: every car you can buy in the chosen country, new, used or both, one row per version across its model years (`components/Browse.tsx`). Quick filters (name search, make, body style, budget, minimum range, new/used, country) plus the full "Filter and sort" panel. Shows 30 at a time with "Show more"; sorted by longest range unless you choose another order. Filters are kept in the URL (the same `budget=`, `range=`, `body=`, `condition=`, `country=` and `f=` parameters as results). When nothing matches it suggests one change that brings cars back. Linked from the top bar and footer, and listed in the sitemap. |
| `/vs/[slug]` | "X vs Y" pages (`lib/rivals.ts`): each model on sale new in the UK against its 2 closest rivals (same body style and size class, nearest starting price), plus 16 well-known rivalries (`KNOWN_RIVALS`, e.g. Kia EV6 vs Hyundai Ioniq 5): 241 pages. Compares each model's cheapest UK version with a verdict written from the figures, the full side-by-side table (shared with Compare, `components/CompareTable.tsx`) and links to every version. Indexed and in the sitemap; linked from "Compare with rivals" on car pages and "Head-to-head" on `/best`. |
| `/best/used-*` | Used-car rankings (`lib/usedRankings.ts`): best used EVs under £10k, £15k, £20k and £25k, and family EVs (SUVs, estates, MPVs with 5+ seats and a 450-litre boot, under £25k). Ranked by estimated real-world range today for the newest model year within budget, one per model; makes that have closed down are left out. |
| `/api/og/[kind]/[slug]` | Share images (1200×630) drawn on request with `next/og` for car, vs and ranking pages, plus a site default (`components/ShareCards.tsx`); cached for a week. |
| `/compare` | Compare up to three cars side by side. Cars can also be picked with the "Compare" tick boxes on All cars rows and results cards: a bar pinned to the bottom of the screen collects up to 3 (kept for the browser tab, across lists and country switches) and opens the comparison in the current country (`components/ComparePicks.tsx`). Linked from the top bar ("Compare"), the homepage hero and "Four ways to start", and the footer (`components/Compare.tsx`, rules in `lib/compare.ts`). Opened from the "Compare with up to 2 others" button on every car page, with that car in slot 1; the other slots are type-ahead searches over all 1,533 cars (every word must match; "ioniq5" finds "IONIQ 5"; a year works too). Rows follow the car page's spec groups. Green marks the best in each row: higher wins for range, efficiency (mi/kWh), charging, battery, seats, boot, towing and NCAP stars; lower wins for prices and 0–62; "Yes" wins for V2L, V2H, V2G, heat pump and towbar. Ties are all green; a row where every car is the same, or fewer than two cars have a figure, has no winner; missing figures never win; body, plug, chemistry, drive, size class and weight have no winner. Each car shows "Wins X of Y". The cars live in the URL (`/compare?cars=a,b,c`, empty slots kept as `a,,c`) plus `country=` when it isn't the UK, so comparisons can be shared. Kept out of search results (`noindex`) and the sitemap. |
| `/car/[slug]` | One static page per car (1,533: on sale, no longer sold new, and coming soon), e.g. `/car/kia-ev3-long-range-my27`. Shows a large photo, interior photos where available, every spec in the data, how the car ranks against all EVs on sale, a short write-up, other versions of the same model, similar cars, and a "Search for this car" button (AutoTrader in the UK, AutoScout24 in Germany and the Netherlands) on every car except coming-soon ones. Every card on the results and ranking pages links here. |

**Filtering** (`lib/quiz.ts` defines every filter once; `lib/match.ts` → `matchesAnswers` applies them)
- **Budget** is a ceiling on the lowest price the buyer could pay: the new price (if wanted and on sale new in that country) or the cheapest estimated used price. Options: Up to £10k, £15k, £20k, £30k, £40k, £50k, £70k, and No limit (€ in Germany and the Netherlands). Ids are kept from when they were bands (`10-15k` = up to £15k, `under-30k` = up to £30k); old links with `over-70k` read as No limit. When a result is only in budget second-hand (its new price is over), its card says so: "In your budget used: 2022–2023 cars from £24,200" (`usedBudgetFit` in `lib/market.ts`).
- **Minimum range:** any, 200+, 250+, 300+ or 350+ miles, converted to km to filter on `Real range km`. The quiz shows how many cars each option leaves.
- **Body:** SUV, Hatchback, Sedan + Liftback, and Station (shown as "Estate"). "No preference" allows all body styles, including MPV, SPV, Cabrio and Coupe.
- **More filters (all optional, default "No preference"):**
  - Seats: 4+, 5+ or 7
  - Drive: front, rear or all-wheel
  - Battery chemistry: LFP or NCM
  - Heat pump required, and V2L required
  - Efficiency: 3.5+, 3.8+ or 4.0+ mi/kWh ("Best"), i.e. `Efficiency Wh/km` ≤ 180, 165 or 155
  - One-stop range: 300+, 350+ or 400+ miles on `1-stop range km`
  - Acceleration: 0–62 mph in 8, 7, 6, 5 or 4 seconds or less, on `0-100 km/h s`
- **Priority** can also be *quickest acceleration*: fastest 0–62 mph first, then longest range. Search uses it when someone asks for a quick or sporty car without giving a time, so a tight budget still returns cars; a stated time ("0-60 in under 5 seconds") sets the acceleration filter instead.

Each result card shows a "Matches your answers" row with a chip for every filter you set.

If nothing matches, the results page suggests which single answer to loosen and how many cars that would bring back.

**Search covers every column.** The quiz filters above handle the common needs. Everything else in `data/cars.json` is a field in `lib/fields.ts`, which powers the results page's "Filter and sort" panel: make and model name, estimated used price (in the buyer's country and currency), size class, towbar and towing weight, boot space, weight, Euro NCAP stars, AC charging, charging plug, V2H, V2G, model year, end of sales, availability, prices in Germany and the Netherlands, EUR price per km, and whether each figure is an estimate. The text search fills in the quiz answers *and* any of these extra filters and a sort (Claude returns them as structured output; `refinementFromText` in `lib/understand.ts` is the built-in fallback). The extra filters travel in the results URL as `f=key:value`, `sort=` and `dir=`. Only `ID` isn't searchable, because it's an identifier. Name searches everywhere (All cars, "Model name", the typed search, Compare) ignore case, accents, spaces, dots and dashes (`lib/text.ts`), so "id3" finds the ID.3 and "eniro" the e-Niro; without Claude, the typed search also spots model names that contain a number ("id3", "ev6", "model 3").

**No results.** When the answers plus any extra filters leave no cars, the results page suggests single changes that bring some back, each with a car count (`relaxSearch` in `lib/match.ts`): raise the budget to the next band with matches, set a quiz answer back to "no preference", loosen a number filter to the nearest value a car actually has (e.g. towing 1,500 kg → 1,200 kg), or drop an extra filter. The search text and sort are kept.

## New and used (`lib/market.ts`)

- **Country** (`country`, default UK): which new prices count (`Price UK GBP`, `Price Germany EUR` or `Price Netherlands EUR`) and the currency. A car is only offered in a country where it has a price.
- **Condition** (`condition`): new, used, or both (default). New means on sale new today. Used means any model year from launch to last year (still on sale) or to its last year (no longer sold). Coming-soon cars are never in results, only on their own pages.
- **Estimated used prices** come from the new price and the car's age (`retained`): 57–65% kept after 1 year, 38–42% after 3 (evenly in between), then 10–15% less each further year. Shown as a range, rounded to 100. Age is measured from `NEXT_PUBLIC_VALUATION_YEAR`, set to the build year in `next.config.ts`, so estimates move on with each deploy. These are estimates only, not valuations.
- **Range today** assumes 2% battery capacity loss a year (`BATTERY_LOSS_PER_YEAR`). Cars are still ranked on range when new.
- **Grouping:** results merge the same version across model years (same make and name without the "(MY..)" tag), e.g. "Tesla Model 3 Long Range AWD (2019–2023)". The top 5 shows at most one per model family. Cards are tagged New and/or Used.
- **Search for this car:** car pages link to a search on AutoTrader (UK) or AutoScout24 (Germany and the Netherlands), new and used, electric only. AutoTrader model names are in `data/autotrader.json`; each was checked by running the search on AutoTrader. Models not in that file link to every electric car of the make. Visitors enter their own postcode on AutoTrader.
- Ranking pages (`/best`) and the homepage radar stay new cars on sale in the UK.

**Ranking** (`rankCars`)
- *Maximum range* (default): highest `Real range km` first. Cars within `RANGE_TIE_KM` (10 km) of each other count as "very close" and are ordered by `Price per km EUR`, lowest first. Each band starts from the highest remaining range, so the order stays stable.
- *Higher efficiency*: lowest `Efficiency Wh/km` first, with ties broken by range.

## Filter and sort (results page)

Below the answer chips, a "Filter and sort" box narrows the cars that match the reader's answers by any field in the data (price, real-world range, one-stop range, efficiency, price per mile, battery, charging speed, seats, make, body, drive, chemistry, heat pump, V2L, model name), and sorts by any of them, low to high or high to low. Fields and their display units are defined once in `lib/fields.ts`; the box is `components/RefinePanel.tsx`. Once anything is set, the page lists every remaining car (10 at a time) instead of the top 5. State is kept in the URL as `f=key:value` (repeatable; numbers as `min~max`), `sort=` and `dir=asc|desc`.

## Typed search (`/api/understand`)

`components/TextSearch.tsx` posts the text to `app/api/understand/route.ts`, which asks Claude (`claude-opus-5-5`, low effort) to map it onto the quiz's filters. The reply is a structured output whose fields are enums of the real option ids, so it can only pick options the quiz already has; the result then goes through the same `/results` page. If Claude can't be used (no API key, network error, refusal), `answersFromText` in `lib/understand.ts` maps the text with keyword and number rules instead. The browser also falls back to those rules if the route can't be reached, e.g. on a static-only host.

The route is public and each Claude call costs a fraction of a penny. Add rate limiting (or a spend limit on the API key) before heavy traffic.

## Pages and design

Every page scrolls normally; there are no scroll-driven effects.

- **Palette:** bright daylight road-sign colours on a plain page: cobalt blue for the header, hero and radar, fresh green for the rankings, a soft sky-blue band, sunny yellow as the accent, and a plain off-white background (no texture or backdrop). Tokens are at the top of `app/globals.css`.
- **Range radar** (`components/RangeRadar.tsx`, geometry in `lib/radar.ts`): every car as a dot, distance = real range, angle = price rank. Shown on the homepage and in the quiz, where cars that no longer match switch off.
- **Homepage budget picker** links to `/quiz?budget=…`; the quiz then starts on question 2 with the budget set.

## Ranking pages (`/best`)

Static pages built at build time by `app/best/[slug]/page.tsx` using `generateStaticParams`. `dynamicParams = false`, so any other slug returns 404. The page definitions are in `lib/rankings.ts`. A page is only generated when at least 5 cars match (`MIN_CARS_PER_PAGE`), and each page lists the top 10 (`CARS_PER_PAGE`).

| URL | Filter | Ranked by |
|---|---|---|
| `/best/real-range-under-{30000,40000,50000,70000}` | UK price ≤ budget | Real range, highest first |
| `/best/most-efficient-{suvs,hatchbacks,saloons,liftbacks,estates}` | Body style | Wh/km, lowest first (ties: range) |
| `/best/best-value-under-{30000,40000,50000,70000}` | UK price ≤ budget | Real range first. Cars within 10 km (`VALUE_TIE_KM`) of each other are ordered by UK £ per km, lowest first |
| `/best/lfp-evs` | LFP battery | Real range |
| `/best/7-seat-evs` | 7 or more seats | Real range |
| `/best` | Index of all pages | |

In range rankings, cars with the same range are ordered by the lower UK £ per km. The edition labels ("2026", "Updated October 2026") are set in `lib/site.ts`. In production, set `NEXT_PUBLIC_SITE_URL` so canonical URLs use your domain.

## Car pages (`/car/[slug]`)


A **Warranty** section (after the used prices) shows the maker's UK car warranty, battery warranty (years, miles, capacity guaranteed) and whether it passes to the next owner, from `data/warranty.json` (`lib/warranty.ts`): 47 makes checked on each maker's official UK website or documents on 18 October 2026, each with its source link. For used cars it estimates the year each warranty likely runs to, counted from the model year and based on today's terms. Makes without an official source say so rather than guess. Compare has car and battery warranty rows (longer wins: years, then miles) and "Car warranty (UK)" / "Battery warranty (UK)" are Filter and sort fields. A **Size** group lists length, width (without and with mirrors), height and wheelbase as "4.64 m (15 ft 2 in)", and the practicality group adds max payload. Length, width, width with mirrors, height and payload are also Filter and sort fields (sizes typed in metres), and Compare has a Size section with no winner (bigger or smaller isn't better) plus payload (higher wins). Under the range bar, a line explains that the figure is a real-world estimate and that makers' advertised (WLTP) ranges are usually 20–30% higher. Renamed cars keep their old links: `redirects()` in `next.config.ts` sends `/car/geely-e5-pro` and the other old Geely slugs to the new pages.
Built at build time by `app/car/[slug]/page.tsx` with `generateStaticParams` (`dynamicParams = false`, so unknown slugs return 404). The slug is the make and model in lower case, for example `bmw-i3-50-xdrive-my27`. Cars on sale in the UK claim their slugs first, so their URLs haven't changed. Other cars whose slug is taken get their years added (`-2019-2022`), or the ID if that's still taken (`lib/cars.ts`).

- **Status and used prices:** each page shows whether the car is on sale new, no longer sold new (with years) or coming soon, its new price, and a "Buying one used" table of estimated prices and range today for each model year, with a "Find one for sale" link. Other versions list their years.

- **Clickable cards:** on the results and ranking pages, the car name inside each card is a link stretched over the whole card, so clicking anywhere on the card opens the car page. The photo-credit links sit above it and stay clickable.
- **Back to results:** clicking a card stores the list it came from (quiz results with their full query, or the ranking) in `sessionStorage` (`components/CarLink.tsx`). The car page then shows "Back to your results" or "Back to the ranking", and the breadcrumb's middle step points there. Without that, for example when arriving from Google, the breadcrumb reads Home / Rankings / car. If storage is blocked, the page still works and shows the plain breadcrumb.
- **Write-up:** EV Database's car pages are spec tables and methodology notes, not reviews, so there was nothing worth summarising there. Instead, `lib/carProfile.ts` writes a short, neutral summary from our own data: what the car is, how its range compares with every EV on sale and with its body style, efficiency against the typical EV, battery and charging, heat pump, V2L and chemistry, and UK price per mile of range against similar cars. It is labelled as written by the site. Car pages don't link to EV Database.
- **Interior photos:** cars with freely licensed interior photos (`interiors` in `cars.json`, served from `data/car-extras.json`, up to 2 per car) have freely licensed interior photos from Wikimedia Commons. Each was checked by eye and is credited in the same way as the exterior photos. Where the photo shows a closely related version (for example a petrol Astra, which shares the Astra Electric's cabin), the page says so under the photos.
- **SEO:** each page has its own title, description and canonical URL, `schema.org/Car` structured data, and an entry in the sitemap.

## Units

The data is stored in km and Wh/km. Everything readers see leads with UK units and gives the metric figure in brackets: `311 mi (500 km)`, `4.1 mi/kWh (151 Wh/km)`, `£172 per mile (£107/km)`. The helpers are in `lib/format.ts`. Rankings sort on the metric values, so the order is the same either way.

## Car photos

Each card shows a photo from **Wikimedia Commons** (`image` and `imageCredit` in `data/cars.json`). Every one of the 1,533 cars has one. Older generations have their own photos (`scripts/more_photos.py`). Where no free photo of the exact car exists, a close stand-in is used and labelled on the photo, e.g. "Photo shows the Bentley Bentayga, not this car." (`imageCredit.note`; 160 cars). The placeholder only appears if an image fails to load.

- **Licensing:** every photo is CC BY, CC BY-SA or CC0. The author and licence are credited on each photo, with links to the file and the licence, which is what these licences require. EV Database's own images are **not** used, because their terms forbid hotlinking or reusing them.
- **Accuracy:** photos are matched by model family and checked by eye. They show the right model but not always the exact trim or year. Families with no correct photo are left blank rather than shown a look-alike.
- **Performance:** `components/CarImage.tsx` reserves a 16:9 frame (no layout shift) and lazy-loads every photo except the number 1 car's. It serves a 500px image (about 60 KB) to phones and a 960px one to larger screens. If an image fails to load, the placeholder appears instead.
- **Hosting:** images load straight from Wikimedia's servers. If traffic grows, consider downloading them and serving them yourself (the licences allow this, provided you keep the credits).
- **Updating:** the scripts in `scripts/` rebuild the photo fields. See `data/README.md`.

## Ads (AdSense later)

`components/AdSlot.tsx` renders a placeholder `<div data-ad-slot="…">` with a reserved height, so ads don't shift the layout when they load. The dashed "Ad placeholder" box only shows with `npm run dev`; in production the slots are empty until you add ad code.

| Slot | Where |
|---|---|
| `results-mid` | Results page, below the number 1 match (before "More good matches") |
| `car-mid` | Car pages, after the summary and "How it compares", before the full specs |
| `car-bottom` | Car pages, before "Similar cars" |
| `cars-list` | All cars list, after the 10th car and then every 20 cars |
| `ranking-top` | Ranking pages, between the intro and the list |
| `ranking-mid` | Ranking pages, between car 5 and car 6 |
| `ranking-bottom` | Ranking pages, between the closing quiz link and "More rankings" |

The AdSense script (publisher `ca-pub-5208891643538099`, `ADSENSE_CLIENT` in `lib/site.ts`) is loaded in the `<head>` of every page by `app/layout.tsx`, and `public/ads.txt` declares the same publisher. To show ads in the slots, put your `<ins className="adsbygoogle">` unit inside `AdSlot`, keyed by `slot` (or turn on Auto ads in AdSense).

## SEO

- `app/sitemap.ts` → `/sitemap.xml`: the homepage, `/quiz`, `/best` and every ranking page.
- `app/robots.ts` → `/robots.txt`: allows everything except `/results`, and points to the sitemap.
- The site URL defaults to `https://plainev.com` in production (set `NEXT_PUBLIC_SITE_URL` to override). The sitemap, robots.txt and canonical links all use it.
- The header links to the quiz and rankings. The footer links to the homepage, the quiz, `/best` and every ranking page.

## Structure

```
app/            layout (nav + footer), homepage (/), quiz (/quiz), results (/results),
                rankings (/best, /best/[slug]), car pages (/car/[slug]), sitemap.ts, robots.ts
components/     Quiz, Results, CarCard, CarImage, CarLink, CarBreadcrumb, QuizCta, AdSlot
scripts/        build.py (spreadsheet → cars.json, cars.min.json, car-extras.json) and the photo lists it uses
lib/            cars.ts (typed data), market.ts (country, new/used, used-price estimates, grouping), carExtras.ts (server-only), quiz.ts (questions + URL state), match.ts (quiz filter/rank),
                rankings.ts (ranking pages), carProfile.ts (car page write-up and comparisons), site.ts (name, edition, site URL), format.ts
data/           cars.json (full), cars.min.json (browser copy), car-extras.json (car pages only) + README
```

## Data

`data/cars.json` holds all 1,533 cars from EV Database (ev-database.org), extracted on 18 October 2026: 687 on sale, 838 no longer sold new, 8 coming soon. Rankings and the homepage use the 485 on sale new with a UK price. See `data/README.md` for details. Range is EV Database's real-world range, **not WLTP**.

To update the data, export a new CSV (or spreadsheet) with the same columns and run `python3 scripts/build.py ev-database-cars.csv data/cars.json`. Columns a newer export adds or renames are handled: weight and boot space come from the "(listing)" columns, and size (length, width, width with mirrors, height, wheelbase) and max payload are read when present. If a car's address changes (EV Database changed its years or name), add a redirect to `RENAMED` in `next.config.ts`. It rewrites all three data files. No code changes are needed.
