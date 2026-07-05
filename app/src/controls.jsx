// Deliberately "niche software" controls: a custom dropdown that is NOT a native
// <select>, and a stepper input that is NOT a bare <input type=number>. Real
// legacy/vertical software is full of these — they're why plain form-autofill
// tools fail and why the sidecar drives the UI the way a user would.
import React, { useEffect, useRef, useState } from "react";

export function FancySelect({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="fs" data-label={label} ref={ref}>
      <span className="fs-label">{label}</span>
      <button
        type="button"
        className="fs-trigger"
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{value || "Select…"}</span>
        <span className="fs-caret">▾</span>
      </button>
      {open && (
        <div className="fs-menu" role="listbox" aria-label={label + " options"}>
          {options.map((o) => (
            <div
              key={o}
              role="option"
              aria-selected={o === value}
              className={"fs-option" + (o === value ? " is-selected" : "")}
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
            >
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function QtyInput({ value, onChange }) {
  const set = (n) => onChange(Math.max(0, n | 0));
  return (
    <div className="qty">
      <button type="button" className="qty-btn" aria-label="Decrease quantity" onClick={() => set(value - 1)}>
        −
      </button>
      <input
        className="qty-input"
        aria-label="Quantity"
        value={value}
        onChange={(e) => set(parseInt(e.target.value || "0", 10))}
      />
      <button type="button" className="qty-btn" aria-label="Increase quantity" onClick={() => set(value + 1)}>
        +
      </button>
    </div>
  );
}
