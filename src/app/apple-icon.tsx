import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "black",
          borderRadius: 40,
          position: "relative",
        }}
      >
        <div
          style={{
            width: 90,
            height: 68,
            background: "white",
            borderRadius: 12,
            marginTop: 16,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 22,
            right: 22,
            width: 32,
            height: 32,
            borderRadius: 16,
            background: "#6366f1",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
