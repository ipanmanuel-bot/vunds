import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
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
          background: "linear-gradient(140deg, #0f2a1f 0%, #1e4a37 100%)",
          color: "#f5efe4",
          fontSize: 320,
          fontWeight: 700,
          letterSpacing: -12,
          fontFamily: "sans-serif",
        }}
      >
        V
      </div>
    ),
    size,
  );
}
