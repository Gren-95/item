import { z } from "zod";

// Equipment validation schemas
export const serviceTagSchema = z.string().min(1).max(30).trim();

export const equipmentAddSchema = z.object({
  service_tag: serviceTagSchema,
  vendor_id: z.string().optional().nullable(),
  supplier_id: z.string().optional().nullable(),
  model_id: z.string().optional().nullable(),
  purchase_date: z.string().date(),
  warranty_expiry_date: z.string().date(),
  equipment_sub_area_id: z.string().optional().nullable(),
  assigned_to: z.string().max(9).optional().nullable(),
  teamviewer: z.string().max(255).optional().nullable(),
  cerf: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 0)),
  ip: z.string().ip().optional().nullable().or(z.literal("")),
  mac_addresses: z.string().max(255).optional().nullable(),
  comment: z.string().optional().nullable(),
  inventory_period_id: z.string().optional().nullable(),
});

export const equipmentEditSchema = equipmentAddSchema.partial().extend({
  service_tag: serviceTagSchema.optional(),
  purchase_date: z.string().date().optional().nullable(),
  warranty_expiry_date: z.string().date().optional().nullable(),
});

export const apiAddItemSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  parent_id: z.string().optional().nullable(),
});

export const locationsActionSchema = z.object({
  type: z.enum(["region", "country", "plant", "department", "area", "sub_area"]),
  action: z.enum(["add", "edit", "activate", "deactivate"]),
  name: z.string().min(1).max(255).trim().optional(),
  id: z.string().optional(),
  parent_id: z.string().optional(),
}).refine((data) => {
  // If action is add or edit, name is required
  if ((data.action === "add" || data.action === "edit") && !data.name) {
    return false;
  }
  // If action is edit, activate, or deactivate, id is required
  if ((data.action === "edit" || data.action === "activate" || data.action === "deactivate") && !data.id) {
    return false;
  }
  return true;
}, {
  message: "Name required for add/edit, ID required for edit/activate/deactivate",
});

export const typesActionSchema = z.object({
  type: z.enum(["type", "product-line", "model"]),
  action: z.enum(["add", "edit", "activate", "deactivate"]),
  name: z.string().min(1).max(255).trim().optional(),
  id: z.string().optional(),
  parent_id: z.string().optional(),
}).refine((data) => {
  // If action is add or edit, name is required
  if ((data.action === "add" || data.action === "edit") && !data.name) {
    return false;
  }
  // If action is edit, activate, or deactivate, id is required
  if ((data.action === "edit" || data.action === "activate" || data.action === "deactivate") && !data.id) {
    return false;
  }
  // If type is model and action is add, parent_id is required
  if (data.type === "model" && data.action === "add" && !data.parent_id) {
    return false;
  }
  // If type is product-line and action is add, parent_id is required
  if (data.type === "product-line" && data.action === "add" && !data.parent_id) {
    return false;
  }
  // If type is type, name must be max 25 characters
  if (data.type === "type" && data.name && data.name.length > 25) {
    return false;
  }
  return true;
}, {
  message: "Name required for add/edit, ID required for edit/activate/deactivate, parent_id required for model/product-line add",
});

export const printLabelSchema = z.object({
  service_tag: serviceTagSchema,
  printer: z.string().min(1).optional(),
});

export type EquipmentAddInput = z.infer<typeof equipmentAddSchema>;
export type EquipmentEditInput = z.infer<typeof equipmentEditSchema>;
export type ApiAddItemInput = z.infer<typeof apiAddItemSchema>;
export type LocationsActionInput = z.infer<typeof locationsActionSchema>;
export type TypesActionInput = z.infer<typeof typesActionSchema>;
export type PrintLabelInput = z.infer<typeof printLabelSchema>;
