import {
  Cinzel,
  Dancing_Script,
  Fraunces,
  Great_Vibes,
  Inconsolata,
  Lora,
  Montserrat,
  Playfair_Display,
  Poppins,
  Roboto,
} from "next/font/google";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "700"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], style: ["normal", "italic"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"] });
const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"] });
const greatVibes = Great_Vibes({ variable: "--font-great-vibes", subsets: ["latin"], weight: "400" });
const dancing = Dancing_Script({ variable: "--font-dancing", subsets: ["latin"] });
const roboto = Roboto({ variable: "--font-roboto", subsets: ["latin"] });
const inconsolata = Inconsolata({ variable: "--font-inconsolata", subsets: ["latin"] });

export const fontVariables = [fraunces, poppins, montserrat, playfair, lora, cinzel, greatVibes, dancing, inconsolata, roboto]
  .map((f) => f.variable)
  .join(" ");

// Fonts offered for the name. Webfonts are referenced by CSS var and resolved at draw time.
export const CERT_FONTS = [
  { label: "Playfair Display", value: "var(--font-playfair), serif" },
  { label: "Poppins", value: "var(--font-poppins), sans-serif" },
  { label: "Roboto", value: "var(--font-roboto), sans-serif" },
  { label: "Montserrat", value: "var(--font-montserrat), sans-serif" },
  { label: "Fraunces", value: "var(--font-fraunces), serif" },
  { label: "Lora", value: "var(--font-lora), serif" },
  { label: "Cinzel", value: "var(--font-cinzel), serif" },
  { label: "Great Vibes (script)", value: "var(--font-great-vibes), cursive" },
  { label: "Dancing Script", value: "var(--font-dancing), cursive" },
  // Consolas is a Windows system font; Inconsolata is the look-alike fallback elsewhere
  { label: "Consolas", value: "Consolas, var(--font-inconsolata), monospace" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
];
