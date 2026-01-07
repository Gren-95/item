const AUTH_ENDPOINT = process.env.AUTH_ENDPOINT || "http://localhost/auth/";
const CHANGE_PASSWORD_ENDPOINT = process.env.CHANGE_PASSWORD_ENDPOINT || (() => {
  // If PMS_DB_HOST is set, construct the URL like PHP does
  const host = process.env.PMS_DB_HOST;
  if (host) {
    return `http://${host}/lswkpi/ajax/t6nu/changePass.php`;
  }
  return "http://rakintra/lswkpi/ajax/t6nu/changePass.php";
})();

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
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
    // Log error but don't expose it
    console.error("Authentication error:", error);
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
    const [perms] = await pool.query<import("mysql2").RowDataPacket[]>(
      `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND permission = 'login'
         AND plant_id = 0
         AND role IN ('user','admin')
       LIMIT 1`,
      [username]
    );

    return perms.length > 0;
  } catch (error) {
    console.error("Permission check error:", error);
    return false;
  }
}

/**
 * Get user's plant_id from their employee_no
 * @param username - The username to check
 * @param pool - The database connection pool
 * @returns plant_id or null if not found
 */
export async function getUserPlantId(
  username: string,
  pool: import("mysql2/promise").Pool
): Promise<number | null> {
  try {
    // Get user's employee_no from employees list
    const [users] = await pool.query<import("mysql2").RowDataPacket[]>(
      "SELECT employee_no FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
      [username]
    );

    if (users.length === 0 || !users[0].employee_no) {
      return null;
    }

    const employeeNo = users[0].employee_no;

    // Get plant_id from employee's most recent equipment assignment
    // This gets the plant from the location hierarchy of equipment assigned to the employee
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
    console.error("Error getting user plant_id:", error);
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
    const [globalAdmin] = await pool.query<import("mysql2").RowDataPacket[]>(
      `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = 0
         AND permission = 'global_admin'
         AND role = 'admin'
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
    const permission = permissionName;
    const [permissions] = await pool.query<import("mysql2").RowDataPacket[]>(
      `SELECT id, role FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = ?
         AND permission = ?
         AND role IN (?, ?)`,
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
    console.error(`Permission check error for ${permissionName}:`, error);
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
  try {
    // Ensure user exists
    const [users] = await pool.query<import("mysql2").RowDataPacket[]>(
      "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
      [username]
    );

    if (users.length === 0) {
      return false;
    }

   // Check if user has admin role on any plant-scoped permission or global admin
    const [pagePermissions] = await pool.query<import("mysql2").RowDataPacket[]>(
      `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND role = 'admin'
       LIMIT 1`,
      [username]
    );

    return pagePermissions.length > 0;
  } catch (error) {
    console.error("Admin permission check error:", error);
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
  const permissionNames = [
    "search",
    "add",
    "edit",
    "locations_view",
    "locations_add",
    "locations_edit",
    "locations_delete",
    "types_view",
    "types_add",
    "types_edit",
    "types_delete",
    "vendors_view",
    "vendors_add",
    "vendors_edit",
    "vendors_delete",
    "write_off_reasons_view",
    "write_off_reasons_add",
    "write_off_reasons_edit",
    "write_off_reasons_delete",
    "repairs",
    "repairs_send",
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
 * Permission format: access_key = '<plant_id>_search', value = 'user' or 'admin'
 * @param username - The username to check
 * @param pool - The database connection pool
 * @param plantId - Optional plant_id to check
 * @returns true if user has permission, false otherwise
 */
export async function hasSearchPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "search", plantId);
}

/**
 * Check if a user has permission to add equipment
 * Permission format: access_key = '<plant_id>_add', value = 'user' or 'admin'
 * @param username - The username to check
 * @param pool - The database connection pool
 * @param plantId - Optional plant_id to check
 * @returns true if user has permission, false otherwise
 */
export async function hasAddEquipmentPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "add", plantId);
}

/**
 * Check if a user has permission to edit equipment
 * Permission format: access_key = '<plant_id>_edit', value = 'user' or 'admin'
 * @param username - The username to check
 * @param pool - The database connection pool
 * @param plantId - Optional plant_id to check
 * @returns true if user has permission, false otherwise
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
 * Check if a user has permission to view locations
 * Permission format: access_key = '<plant_id>_locations_view', value = 'user' or 'admin'
 */
export async function hasLocationsViewPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "locations_view", plantId);
}

/**
 * Check if a user has permission to add locations
 * Permission format: access_key = '<plant_id>_locations_add', value = 'user' or 'admin'
 */
export async function hasLocationsAddPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "locations_add", plantId);
}

/**
 * Check if a user has permission to edit locations
 * Permission format: access_key = '<plant_id>_locations_edit', value = 'user' or 'admin'
 */
export async function hasLocationsEditPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "locations_edit", plantId);
}

/**
 * Check if a user has permission to delete locations
 * Permission format: access_key = '<plant_id>_locations_delete', value = 'user' or 'admin'
 */
export async function hasLocationsDeletePermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "locations_delete", plantId);
}

/**
 * Check if a user has permission to manage locations (any operation)
 * Checks for view, add, edit, or delete permissions
 */
export async function hasManageLocationsPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return (
    await hasLocationsViewPermission(username, pool, plantId) ||
    await hasLocationsAddPermission(username, pool, plantId) ||
    await hasLocationsEditPermission(username, pool, plantId) ||
    await hasLocationsDeletePermission(username, pool, plantId)
  );
}

/**
 * Check if a user has permission to view types/configurations
 * Permission format: access_key = '<plant_id>_types_view', value = 'user' or 'admin'
 */
export async function hasTypesViewPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "types_view", plantId);
}

/**
 * Check if a user has permission to add types/configurations
 * Permission format: access_key = '<plant_id>_types_add', value = 'user' or 'admin'
 */
export async function hasTypesAddPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "types_add", plantId);
}

/**
 * Check if a user has permission to edit types/configurations
 * Permission format: access_key = '<plant_id>_types_edit', value = 'user' or 'admin'
 */
export async function hasTypesEditPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "types_edit", plantId);
}

/**
 * Check if a user has permission to delete types/configurations
 * Permission format: access_key = '<plant_id>_types_delete', value = 'user' or 'admin'
 */
export async function hasTypesDeletePermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "types_delete", plantId);
}

/**
 * Check if a user has permission to manage types/configurations (any operation)
 */
export async function hasManageTypesPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return (
    await hasTypesViewPermission(username, pool, plantId) ||
    await hasTypesAddPermission(username, pool, plantId) ||
    await hasTypesEditPermission(username, pool, plantId) ||
    await hasTypesDeletePermission(username, pool, plantId)
  );
}

/**
 * Check if a user has permission to view vendors/suppliers
 * Permission format: access_key = '<plant_id>_vendors_view', value = 'user' or 'admin'
 */
export async function hasVendorsViewPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "vendors_view", plantId);
}

/**
 * Check if a user has permission to add vendors/suppliers
 * Permission format: access_key = '<plant_id>_vendors_add', value = 'user' or 'admin'
 */
export async function hasVendorsAddPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "vendors_add", plantId);
}

/**
 * Check if a user has permission to edit vendors/suppliers
 * Permission format: access_key = '<plant_id>_vendors_edit', value = 'user' or 'admin'
 */
export async function hasVendorsEditPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "vendors_edit", plantId);
}

/**
 * Check if a user has permission to delete vendors/suppliers
 * Permission format: access_key = '<plant_id>_vendors_delete', value = 'user' or 'admin'
 */
export async function hasVendorsDeletePermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "vendors_delete", plantId);
}

/**
 * Check if a user has permission to manage vendors/suppliers (any operation)
 */
export async function hasManageVendorsPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return (
    await hasVendorsViewPermission(username, pool, plantId) ||
    await hasVendorsAddPermission(username, pool, plantId) ||
    await hasVendorsEditPermission(username, pool, plantId) ||
    await hasVendorsDeletePermission(username, pool, plantId)
  );
}

/**
 * Check if a user has permission to view write-off reasons
 * Permission format: access_key = '<plant_id>_write_off_reasons_view', value = 'user' or 'admin'
 */
export async function hasWriteOffReasonsViewPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "write_off_reasons_view", plantId);
}

/**
 * Check if a user has permission to add write-off reasons
 * Permission format: access_key = '<plant_id>_write_off_reasons_add', value = 'user' or 'admin'
 */
export async function hasWriteOffReasonsAddPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "write_off_reasons_add", plantId);
}

/**
 * Check if a user has permission to edit write-off reasons
 * Permission format: access_key = '<plant_id>_write_off_reasons_edit', value = 'user' or 'admin'
 */
export async function hasWriteOffReasonsEditPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "write_off_reasons_edit", plantId);
}

/**
 * Check if a user has permission to delete write-off reasons
 * Permission format: access_key = '<plant_id>_write_off_reasons_delete', value = 'user' or 'admin'
 */
export async function hasWriteOffReasonsDeletePermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "write_off_reasons_delete", plantId);
}

/**
 * Check if a user has permission to manage write-off reasons (any operation)
 */
export async function hasManageWriteOffReasonsPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return (
    await hasWriteOffReasonsViewPermission(username, pool, plantId) ||
    await hasWriteOffReasonsAddPermission(username, pool, plantId) ||
    await hasWriteOffReasonsEditPermission(username, pool, plantId) ||
    await hasWriteOffReasonsDeletePermission(username, pool, plantId)
  );
}

/**
 * Check if a user has permission to view/manage repairs
 * Permission format: access_key = '<plant_id>_repairs', value = 'user' or 'admin'
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
 * Permission format: access_key = '<plant_id>_repairs_send', value = 'user' or 'admin'
 */
export async function hasRepairsSendPermission(
  username: string,
  pool: import("mysql2/promise").Pool,
  plantId?: number | null
): Promise<boolean> {
  const isAdmin = await hasAdminPermission(username, pool);
  if (isAdmin) return true;
  return hasPermission(username, pool, "repairs_send", plantId);
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
    console.error("Password change error:", error);
    return {
      success: false,
      error: "An error occurred during password change. Please try again.",
    };
  }
}

