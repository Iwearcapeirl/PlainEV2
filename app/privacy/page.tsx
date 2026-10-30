import type { Metadata } from "next";
import Link from "next/link";
import InfoPage, { InfoSection } from "@/components/InfoPage";
import { CONTACT_EMAIL, OWNER_NAME, POLICIES_UPDATED, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `What ${SITE_NAME} collects (very little), which services handle your data, what stays in your own browser, and your rights.`,
  alternates: { canonical: "/privacy" },
};

const dateLabel = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const CONTENTS = [
  { id: "who", label: "Who we are" },
  { id: "short", label: "The short version" },
  { id: "services", label: "Services that handle your data" },
  { id: "browser", label: "What's saved in your browser" },
  { id: "ads", label: "Adverts and cookies" },
  { id: "basis", label: "Why we're allowed to" },
  { id: "rights", label: "Your rights" },
  { id: "changes", label: "Changes" },
];

export default function PrivacyPage() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <InfoPage title="Privacy policy" path="/privacy" updated={`Last updated ${dateLabel(POLICIES_UPDATED)}`} contents={CONTENTS}>
      <InfoSection id="who" title="Who we are">
        <p>
          {SITE_NAME} (plainev.com) is run by {OWNER_NAME}, who is the data controller for this site. For anything about your data, email {mail}.
        </p>
      </InfoSection>

      <InfoSection id="short" title="The short version">
        <ul>
          <li>There are no accounts or sign-up forms, and we don&rsquo;t ask for your name, email or location.</li>
          <li>Visitor numbers are counted without cookies.</li>
          <li>If you use the describe-it search, what you type is sent to an AI service to work out what you&rsquo;re looking for, and we don&rsquo;t store it.</li>
          <li>Your settings (miles or km, running-cost figures) are saved only in your own browser.</li>
          <li>We don&rsquo;t sell data, and we&rsquo;ll ask before any advertising cookies are used.</li>
        </ul>
      </InfoSection>

      <InfoSection id="services" title="Services that handle your data">
        <p>Like any website, a few services see some technical information (such as your IP address and browser type) to do their job:</p>
        <ul>
          <li>
            <strong>Vercel</strong> hosts the site. Its servers handle every page request, which includes your IP address, and keep short-lived logs for
            security and fixing faults. <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Vercel&rsquo;s privacy policy</a>.
          </li>
          <li>
            <strong>Vercel Web Analytics</strong> counts page views so we know which pages are useful. It doesn&rsquo;t use cookies and doesn&rsquo;t track you
            across days or other websites.
          </li>
          <li>
            <strong>Anthropic</strong> (the company behind Claude): when you describe the car you want in the search box, that text is sent to
            Anthropic&rsquo;s API to turn it into search filters. {SITE_NAME} doesn&rsquo;t save it or link it to you. Anthropic&rsquo;s commercial terms don&rsquo;t
            allow it to train its models on this data. Please don&rsquo;t type personal details into the box.{" "}
            <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer">Anthropic&rsquo;s privacy policy</a>.
          </li>
          <li>
            <strong>Wikimedia Commons</strong> serves the car photos directly, so it receives a request from your browser for each one (we send no
            information about which page you were on).{" "}
            <a href="https://foundation.wikimedia.org/wiki/Policy:Privacy_policy" target="_blank" rel="noopener noreferrer">Wikimedia&rsquo;s privacy policy</a>.
          </li>
        </ul>
        <p>
          Some of these companies are in the US. Where your data leaves the UK, it&rsquo;s protected by the UK–US Data Bridge or other safeguards approved
          under UK law, such as standard contractual clauses.
        </p>
        <p>
          Links to other sites (EV Database, AutoTrader, AutoScout24, makers&rsquo; websites) take you to sites with their own privacy policies. We
          don&rsquo;t send them anything about you.
        </p>
      </InfoSection>

      <InfoSection id="browser" title="What's saved in your browser">
        <p>A few things are saved in your own browser so the site works the way you set it. They never leave your device:</p>
        <ul>
          <li>Whether you prefer miles or kilometres (kept until you clear your browser data).</li>
          <li>Your running-cost figures, if you change them (kept until you clear them or press &ldquo;Back to UK averages&rdquo;).</li>
          <li>The cars you pick to compare, and the list you came from, so &ldquo;Back to…&rdquo; links work (cleared when you close the tab).</li>
        </ul>
        <p>These are needed for features you choose to use, so they don&rsquo;t need consent, but you can clear them at any time in your browser settings.</p>
      </InfoSection>

      <InfoSection id="ads" title="Adverts and cookies">
        <p>
          There are no adverts on the site, and no advertising code or cookies. We may apply to show adverts from Google AdSense in future to cover
          the cost of running the site.
        </p>
        <p>
          If we do, before any adverts appear a consent message will ask whether Google and its partners may use cookies to personalise ads. You can say no and
          still use everything on the site, and change your choice later. Google explains{" "}
          <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
            how it uses information from sites that show its ads
          </a>
          , and you can turn off personalised ads in your{" "}
          <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
            Google ad settings
          </a>
          .
        </p>
      </InfoSection>

      <InfoSection id="basis" title="Why we're allowed to">
        <p>
          Hosting, security logs, cookieless visitor counts and the describe-it search rely on our <strong>legitimate interests</strong> in running a
          working, secure site and understanding which pages help people, with very little data involved. Advertising cookies will rely on your{" "}
          <strong>consent</strong>.
        </p>
      </InfoSection>

      <InfoSection id="rights" title="Your rights">
        <p>
          Under UK data protection law you can ask for a copy of personal data we hold about you, ask us to correct or delete it, object to how we use
          it, or ask us to restrict it. Because the site doesn&rsquo;t collect names or accounts, we usually hold nothing that identifies you, but email{" "}
          {mail} and we&rsquo;ll help, normally within a month.
        </p>
        <p>
          If you&rsquo;re unhappy with how we&rsquo;ve handled your data, you can complain to the Information Commissioner&rsquo;s Office (
          <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener noreferrer">
            ico.org.uk
          </a>
          ), though we&rsquo;d appreciate the chance to put it right first.
        </p>
      </InfoSection>

      <InfoSection id="changes" title="Changes">
        <p>
          If what the site collects changes (for example when adverts start), we&rsquo;ll update this page and the date at the top. See also the{" "}
          <Link href="/terms">terms of use</Link>.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
