"use client";

import { useEffect, useRef, useState } from "react";
import { loadCertificate, saveCertificate } from "./certStore";
import { CERT_FONTS } from "./fonts";

// canvas can't read CSS vars, so resolve next/font's generated family names
function resolveFont(value: string) {
  const root = getComputedStyle(document.documentElement);
  return value.replace(/var\((--[\w-]+)\)/g, (_, v) => root.getPropertyValue(v));
}

const label = "font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [name, setName] = useState("");
  const [pos, setPos] = useState({ x: 0.5, y: 0.475 }); // visual centre of the name, as fraction of image size
  const [fontSize, setFontSize] = useState(4.5); // % of image width
  const [font, setFont] = useState(CERT_FONTS[0].value);
  const [bold, setBold] = useState(true);
  const [color, setColor] = useState("#1c1a17");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    let cancelled = false;
    const css = `${bold ? "bold " : ""}${(fontSize / 100) * img.naturalWidth}px ${resolveFont(font)}`;
    document.fonts.load(css, name || "A").finally(() => {
      if (cancelled) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      ctx.font = css;
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      // centre on the actual glyphs so the same position works for every font
      const m = ctx.measureText(name);
      const dy = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
      ctx.fillText(name, pos.x * canvas.width, pos.y * canvas.height + dy);
    });
    return () => {
      cancelled = true;
    };
  }, [img, name, pos, fontSize, font, bold, color]);

  useEffect(() => {
    // restore the certificate from the previous visit; storage may be unavailable (private mode), so ignore failures
    loadCertificate()
      .then((file) => file && loadFile(file, false))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadFile(file?: File, persist = true) {
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setError("Please use a PNG or JPG image.");
      return;
    }
    setError("");
    const image = new Image();
    image.onload = () => {
      if (img) URL.revokeObjectURL(img.src);
      setImg(image);
      setFileName(file.name);
      if (persist) saveCertificate(file).catch(() => setError("Couldn't save the certificate for next time."));
    };
    image.src = URL.createObjectURL(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    loadFile(e.dataTransfer.files[0]);
  }

  function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
  }

  async function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { jsPDF } = await import("jspdf");
    const { width: w, height: h } = canvas;
    const pdf = new jsPDF({ orientation: w > h ? "landscape" : "portrait", unit: "px", format: [w, h] });
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, w, h);
    pdf.save(`${name.trim() || "certificate"}.pdf`);
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl flex-1 gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[320px_1fr] lg:py-12">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          loadFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <aside className="rise flex flex-col gap-7 lg:sticky lg:top-12 lg:self-start">
        <header>
          <p className={label}>No. 01 — Certificates</p>
          <h1 className="mt-2 font-display text-4xl leading-[1.05] font-medium tracking-tight">
            Put a name <em className="text-accent">on it.</em>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Drop in a blank certificate, type a name, click to place it, and download a print-ready PDF.
          </p>
        </header>

        <hr className="border-rule" />

        <label className="flex flex-col gap-2">
          <span className={label}>Recipient name</span>
          <input
            className="border-b-2 border-rule bg-transparent pb-1.5 font-display text-2xl outline-none transition-colors placeholder:text-rule focus:border-accent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
          />
        </label>

        <div className="grid grid-cols-[1fr_auto] gap-4">
          <label className="flex flex-col gap-2">
            <span className={label}>Typeface</span>
            <select
              className="rounded-md border border-rule bg-paper px-2.5 py-2 text-sm outline-none focus:border-accent"
              value={font}
              onChange={(e) => setFont(e.target.value)}
            >
              {CERT_FONTS.map((f) => (
                <option key={f.label} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className={label}>Ink</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-[38px] w-14 cursor-pointer rounded-md border border-rule bg-paper p-1"
            />
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className={`${label} flex justify-between`}>
            Size <span>{fontSize.toFixed(1)}%</span>
          </span>
          <input
            type="range"
            min={1}
            max={15}
            step={0.5}
            value={fontSize}
            onChange={(e) => setFontSize(+e.target.value)}
            className="accent-accent"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          {(["x", "y"] as const).map((axis) => (
            <label key={axis} className="flex flex-col gap-2">
              <span className={`${label} flex justify-between`}>
                {axis === "x" ? "Horizontal" : "Vertical"} <span>{(pos[axis] * 100).toFixed(1)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.0025}
                value={pos[axis]}
                onChange={(e) => setPos({ ...pos, [axis]: +e.target.value })}
                className="accent-accent"
              />
            </label>
          ))}
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input type="checkbox" checked={bold} onChange={(e) => setBold(e.target.checked)} className="accent-accent" />
          Bold
        </label>

        <button
          onClick={download}
          disabled={!img || !name.trim()}
          className="group flex items-center justify-between rounded-md bg-foreground px-5 py-3.5 text-background transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-foreground"
        >
          <span className="font-medium">Download PDF</span>
          <span className="font-mono text-sm transition-transform group-enabled:group-hover:translate-y-0.5">↓</span>
        </button>
        {img && !name.trim() && <p className="-mt-4 text-xs text-ink-soft">Enter a name to enable download.</p>}
      </aside>

      <section
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={onDrop}
        className="rise relative flex min-h-[60vh] flex-col [animation-delay:120ms]"
      >
        {img ? (
          <>
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className={`${label} truncate`}>
                {fileName} · {img.naturalWidth}×{img.naturalHeight} · click to place name
              </p>
              <button
                onClick={() => inputRef.current?.click()}
                className="shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-accent underline-offset-4 hover:underline"
              >
                Replace
              </button>
            </div>
            <div className="rounded-sm bg-paper p-3 shadow-[0_1px_0_var(--rule),0_24px_48px_-24px_rgb(0_0_0/0.35)] sm:p-5">
              <canvas ref={canvasRef} onClick={onCanvasClick} className="block h-auto w-full cursor-crosshair" />
            </div>
          </>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="group flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-rule bg-paper/60 p-10 text-center transition-colors hover:border-accent"
          >
            <span className="grid size-16 place-items-center rounded-full border border-rule font-display text-3xl text-ink-soft transition group-hover:-translate-y-1 group-hover:border-accent group-hover:text-accent">
              ↑
            </span>
            <span className="font-display text-2xl">Drop your certificate here</span>
            <span className="text-sm text-ink-soft">
              or <span className="text-accent underline underline-offset-4">browse files</span> · PNG or JPG
            </span>
          </button>
        )}

        {error && <p className="mt-3 text-sm text-accent">{error}</p>}

        {dragging && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-lg border-2 border-dashed border-accent bg-background/85 backdrop-blur-sm">
            <span className="font-display text-3xl text-accent">Release to upload</span>
          </div>
        )}
      </section>
    </main>
  );
}
