/**
 * Shared date formatting utilities for Estonian date format (dd.mm.yyyy).
 * Used across all templates and server-side code.
 */

/**
 * Format a date string or Date object to Estonian format dd.mm.yyyy
 * Returns empty string or fallback for invalid/null dates.
 */
export function formatEstonianDate(
  date: string | Date | null | undefined,
  fallback = "",
): string {
  if (!date) return fallback;
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return fallback;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return fallback;
  }
}

/**
 * Format a date string or Date object to Estonian datetime format dd.mm.yyyy HH:mm
 */
export function formatEstonianDateTime(
  date: string | Date | null | undefined,
  fallback = "",
): string {
  if (!date) return fallback;
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return fallback;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch {
    return fallback;
  }
}

/**
 * Format a date for use as a text input value in dd.mm.yyyy format.
 * Handles MySQL DATE (YYYY-MM-DD) strings, Date objects, and ISO strings.
 */
export function formatDateForInput(
  date: string | Date | null | undefined,
): string {
  if (!date) return "";
  try {
    // If it's already in YYYY-MM-DD format, convert directly without Date parsing (avoids timezone issues)
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split("-");
      return `${day}.${month}.${year}`;
    }
    // Pure 6 digits (ddmmyy) → insert dots, expand 2-digit year
    if (typeof date === "string" && /^\d{6}$/.test(date)) {
      const yy = parseInt(date.slice(4, 6), 10);
      const fullYear = yy >= 50 ? 1900 + yy : 2000 + yy;
      return `${date.slice(0, 2)}.${date.slice(2, 4)}.${fullYear}`;
    }
    // Pure 8 digits (ddmmyyyy) → insert dots
    if (typeof date === "string" && /^\d{8}$/.test(date)) {
      return `${date.slice(0, 2)}.${date.slice(2, 4)}.${date.slice(4)}`;
    }
    // If it's already in dd.mm.yyyy format (or dd,mm,yyyy / dd-mm-yyyy), normalize and return
    if (typeof date === "string" && /^\d{2}[.,-]\d{2}[.,-]\d{4}$/.test(date)) {
      return date.replace(/[,-]/g, ".");
    }
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return "";
  }
}

/**
 * Parse an Estonian date string (dd.mm.yyyy) to ISO format (yyyy-mm-dd) for MySQL storage.
 * Also accepts commas (dd,mm,yyyy), dashes (dd-mm-yyyy), pure digits (ddmmyyyy or ddmmyy),
 * and yyyy-mm-dd (pass-through).
 * Returns null if the input is empty or invalid.
 */
export function parseEstonianDate(
  dateStr: string | null | undefined,
): string | null {
  if (!dateStr || dateStr.trim() === "") return null;
  // Normalize commas and dashes to dots
  let trimmed = dateStr.trim().replace(/[,-]/g, ".");

  // Pure 6 digits (ddmmyy) → insert dots, expand 2-digit year
  if (/^\d{6}$/.test(trimmed)) {
    const yy = parseInt(trimmed.slice(4, 6), 10);
    const fullYear = yy >= 50 ? 1900 + yy : 2000 + yy;
    trimmed = `${trimmed.slice(0, 2)}.${trimmed.slice(2, 4)}.${fullYear}`;
  }

  // Pure 8 digits (ddmmyyyy) → insert dots
  if (/^\d{8}$/.test(trimmed)) {
    trimmed = `${trimmed.slice(0, 2)}.${trimmed.slice(2, 4)}.${trimmed.slice(4)}`;
  }

  // Already in yyyy-mm-dd format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Estonian format dd.mm.yyyy (now normalized to dots)
  const match = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Returns a client-side JavaScript snippet with date formatting helper functions.
 * Include this once per page (in layout) so all client-side scripts can use it.
 */
export function clientDateScript(): string {
  return `
    function formatEstonianDate(dateStr) {
      if (!dateStr) return '';
      try {
        // Handle YYYY-MM-DD strings directly to avoid timezone issues
        if (typeof dateStr === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(dateStr)) {
          var parts = dateStr.split('-');
          return parts[2] + '.' + parts[1] + '.' + parts[0];
        }
        var d = dateStr instanceof Date ? dateStr : new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        var day = String(d.getDate()).padStart(2, '0');
        var month = String(d.getMonth() + 1).padStart(2, '0');
        var year = d.getFullYear();
        return day + '.' + month + '.' + year;
      } catch(e) { return ''; }
    }

    function formatEstonianDateTime(dateStr) {
      if (!dateStr) return '';
      try {
        var d = dateStr instanceof Date ? dateStr : new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        var day = String(d.getDate()).padStart(2, '0');
        var month = String(d.getMonth() + 1).padStart(2, '0');
        var year = d.getFullYear();
        var hours = String(d.getHours()).padStart(2, '0');
        var minutes = String(d.getMinutes()).padStart(2, '0');
        return day + '.' + month + '.' + year + ' ' + hours + ':' + minutes;
      } catch(e) { return ''; }
    }

    // Expand 2-digit year: 00-49 → 2000s, 50-99 → 1900s
    function expandYear(yy) {
      var n = parseInt(yy, 10);
      return (n >= 50 ? 1900 + n : 2000 + n);
    }

    // Auto-replace commas and dashes with dots in date input fields
    document.addEventListener('input', function(e) {
      var el = e.target;
      if (el && el.tagName === 'INPUT' && el.placeholder === 'dd.mm.yyyy') {
        var pos = el.selectionStart;
        var prev = el.value;
        var next = prev.replace(/[,-]/g, '.');
        if (prev !== next) {
          el.value = next;
          el.setSelectionRange(pos, pos);
        }
      }
    });

    // On blur, auto-format pure digit inputs (ddmmyy or ddmmyyyy) into dd.mm.yyyy
    document.addEventListener('focusout', function(e) {
      var el = e.target;
      if (el && el.tagName === 'INPUT' && el.placeholder === 'dd.mm.yyyy') {
        var v = el.value.trim();
        if (/^\\d{6}$/.test(v)) {
          el.value = v.slice(0, 2) + '.' + v.slice(2, 4) + '.' + expandYear(v.slice(4, 6));
        } else if (/^\\d{8}$/.test(v)) {
          el.value = v.slice(0, 2) + '.' + v.slice(2, 4) + '.' + v.slice(4);
        }
      }
    });
  `;
}
