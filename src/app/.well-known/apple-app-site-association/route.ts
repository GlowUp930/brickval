import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    applinks: {
      details: [
        {
          appID: "4CQHLZBSU7.com.brickval.app",
          components: [{ "/": "/r/*" }],
        },
      ],
    },
  });
}
