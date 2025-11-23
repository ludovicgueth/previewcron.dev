import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff",
          backgroundImage:
            "radial-gradient(circle at 25px 25px, lightgray 2%, transparent 0%), radial-gradient(circle at 75px 75px, lightgray 2%, transparent 0%)",
          backgroundSize: "100px 100px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "white",
            padding: "60px 80px",
            borderRadius: "24px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "30px",
            }}
          >
            <svg
              width="80"
              height="80"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="24" height="24" rx="4" fill="#18181b" />
              <path
                d="M8 12L11 15L16 9"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="#18181b"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              background: "linear-gradient(to bottom right, #000000, #3f3f46)",
              backgroundClip: "text",
              color: "transparent",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            Preview Cron
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#52525b",
              textAlign: "center",
              maxWidth: "800px",
              lineHeight: 1.4,
            }}
          >
            Test Vercel Cron Jobs on Preview & Local
          </div>
          <div
            style={{
              display: "flex",
              gap: "20px",
              marginTop: "40px",
              fontSize: "24px",
              color: "#71717a",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              ✓ Preview Deployments
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                paddingLeft: "20px",
                borderLeft: "2px solid #e4e4e7",
              }}
            >
              ✓ Local Testing
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
