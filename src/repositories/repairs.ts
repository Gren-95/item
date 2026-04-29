import type { Pool, RowDataPacket } from "mysql2/promise";

type RepairStatus = "needs_repair" | "at_supplier" | "returned" | "in_backup" | null;

interface RepairItemRow extends RowDataPacket {
  id: number;
  service_tag: string;
  model_name: string | null;
  vendor_name: string | null;
  supplier_name: string | null;
  supplier_email: string | null;
  repair_status: RepairStatus;
  repair_note: string | null;
  repair_physical_location: string | null;
  repair_sent_date: Date | null;
  repair_returned_date: Date | null;
  repair_marked_backup_date: Date | null;
  days_in_repair: number | null;
}

const REPAIR_BASE_COLS = `
  e.id,
  e.service_tag,
  m.name as model_name,
  v.name as vendor_name,
  s.name as supplier_name,
  s.email as supplier_email,
  e.repair_status,
  e.repair_note,
  e.repair_physical_location,
  e.repair_sent_date,
  e.repair_returned_date,
  e.repair_marked_backup_date
`;

const REPAIR_BASE_FROM = `
  FROM it_equipment e
  LEFT JOIN it_equipment_model m ON e.model_id = m.id
  LEFT JOIN it_equipment_vendor v ON e.vendor_id = v.id
  LEFT JOIN it_equipment_supplier s ON e.supplier_id = s.id
`;

const DAYS_FROM_SENT = `
  CASE
    WHEN e.repair_sent_date IS NOT NULL
    THEN DATEDIFF(CURRENT_DATE, e.repair_sent_date)
    ELSE NULL
  END as days_in_repair
`;

const DAYS_BETWEEN_SENT_AND_RETURNED = `
  CASE
    WHEN e.repair_sent_date IS NOT NULL AND e.repair_returned_date IS NOT NULL
    THEN DATEDIFF(e.repair_returned_date, e.repair_sent_date)
    WHEN e.repair_sent_date IS NOT NULL
    THEN DATEDIFF(CURRENT_DATE, e.repair_sent_date)
    ELSE NULL
  END as days_in_repair
`;

function mapRepairItem(item: RepairItemRow) {
  return {
    id: item.id,
    service_tag: item.service_tag,
    model_name: item.model_name,
    vendor_name: item.vendor_name,
    supplier_name: item.supplier_name,
    supplier_email: item.supplier_email,
    repair_status: item.repair_status,
    repair_note: item.repair_note,
    repair_physical_location: item.repair_physical_location,
    repair_sent_date: item.repair_sent_date
      ? item.repair_sent_date.toISOString().split("T")[0]
      : null,
    repair_returned_date: item.repair_returned_date
      ? item.repair_returned_date.toISOString().split("T")[0]
      : null,
    repair_marked_backup_date: item.repair_marked_backup_date
      ? item.repair_marked_backup_date.toISOString().split("T")[0]
      : null,
    days_in_repair: item.days_in_repair !== null ? Number(item.days_in_repair) : null,
  };
}

export async function getRepairsData(pool: Pool) {
  const [needsRepair, atSupplier, returned] = await Promise.all([
    pool.query<RowDataPacket[]>(`
      SELECT ${REPAIR_BASE_COLS}, ${DAYS_FROM_SENT}
      ${REPAIR_BASE_FROM}
      WHERE e.repair_status = 'needs_repair'
      ORDER BY e.repair_sent_date DESC, e.service_tag
    `),
    pool.query<RowDataPacket[]>(`
      SELECT ${REPAIR_BASE_COLS}, ${DAYS_FROM_SENT}
      ${REPAIR_BASE_FROM}
      WHERE e.repair_status = 'at_supplier'
      ORDER BY e.repair_sent_date DESC, e.service_tag
    `),
    pool.query<RowDataPacket[]>(`
      SELECT ${REPAIR_BASE_COLS}, ${DAYS_BETWEEN_SENT_AND_RETURNED}
      ${REPAIR_BASE_FROM}
      WHERE e.repair_status = 'returned'
      ORDER BY e.repair_returned_date DESC, e.service_tag
    `),
  ]);

  return {
    needsRepair: (needsRepair[0] as RepairItemRow[]).map(mapRepairItem),
    atSupplier: (atSupplier[0] as RepairItemRow[]).map(mapRepairItem),
    returned: (returned[0] as RepairItemRow[]).map(mapRepairItem),
  };
}
