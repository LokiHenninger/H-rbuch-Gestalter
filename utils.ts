
/**
 * Converts a hex color string to an rgba string.
 * @param hex - The hex color code (e.g., "#RRGGBB").
 * @param alpha - The alpha transparency value (0 to 1).
 * @returns The rgba color string.
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => {
    return r + r + g + g + b + b;
  });

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    // Fallback for invalid hex, e.g., during initial state or error
    return `rgba(200, 200, 200, ${alpha})`;
  }

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
