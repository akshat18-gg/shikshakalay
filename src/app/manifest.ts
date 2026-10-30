import type { MetadataRoute } from "next";

/** Installable app (Add to Home screen): navy theme, opens like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shikshakalay — practise a lesson",
    short_name: "Shikshakalay",
    description: "Practise a maths lesson with AI children who make real mistakes, then get kind, specific coaching.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b2850",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
