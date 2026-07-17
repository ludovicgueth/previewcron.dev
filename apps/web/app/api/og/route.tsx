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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImJnIiB4MT0iMCIgeTE9IjAiIHgyPSI1MTIiIHkyPSI1MTIiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjMjcyNzJhIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMTMxMzE1Ii8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIHJ4PSIxMTIiIGZpbGw9InVybCgjYmcpIi8+CjxyZWN0IHg9IjYiIHk9IjYiIHdpZHRoPSI1MDAiIGhlaWdodD0iNTAwIiByeD0iMTA2IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS1vcGFjaXR5PSIwLjA3IiBzdHJva2Utd2lkdGg9IjIiLz4KCjxjaXJjbGUgY3g9IjI1NiIgY3k9IjI1NiIgcj0iMTUwIiBmaWxsPSJub25lIiBzdHJva2U9IiNmYWZhZmEiIHN0cm9rZS13aWR0aD0iMjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8cGF0aCBkPSJNIDIyMCAxNzggTCAyMjAgMzM0IEwgMzQ2IDI1NiBaIiBmaWxsPSIjZmFmYWZhIiBzdHJva2U9IiNmYWZhZmEiIHN0cm9rZS13aWR0aD0iMjAiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4="
              width={96}
              height={96}
              alt=""
            />
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
              Preview Deployments
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
              Local Testing
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
