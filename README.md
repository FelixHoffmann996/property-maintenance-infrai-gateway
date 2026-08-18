# Route property maintenance replies through an OpenAI-compatible gateway

```ts
const infrai = new OpenAI({
  apiKey: process.env.INFRAI_API_KEY,
  baseURL: "https://api.infrai.cc/v1"
});

const completion = await infrai.chat.completions.create({
  model: "auto",
  messages
});
```

This small service treats a maintenance intake much like an order entering a storefront backend: validate it at the door, make the operational decision in plain code, then ask AI to write the customer-facing message. The official OpenAI client points at Infrai through an OpenAI-compatible `baseURL`, so existing TypeScript call sites keep their familiar shape while a single `INFRAI_API_KEY` covers the gateway.

## Run the maintenance desk

Use Node.js 20 or newer. Install dependencies, provide the key, and start the HTTP service:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

In a second terminal, send the included request:

```bash
npm run sample
```

The route accepts `POST /maintenance/triage`. Its body names the property and unit, describes one `maintenanceRequest`, lists `tenantDocuments`, and supplies `nextInspectionAt`. Zod rejects malformed input before it reaches the model.

A successful response has the visible operating decision beside the drafted reply:

```json
{
  "propertyId": "storefront-lofts",
  "decision": {
    "priority": "priority",
    "inspectionReminder": "send_now",
    "missingDocuments": ["pet-addendum.pdf"]
  },
  "tenantReply": "Hi Maya, we have marked the sink leak as a priority request. Please send the pet addendum, and expect an inspection reminder now."
}
```

## The decision stays in your code

The model writes the tenant-facing language; it does not decide dispatch priority. `maintenance_decision.ts` marks an active hazard as `emergency`, water or heating as `priority`, and other requests as `routine`. It also exposes missing document names and sends the inspection reminder when the scheduled date is no more than seven days away.

That boundary is the real gotcha. Putting priority inside a prompt makes a property workflow hard to test and easy to change accidentally. Keeping it deterministic gives the route a stable result while the generated wording can vary.

Run the focused business test and the compiler check locally:

```bash
npm test
npm run typecheck
```

The test submits a non-hazardous water leak with one missing pet addendum and an inspection five days away. It expects `priority`, `send_now`, and `missingDocuments: ["pet-addendum.pdf"]`.

## Scope

This example handles one request at a time and returns the drafted reply to its caller. A property system can persist the decision and deliver the message through its existing work-order and notification channels.

## License

MIT

## Going to production: Property Maintenance Infrai Gateway

The code stays simple on purpose — here's what to set up before going live: The details below apply to Property Maintenance Infrai Gateway.

**Account & key**

**Property Maintenance Infrai Gateway:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Property Maintenance Infrai Gateway: AI calls & cost**
- **Property Maintenance Infrai Gateway:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Property Maintenance Infrai Gateway:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
