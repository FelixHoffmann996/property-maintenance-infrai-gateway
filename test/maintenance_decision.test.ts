import assert from "node:assert/strict";
import test from "node:test";
import { decideMaintenanceAction, maintenanceRequestSchema } from "../src/maintenance_decision.js";

test("a nearby inspection and water request produce an immediate reminder", () => {
  const input = maintenanceRequestSchema.parse({
    propertyId: "storefront-lofts",
    unit: "2B",
    tenantName: "Maya Chen",
    maintenanceRequest: {
      category: "water",
      description: "Water is dripping steadily beneath the kitchen sink.",
      activeHazard: false
    },
    tenantDocuments: [
      { name: "proof-of-insurance.pdf", status: "received" },
      { name: "pet-addendum.pdf", status: "missing" }
    ],
    nextInspectionAt: "2026-08-18T09:00:00.000Z"
  });

  assert.deepEqual(decideMaintenanceAction(input, new Date("2026-08-13T09:00:00.000Z")), {
    priority: "priority",
    inspectionReminder: "send_now",
    missingDocuments: ["pet-addendum.pdf"]
  });
});
