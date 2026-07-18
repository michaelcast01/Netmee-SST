export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      data: {
        service: "netmee-epp-seguro",
        status: "ok",
        version: process.env.npm_package_version ?? "0.1.0",
        timestamp: new Date().toISOString(),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
