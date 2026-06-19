const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function verifyTurnstile(token, secret, ip) {
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token, remoteip: ip }),
  });
  const data = await res.json();
  return data.success === true;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/notion") {
      if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
      if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

      const payload = await request.json();

      const valid = await verifyTurnstile(
        payload.cf_turnstile_response,
        env.TURNSTILE_SECRET,
        request.headers.get("CF-Connecting-IP"),
      );
      if (!valid) return new Response("Forbidden", { status: 403, headers: CORS });

      const res = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + env.NOTION_TOKEN,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          parent: { database_id: env.NOTION_DB_ID },
          properties: {
            ID:              { title:    [{ text: { content: payload.email } }] },
            Email:           { email:    payload.email },
            "Traveler Type": { select:   { name: payload.traveler_type } },
            Story:           { rich_text:[{ text: { content: payload.timezone_story || "" } }] },
            Interview:       { checkbox: payload.interview === "Yes, contact me for a 15-minute interview" },
            "Submitted At":  { date:     { start: new Date().toISOString() } },
          },
        }),
      });

      return new Response(res.ok ? "ok" : "error", {
        status: res.ok ? 200 : 500,
        headers: CORS,
      });
    }

    return env.ASSETS.fetch(request);
  },
};
