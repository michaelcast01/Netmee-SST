import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NETMEE EPP Seguro",
    short_name: "NETMEE EPP",
    description: "Inspecciones y trazabilidad preventiva de elementos de protección personal.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f4f6fa",
    theme_color: "#111a2f",
    lang: "es-CO",
  };
}
