import type { Metadata } from "next";
import Link from "next/link";
import InfoPage, { InfoSection } from "@/components/InfoPage";
import { u } from "@/components/UnitText";
import { allCars, cars } from "@/lib/cars";
import { BATTERY_LOSS_PER_YEAR } from "@/lib/market";
import { rankingPages, SECTIONS } from "@/lib/rankings";
import { assumptionsText, formatPencePerMile, formatPounds, HOME_LOSS, RAPID_LOSS, RUNNING_DEFAULTS, RUNNING_SOURCES, runningCost } from "@/lib/running";
import { CONTACT_EMAIL, SITE_NAME, UPDATED_ISO, UPDATED_LABEL } from "@/lib/site";
import { usedRankingPages } from "@/lib/usedRankings";
import { plainDeep } from "@/lib/units";

export const metadata: Metadata = plainDeep({
  title: "How we work out the figures",
  description:
    `How ${SITE_NAME} works out real-world range, used prices, battery wear, running costs and its rankings, with the sources and assumptions behind each number.`,
  alternates: { canonical: "/methodology" },
});

const CONTENTS = [
  { id: "range", label: "Real-world range and efficiency" },
  { id: "used", label: "Used prices" },
  { id: "battery", label: "Battery wear" },
  { id: "running", label: "Running costs" },
  { id: "rankings", label: "How the rankings are ordered" },
  { id: "other", label: "Warranties, photos and names" },
  { id: "estimates", label: "What “estimate” means here" },
  { id: "updates", label: "Updates and corrections" },
];

const dateLabel = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default function MethodologyPage() {
  const typical = runningCost(170, RUNNING_DEFAULTS);
  // One line per group of rankings: each group's method, without repeats.
  const groups = [
    ...SECTIONS.map((s) => ({ title: s.title, methods: [...new Set(rankingPages.filter((p) => s.kinds.includes(p.kind)).map((p) => p.method))] })),
    { title: "Used EVs", methods: [...new Set(usedRankingPages.map((p) => p.method))] },
  ].filter((g) => g.methods.length);

  return (
    <InfoPage
      title="How we work out the figures"
      path="/methodology"
      intro={
        <p>
          Every number on {SITE_NAME} either comes from EV Database or is worked out from its figures in a fixed, written-down way. This page
          explains each one, so you can judge how far to rely on it.
        </p>
      }
      contents={CONTENTS}
    >
      <InfoSection id="range" title="Real-world range and efficiency">
        <p>
          Range, efficiency, battery size and charging speeds come from{" "}
          <a href="https://ev-database.org/uk/" rel="noopener">
            EV Database
          </a>
          , an independent database of electric cars. We took its figures for all {allCars.length.toLocaleString("en-GB")} cars on{" "}
          {dateLabel(UPDATED_ISO)}, and each car&rsquo;s page links to its entry there.
        </p>
        <p>
          <strong>Real-world range</strong> is EV Database&rsquo;s estimate of how far a car goes on a full charge in everyday driving, across a mix of
          conditions. It isn&rsquo;t the official WLTP figure, which comes from a lab test and is usually 20–30% higher. Expect less than the real-world
          figure on a cold motorway and more in mild weather around town.
        </p>
        <p>
          <strong>Efficiency</strong> is the energy taken from the battery per mile in the same conditions (range × efficiency = the usable battery). It
          doesn&rsquo;t include energy lost while charging, which running costs add on (below).
        </p>
        <p>
          <strong>Rapid charging</strong> is the average power from 10% to 80% on a charger fast enough for the car, not the peak figure makers quote.{" "}
          <strong>One-stop range</strong> is how far the car goes at motorway speed with one 15-minute rapid-charging stop.
        </p>
        <p>
          We don&rsquo;t change these figures. Where EV Database marks a figure as an estimate (usually for cars not yet on sale), the car&rsquo;s
          page says so.
        </p>
      </InfoSection>

      <InfoSection id="used" title="Used prices">
        <p>
          Used prices are a <strong>likely asking-price band</strong> for an average-mileage example of each model year, from a dealer or private
          seller. They&rsquo;re estimates, not valuations.
        </p>
        <ol>
          <li>
            We start from the car&rsquo;s price when new. A curve, fitted in October 2026 to asking prices on AutoTrader for 51 model years of popular
            EVs (from nearly new to nine years old), gives the share of that price a typical example keeps at each age.
          </li>
          <li>
            Dearer cars lose a bigger share. A few makes held their value clearly better or worse than the curve in that check (for example Tesla
            and Kia better, MG worse), and so did a few models such as the Nissan Leaf and Jaguar I-Pace, so they&rsquo;re adjusted.
          </li>
          <li>
            The band is that estimate plus or minus 15%. In the check, nine in ten real median prices fell within 15% of the curve, and the cheaper
            normal listings sat about 15% below the median.
          </li>
          <li>The top of the band never goes above 95% of the price new, so a used car never looks dearer than a new one.</li>
        </ol>
        <p>
          When you set a budget, a car only counts as affordable used if the <strong>top</strong> of its band fits, so a typical example is within
          reach rather than just the cheapest one. Every used price links to live listings for that model and year (AutoTrader in the UK,
          AutoScout24 in Germany and the Netherlands), and we&rsquo;d always check those before you budget: mileage, trim, condition and battery health
          make a big difference. We recheck the curve against real listings about every six months.
        </p>
      </InfoSection>

      <InfoSection id="battery" title="Battery wear">
        <p>
          &ldquo;Range today&rdquo; for a used car assumes the battery loses about {Math.round(BATTERY_LOSS_PER_YEAR * 100)}% of its capacity a year,
          a middle-of-the-road figure. Some batteries lose less, and cars that were often rapid-charged or kept at 100% may lose more. A battery health
          report from the seller or a dealer is the only way to know for a particular car.
        </p>
      </InfoSection>

      <InfoSection id="running" title="Running costs">
        <p>
          Running costs multiply each car&rsquo;s real-world energy use by the price of electricity, adding about {Math.round(HOME_LOSS * 100)}% for energy
          lost charging at home and {Math.round(RAPID_LOSS * 100)}% on a rapid charger. Unless you change them, the figures are UK averages:{" "}
          {u(assumptionsText())}.
        </p>
        <ul>
          {Object.values(RUNNING_SOURCES).map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.label}
              </a>
              : {s.note}
            </li>
          ))}
        </ul>
        <p>
          On those figures, a typical EV costs about {formatPounds(typical.perMonth)} a month to charge ({u(formatPencePerMile(typical.perMile))}) against{" "}
          {formatPounds(typical.petrolPerYear / 12)} for the petrol car. We update the home electricity price each time the Ofgem price cap changes, every
          three months. You can put in your own mileage and tariff on any car page or in the <Link href="/running-costs">running costs calculator</Link>.
        </p>
      </InfoSection>

      <InfoSection id="rankings" title="How the rankings are ordered">
        <p>
          Rankings use only the figures above: nobody pays to be included or placed. New-car rankings cover the {cars.length} cars on sale new in the UK
          with a UK price. Each ranking page repeats its own method under the heading.
        </p>
        {groups.map((g) => (
          <div key={g.title}>
            <h3>{g.title}</h3>
            {g.methods.map((m) => (
              <p key={m} className="mt-1">
                {u(m)}
              </p>
            ))}
          </div>
        ))}
      </InfoSection>

      <InfoSection id="other" title="Warranties, photos and names">
        <p>
          <strong>Warranties</strong> are each maker&rsquo;s current UK terms, checked on its official UK website or warranty documents (the source is
          linked on each car page). For used cars we estimate what&rsquo;s likely left from the model year, assuming today&rsquo;s terms applied.
        </p>
        <p>
          <strong>Photos</strong> come from Wikimedia Commons under free licences and are matched by model, not exact trim or year. Where a photo shows a
          different version (for example the saloon when the car is an estate), a note on the photo says so.
        </p>
        <p>
          <strong>Names and body styles</strong> follow EV Database, except where a car is sold under a different name in the UK (the Geely EX5, for
          example) or is clearly a different body style from the one listed. No figures are changed.
        </p>
      </InfoSection>

      <InfoSection id="estimates" title="What “estimate” means here">
        <p>
          Real-world range is EV Database&rsquo;s estimate; used prices, battery wear and running costs are ours. They&rsquo;re good for comparing cars and
          narrowing down a shortlist. Before you buy, check the price, the car&rsquo;s history and its battery health with the seller.
        </p>
      </InfoSection>

      <InfoSection id="updates" title="Updates and corrections">
        <p>
          The car data was last updated in {UPDATED_LABEL}, and we refresh it from EV Database every few months. If something looks wrong, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we&rsquo;ll check it.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
