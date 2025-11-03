import { useMemo, useState } from "react";

// ---------- normal districution CDF -> N //// utilizing google and stack overflow to help approixmate erf()----------
const erf = (x) => {
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x));
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
};
const normCdf = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
const yearFracACT365 = (start, end) => {
  const ms = end.getTime() - start.getTime();
  return ms / (1000 * 60 * 60 * 24 * 365);
};

// ---------- pricing the option using black scholes ----------
function bsFxOption({ S, K, rd, rf, vol, tau, isCall }) {
  if (tau <= 0 || vol <= 0) return 0;
  const sqrtT = Math.sqrt(tau);
  const d1 = (Math.log(S / K) + (rd - rf + 0.5 * vol * vol) * tau) / (vol * sqrtT);
  const d2 = d1 - vol * sqrtT;
  const disc = Math.exp(-rd * tau);
  // although current sheet only has call option, teh sheet displays option to do put so i searched for put option equation for fx
  if (isCall) {
    return normCdf(d1) * S - normCdf(d2) * K * disc;
  } else {
    return normCdf(-d2) * K * disc - normCdf(-d1) * S;
  }
}
function fxForward({ S0, rd, rf, tau }) {
  return S0 * Math.exp((rd - rf) * tau);
}

// ---------- returning ui ----------
export default function App() {
  //use react hook to monitor the change in the product whihc is changed using radio - defualt option
  const [product, setProduct] = useState("option"); // "option" | "forward"
// utilizing two radio button with flex for both options
  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16, fontFamily: "Inter, system-ui, Arial" }}>
      <h2>FX Pricing Blotter</h2>

      <div style={{ display: "flex", gap: 12, margin: "12px 0" }}>
        <label>
          <input
            type="radio"
            name="prod"
            value="option"
            checked={product === "option"}
            onChange={() => setProduct("option")}
          />{" "}
          FX Vanilla Option
        </label>
        <label>
          <input
            type="radio"
            name="prod"
            value="forward"
            checked={product === "forward"}
            onChange={() => setProduct("forward")}
          />{" "}
          FX Forward
        </label>
      </div>

      {product === "option" ? <OptionBlotter /> : <ForwardBlotter />}
    </div>
  );
}

// formating field to be a two column where title is set and right side will be a frame
function Field({ label, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <div style={{ color: "#333" }}>
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

// -------- FX OPTION BLOTTER --------
function OptionBlotter() {
  const todayISO = new Date().toISOString().slice(0, 10);
  const [side, setSide] = useState("BUY");          // informational
  const [pair, setPair] = useState("EURUSD");       // informational
  const [spot, setSpot] = useState(1.15629);
  const [notional, setNotional] = useState(100000);
  const [strike, setStrike] = useState(1.17);
  const [expiry, setExpiry] = useState(todayISO);   // change to future date
  const [rd, setRd] = useState(0.015);              // domestic (quote ccy)
  const [rf, setRf] = useState(0.01);               // foreign (base ccy)
  const [vol, setVol] = useState(0.12);
  const [cp, setCp] = useState("Call");             // Call/Put

  const tau = useMemo(() => yearFracACT365(new Date(), new Date(expiry)), [expiry]);

  const unitPrice = useMemo(() => {
    return bsFxOption({
      S: spot,
      K: strike,
      rd,
      rf,
      vol,
      tau,
      isCall: cp === "Call",
    });
  }, [spot, strike, rd, rf, vol, tau, cp]);

  const premium = unitPrice * notional; // price in quote ccy for 1x notional
  const mktText = isFinite(unitPrice) ? unitPrice.toFixed(6) : "—";

  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0 }}>FX Vanilla Option</h3>

      <Field label="Buy/Sell">
        <select value={side} onChange={(e) => setSide(e.target.value)}>
          <option>BUY</option>
          <option>SELL</option>
        </select>
      </Field>

      <Field label="CCY Pair"><input value={pair} onChange={(e) => setPair(e.target.value)} /></Field>

      <Field label="Spot">
        <input type="number" step="0.00001" value={spot} onChange={(e) => setSpot(Number(e.target.value))} />
      </Field>

      <Field label="Strike (K)">
        <input type="number" step="0.00001" value={strike} onChange={(e) => setStrike(Number(e.target.value))} />
      </Field>

      <Field label="Notional">
        <input type="number" step="1000" value={notional} onChange={(e) => setNotional(Number(e.target.value))} />
      </Field>

      <Field label="Expiry Date">
        <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
      </Field>

      <Field label="Domestic rate r_d">
        <input type="number" step="0.0001" value={rd} onChange={(e) => setRd(Number(e.target.value))} />
      </Field>

      <Field label="Foreign rate r_f">
        <input type="number" step="0.0001" value={rf} onChange={(e) => setRf(Number(e.target.value))} />
      </Field>

      <Field label="Volatility σ (annual)">
        <input type="number" step="0.0001" value={vol} onChange={(e) => setVol(Number(e.target.value))} />
      </Field>

      <Field label="Call/Put">
        <select value={cp} onChange={(e) => setCp(e.target.value)}>
          <option>Call</option>
          <option>Put</option>
        </select>
      </Field>

      <div style={priceRow}>
        <div>
          <div style={labelSm}>Unit Market Price</div>
          <div style={bigNumber}>{mktText}</div>
        </div>
        <div>
          <div style={labelSm}>Premium (≈ Unit x Notional)</div>
          <div style={bigNumber}>{isFinite(premium) ? premium.toFixed(2) : "-"}</div>
        </div>
      </div>
    </div>
  );
}

// -------- FX FORWARD BLOTTER --------
function ForwardBlotter() {
  const todayISO = new Date().toISOString().slice(0, 10);
  const [side, setSide] = useState("BUY");
  const [pair, setPair] = useState("EURUSD");
  const [spot, setSpot] = useState(1.15629);
  const [notional, setNotional] = useState(100000);
  const [expiry, setExpiry] = useState(todayISO);
  const [rd, setRd] = useState(0.015);
  const [rf, setRf] = useState(0.01);

  const tau = useMemo(() => yearFracACT365(new Date(), new Date(expiry)), [expiry]);
  const fwd = useMemo(() => fxForward({ S0: spot, rd, rf, tau }), [spot, rd, rf, tau]);

  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0 }}>FX Forward</h3>

      <Field label="Buy/Sell">
        <select value={side} onChange={(e) => setSide(e.target.value)}>
          <option>BUY</option>
          <option>SELL</option>
        </select>
      </Field>

      <Field label="CCY Pair"><input value={pair} onChange={(e) => setPair(e.target.value)} /></Field>

      <Field label="Spot">
        <input type="number" step="0.00001" value={spot} onChange={(e) => setSpot(Number(e.target.value))} />
      </Field>

      <Field label="Notional">
        <input type="number" step="1000" value={notional} onChange={(e) => setNotional(Number(e.target.value))} />
      </Field>

      <Field label="Expiry Date">
        <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
      </Field>

      <Field label="Domestic rate r_d">
        <input type="number" step="0.0001" value={rd} onChange={(e) => setRd(Number(e.target.value))} />
      </Field>

      <Field label="Foreign rate r_f">
        <input type="number" step="0.0001" value={rf} onChange={(e) => setRf(Number(e.target.value))} />
      </Field>

      <div style={priceRow}>
        <div>
          <div style={labelSm}>Forward Rate</div>
          <div style={bigNumber}>{isFinite(fwd) ? fwd.toFixed(6) : "—"}</div>
        </div>
      </div>
    </div>
  );
}


const panelStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
  background: "white",
};
const priceRow = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 12,
  alignItems: "center",
};
const bigNumber = { fontSize: 20, fontWeight: 700 };
const labelSm = { fontSize: 12, color: "#666" };
