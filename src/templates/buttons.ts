/**
 * Standardized button component
 * Provides consistent button styling across the application
 */

export type ButtonVariant = "primary" | "secondary" | "success" | "danger" | "warning";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonColor = 
  | "red" | "yellow" | "green" | "blue" | "indigo" | "purple" | "pink" 
  | "gray" | "slate" | "zinc" | "neutral" | "stone" | "orange" | "amber" 
  | "lime" | "emerald" | "teal" | "cyan" | "sky" | "violet" | "fuchsia" | "rose";

interface ButtonOptions {
  variant?: ButtonVariant;
  color?: ButtonColor; // Custom color override (uses Tailwind color-600 by default)
  colorShade?: 500 | 600 | 700 | 800; // Shade of the color (default: 600)
  size?: ButtonSize;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: string; // SVG icon HTML
  iconPosition?: "left" | "right";
  className?: string;
  onClick?: string; // For inline onclick handlers
  title?: string;
  ariaLabel?: string;
}

/**
 * Generates a standardized button HTML string
 */
export function button(
  text: string,
  options: ButtonOptions = {}
): string {
  const {
    variant = "primary",
    color,
    colorShade = 600,
    size = "md",
    type = "button",
    disabled = false,
    fullWidth = false,
    icon,
    iconPosition = "left",
    className = "",
    onClick,
    title,
    ariaLabel,
  } = options;

  const sizeClass = size !== "md" ? `btn-${size}` : "";
  const widthClass = fullWidth ? "w-full" : "";
  const disabledClass = disabled ? "opacity-50 cursor-not-allowed" : "";
  
  // If custom color is provided, use it; otherwise use variant
  let variantClass: string;
  let hasColoredBackground: boolean;
  let iconColorClass: string;
  
  if (color) {
    // Custom color: build Tailwind classes
    const bgColor = `bg-${color}-${colorShade}`;
    const hoverColor = `hover:bg-${color}-${colorShade + 100}`;
    const focusRing = `focus:ring-${color}-${colorShade}`;
    const darkBgColor = `dark:bg-${color}-${Math.max(400, colorShade - 200)}`;
    const darkHoverColor = `dark:hover:bg-${color}-${Math.max(500, colorShade - 100)}`;
    
    variantClass = `${bgColor} ${hoverColor} ${focusRing} ${darkBgColor} ${darkHoverColor} text-white`;
    hasColoredBackground = true;
    iconColorClass = "text-white";
  } else {
    // Use predefined variant
    variantClass = `btn-${variant}`;
    const coloredBackgroundVariants: ButtonVariant[] = ["primary", "success", "danger", "warning"];
    hasColoredBackground = coloredBackgroundVariants.includes(variant);
    iconColorClass = hasColoredBackground ? "text-white" : "text-inherit";
  }
  
  const classes = [
    "btn",
    variantClass,
    sizeClass,
    widthClass,
    disabledClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const iconHtml = icon
    ? `<span class="inline-flex items-center justify-center ${iconPosition === "right" ? "ml-2" : text ? "mr-2" : ""} ${iconColorClass} [&_svg]:text-current">${icon}</span>`
    : "";

  // For icon-only buttons, center the icon properly
  const content = text
    ? (iconPosition === "right"
        ? `<span class="flex items-center justify-center">${escapeHtml(text)}${iconHtml}</span>`
        : `<span class="flex items-center justify-center">${iconHtml}${escapeHtml(text)}</span>`)
    : (iconHtml
        ? `<span class="flex items-center justify-center w-full">${iconHtml}</span>`
        : escapeHtml(text));

  const onClickAttr = onClick ? `onclick="${escapeHtml(onClick)}"` : "";
  const disabledAttr = disabled ? "disabled" : "";
  const titleAttr = title ? `title="${escapeHtml(title)}"` : "";
  const ariaLabelAttr = ariaLabel ? `aria-label="${escapeHtml(ariaLabel)}"` : "";

  return `<button type="${type}" class="${classes}" ${onClickAttr} ${disabledAttr} ${titleAttr} ${ariaLabelAttr}>${content}</button>`;
}

/**
 * Generates a link-styled button (for actions that navigate)
 */
export function buttonLink(
  href: string,
  text: string,
  options: Omit<ButtonOptions, "type"> = {}
): string {
  const {
    variant = "primary",
    size = "md",
    disabled = false,
    fullWidth = false,
    icon,
    iconPosition = "left",
    className = "",
    title,
    ariaLabel,
  } = options;

  const variantClass = `btn-${variant}`;
  const sizeClass = size !== "md" ? `btn-${size}` : "";
  const widthClass = fullWidth ? "w-full" : "";
  const disabledClass = disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "";
  
  // Variants with colored backgrounds need white icons
  const coloredBackgroundVariants: ButtonVariant[] = ["primary", "success", "danger", "warning"];
  const hasColoredBackground = coloredBackgroundVariants.includes(variant);
  const iconColorClass = hasColoredBackground ? "text-white" : "text-inherit";
  
  const classes = [
    "btn",
    variantClass,
    sizeClass,
    widthClass,
    disabledClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const iconHtml = icon
    ? `<span class="inline-flex items-center ${iconPosition === "right" ? "ml-2" : "mr-2"} ${iconColorClass} [&_svg]:text-current">${icon}</span>`
    : "";

  const content =
    iconPosition === "right"
      ? `<span class="flex items-center">${escapeHtml(text)}${iconHtml}</span>`
      : `<span class="flex items-center">${iconHtml}${escapeHtml(text)}</span>`;

  const titleAttr = title ? `title="${escapeHtml(title)}"` : "";
  const ariaLabelAttr = ariaLabel ? `aria-label="${escapeHtml(ariaLabel)}"` : "";

  return `<a href="${escapeHtml(href)}" class="${classes}" ${titleAttr} ${ariaLabelAttr}>${content}</a>`;
}

/**
 * Generates an inline text button (for delete, edit actions in tables)
 */
export function buttonInline(
  text: string,
  options: Omit<ButtonOptions, "type"> & { variant?: "danger" | "primary" | "secondary"; type?: "button" | "submit" | "reset" } = {}
): string {
  const {
    variant = "primary",
    type = "button",
    disabled = false,
    onClick,
    title,
    ariaLabel,
    className = "",
  } = options;

  const variantClasses = {
    danger: "text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300",
    primary: "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300",
    secondary: "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300",
  };

  const classes = [
    "text-sm font-medium transition-colors",
    variantClasses[variant],
    disabled ? "opacity-50 cursor-not-allowed" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const onClickAttr = onClick ? `onclick="${escapeHtml(onClick)}"` : "";
  const disabledAttr = disabled ? "disabled" : "";
  const titleAttr = title ? `title="${escapeHtml(title)}"` : "";
  const ariaLabelAttr = ariaLabel ? `aria-label="${escapeHtml(ariaLabel)}"` : "";

  return `<button type="${type}" class="${classes}" ${onClickAttr} ${disabledAttr} ${titleAttr} ${ariaLabelAttr}>${escapeHtml(text)}</button>`;
}

/**
 * Standardized action buttons with icons
 */

import { TRASH_ICON, EDIT_ICON, PRINTER_ICON, CHECK_ICON, ARCHIVE_ICON } from "./icons";

/**
 * Delete button - Red with trash icon
 */
export function deleteButton(options: {
  type?: "button" | "submit" | "reset";
  onClick?: string;
  title?: string;
  className?: string;
  disabled?: boolean;
} = {}): string {
  return button("", {
    type: options.type || "submit",
    variant: "danger",
    size: "sm",
    icon: TRASH_ICON,
    onClick: options.onClick,
    title: options.title || "Delete",
    className: options.className || "",
    disabled: options.disabled || false,
  });
}

/**
 * Edit button - Secondary with pen icon
 */
export function editButton(options: {
  type?: "button" | "submit" | "reset";
  onClick?: string;
  title?: string;
  className?: string;
  disabled?: boolean;
} = {}): string {
  return button("", {
    type: options.type || "submit",
    variant: "secondary",
    size: "sm",
    icon: EDIT_ICON,
    onClick: options.onClick,
    title: options.title || "Edit",
    className: options.className || "",
    disabled: options.disabled || false,
  });
}

/**
 * Print button - Green with printer icon only
 */
export function printButton(options: {
  type?: "button" | "submit" | "reset";
  onClick?: string;
  title?: string;
  className?: string;
  disabled?: boolean;
} = {}): string {
  return button("", {
    type: options.type || "button",
    variant: "success",
    size: "sm",
    icon: PRINTER_ICON,
    onClick: options.onClick,
    title: options.title || "Print",
    className: options.className || "",
    disabled: options.disabled || false,
  });
}

/**
 * Save/Check button - Secondary with check icon
 */
export function saveButton(options: {
  type?: "button" | "submit" | "reset";
  onClick?: string;
  title?: string;
  className?: string;
  disabled?: boolean;
} = {}): string {
  return button("", {
    type: options.type || "submit",
    variant: "secondary",
    size: "sm",
    icon: CHECK_ICON,
    onClick: options.onClick,
    title: options.title || "Save",
    className: options.className || "",
    disabled: options.disabled || false,
  });
}

/**
 * Deactivate button - Dark yellow with archive box icon
 */
export function deactivateButton(options: {
  type?: "button" | "submit" | "reset";
  onClick?: string;
  title?: string;
  className?: string;
  disabled?: boolean;
} = {}): string {
  return button("", {
    type: options.type || "submit",
    variant: "warning",
    size: "sm",
    icon: ARCHIVE_ICON,
    onClick: options.onClick,
    title: options.title || "Deactivate",
    className: options.className || "",
    disabled: options.disabled || false,
  });
}

/**
 * Activate button - Green success
 */
export function activateButton(options: {
  type?: "button" | "submit" | "reset";
  onClick?: string;
  title?: string;
  className?: string;
  disabled?: boolean;
} = {}): string {
  return button("Activate", {
    type: options.type || "submit",
    variant: "success",
    size: "sm",
    onClick: options.onClick,
    title: options.title || "Activate",
    className: options.className || "",
    disabled: options.disabled || false,
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
