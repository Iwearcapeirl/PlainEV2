"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { u } from "@/components/UnitText";
import { useUnits } from "@/components/UnitsSwitch";
import {
  assumptionsText,
  formatPencePerMile,
  formatPounds,
  RUNNING_CHECKED,
  RUNNING_DEFAULTS,
  RUNNING_SOURCES,
  runningCost,
  type RunningInputs,
} from "@/lib/running";

// ---------- Your assumptions, remembered across pages ----------

const KEY = "plainev:running";
const EVENT = "plainev:running";
const KM_PER_MILE = 1.609344;

/** Allowed range for each input; anything outside (or not a number) falls back to the default. */
const LIMITS: Record<keyof RunningInputs, [number, number]> = {
  miles: [0, 100_000],
  homeShare: [0, 100],
  homeP: [0, 200],
  rapidP: [0, 300],
  mpg: [1, 200],
  petrolP: [0, 500],
};

let cachedRaw: string | null | undefined;
/** Fallback when storage is blocked, so changes still apply on this page. */
let memory: string | null = null;
let cached: RunningInputs = RUNNING_DEFAULTS;

function parse(raw: string | null): RunningInputs {
  if (!raw) return RUNNING_DEFAULTS;
  try {
    const o = JSON.parse(raw) as Partial<Record<keyof RunningInputs, unknown>>;
    const out = { ...RUNNING_DEFAULTS };
    for (const k of Object.keys(LIMITS) as (keyof RunningInputs)[]) {
      const v = o[k];
      if (typeof v === "number" && Number.isFinite(v) && v >= LIMITS[k][0] && v <= LIMITS[k][1]) out[k] = v;
    }
    return out;
  } catch {
    return RUNNING_DEFAULTS;
  }
}

function read(): RunningInputs {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // Storage blocked: the defaults (or this page's changes, below) are used.
    raw = memory;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

function write(value: RunningInputs | null) {
  const raw = value ? JSON.stringify(value) : null;
  memory = raw;
  try {
    if (raw) localStorage.setItem(KEY, raw);
    else localStorage.removeItem(KEY);
  } catch {
    // Private browsing or blocked storage: kept in memory for this page.
  }
  window.dispatchEvent(new Event(EVENT));
}

const subscribe = (fn: () => void) => {
  const onStorage = (e: StorageEvent) => e.key === KEY && fn();
  window.addEventListener(EVENT, fn);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", onStorage);
  };
};

/** The running-cost assumptions: the visitor's own if they've changed them (on any page), otherwise the defaults. */
export function useRunningInputs(): [RunningInputs, (patch: Partial<RunningInputs> | null) => void] {
  const inputs = useSyncExternalStore(subscribe, read, () => RUNNING_DEFAULTS);
  const set = (patch: Partial<RunningInputs> | null) => write(patch ? { ...read(), ...patch } : null);
  return [inputs, set];
}

const isDefault = (i: RunningInputs) => (Object.keys(RUNNING_DEFAULTS) as (keyof RunningInputs)[]).every((k) => i[k] === RUNNING_DEFAULTS[k]);

// ---------- Car page block ----------

/** Running costs for one car: per month and per mile against a petrol car, with the assumptions open to change. */
export default function RunningCosts({ whPerKm, name, calculatorHref }: { whPerKm: number; name: string; calculatorHref: string }) {
  const [inputs] = useRunningInputs();
  const c = runningCost(whPerKm, inputs);
  const more = c.savingPerYear < 0;

  return (
    <div>
      <dl className="mt-4 grid gap-px overflow-hidden rounded-2xl bg-line shadow-[0_0_0_1px_var(--line)] sm:grid-cols-3">
        <Figure label={`Charging the ${name}`} value={`${formatPounds(c.perMonth)} a month`} sub={`${formatPencePerMile(c.perMile)} · ${formatPounds(c.perYear)} a year`} strong />
        <Figure label={`A ${inputs.mpg} mpg petrol car`} value={`${formatPounds(c.petrolPerYear / 12)} a month`} sub={`${formatPencePerMile(c.petrolPerMile)} · ${formatPounds(c.petrolPerYear)} a year`} />
        <Figure
          label={more ? "Costs more than petrol" : "Saving against petrol"}
          value={`${formatPounds(Math.abs(c.savingPerYear))} a year`}
          sub={`${formatPounds(Math.abs(c.savingPerYear) / 12)} a month${more ? " more" : ""}`}
        />
      </dl>
      <p className="mt-3 max-w-[66ch] text-sm text-pretty">
        Charging only at home: <span className="font-semibold tabular-nums">{u(formatPencePerMile(c.homeOnly))}</span>. Only on public rapid chargers:{" "}
        <span className="font-semibold tabular-nums">{u(formatPencePerMile(c.rapidOnly))}</span>.
      </p>
      <Assumptions className="mt-4" />
      <p className="mt-4 text-sm">
        <a href={calculatorHref} className="font-semibold underline decoration-signal decoration-2 underline-offset-4">
          Compare its running costs with other cars →
        </a>
      </p>
    </div>
  );
}

function Figure({ label, value, sub, strong = false }: { label: string; value: string; sub: string; strong?: boolean }) {
  return (
    <div className={`p-4 sm:p-5 ${strong ? "bg-accent-soft" : "bg-card"}`}>
      <dt className="text-sm text-muted text-pretty">{label}</dt>
      <dd className="font-wide mt-1 text-xl font-semibold tabular-nums">{value}</dd>
      <dd className="mt-0.5 text-xs tabular-nums text-muted">{u(sub)}</dd>
    </div>
  );
}

// ---------- Assumptions: summary line, editor and sources ----------

/** "Based on 8,000 miles a year, 80% charged at home…", a button to change them, and where the prices come from. */
export function Assumptions({ className = "", startOpen = false }: { className?: string; startOpen?: boolean }) {
  const [inputs, set] = useRunningInputs();
  const [open, setOpen] = useState(startOpen);
  const id = useId();
  const custom = !isDefault(inputs);

  return (
    <div className={`rounded-2xl bg-card p-4 shadow-[0_0_0_1px_var(--line)] sm:p-5 ${className}`}>
      <p className="text-sm text-pretty">
        <span className="font-semibold">{custom ? "Your figures: " : "Based on "}</span>
        {u(assumptionsText(inputs))}.
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          className="underline decoration-line underline-offset-4 hover:decoration-foreground"
        >
          {open ? "Hide" : "Change"} these figures
        </button>
        {custom && (
          <button type="button" onClick={() => set(null)} className="text-muted underline decoration-line underline-offset-4 hover:text-foreground">
            Back to UK averages
          </button>
        )}
      </div>

      {open && (
        <div id={`${id}-panel`} className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
          <DistanceField value={inputs.miles} onChange={(miles) => set({ miles })} />
          <ShareField value={inputs.homeShare} onChange={(homeShare) => set({ homeShare })} />
          <NumberField
            label="Home electricity"
            unit="p per kWh"
            step={0.01}
            value={inputs.homeP}
            limits={LIMITS.homeP}
            hint="Check your bill. EV tariffs with a cheap overnight rate can cost much less."
            onChange={(homeP) => set({ homeP })}
          />
          <NumberField label="Public rapid charging" unit="p per kWh" step={1} value={inputs.rapidP} limits={LIMITS.rapidP} onChange={(rapidP) => set({ rapidP })} />
          <NumberField label="Petrol car it replaces" unit="mpg" step={1} value={inputs.mpg} limits={LIMITS.mpg} onChange={(mpg) => set({ mpg })} />
          <NumberField label="Petrol price" unit="p per litre" step={0.1} value={inputs.petrolP} limits={LIMITS.petrolP} onChange={(petrolP) => set({ petrolP })} />
          <p className="text-xs text-muted sm:col-span-2">Your figures are saved in this browser and used on every car page.</p>
        </div>
      )}

      <details className="mt-3 text-xs text-muted">
        <summary className="cursor-pointer font-medium hover:text-foreground">Where the figures come from</summary>
        <ul className="mt-2 grid gap-1.5">
          {Object.values(RUNNING_SOURCES).map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                {s.label}
              </a>
              : {s.note}
            </li>
          ))}
          <li>
            Energy use is each car&rsquo;s real-world efficiency from EV Database, plus about 10% lost when charging at home and 5% on a rapid charger.
            Cold weather and motorway driving use more. Prices checked {checkedLabel}.
          </li>
        </ul>
      </details>
    </div>
  );
}

const checkedLabel = new Date(`${RUNNING_CHECKED}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const inputClass =
  "w-full min-w-0 rounded-lg bg-background px-3 py-2 text-[16px] tabular-nums shadow-[inset_0_0_0_1px_var(--line)] focus:shadow-[inset_0_0_0_2px_var(--ink)] focus:outline-none sm:text-[15px]";

/** A number input that lets you type freely and saves each valid value as you go. */
function NumberField({
  label,
  unit,
  value,
  step,
  limits,
  hint,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  step: number;
  limits: [number, number];
  hint?: string;
  onChange: (n: number) => void;
}) {
  const id = useId();
  const [text, setText] = useState(String(value));
  // Follow changes made elsewhere (reset, another tab), but not while typing a value that rounds to the same number.
  useEffect(() => {
    setText((t) => (Number(t) === value ? t : String(value)));
  }, [value]);
  const n = Number(text);
  const valid = text.trim() !== "" && Number.isFinite(n) && n >= limits[0] && n <= limits[1];

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={limits[0]}
          max={limits[1]}
          step={step}
          value={text}
          aria-invalid={!valid}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => {
            setText(e.target.value);
            const v = Number(e.target.value);
            if (e.target.value.trim() !== "" && Number.isFinite(v) && v >= limits[0] && v <= limits[1]) onChange(v);
          }}
          onBlur={() => !valid && setText(String(value))}
          className={`${inputClass} max-w-[8rem]`}
        />
        <span className="text-sm text-muted">{unit}</span>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted text-pretty">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Distance a year, in miles or km to match the units switch (always saved in miles). */
function DistanceField({ value, onChange }: { value: number; onChange: (miles: number) => void }) {
  const units = useUnits();
  const shown = units === "km" ? Math.round(value * KM_PER_MILE) : value;
  return (
    <NumberField
      key={units}
      label="Distance a year"
      unit={units === "km" ? "km" : "miles"}
      step={500}
      value={shown}
      limits={units === "km" ? [0, Math.round(LIMITS.miles[1] * KM_PER_MILE)] : LIMITS.miles}
      onChange={(n) => onChange(units === "km" ? Math.round(n / KM_PER_MILE) : n)}
    />
  );
}

function ShareField({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        Where you charge
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${value}% at home, ${100 - value}% on rapid chargers`}
        className="mt-2.5 w-full accent-[var(--ink)]"
      />
      <p className="mt-1 flex justify-between text-xs tabular-nums text-muted">
        <span>
          <span className="font-semibold text-foreground">{value}%</span> at home
        </span>
        <span>
          <span className="font-semibold text-foreground">{100 - value}%</span> rapid chargers
        </span>
      </p>
    </div>
  );
}
