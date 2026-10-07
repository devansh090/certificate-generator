"use client";

import { useEffect, useRef, useState } from "react";
import { loadCertificate, saveCertificate } from "./certStore";
import { CERT_FONTS } from "./fonts";

// canvas can't read CSS vars, so resolve next/font's generated family names
function resolveFont(value: string) {
  const root = getComputedStyle(document.documentElement);
  return value.replace(/var\((--[\w-]+)\)/g, (_, v) => root.getPropertyValue(v));
}

// wrap explicit lines (\n) to maxWidth on word boundaries
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  return text.split("\n").flatMap((para) => {
    const lines: string[] = [];
    let line = "";
    for (const word of para.split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > maxWidth) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    return [...lines, line];
  });
}

const label = "font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft";

type Field = {
  label: string;
  text: string;
  x: number; // visual centre of the text block, as fraction of image size
  y: number;
  width: number; // wrap width, fraction of image width
  size: number; // % of image width
  font: string;
  bold: boolean;
  italic: boolean;
  color: string;
  erase?: { x: number; y: number; w: number; h: number }; // template area painted white first, to hide a baked-in original
};

const fontOf = (label: string) => CERT_FONTS.find((f) => f.label === label)!.value;

const DEFAULT_FIELDS: Field[] = [
  { label: "Name", text: "", x: 0.5, y: 0.475, width: 0.8, size: 4.5, font: CERT_FONTS[0].value, bold: true, italic: false, color: "#1c1a17" },
  {
    label: "Description",
    text: "who attended our 10-week AI Engineering Program covering AI terminology, Retrieval Augmented Generation, Agentic Systems, Evals, and built a Capstone Project.",
    x: 0.5,
    y: 0.565,
    width: 0.62,
    size: 1.6,
    font: fontOf("Roboto"),
    bold: false,
    italic: false,
    color: "#000000",
  },
  {
    label: "Tagline",
    text: "Your attention is precious. Thank you for sharing it with us.",
    x: 0.5,
    y: 0.6393,
    width: 0.8,
    size: 1.36,
    font: fontOf("Montserrat"),
    bold: true,
    italic: true,
    color: "#000000",
    // ponytail: hardcoded to the AIEngg template's baked-in tagline (x 578–1420, y 891–917 of 2000×1414)
    erase: { x: 0.28, y: 0.622, w: 0.44, h: 0.036 },
  },
];

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [active, setActive] = useState(0);
  const field = fields[active];
  const name = fields[0].text;
  const setField = (patch: Partial<Field>) => setFields((fs) => fs.map((f, i) => (i === active ? { ...f, ...patch } : f)));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    let cancelled = false;
    const W = img.naturalWidth;
    const fontCss = (f: Field) => `${f.italic ? "italic " : ""}${f.bold ? "bold " : ""}${(f.size / 100) * W}px ${resolveFont(f.font)}`;
    Promise.allSettled(fields.map((f) => document.fonts.load(fontCss(f), f.text || "A"))).then(() => {
      if (cancelled) return;
      canvas.width = W;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      ctx.fillStyle = "#fff";
      for (const { erase: e } of fields) if (e) ctx.fillRect(e.x * W, e.y * canvas.height, e.w * W, e.h * canvas.height);
      ctx.textAlign = "center";
      for (const f of fields) {
        ctx.font = fontCss(f);
        ctx.fillStyle = f.color;
        const lines = wrap(ctx, f.text, f.width * W);
        const lh = (f.size / 100) * W * 1.4;
        const top = f.y * canvas.height - ((lines.length - 1) * lh) / 2;
        lines.forEach((line, i) => {
          // centre on the actual glyphs so the same position works for every font
          const m = ctx.measureText(line || "A");
          const dy = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
          ctx.fillText(line, f.x * W, top + i * lh + dy);
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [img, fields]);

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
    setField({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
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
            onFocus={() => setActive(0)}
            onChange={(e) => setFields((fs) => fs.map((f, i) => (i === 0 ? { ...f, text: e.target.value } : f)))}
            placeholder="Jane Doe"
          />
        </label>

        {fields.slice(1).map((f, j) => {
          const idx = j + 1;
          return (
            <label key={f.label} className="flex flex-col gap-2">
              <span className={label}>{f.label}</span>
              <textarea
                rows={f.label === "Description" ? 4 : 2}
                className="resize-y rounded-md border border-rule bg-paper px-2.5 py-2 text-sm leading-relaxed outline-none focus:border-accent"
                value={f.text}
                onFocus={() => setActive(idx)}
                onChange={(e) => setFields((fs) => fs.map((x, i) => (i === idx ? { ...x, text: e.target.value } : x)))}
              />
            </label>
          );
        })}

        <hr className="border-rule" />

        <div className="flex flex-col gap-2">
          <span className={label}>Styling</span>
          <div className="grid grid-cols-3 rounded-md border border-rule p-0.5 text-sm">
            {fields.map((f, i) => (
              <button
                key={f.label}
                onClick={() => setActive(i)}
                className={`rounded px-3 py-1.5 transition-colors ${i === active ? "bg-foreground text-background" : "hover:text-accent"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-4">
          <label className="flex flex-col gap-2">
            <span className={label}>Typeface</span>
            <select
              className="rounded-md border border-rule bg-paper px-2.5 py-2 text-sm outline-none focus:border-accent"
              value={field.font}
              onChange={(e) => setField({ font: e.target.value })}
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
              value={field.color}
              onChange={(e) => setField({ color: e.target.value })}
              className="h-[38px] w-14 cursor-pointer rounded-md border border-rule bg-paper p-1"
            />
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className={`${label} flex justify-between`}>
            Size <span>{field.size.toFixed(1)}%</span>
          </span>
          <input
            type="range"
            min={0.5}
            max={15}
            step={0.1}
            value={field.size}
            onChange={(e) => setField({ size: +e.target.value })}
            className="accent-accent"
          />
        </label>

        <div className="grid grid-cols-3 gap-4">
          {(
            [
              ["x", "X"],
              ["y", "Y"],
              ["width", "Wrap"],
            ] as const
          ).map(([key, text]) => (
            <label key={key} className="flex flex-col gap-2">
              <span className={`${label} flex justify-between`}>
                {text} <span>{(field[key] * 100).toFixed(0)}%</span>
              </span>
              <input
                type="range"
                min={key === "width" ? 0.1 : 0}
                max={1}
                step={0.0025}
                value={field[key]}
                onChange={(e) => setField({ [key]: +e.target.value })}
                className="accent-accent"
              />
            </label>
          ))}
        </div>

        <div className="flex gap-6">
          {(["bold", "italic"] as const).map((key) => (
            <label key={key} className="flex cursor-pointer items-center gap-2.5 text-sm capitalize">
              <input
                type="checkbox"
                checked={field[key]}
                onChange={(e) => setField({ [key]: e.target.checked })}
                className="accent-accent"
              />
              {key}
            </label>
          ))}
        </div>

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
                {fileName} · {img.naturalWidth}×{img.naturalHeight} · click to place {field.label.toLowerCase()}
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
