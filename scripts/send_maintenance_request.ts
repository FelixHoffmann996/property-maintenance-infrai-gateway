export {};

const response = await fetch("http://localhost:3000/maintenance/triage", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
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
  })
});

console.log(JSON.stringify(await response.json(), null, 2));
