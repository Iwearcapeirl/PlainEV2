import Link from "next/link";
import type { ReactNode } from "react";
import JsonLd from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/jsonld";

/**
 * Layout for the text pages (About, Methodology, Privacy, Terms): breadcrumb, heading, optional "updated" line, an
 * optional list of contents, and readable prose. Sections are <InfoSection>s.
 */
export default function InfoPage({
  title,
  path,
  intro,
  updated,
  contents,
  children,
}: {
  title: string;
  path: string;
  intro?: ReactNode;
  /** e.g. "Last updated 28 October 2026" */
  updated?: string;
  contents?: { id: string; label: string }[];
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl">
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: title, path },
        ])}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/" className="hover:text-foreground">Home</Link> <span aria-hidden>/</span> <span className="text-foreground">{title}</span>
      </nav>
      <h1 className="font-wide mt-3 text-3xl font-semibold leading-tight text-balance sm:text-4xl">{title}</h1>
      {updated && <p className="mt-2 text-sm text-muted">{updated}</p>}
      {intro && <div className="mt-4 max-w-[64ch] text-lg leading-relaxed text-pretty">{intro}</div>}
      {contents && contents.length > 0 && (
        <nav aria-label="On this page" className="mt-6 rounded-2xl bg-card p-4 shadow-[0_0_0_1px_var(--line)] sm:p-5">
          <p className="text-sm font-semibold">On this page</p>
          <ul className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
            {contents.map((c) => (
              <li key={c.id}>
                <a href={`#${c.id}`} className="underline decoration-line underline-offset-4 hover:decoration-foreground">
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div className="mt-8 grid gap-10">{children}</div>
    </article>
  );
}

/** A titled section of an info page, with prose styles for its paragraphs, lists, tables and links. */
export function InfoSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} id={id} className="scroll-mt-6">
      <h2 id={`${id}-title`} className="font-wide text-xl font-semibold sm:text-2xl">
        {title}
      </h2>
      <div className="mt-3 grid max-w-[66ch] gap-3 leading-relaxed text-pretty [&_a]:underline [&_a]:decoration-line [&_a]:underline-offset-2 hover:[&_a]:decoration-foreground [&_h3]:mt-2 [&_h3]:font-semibold [&_li]:pl-1 [&_ol]:grid [&_ol]:list-decimal [&_ol]:gap-1.5 [&_ol]:pl-5 [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
