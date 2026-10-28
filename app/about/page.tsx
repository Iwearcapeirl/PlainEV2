import type { Metadata } from "next";
import Link from "next/link";
import InfoPage, { InfoSection } from "@/components/InfoPage";
import { allCars, cars } from "@/lib/cars";
import { models } from "@/lib/models";
import { rankingPages } from "@/lib/rankings";
import { CONTACT_EMAIL, OWNER_NAME, SITE_NAME, UPDATED_LABEL } from "@/lib/site";
import { usedRankingPages } from "@/lib/usedRankings";

export const metadata: Metadata = {
  title: `About ${SITE_NAME}`,
  description: `${SITE_NAME} ranks every electric car sold in the UK by the range you can expect on the road, not the lab figure. Who runs it, where the data comes from, and how to get in touch.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const firstYear = Math.min(...allCars.map((c) => c.yearFrom));
  return (
    <InfoPage
      title={`About ${SITE_NAME}`}
      path="/about"
      intro={
        <p>
          {SITE_NAME} helps you choose an electric car using the range you can expect on the road, not the official lab figure. It covers every
          EV sold in the UK since {firstYear}, new and used, in plain English.
        </p>
      }
    >
      <InfoSection id="why" title="Why real-world range">
        <p>
          Every new car&rsquo;s advertised range comes from the WLTP lab test. Most drivers get noticeably less, especially on motorways and in
          winter, and the gap differs from car to car. So two cars with the same advertised range can be quite different to live with.
        </p>
        <p>
          {SITE_NAME} uses an independent real-world estimate for every car instead, and ranks, compares and prices everything on that basis.{" "}
          <Link href="/methodology">How we work out the figures</Link> explains each number on the site.
        </p>
      </InfoSection>

      <InfoSection id="what" title="What you can do here">
        <ul>
          <li>
            <Link prefetch={false} href="/quiz">Find your match</Link>: describe what you need in your own words, or answer a few questions.
          </li>
          <li>
            <Link prefetch={false} href="/cars">All cars</Link>: all {allCars.length.toLocaleString("en-GB")} electric cars, with filters for budget, range, towing,
            boot space, charging and more. {cars.length} are on sale new in the UK today.
          </li>
          <li>
            <Link href="/best">Rankings</Link>: {rankingPages.length + usedRankingPages.length} lists, from the best value under £30,000 to the best used EVs
            and the cheapest to run.
          </li>
          <li>
            <Link href="/models">Models A–Z</Link>: {models.length} model pages with every version side by side.
          </li>
          <li>
            <Link prefetch={false} href="/compare">Compare</Link> up to three cars, and work out <Link prefetch={false} href="/running-costs">running costs</Link> against petrol.
          </li>
        </ul>
      </InfoSection>

      <InfoSection id="independent" title="Independent">
        <p>
          {SITE_NAME} isn&rsquo;t owned by a car maker, dealer or leasing company, and nobody pays to be ranked: every ranking comes only from the
          figures, and each page says how it&rsquo;s ordered. To cover running costs the site may show adverts, which are always kept separate from the
          rankings and recommendations.
        </p>
      </InfoSection>

      <InfoSection id="data" title="Where the data comes from">
        <p>
          Car specifications, real-world range and efficiency come from{" "}
          <a href="https://ev-database.org/uk/" rel="noopener">
            EV Database
          </a>
          , last updated {UPDATED_LABEL}. Each car&rsquo;s page links to its entry there. Used prices, running costs and the written summaries are{" "}
          {SITE_NAME}&rsquo;s own, worked out from those figures as the <Link href="/methodology">methodology</Link> describes.
        </p>
        <p>Car photos come from Wikimedia Commons contributors under free licences, and each one is credited where it appears.</p>
      </InfoSection>

      <InfoSection id="contact" title="Who runs it, and how to get in touch">
        <p>
          {SITE_NAME} is run by {OWNER_NAME}. If you spot a mistake, a missing car or a photo of the wrong model, or have a question about your
          data, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Corrections are very welcome.
        </p>
        <p>
          See also the <Link href="/privacy">privacy policy</Link> and <Link href="/terms">terms of use</Link>.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
