import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 8,
          position: "relative",
        }}
      >
        <div
          style={{
            width: 16,
            height: 12,
            background: "white",
            borderRadius: 2,
            marginTop: 3,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            width: 6,
            height: 6,
            borderRadius: 3,
            background: "#6366f1",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
