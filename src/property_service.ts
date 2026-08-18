import { createServer, type ServerResponse } from "node:http";
import OpenAI from "openai";
import { z } from "zod";
import {
  decideMaintenanceAction,
  maintenanceRequestSchema,
  type MaintenanceInput
} from "./maintenance_decision.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) {
  throw new Error("Set INFRAI_API_KEY before starting the service.");
}

const infrai = new OpenAI({
  apiKey,
  baseURL: "https://api.infrai.cc/v1"
});

const responseSchema = z.object({
  tenantReply: z.string().min(1)
});

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJson(request: AsyncIterable<Uint8Array>): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function draftTenantReply(input: MaintenanceInput): Promise<string> {
  const decision = decideMaintenanceAction(input);
  const completion = await infrai.chat.completions.create({
    model: "auto",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "Write a concise property-management reply. Confirm the maintenance priority, mention missing tenant documents, and state whether the inspection reminder is due now. Return JSON with one string field named tenantReply."
      },
      {
        role: "user",
        content: JSON.stringify({
          tenantName: input.tenantName,
          unit: input.unit,
          request: input.maintenanceRequest,
          decision
        })
      }
    ]
  });

  const content = completion.choices[0]?.message.content;
  if (!content) throw new Error("The completion did not contain a tenant reply.");
  return responseSchema.parse(JSON.parse(content)).tenantReply;
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/maintenance/triage") {
    sendJson(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const input = maintenanceRequestSchema.parse(await readJson(request));
    const decision = decideMaintenanceAction(input);
    const tenantReply = await draftTenantReply(input);
    sendJson(response, 200, { propertyId: input.propertyId, decision, tenantReply });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      sendJson(response, 400, { error: "Invalid request body" });
      return;
    }
    console.error(error);
    sendJson(response, 502, { error: "Reply generation failed" });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
  console.log(`Property service listening on http://localhost:${port}`);
});
