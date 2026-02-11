import { z } from "zod";
import { parseEstonianDate } from "./date";

// Date field that accepts dd.mm.yyyy (Estonian) or yyyy-mm-dd (ISO) and outputs ISO
const estonianDateField = z.string().transform((val, ctx) => {
  const parsed = parseEstonianDate(val);
  if (!parsed) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid date format. Use dd.mm.yyyy",
    });
    return z.NEVER;
  }
  return parsed;
});

const estonianDateFieldOptional = z.string().optional().nullable().transform((val, ctx) => {
  if (!val || val.trim() === "") return null;
  const parsed = parseEstonianDate(val);
  if (!parsed) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid date format. Use dd.mm.yyyy",
    });
    return z.NEVER;
  }
  return parsed;
});

// Equipment validation schemas
export const serviceTagSchema = z.string().min(1).max(30).trim();

export const equipmentAddSchema = z.object({
  service_tag: serviceTagSchema,
  vendor_id: z.string().optional().nullable(),
  supplier_id: z.string().optional().nullable(),
  model_id: z.string().optional().nullable(),
  purchase_date: estonianDateField,
  warranty_expiry_date: estonianDateField,
  equipment_sub_area_id: z.string().optional().nullable(),
  assigned_to: z.string().max(9).optional().nullable(),
  teamviewer: z.string().max(255).optional().nullable(),
  cerf: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 0)),
  ip: z.string().ip().optional().nullable().or(z.literal("")),
  mac_addresses: z.string().max(255).optional().nullable(),
  comment: z.string().optional().nullable(),
  inventory_period_id: z.string().optional().nullable(),
  imei1: z.string().max(15).optional().nullable().or(z.literal("")).transform((val) => {
    if (!val || val.trim() === "") return null;
    return val.trim();
  }),
  imei2: z.string().max(15).optional().nullable().or(z.literal("")).transform((val) => {
    if (!val || val.trim() === "") return null;
    return val.trim();
  }),
});

export const equipmentEditSchema = equipmentAddSchema.partial().extend({
  service_tag: serviceTagSchema.optional(),
  purchase_date: estonianDateFieldOptional,
  warranty_expiry_date: estonianDateFieldOptional,
  is_written_off: z.string().optional().nullable().or(z.literal("")),
  repair_status: z.enum(["needs_repair", "at_supplier", "returned", "in_backup"]).optional().nullable().or(z.literal("")),
  repair_note: z.string().max(65535).optional().nullable().or(z.literal("")),
  repair_physical_location: z.string().max(255).optional().nullable().or(z.literal("")),
});

export const apiAddItemSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  parent_id: z.union([z.string(), z.number(), z.null()]).optional().transform((val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === '') return null;
      const parsed = parseInt(trimmed, 10);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }),
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

export const vendorsActionSchema = z.object({
  action: z.enum(["add", "edit", "delete"]),
  name: z.string().min(1).max(255).trim().optional(),
  id: z.string().optional(),
}).refine((data) => {
  // If action is add or edit, name is required
  if ((data.action === "add" || data.action === "edit") && !data.name) {
    return false;
  }
  // If action is edit or delete, id is required
  if ((data.action === "edit" || data.action === "delete") && !data.id) {
    return false;
  }
  return true;
}, {
  message: "Name required for add/edit, ID required for edit/delete",
});

export const suppliersActionSchema = z.object({
  action: z.enum(["add", "edit", "delete"]),
  name: z.string().min(1).max(255).trim().optional(),
  email: z.string().email().max(255).optional().or(z.literal("")),
  phone_number: z.string().max(255).optional().or(z.literal("")),
  address: z.string().max(255).optional().or(z.literal("")),
  representative_name: z.string().max(255).optional().or(z.literal("")),
  sap_vendor_no: z.string().regex(/^[0-9]+$/).optional().or(z.literal("")),
  website: z.string().url().max(255).optional().or(z.literal("")),
  id: z.string().optional(),
}).refine((data) => {
  // If action is add or edit, name is required
  if ((data.action === "add" || data.action === "edit") && !data.name) {
    return false;
  }
  // If action is edit or delete, id is required
  if ((data.action === "edit" || data.action === "delete") && !data.id) {
    return false;
  }
  return true;
}, {
  message: "Name required for add/edit, ID required for edit/delete",
});

export const writeOffReasonsActionSchema = z.object({
  action: z.enum(["add", "edit", "delete"]),
  reason: z.string().min(1).max(255).trim().optional(),
  id: z.string().optional(),
}).refine((data) => {
  // If action is add or edit, reason is required
  if ((data.action === "add" || data.action === "edit") && !data.reason) {
    return false;
  }
  // If action is edit or delete, id is required
  if ((data.action === "edit" || data.action === "delete") && !data.id) {
    return false;
  }
  return true;
}, {
  message: "Reason required for add/edit, ID required for edit/delete",
});

export const printLabelSchema = z.object({
  service_tag: serviceTagSchema,
  printer: z.string().min(1).optional(),
});

export const printPrinterTagSchema = z.object({
  printer_name: z.string().min(1, "Printer name is required"),
  printer: z.string().min(1, "Target printer is required"),
});

export const changePasswordSchema = z.object({
  old_password: z.string().min(1),
  new_password: z.string().min(8),
  confirm_password: z.string().min(1),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "New password and confirmation password must match",
  path: ["confirm_password"],
});

export type EquipmentAddInput = z.infer<typeof equipmentAddSchema>;
export type EquipmentEditInput = z.infer<typeof equipmentEditSchema>;
export type ApiAddItemInput = z.infer<typeof apiAddItemSchema>;
export type LocationsActionInput = z.infer<typeof locationsActionSchema>;
export type TypesActionInput = z.infer<typeof typesActionSchema>;
export type VendorsActionInput = z.infer<typeof vendorsActionSchema>;
export type SuppliersActionInput = z.infer<typeof suppliersActionSchema>;
export type WriteOffReasonsActionInput = z.infer<typeof writeOffReasonsActionSchema>;
export type PrintLabelInput = z.infer<typeof printLabelSchema>;
export type PrintPrinterTagInput = z.infer<typeof printPrinterTagSchema>;
