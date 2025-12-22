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

/**
 * Check if a user has the item_login permission
 * @param username - The username to check
 * @param pool - The database connection pool
 * @returns true if user has permission, false otherwise
 */
export async function hasItemLoginPermission(
  username: string,
  pool: import("mysql2/promise").Pool
): Promise<boolean> {
  try {
    // First, get the user_id from the username
    const [users] = await pool.query<import("mysql2").RowDataPacket[]>(
      "SELECT id FROM `core`.`users` WHERE `user` = ? AND `active` = 1",
      [username]
    );

    if (users.length === 0) {
      return false;
    }

    const userId = users[0].id;

    // Check if user has item_login permission (access_key = 'item', value = 'login')
    // and the permission is currently valid (between start_date and end_date)
    const [permissions] = await pool.query<import("mysql2").RowDataPacket[]>(
      `SELECT id FROM \`core\`.\`user_permissions\`
       WHERE user_id = ?
         AND access_key = 'item'
         AND value = 'login'
         AND start_date <= CURDATE()
         AND end_date >= CURDATE()`,
      [userId]
    );

    return permissions.length > 0;
  } catch (error) {
    console.error("Permission check error:", error);
    // On error, deny access for security
    return false;
  }
}

/**
 * Check if a user has the admin permission
 * @param username - The username to check
 * @param pool - The database connection pool
 * @returns true if user has permission, false otherwise
 */
export async function hasAdminPermission(
  username: string,
  pool: import("mysql2/promise").Pool
): Promise<boolean> {
  try {
    // First, get the user_id from the username
    const [users] = await pool.query<import("mysql2").RowDataPacket[]>(
      "SELECT id FROM `core`.`users` WHERE `user` = ? AND `active` = 1",
      [username]
    );

    if (users.length === 0) {
      return false;
    }

    const userId = users[0].id;

    // Check if user has admin permission (access_key = 'item', value = 'admin')
    // and the permission is currently valid (between start_date and end_date)
    const [permissions] = await pool.query<import("mysql2").RowDataPacket[]>(
      `SELECT id FROM \`core\`.\`user_permissions\`
       WHERE user_id = ?
         AND access_key = 'item'
         AND value = 'admin'
         AND start_date <= CURDATE()
         AND end_date >= CURDATE()`,
      [userId]
    );

    return permissions.length > 0;
  } catch (error) {
    console.error("Admin permission check error:", error);
    // On error, deny access for security
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
    console.error("Password change error:", error);
    return {
      success: false,
      error: "An error occurred during password change. Please try again.",
    };
  }
}

