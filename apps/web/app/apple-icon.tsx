import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const size = {
  width: 180,
  height: 180,
};
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
          background: "linear-gradient(135deg, #18181b 0%, #27272a 100%)",
          borderRadius: "36px",
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Clock circle */}
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="white"
            strokeWidth="2"
            fill="none"
          />
          {/* Clock hand pointing to 2 o'clock */}
          <line
            x1="12"
            y1="12"
            x2="16"
            y2="9"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Play/trigger symbol (small triangle) */}
          <path d="M10 8 L10 16 L16 12 Z" fill="#10b981" opacity="0.9" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
