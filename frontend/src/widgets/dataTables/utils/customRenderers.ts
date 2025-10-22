import {
  CustomRenderer,
  GridCellKind,
  CustomCell,
} from '@glideapps/glide-data-grid';
import { getIconImage, isValidIconName } from './iconRenderer';

/**
 * Data structure for icon cells
 */
export interface IconCellData {
  kind: 'icon-cell';
  iconName: string;
  align?: 'left' | 'center' | 'right';
}

/**
 * Type definition for icon custom cells
 */
export type IconCell = CustomCell<IconCellData>;

/**
 * Custom cell renderer for displaying Lucide icons in table cells
 */
export const iconCellRenderer: CustomRenderer<IconCell> = {
  kind: GridCellKind.Custom,

  isMatch: (cell: CustomCell): cell is IconCell =>
    cell.kind === GridCellKind.Custom &&
    (cell.data as IconCellData | undefined)?.kind === 'icon-cell',

  draw: (args, cell) => {
    const { ctx, rect, theme } = args;
    const iconName = cell.data?.iconName;
    const align = cell.data?.align || 'left';

    if (!iconName) return false;

    // Validate icon exists
    if (!isValidIconName(iconName)) {
      // Draw error indicator for invalid icon
      ctx.fillStyle = theme.textDark;
      ctx.font = '12px sans-serif';
      const errorX =
        align === 'center'
          ? rect.x + rect.width / 2 - 4
          : align === 'right'
            ? rect.x + rect.width - 20
            : rect.x + 16;
      ctx.fillText('?', errorX, rect.y + rect.height / 2 + 4);
      return true;
    }

    // Get icon image (cached or newly created)
    const iconImage = getIconImage(iconName, {
      size: 20,
      color: theme.textDark,
      strokeWidth: 2,
    });

    if (iconImage && iconImage.complete) {
      // Draw the icon with specified alignment
      const iconSize = 20;
      const padding = 16;
      let x: number;

      switch (align) {
        case 'center':
          x = rect.x + (rect.width - iconSize) / 2;
          break;
        case 'right':
          x = rect.x + rect.width - iconSize - padding;
          break;
        case 'left':
        default:
          x = rect.x + padding;
      }

      const y = rect.y + (rect.height - iconSize) / 2;
      ctx.drawImage(iconImage, x, y, iconSize, iconSize);
      return true;
    }

    // If image is not complete, draw placeholder with specified alignment
    const padding = 16;
    let centerX: number;

    switch (align) {
      case 'center':
        centerX = rect.x + rect.width / 2;
        break;
      case 'right':
        centerX = rect.x + rect.width - padding - 10;
        break;
      case 'left':
      default:
        centerX = rect.x + padding + 10;
    }

    ctx.fillStyle = theme.textMedium;
    ctx.beginPath();
    ctx.arc(centerX, rect.y + rect.height / 2, 4, 0, 2 * Math.PI);
    ctx.fill();

    return true;
  },

  // Support pasting icon names
  onPaste: (value: string, data: IconCellData) => {
    if (typeof value === 'string' && isValidIconName(value)) {
      return {
        ...data,
        iconName: value,
      };
    }
    return undefined;
  },
};

/**
 * Data structure for label cells
 */
export interface LabelCellData {
  kind: 'label-cell';
  label: string;
  align?: 'left' | 'center' | 'right';
}

/**
 * Type definition for label custom cells
 */
export type LabelCell = CustomCell<LabelCellData>;

/**
 * Configuration for label cell styling
 */
const LABEL_STYLE = {
  // Cell padding
  cellPaddingX: 8,

  // Label dimensions
  labelPaddingX: 12,
  labelPaddingY: 8,
  borderRadius: 8,

  // Typography
  fontSize: 12,
  fontWeight: '500',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',

  // Effects
  shadowColor: 'rgba(0, 0, 0, 0.08)',
  shadowBlur: 2,
  shadowOffsetY: 1,

  // Optional: Add border for more definition
  borderWidth: 0, // Set to 1 to enable border
  borderOpacity: 0.2, // Border opacity (when enabled)
};

/**
 * Predefined color palette for labels using project colors
 */
const labelColorPalette = [
  { bg: '#00cc92', fg: '#000000' }, // primary (green)
  { bg: '#dd5860', fg: '#ffffff' }, // red
  { bg: '#373bda', fg: '#ffffff' }, // blue
  { bg: '#deb145', fg: '#000000' }, // amber
  { bg: '#844cc0', fg: '#ffffff' }, // purple
  { bg: '#f3a43b', fg: '#000000' }, // orange
  { bg: '#86d26f', fg: '#000000' }, // light green
  { bg: '#5b9ba8', fg: '#ffffff' }, // teal
  { bg: '#76cd94', fg: '#000000' }, // emerald
  { bg: '#ca8622', fg: '#ffffff' }, // gold (adjusted for better contrast)
  { bg: '#e48e91', fg: '#000000' }, // rose
  { bg: '#4469c0', fg: '#ffffff' }, // cyan
  { bg: '#91c7ae', fg: '#000000' }, // mint
  { bg: '#c377a0', fg: '#ffffff' }, // pink (adjusted for better contrast)
  { bg: '#749f83', fg: '#ffffff' }, // sage (adjusted for better contrast)
  { bg: '#d48265', fg: '#000000' }, // terracotta
];

/**
 * Custom color mappings for specific label texts
 * Add entries here to override the automatic color assignment
 */
const customLabelColors: Record<string, { bg: string; fg: string }> = {
  // Examples:
  VIP: { bg: '#ffd700', fg: '#000000' }, // Gold
  Premium: { bg: '#844cc0', fg: '#ffffff' }, // Purple
  Trial: { bg: '#deb145', fg: '#000000' }, // Amber
  Active: { bg: '#00cc92', fg: '#000000' }, // Green
  New: { bg: '#373bda', fg: '#ffffff' }, // Blue
  Beta: { bg: '#f3a43b', fg: '#000000' }, // Orange
  // Add more custom mappings as needed
};

/**
 * Get a consistent color for a label based on its text
 */
function getLabelColor(text: string): { bg: string; fg: string } {
  // Check for custom color mapping first
  if (customLabelColors[text]) {
    return customLabelColors[text];
  }

  // Otherwise use hash-based color assignment
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % labelColorPalette.length;
  return labelColorPalette[index];
}

/**
 * Custom cell renderer for displaying single colored labels in table cells
 */
export const labelCellRenderer: CustomRenderer<LabelCell> = {
  kind: GridCellKind.Custom,

  isMatch: (cell: CustomCell): cell is LabelCell =>
    cell.kind === GridCellKind.Custom &&
    (cell.data as LabelCellData | undefined)?.kind === 'label-cell',

  draw: (args, cell) => {
    const { ctx, rect } = args;
    const label = cell.data?.label;
    const align = cell.data?.align || 'left';

    if (!label) return false;

    // Get color for this label
    const colors = getLabelColor(label);

    // Use configuration values
    const {
      cellPaddingX,
      labelPaddingX,
      labelPaddingY,
      borderRadius,
      fontSize,
      fontWeight,
      fontFamily,
      shadowColor,
      shadowBlur,
      shadowOffsetY,
      borderWidth,
      borderOpacity,
    } = LABEL_STYLE;

    // Set up text style
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    // Measure text precisely
    const metrics = ctx.measureText(label);
    const textWidth = metrics.width;
    const labelWidth = textWidth + labelPaddingX * 2;
    const labelHeight = fontSize + labelPaddingY * 2;

    // Calculate position based on alignment
    let x: number;
    switch (align) {
      case 'center':
        x = rect.x + (rect.width - labelWidth) / 2;
        break;
      case 'right':
        x = rect.x + rect.width - labelWidth - cellPaddingX;
        break;
      case 'left':
      default:
        x = rect.x + cellPaddingX;
    }

    // Center vertically in the cell
    const y = rect.y + (rect.height - labelHeight) / 2;

    // Add subtle shadow for depth
    ctx.save();
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetY = shadowOffsetY;

    // Draw label background with rounded corners
    ctx.fillStyle = colors.bg;
    ctx.beginPath();
    ctx.roundRect(x, y, labelWidth, labelHeight, borderRadius);
    ctx.fill();

    // Optional: Add border for more definition
    if (borderWidth > 0) {
      ctx.strokeStyle = `rgba(0, 0, 0, ${borderOpacity})`;
      ctx.lineWidth = borderWidth;
      ctx.stroke();
    }

    // Reset shadow for text
    ctx.restore();

    // Draw label text - perfectly centered
    ctx.fillStyle = colors.fg;
    ctx.fillText(label, x + labelPaddingX, y + labelHeight / 2);

    return true;
  },

  // Support pasting label text
  onPaste: (value: string, data: LabelCellData) => {
    const trimmedValue = value.trim();
    if (trimmedValue) {
      return {
        ...data,
        label: trimmedValue,
      };
    }
    return undefined;
  },
};
