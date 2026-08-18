import { z } from "zod";

export const maintenanceRequestSchema = z.object({
  propertyId: z.string().min(1),
  unit: z.string().min(1),
  tenantName: z.string().min(1),
  maintenanceRequest: z.object({
    category: z.enum(["water", "electrical", "heating", "appliance", "other"]),
    description: z.string().min(10).max(1000),
    activeHazard: z.boolean()
  }),
  tenantDocuments: z.array(z.object({
    name: z.string().min(1),
    status: z.enum(["received", "missing"])
  })).max(20),
  nextInspectionAt: z.string().datetime()
});

export type MaintenanceInput = z.infer<typeof maintenanceRequestSchema>;

export type MaintenanceDecision = {
  priority: "emergency" | "priority" | "routine";
  inspectionReminder: "send_now" | "scheduled";
  missingDocuments: string[];
};

export function decideMaintenanceAction(
  input: MaintenanceInput,
  now: Date = new Date()
): MaintenanceDecision {
  const priority = input.maintenanceRequest.activeHazard
    ? "emergency"
    : input.maintenanceRequest.category === "water" || input.maintenanceRequest.category === "heating"
      ? "priority"
      : "routine";

  const inspectionAt = new Date(input.nextInspectionAt);
  const daysUntilInspection = (inspectionAt.getTime() - now.getTime()) / 86_400_000;

  return {
    priority,
    inspectionReminder: daysUntilInspection <= 7 ? "send_now" : "scheduled",
    missingDocuments: input.tenantDocuments
      .filter((document) => document.status === "missing")
      .map((document) => document.name)
  };
}
