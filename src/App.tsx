import { useEffect, useMemo, useRef, useState } from 'react';
import {
  extras,
  fromDate,
  humanLocal,
  humanUtc,
  isoLocal,
  isoUtc,
  localTzName,
  parseInput,
  relativeFrom,
  rfc2822,
  tzOffsetLabel,
  type Unit,
} from './epoch';

function Row({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="orow">
      <span className="ol">{label}</span>
      <button
        className="ov"
        title="Click to copy"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          } catch {
            /* ignore */
          }
        }}
      >
        <code>{value}</code>
        <span className="cp">{copied ? 'copied' : 'copy'}</span>
      </button>
    </div>
  );
}

function initialInput(): string {
  try {
    const q = new URL(window.location.href).searchParams.get('t');
    if (q) return q;
  } catch {
    /* ignore */
  }
  return '';
}

export default function App() {
  const [input, setInput] = useState(initialInput);
  const [unit, setUnit] = useState<Unit>('s');
  const [autoUnit, setAutoUnit] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const tick = useRef<number | undefined>(undefined);

  useEffect(() => {
    tick.current = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(tick.current);
  }, []);

  const isInt = /^-?\d+$/.test(input.trim());
  const parsed = useMemo(
    () => (input.trim() ? parseInput(input, isInt && !autoUnit ? unit : undefined) : null),
    [input, unit, autoUnit, isInt],
  );

  const target = parsed?.ok ? parsed.date! : null;
  const effectiveUnit: Unit = autoUnit ? (parsed?.detectedUnit ?? unit) : unit;

  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      if (input.trim() && parsed?.ok) u.searchParams.set('t', input.trim());
      else if (!input.trim()) u.searchParams.delete('t');
      window.history.replaceState(null, '', u.toString());
    } catch {
      /* ignore */
    }
  }, [input, parsed?.ok]);

  const tz = localTzName();

  const nowRows: [string, string][] = [
    ['Seconds', String(fromDate(now, 's'))],
    ['Milliseconds', String(fromDate(now, 'ms'))],
    ['ISO 8601 (UTC)', isoUtc(now)],
  ];

  return (
    <div className="app">
      <header>
        <h1>Epoch &amp; Unix Timestamp Converter</h1>
        <p className="tag">
          Convert a Unix timestamp to a human date and back. Seconds, milliseconds, microseconds and
          nanoseconds are detected automatically. Everything runs in your browser.
        </p>
      </header>

      <div className="nowcard">
        <div className="nowmain">
          <span className="nowlabel">Current Unix time</span>
          <span className="nowbig">{fromDate(now, 's')}</span>
        </div>
        <div className="nowrows">
          {nowRows.map(([l, v]) => (
            <Row key={l} label={l} value={v} />
          ))}
        </div>
      </div>

      <label className="inlabel" htmlFor="ts">
        Timestamp or date
      </label>
      <div className={`inputwrap${parsed && !parsed.ok ? ' bad' : ''}`}>
        <input
          id="ts"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. 1757230200 or 2026-09-07 14:30"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
        <button className="nowbtn" onClick={() => setInput(String(fromDate(new Date(), unit)))}>
          Now
        </button>
      </div>

      <div className="units">
        <button
          className={autoUnit ? 'on' : ''}
          onClick={() => setAutoUnit(true)}
          title="Detect the unit from the number of digits"
        >
          auto
        </button>
        {(['s', 'ms', 'us', 'ns'] as Unit[]).map((u) => (
          <button
            key={u}
            className={!autoUnit && unit === u ? 'on' : ''}
            onClick={() => {
              setAutoUnit(false);
              setUnit(u);
            }}
            title={{ s: 'seconds', ms: 'milliseconds', us: 'microseconds', ns: 'nanoseconds' }[u]}
          >
            {u === 'us' ? 'µs' : u}
          </button>
        ))}
        <span className="uhint">
          input unit for a plain number
          {autoUnit && isInt && parsed?.ok
            ? ` — read as ${effectiveUnit === 'us' ? 'µs' : effectiveUnit}`
            : ''}
        </span>
      </div>

      {parsed && !parsed.ok && <p className="error">{parsed.error}</p>}

      {target && (
        <div className="result">
          <div className="rhead">
            <span className="rrel">{relativeFrom(target, now)}</span>
            <span className="rday">{humanLocal(target).split(',')[0]}</span>
          </div>

          <h2>Your time — {tz}</h2>
          <div className="ogroup">
            <Row label="Readable" value={humanLocal(target)} />
            <Row label={`ISO 8601 (${tzOffsetLabel(target)})`} value={isoLocal(target)} />
          </div>

          <h2>UTC</h2>
          <div className="ogroup">
            <Row label="Readable" value={humanUtc(target)} />
            <Row label="ISO 8601" value={isoUtc(target)} />
            <Row label="RFC 2822" value={rfc2822(target)} />
          </div>

          <h2>Timestamp</h2>
          <div className="ogroup">
            <Row label="Seconds" value={String(fromDate(target, 's'))} />
            <Row label="Milliseconds" value={String(fromDate(target, 'ms'))} />
            <Row label="Microseconds" value={String(fromDate(target, 'us'))} />
          </div>

          <h2>Also</h2>
          <div className="ogroup">
            {(() => {
              const x = extras(target);
              return (
                <>
                  <Row label="Day of year" value={String(x.doy)} />
                  <Row label="ISO week" value={String(x.isoWeek)} />
                  <Row label="Leap year" value={x.leap ? 'yes' : 'no'} />
                </>
              );
            })()}
          </div>
        </div>
      )}

      <section className="explainer">
        <h2>What is a Unix timestamp?</h2>
        <p>
          A Unix timestamp (also called epoch time or POSIX time) is the number of seconds that have
          passed since <strong>00:00:00 UTC on 1 January 1970</strong>, not counting leap seconds.
          It is a single number that represents an instant in time, independent of timezone, which
          makes it convenient for storing and comparing times in software.
        </p>
        <h3>Seconds, milliseconds, microseconds, nanoseconds</h3>
        <p>
          Different systems use different resolutions. Unix command-line tools and most databases use
          seconds (10 digits for current dates). JavaScript, Java and many APIs use milliseconds (13
          digits). High-resolution sources use microseconds (16 digits) or nanoseconds (19 digits).
          This converter guesses the unit from how many digits you paste, and you can override it
          with the buttons.
        </p>
        <table>
          <thead>
            <tr>
              <th>Unit</th>
              <th>Digits today</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Seconds</td><td>10</td><td className="mono">1757230200</td></tr>
            <tr><td>Milliseconds</td><td>13</td><td className="mono">1757230200000</td></tr>
            <tr><td>Microseconds</td><td>16</td><td className="mono">1757230200000000</td></tr>
            <tr><td>Nanoseconds</td><td>19</td><td className="mono">1757230200000000000</td></tr>
          </tbody>
        </table>
        <h3>The year 2038 problem</h3>
        <p>
          Systems that store the timestamp in a signed 32-bit integer can only count up to{' '}
          <span className="mono">2147483647</span>, which is 03:14:07 UTC on 19 January 2038. After
          that the value overflows to a negative number. Modern systems use 64-bit integers and are
          not affected.
        </p>
        <h3>Converting in code</h3>
        <ul>
          <li>
            <b>JavaScript:</b> <code>new Date(1757230200 * 1000)</code> ·{' '}
            <code>Math.floor(Date.now() / 1000)</code>
          </li>
          <li>
            <b>Python:</b> <code>datetime.fromtimestamp(1757230200, tz=timezone.utc)</code> ·{' '}
            <code>int(time.time())</code>
          </li>
          <li>
            <b>Unix shell:</b> <code>date -d @1757230200</code> · <code>date +%s</code>
          </li>
          <li>
            <b>SQL:</b> <code>to_timestamp(1757230200)</code> (PostgreSQL) ·{' '}
            <code>FROM_UNIXTIME(1757230200)</code> (MySQL)
          </li>
        </ul>
        <h3>Is my data sent anywhere?</h3>
        <p>
          No. The conversion is done entirely in your browser. The value you enter is only added to
          the page URL so you can share or bookmark a specific instant.
        </p>
        <footer>Epoch &amp; Unix Timestamp Converter · client-side · no sign-up, no tracking</footer>
      </section>
    </div>
  );
}
