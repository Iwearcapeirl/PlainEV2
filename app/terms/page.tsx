import type { Metadata } from "next";
import Link from "next/link";
import InfoPage, { InfoSection } from "@/components/InfoPage";
import { CONTACT_EMAIL, OWNER_NAME, POLICIES_UPDATED, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description: `The terms for using ${SITE_NAME}: the figures are for information, how the data and photos are licensed, and who to contact.`,
  alternates: { canonical: "/terms" },
};

const dateLabel = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default function TermsPage() {
  return (
    <InfoPage
      title="Terms of use"
      path="/terms"
      updated={`Last updated ${dateLabel(POLICIES_UPDATED)}`}
      intro={
        <p>
          {SITE_NAME} (plainev.com) is run by {OWNER_NAME}. By using the site you agree to these terms. They&rsquo;re short, and mostly say: the figures
          are a guide, so check before you buy.
        </p>
      }
    >
      <InfoSection id="information" title="Information, not advice">
        <p>
          Everything on {SITE_NAME} is general information to help you compare cars. It isn&rsquo;t financial, legal or professional advice, and it
          isn&rsquo;t a recommendation to buy a particular car.
        </p>
        <p>
          Real-world range, used prices, battery wear and running costs are estimates (the <Link href="/methodology">methodology</Link> explains
          each one). Prices, specifications and warranties change, and a particular car may differ from the typical figures. Before you buy, check the
          price, specification, history, battery health and warranty with the seller or dealer.
        </p>
      </InfoSection>

      <InfoSection id="accuracy" title="Accuracy">
        <p>
          We work hard to keep the figures accurate and up to date, but we can&rsquo;t promise that every figure is correct or complete at all times. If you
          spot a mistake, please tell us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </InfoSection>

      <InfoSection id="liability" title="Our responsibility to you">
        <p>
          We aren&rsquo;t responsible for losses that come from relying on the information on this site, such as paying more for a car than expected,
          except where the law doesn&rsquo;t allow us to exclude that responsibility. Nothing in these terms limits liability for death or personal
          injury caused by negligence, for fraud, or for anything else that can&rsquo;t be limited under English law.
        </p>
      </InfoSection>

      <InfoSection id="credits" title="Data, photos and content">
        <ul>
          <li>
            Car data comes from{" "}
            <a href="https://ev-database.org/uk/" rel="noopener">
              EV Database
            </a>
            , credited on every car page.
          </li>
          <li>
            Car photos come from Wikimedia Commons contributors under the free licences shown with each photo (CC BY, CC BY-SA or public domain). You
            can reuse them under those licences, crediting the photographer as shown.
          </li>
          <li>
            The site&rsquo;s own text, rankings, estimates and design are &copy; {OWNER_NAME}. You&rsquo;re welcome to quote and link to them with credit to{" "}
            {SITE_NAME}, but please don&rsquo;t copy the site or its data in bulk.
          </li>
        </ul>
      </InfoSection>

      <InfoSection id="links" title="Other websites">
        <p>
          We link to other sites, such as EV Database, AutoTrader and makers&rsquo; websites, for more detail and live listings. We don&rsquo;t control them and
          aren&rsquo;t responsible for their content, prices or the cars sold through them.
        </p>
      </InfoSection>

      <InfoSection id="law" title="Changes and law">
        <p>
          We may update these terms; the date at the top shows the latest version. These terms are governed by the law of England and Wales, and if
          you live elsewhere in the UK you can also bring a claim in your local courts. How we handle data is in the{" "}
          <Link href="/privacy">privacy policy</Link>.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
