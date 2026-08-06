import { ImageResponse } from "next/og";
import { siteName, defaultDescription } from "@/lib/seo";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "black",
          padding: "80px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -160,
            width: 480,
            height: 480,
            borderRadius: 240,
            background: "#6366f1",
            opacity: 0.35,
            filter: "blur(80px)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div style={{ width: 26, height: 20, background: "black", borderRadius: 4 }} />
            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 10,
                height: 10,
                borderRadius: 5,
                background: "#6366f1",
              }}
            />
          </div>
          <div style={{ fontSize: 32, color: "white", fontWeight: 600 }}>{siteName}</div>
        </div>
        <div style={{ display: "flex", fontSize: 56, color: "white", fontWeight: 600, maxWidth: 920, lineHeight: 1.15 }}>
          Build Shopify apps using natural language.
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.65)", maxWidth: 780, marginTop: 24 }}>
          {defaultDescription}
        </div>
      </div>
    ),
    { ...size },
  );
}
