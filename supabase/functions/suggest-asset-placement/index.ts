// Suggests ISA-95 UNS placement, IEC 81346 RDS aspects and an AAS idShort
// for a new asset. The client re-validates everything with the shared
// validators (hierarchyUtils / validation) before showing it as compliant.
import { createClient } from "npm:@supabase/supabase-js@2";
import { generateResponse, GatewayError } from "npm:@lovable.dev/ai-gateway";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["parentNodeId", "functionCode", "productCode", "idShort", "rationale"],
  properties: {
    parentNodeId: { type: "string", description: "id of the chosen Line or Cell node from the candidate list" },
    functionCode: { type: "string", description: "IEC 81346 function aspect WITHOUT '=' prefix, uppercase A-Z0-9, levels separated by '.', e.g. M1" },
    productCode: { type: "string", description: "IEC 81346 product aspect WITHOUT '-' prefix, uppercase A-Z0-9 with IEC 81346-2 letter class, e.g. MA1" },
    idShort: { type: "string", description: "AAS idShort: ^[a-zA-Z][a-zA-Z0-9_]+$, max 128, no hyphens" },
    rationale: { type: "string" },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData } = await sb.auth.getUser();
  if (!userData?.user) return json({ error: "Not signed in" }, 401);

  const { name, description, candidates } = await req.json().catch(() => ({}));
  if (typeof name !== "string" || !name.trim() || name.length > 200 || !Array.isArray(candidates) || candidates.length === 0) {
    return json({ error: "Name and at least one Line/Cell node are required." }, 400);
  }
  const desc = typeof description === "string" ? description.slice(0, 2000) : "";
  const list = candidates.slice(0, 200).map((c: Record<string, unknown>) =>
    `- id=${c.id} level=${c.level} path=${c.path} rds_location=${c.rdsLocation ?? ""}`).join("\n");

  try {
    const res = await generateResponse({
      model: "openai/gpt-6-astra",
      reasoning: { effort: "low" },
      instructions:
        "You are an industrial automation engineer. Place a new asset in an ISA-95 UNS hierarchy " +
        "(Enterprise>Site>Area>Line>Cell; assets attach to a Line or Cell) and propose IEC 81346 " +
        "function (=) and product (-) aspect codes (uppercase A-Z0-9, '.'-separated levels, use IEC 81346-2 letter classes, " +
        "no prefixes in output) and an AAS idShort (^[a-zA-Z][a-zA-Z0-9_]+$, no hyphens, PascalCase). " +
        "Choose parentNodeId ONLY from the candidate ids.",
      input: `Asset name: ${name}\nDescription: ${desc}\n\nCandidate nodes:\n${list}`,
      text: { format: { type: "json_schema", name: "placement", strict: true, schema } },
    });
    // deno-lint-ignore no-explicit-any
    const out = (res as any).output ?? [];
    let text = "";
    for (const item of out) for (const c of item.content ?? []) if (c.type === "output_text") text += c.text;
    return json({ suggestion: JSON.parse(text) });
  } catch (e) {
    if (e instanceof GatewayError) {
      const status = e.httpStatus === 429 ? 429 : e.httpStatus === 402 ? 402 : 502;
      return json({ error: status === 429 ? "Too many requests, try again shortly." : status === 402 ? "AI credits exhausted." : "AI suggestion failed." }, status);
    }
    return json({ error: "AI suggestion failed." }, 500);
  }
});
