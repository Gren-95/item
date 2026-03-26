const AUTH_ENDPOINT = process.env.AUTH_ENDPOINT || "";
const CHANGE_PASSWORD_ENDPOINT = process.env.CHANGE_PASSWORD_ENDPOINT || "";

// General admin user credentials from environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

/**
 * Check if a username matches the configured admin username
 * @param username - The username to check
 * @returns true if username matches ADMIN_USERNAME (case-sensitive)
 */
export function isAdminUser(username: string): boolean {
  return ADMIN_USERNAME !== undefined && ADMIN_USERNAME !== "" && username === ADMIN_USERNAME;
}

/**
 * Verify admin user credentials
 * @param username - The username to check
 * @param password - The password to verify
 * @returns true if credentials match admin user from .env
 */
export function verifyAdminCredentials(username: string, password: string): boolean {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    // Only log in non-test environments
    if (typeof process !== "undefined" && process.env.NODE_ENV !== "test" && !process.env.BUN_ENV?.includes("test")) {
      console.log("Admin credentials not configured");
    }
    return false;
  }
  const matches = username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
  return matches;
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  // Check admin credentials first (bypasses auth API)
  if (verifyAdminCredentials(username, password)) {
    // Only log in non-test environments
    if (typeof process !== "undefined" && process.env.NODE_ENV !== "test" && !process.env.BUN_ENV?.includes("test")) {
      console.log("Admin user login attempt:", username);
    }
    return true;
  }

  // TEST_MODE: Allow login if user exists in it_employees_list (bypasses auth API)
  // Guard: TEST_MODE is forbidden when NODE_ENV=production
  if (process.env.TEST_MODE === "true" && process.env.NODE_ENV !== "production") {
    try {
      const pool = (await import("../db")).default;
      const [users] = await pool.query<import("mysql2").RowDataPacket[]>(
        "SELECT employee_no FROM `it_employees_list` WHERE `employee_no` = ? OR `user_id` = ?",
        [username, username]
      );

      if (users.length > 0) {
        console.log("TEST_MODE: User authenticated from database:", username);
        return true;
      }

      console.log("TEST_MODE: User not found in database:", username);
      return false;
    } catch (error) {
      console.error("TEST_MODE: Database authentication error:", error);
      return false;
    }
  }

  // Proceed with normal auth API call for non-admin users
  if (!AUTH_ENDPOINT) {
    return false;
  }
  try {
    const formData = new URLSearchParams();
    formData.append("user", username);
    formData.append("pass", password);

    const response = await fetch(AUTH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      return false;
    }

    const text = await response.text();

    // Match PHP implementation: trim($response) === "TRUE"
    // Handle both plain text "TRUE"/"FALSE" and HTML responses
    const trimmed = text.trim();

    // If it's HTML, extract body content
    if (trimmed.includes("<body>")) {
      const bodyMatch = trimmed.match(/<body>(.*?)<\/body>/i);
      if (bodyMatch) {
        return bodyMatch[1].trim() === "TRUE";
      }
    }

    // Otherwise check the trimmed response directly
    return trimmed === "TRUE";
  } catch (error) {
    // Log error but don't expose it (only in non-test environments)
    if (typeof process !== "undefined" && process.env.NODE_ENV !== "test" && !process.env.BUN_ENV?.includes("test")) {
      console.error("Authentication error:", error);
    }
    return false;
  }
}

export interface PasswordChangeResult {
  success: boolean;
  error?: string;
  message?: string;
}

export async function hasItemLoginPermission(
  username: string,
  pool: import("mysql2/promise").Pool
): Promise<boolean> {
  // Admin user always has login permission
  if (isAdminUser(username)) {
    return true;
  }

  try {
    // Must be an active employee
    const [users] = await pool.query<import("mysql2").RowDataPacket[]>(
      "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
      [username]
    );
    if (users.length === 0) {
      return false;
    }

    // Must have "login" permission with plant_id = 0 (global)
    // Exclude expired permissions
    const [perms] = await pool.query<import("mysql2").RowDataPacket[]>(
      `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND permission = 'login'
         AND plant_id = 0
         AND role IN ('user','admin')
         AND (expiry_date IS NULL OR expiry_date >= CURDATE())
       LIMIT 1`,
      [username]
    );

    return perms.length > 0;
  } catch (error) {
    // Only log in non-test environments
    if (typeof process !== "undefined" && process.env.NODE_ENV !== "test" && !process.env.BUN_ENV?.includes("test")) {
      console.error("Permission check error:", error);
    }
    return false;
  }
}

/**
 * Get user's plant_id from their permissions (preferred) or equipment assignments (fallback)
 * @param username - The username to check
 * @param pool - The database connection pool
 * @returns plant_id or null if not found
 */
export async function getUserPlantId(
  username: string,
  pool: import("mysql2/promise").Pool
): Promise<number | null> {
  // Admin user has no plant restrictions (returns null to bypass all plant checks)
  if (isAdminUser(username)) {
    return null;
  }

  try {
    // First, try to get plant_id from user's permissions
    // Get the most common plant_id from their non-global permissions (excluding plant_id = 0)
    const [permissionPlants] = await pool.query<import("mysql2").RowDataPacket[]>(
      `SELECT plant_id, COUNT(*) as count
       FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id > 0
         AND (expiry_date IS NULL OR expiry_date >= CURDATE())
       GROUP BY plant_id
       ORDER BY count DESC, plant_id ASC
       LIMIT 1`,
      [username]
    );

    if (permissionPlants.length > 0 && permissionPlants[0].plant_id) {
      return permissionPlants[0].plant_id;
    }

    // Fallback: Get plant_id from employee's most recent equipment assignment
    // This gets the plant from the location hierarchy of equipment assigned to the employee
    const [users] = await pool.query<import("mysql2").RowDataPacket[]>(
      "SELECT employee_no FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
      [username]
    );

    if (users.length === 0 || !users[0].employee_no) {
      return null;
    }

    const employeeNo = users[0].employee_no;

    const [plantData] = await pool.query<import("mysql2").RowDataPacket[]>(
      `SELECT d.plant_id
       FROM it_equipment_log log
       LEFT JOIN it_equipment_sub_area sa ON log.equipment_sub_area_id = sa.id
       LEFT JOIN it_equipment_area a ON sa.area_id = a.id
       LEFT JOIN it_equipment_department d ON a.department_id = d.id
       WHERE log.assigned_to = ?
         AND d.plant_id IS NOT NULL
       ORDER BY log.created DESC
       LIMIT 1`,
      [employeeNo]
    );

    if (plantData.length > 0 && plantData[0].plant_id) {
      return plantData[0].plant_id;
    }

    return null;
  } catch (error) {
    // Only log in non-test environments
    if (typeof process !== "undefined" && process.env.NODE_ENV !== "test" && !process.env.BUN_ENV?.includes("test")) {
      console.error("Error getting user plant_id:", error);
    }
    return null;
  }
}

/**
 * Generic function to check if a user has a specific permission
 * Permission format: access_key = '<plant_id>_<pagename>', value = 'user' or 'admin'
 * @param username - The username to check
 * @param pool - The database connection pool
 * @param permissionName - The permission name (e.g., 'search', 'add', 'edit', 'locations_view', etc.)
 * @param plantId - Optional plant_id to check. If not provided, gets user's plant_id
 * @param requireAdmin - If true, only checks for 'admin' role. If false, checks for both 'user' and 'admin'
 * @returns true if user has permission, false otherwise
 */
export async function hasPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  permissionName: string,
  plantId?: number | null,
  requireAdmin: boolean = false
): Promise<boolean> {
  // Admin user always has all permissions
  if (isAdminUser(username)) {
    return true;
  }

  try {
    // Ensure user exists
    const [users] = await pool.query<import("mysql2").RowDataPacket[]>(
      "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
      [username]
    );

    if (users.length === 0) {
      return false;
    }

    // Global admin check (plant_id = 0, access_key = 'global_admin')
    // Exclude expired permissions
    const [globalAdmin] = await pool.query<import("mysql2").RowDataPacket[]>(
      `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = 0
         AND permission = 'global_admin'
         AND role = 'admin'
         AND (expiry_date IS NULL OR expiry_date >= CURDATE())
       LIMIT 1`,
      [username]
    );
    if (globalAdmin.length > 0) {
      return true;
    }

    // Get plant_id if not provided
    let targetPlantId = plantId;
    if (targetPlantId === undefined || targetPlantId === null) {
      targetPlantId = await getUserPlantId(username, pool);
    }

 // If we still don't have a plant_id, deny (no legacy fallback)
 if (targetPlantId === null) {
   return false;
 }

    // Check plant-scoped permission with separate plant_id and simple permission name
    // Exclude expired permissions
    const permission = permissionName;
    const [permissions] = await pool.query<import("mysql2").RowDataPacket[]>(
      `SELECT id, role FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = ?
         AND permission = ?
         AND role IN (?, ?)
         AND (expiry_date IS NULL OR expiry_date >= CURDATE())`,
      [username, targetPlantId, permission, requireAdmin ? 'admin' : 'user', 'admin']
    );

    if (permissions.length === 0) {
      return false;
    }

    // If requireAdmin is true, check if any permission has 'admin' value
    if (requireAdmin) {
      return permissions.some(p => p.role === 'admin');
    }

    // Otherwise, having either 'user' or 'admin' is sufficient
    return true;
  } catch (error) {
    // Only log in non-test environments
    if (typeof process !== "undefined" && process.env.NODE_ENV !== "test" && !process.env.BUN_ENV?.includes("test")) {
      console.error(`Permission check error for ${permissionName}:`, error);
    }
    // On error, deny access for security
    return false;
  }
}

/**
 * Check if a user has the admin permission
 * Admin permission grants access to all pages
 * Format: access_key = 'item', value = 'admin' (legacy format for backward compatibility)
 * OR access_key = '<plant_id>_<pagename>', value = 'admin' for specific pages
 * @param username - The username to check
 * @param pool - The database connection pool
 * @returns true if user has permission, false otherwise
 */
export async function hasAdminPermission(
  username: string,
  pool: import("mysql2/promise").Pool
): Promise<boolean> {
  // Admin user always has admin permission
  if (isAdminUser(username)) {
    return true;
  }

  try {
    // Ensure user exists
    const [users] = await pool.query<import("mysql2").RowDataPacket[]>(
      "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
      [username]
    );

    if (users.length === 0) {
      return false;
    }

    // Only global_admin permission grants global admin access
    // Plant-specific permissions with role='admin' only grant admin for that specific plant
    // Exclude expired permissions
    const [globalAdmin] = await pool.query<import("mysql2").RowDataPacket[]>(
      `SELECT id, user_id, plant_id, permission, role, expiry_date FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = 0
         AND permission = 'global_admin'
         AND role = 'admin'
         AND (expiry_date IS NULL OR expiry_date >= CURDATE())
       LIMIT 1`,
      [username]
    );
    if (globalAdmin.length > 0) {
      return true;
    }

    // No other permissions grant global admin access
    return false;
  } catch (error) {
    // Only log in non-test environments
    if (typeof process !== "undefined" && process.env.NODE_ENV !== "test" && !process.env.BUN_ENV?.includes("test")) {
      console.error("Admin permission check error:", error);
    }
    return false;
  }
}

/**
 * Seed full admin permissions for a user across all plants on first login.
 */
export async function seedFullPermissionsForUser(
  username: string,
  pool: import("mysql2/promise").Pool
): Promise<void> {
  // Permissions to grant; admin covers all operations for that scope.
  // Combined permissions:
  // - edit: covers search, add, and edit operations
  // - locations_edit, types_edit, vendors_edit, write_off_reasons_edit: cover view/add/edit/delete for each feature
  const permissionNames = [
    "edit",
    "locations_edit",
    "types_edit",
    "vendors_edit",
    "write_off_reasons_edit",
    "repairs",
  ];

  const [userRows] = await pool.query<import("mysql2").RowDataPacket[]>(
    "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
    [username]
  );
  if (userRows.length === 0) return;
  const userId = userRows[0].user_id;

  const [plants] = await pool.query<import("mysql2").RowDataPacket[]>(
    "SELECT id FROM it_equipment_plant WHERE status = 1"
  );

  // Global admin entry (plant_id = 0)
  await pool.query(
    `INSERT INTO it_user_permissions 
       (user_id, plant_id, permission, role, comment)
     VALUES (?, 0, 'global_admin', 'admin', '')
     ON DUPLICATE KEY UPDATE role = VALUES(role)`,
    [userId]
  );

  for (const plant of plants) {
    for (const perm of permissionNames) {
      await pool.query(
        `INSERT INTO it_user_permissions 
           (user_id, plant_id, permission, role, comment)
         VALUES (?, ?, ?, 'admin', '')
         ON DUPLICATE KEY UPDATE role = VALUES(role)`,
        [userId, plant.id, perm]
      );
    }
  }
}

/**
 * Check if a user has permission to search/view equipment
 * Uses the combined edit permission (backward compatible with search)
 */
export async function hasSearchPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return (await hasPermission(username, pool, "edit", plantId)) ||
         (await hasPermission(username, pool, "search", plantId));
}

/**
 * Check if a user has permission to add equipment
 * Uses the combined edit permission (backward compatible with add)
 */
export async function hasAddEquipmentPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return (await hasPermission(username, pool, "edit", plantId)) ||
         (await hasPermission(username, pool, "add", plantId));
}

/**
 * Check if a user has permission to edit equipment
 * Permission format: access_key = '<plant_id>_edit', value = 'user' or 'admin'
 * This now covers search, add, and edit operations
 */
export async function hasEditEquipmentPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "edit", plantId);
}

/**
 * Check if a user has permission to manage locations (view/add/edit/delete)
 * Permission format: access_key = '<plant_id>_locations_edit', value = 'user' or 'admin'
 * This replaces the previous separate view/add/edit/delete permissions
 */
export async function hasLocationsViewPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  // Check for new combined permission OR old individual permissions (for backward compatibility)
  return (await hasPermission(username, pool, "locations_edit", plantId)) ||
         (await hasPermission(username, pool, "locations_view", plantId));
}

export async function hasLocationsAddPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return (await hasPermission(username, pool, "locations_edit", plantId)) ||
         (await hasPermission(username, pool, "locations_add", plantId));
}

export async function hasLocationsEditPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "locations_edit", plantId);
}

export async function hasLocationsDeletePermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return (await hasPermission(username, pool, "locations_edit", plantId)) ||
         (await hasPermission(username, pool, "locations_delete", plantId));
}

/**
 * Check if a user has permission to manage locations (any operation)
 * Uses the combined locations_edit permission
 */
export async function hasManageLocationsPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return (await hasPermission(username, pool, "locations_edit", plantId)) ||
         (await hasPermission(username, pool, "locations_view", plantId)) ||
         (await hasPermission(username, pool, "locations_add", plantId)) ||
         (await hasPermission(username, pool, "locations_delete", plantId));
}

/**
 * Check if a user has permission to manage types/configurations (view/add/edit/delete)
 * Permission format: access_key = '<plant_id>_types_edit', value = 'user' or 'admin'
 * This replaces the previous separate view/add/edit/delete permissions
 */
export async function hasTypesViewPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return (await hasPermission(username, pool, "types_edit", plantId)) ||
         (await hasPermission(username, pool, "types_view", plantId));
}

export async function hasTypesAddPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return (await hasPermission(username, pool, "types_edit", plantId)) ||
         (await hasPermission(username, pool, "types_add", plantId));
}

export async function hasTypesEditPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "types_edit", plantId);
}

export async function hasTypesDeletePermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return (await hasPermission(username, pool, "types_edit", plantId)) ||
         (await hasPermission(username, pool, "types_delete", plantId));
}

/**
 * Check if a user has permission to manage types/configurations (any operation)
 * Uses the combined types_edit permission
 */
export async function hasManageTypesPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return (await hasPermission(username, pool, "types_edit", plantId)) ||
         (await hasPermission(username, pool, "types_view", plantId)) ||
         (await hasPermission(username, pool, "types_add", plantId)) ||
         (await hasPermission(username, pool, "types_delete", plantId));
}

/**
 * Check if a user has permission to manage vendors/suppliers (view/add/edit/delete)
 * Permission format: access_key = '<plant_id>_vendors_edit', value = 'user' or 'admin'
 * This replaces the previous separate view/add/edit/delete permissions
 */
export async function hasVendorsViewPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return (await hasPermission(username, pool, "vendors_edit", plantId)) ||
         (await hasPermission(username, pool, "vendors_view", plantId));
}

export async function hasVendorsAddPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return (await hasPermission(username, pool, "vendors_edit", plantId)) ||
         (await hasPermission(username, pool, "vendors_add", plantId));
}

export async function hasVendorsEditPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "vendors_edit", plantId);
}

export async function hasVendorsDeletePermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return (await hasPermission(username, pool, "vendors_edit", plantId)) ||
         (await hasPermission(username, pool, "vendors_delete", plantId));
}

/**
 * Check if a user has permission to manage vendors/suppliers (any operation)
 * Uses the combined vendors_edit permission
 */
export async function hasManageVendorsPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return (await hasPermission(username, pool, "vendors_edit", plantId)) ||
         (await hasPermission(username, pool, "vendors_view", plantId)) ||
         (await hasPermission(username, pool, "vendors_add", plantId)) ||
         (await hasPermission(username, pool, "vendors_delete", plantId));
}

/**
 * Check if a user has permission to manage write-off reasons (view/add/edit/delete)
 * Permission format: access_key = '<plant_id>_write_off_reasons_edit', value = 'user' or 'admin'
 * This replaces the previous separate view/add/edit/delete permissions
 */
export async function hasWriteOffReasonsViewPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return (await hasPermission(username, pool, "write_off_reasons_edit", plantId)) ||
         (await hasPermission(username, pool, "write_off_reasons_view", plantId));
}

export async function hasWriteOffReasonsAddPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return (await hasPermission(username, pool, "write_off_reasons_edit", plantId)) ||
         (await hasPermission(username, pool, "write_off_reasons_add", plantId));
}

export async function hasWriteOffReasonsEditPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "write_off_reasons_edit", plantId);
}

export async function hasWriteOffReasonsDeletePermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return (await hasPermission(username, pool, "write_off_reasons_edit", plantId)) ||
         (await hasPermission(username, pool, "write_off_reasons_delete", plantId));
}

/**
 * Check if a user has permission to manage write-off reasons (any operation)
 * Uses the combined write_off_reasons_edit permission
 */
export async function hasManageWriteOffReasonsPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return (await hasPermission(username, pool, "write_off_reasons_edit", plantId)) ||
         (await hasPermission(username, pool, "write_off_reasons_view", plantId)) ||
         (await hasPermission(username, pool, "write_off_reasons_add", plantId)) ||
         (await hasPermission(username, pool, "write_off_reasons_delete", plantId));
}

/**
 * Check if a user has permission to view/manage repairs (including sending to repair)
 * Permission format: access_key = '<plant_id>_repairs', value = 'user' or 'admin'
 * This replaces the previous separate repairs and repairs_send permissions
 */
export async function hasRepairsPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "repairs", plantId);
}

/**
 * Check if a user has permission to send equipment to repair
 * Uses the combined repairs permission (backward compatible with repairs_send)
 */
export async function hasRepairsSendPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return (await hasPermission(username, pool, "repairs", plantId)) ||
         (await hasPermission(username, pool, "repairs_send", plantId));
}

/**
 * Check if a user has permission to view PC passwords
 * @param username - The username to check
 * @param pool - The database connection pool
 * @returns true if user has permission, false otherwise
 */
export async function hasPcPwViewPermission(
  username: string,
  pool: import("mysql2/promise").Pool
): Promise<boolean> {
  // Admin user always has PC password view permission (bypasses all database checks)
  if (isAdminUser(username)) {
    return true;
  }

  try {
    // Ensure user exists
    const [users] = await pool.query<import("mysql2").RowDataPacket[]>(
      "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
      [username]
    );

    if (users.length === 0) {
      return false;
    }

    // Check for global admin first
    const [globalAdmin] = await pool.query<import("mysql2").RowDataPacket[]>(
      `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = 0
         AND permission = 'global_admin'
         AND role = 'admin'
         AND (expiry_date IS NULL OR expiry_date >= CURDATE())
       LIMIT 1`,
      [username]
    );
    if (globalAdmin.length > 0) {
      return true;
    }

    // Check for pc_pw_view permission with plant_id = 0 (global)
    const [permissions] = await pool.query<import("mysql2").RowDataPacket[]>(
      `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = 0
         AND permission = 'pc_pw_view'
         AND (expiry_date IS NULL OR expiry_date >= CURDATE())
       LIMIT 1`,
      [username]
    );

    return permissions.length > 0;
  } catch (error) {
    // Only log in non-test environments
    if (typeof process !== "undefined" && process.env.NODE_ENV !== "test" && !process.env.BUN_ENV?.includes("test")) {
      console.error(`[hasPcPwViewPermission] Error for ${username}:`, error);
    }
    return false;
  }
}

/**
 * Check if a user has permission to edit PC passwords
 * @param username - The username to check
 * @param pool - The database connection pool
 * @returns true if user has permission, false otherwise
 */
export async function hasPcPwEditPermission(
  username: string,
  pool: import("mysql2/promise").Pool
): Promise<boolean> {
  // Admin user always has PC password edit permission (bypasses all database checks)
  if (isAdminUser(username)) {
    return true;
  }

  try {
    // Ensure user exists
    const [users] = await pool.query<import("mysql2").RowDataPacket[]>(
      "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
      [username]
    );

    if (users.length === 0) {
      return false;
    }

    // Check for global admin first
    const [globalAdmin] = await pool.query<import("mysql2").RowDataPacket[]>(
      `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = 0
         AND permission = 'global_admin'
         AND role = 'admin'
         AND (expiry_date IS NULL OR expiry_date >= CURDATE())
       LIMIT 1`,
      [username]
    );
    if (globalAdmin.length > 0) {
      return true;
    }

    // Check for pc_pw_edit permission with plant_id = 0 (global)
    const [permissions] = await pool.query<import("mysql2").RowDataPacket[]>(
      `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = 0
         AND permission = 'pc_pw_edit'
         AND (expiry_date IS NULL OR expiry_date >= CURDATE())
       LIMIT 1`,
      [username]
    );

    return permissions.length > 0;
  } catch (error) {
    // Only log in non-test environments
    if (typeof process !== "undefined" && process.env.NODE_ENV !== "test" && !process.env.BUN_ENV?.includes("test")) {
      console.error(`[hasPcPwEditPermission] Error for ${username}:`, error);
    }
    return false;
  }
}

export async function changePassword(
  username: string,
  oldPassword: string,
  newPassword: string
): Promise<PasswordChangeResult> {
  try {
    // Validation: password must be at least 8 characters
    if (newPassword.length < 8) {
      return {
        success: false,
        error: "Password must contain at least 8 characters.",
      };
    }

    // Validation: must have at least one lowercase and one uppercase letter
    if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword)) {
      return {
        success: false,
        error: "Password must contain at least one lowercase and one uppercase letter.",
      };
    }

    // Validation: password cannot be same as username
    if (newPassword === username) {
      return {
        success: false,
        error: "Password cannot be the same as username.",
      };
    }

    // Validation: password cannot be same as old password
    if (newPassword === oldPassword) {
      return {
        success: false,
        error: "Password cannot be the same as old password.",
      };
    }

    // Build form data matching PHP implementation
    const formData = new URLSearchParams();
    formData.append("user", username);
    formData.append("pass", oldPassword);
    formData.append("new_pass", newPassword);

    const response = await fetch(CHANGE_PASSWORD_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      return {
        success: false,
        error: "Password change failed. Please try again.",
      };
    }

    const text = await response.text();
    const trimmed = text.trim();

    // Match PHP implementation: trim($response) === "TRUE"
    // Handle both plain text "TRUE"/"FALSE" and HTML responses
    let isSuccess = false;
    
    if (trimmed.includes("<body>")) {
      const bodyMatch = trimmed.match(/<body>(.*?)<\/body>/i);
      if (bodyMatch) {
        isSuccess = bodyMatch[1].trim() === "TRUE";
      }
    } else {
      isSuccess = trimmed === "TRUE";
    }

    if (isSuccess) {
      return {
        success: true,
        message: "Password changed successfully",
      };
    } else {
      return {
        success: false,
        error: "Password change failed. Please try again.",
      };
    }
  } catch (error) {
    // Only log in non-test environments
    if (typeof process !== "undefined" && process.env.NODE_ENV !== "test" && !process.env.BUN_ENV?.includes("test")) {
      console.error("Password change error:", error);
    }
    return {
      success: false,
      error: "An error occurred during password change. Please try again.",
    };
  }
}

