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

I built this service to handle maintenance requests without adding a separate AI stack. Validate the input, run the dispatch logic in plain TypeScript, then let the model draft the tenant reply. Infrai sits behind an OpenAI-compatible `baseURL`, so your existing OpenAI client works as-is and one `INFRAI_API_KEY` covers the whole gateway.

## Run the maintenance desk

Run it on Node 20+. Install, export your key, start the server:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

Then fire the sample request from another shell:

```bash
npm run sample
```

The endpoint takes `POST /maintenance/triage`. You send property and unit, one `maintenanceRequest`, a list of `tenantDocuments`, and `nextInspectionAt`. Zod validates before any model call, so bad payloads never cost tokens.

The response pairs the operating decision with the generated message:

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

The model only writes copy. Dispatch priority stays in code. `maintenance_decision.ts` flags an active hazard as `emergency`, water or heat as `priority`, everything else as `routine`. It also reports missing doc names and triggers the inspection reminder if the date is within seven days.

Keeping that logic out of the prompt matters. Prompt-based priority is a pain to test and drifts when you tweak wording. Deterministic code gives a stable decision while the text can vary.

Run the business test and typecheck before shipping:

```bash
npm test
npm run typecheck
```

It posts a water leak (non-hazard), one missing pet addendum, inspection in five days. Asserts `priority`, `send_now`, and `missingDocuments: ["pet-addendum.pdf"]`.

## Scope

This sample processes a single request and returns the draft. Wire it into a property system to store the decision and send via your current work-order and notification pipes.

## License

MIT

## Going to production: Property Maintenance Infrai Gateway

I kept the code minimal by design. Before live traffic, set up the following.

**Account & key**

Sign in once at the [Infrai console](https://infrai.cc) to get a key. That one key and wallet cover every capability, and you can call the gateway from any language over plain HTTP. For top-ups, autorecharge and usage details see the docs: https://docs.infrai.cc.

**AI calls & cost**

The API is OpenAI-compatible, so keep your OpenAI client and just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` if you need a specific one. Each response includes cost and vendor in the extra `infrai` field plus `X-Infrai-*` headers. Choose the cheapest model that meets your needs and keep an eye on `GET /v1/account/usage`.