import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/site";

/** Lets phones save the site to the home screen with its own icon and colours. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: "Find the right electric car, new or used, with real-world range.",
    start_url: "/",
    display: "browser",
    background_color: "#f7f9fc",
    theme_color: "#1a56c4",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
