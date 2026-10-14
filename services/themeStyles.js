import { StyleSheet } from 'react-native';

export const LIGHT_PALETTE = {
  background: '#e1e7e3',
  surface: '#eaf0ec',
  elevated: '#d4ded8',
  border: '#bdcbc2',
  text: '#111111',
  muted: '#4c5d53',
  subtle: '#5e6d64',
  accent: '#456d13',
};

const DARK_SURFACES = new Map([
  ['#000', LIGHT_PALETTE.background],
  ['#000000', LIGHT_PALETTE.background],
  ['#050505', LIGHT_PALETTE.background],
  ['#080808', LIGHT_PALETTE.background],
  ['#0a0a0a', LIGHT_PALETTE.background],
  ['#0f0f0f', LIGHT_PALETTE.background],
  ['#111', LIGHT_PALETTE.surface],
  ['#111111', LIGHT_PALETTE.surface],
  ['#121212', LIGHT_PALETTE.surface],
  ['#131313', LIGHT_PALETTE.surface],
  ['#141414', LIGHT_PALETTE.surface],
  ['#151515', LIGHT_PALETTE.surface],
  ['#161616', LIGHT_PALETTE.surface],
  ['#171717', LIGHT_PALETTE.surface],
  ['#181818', LIGHT_PALETTE.surface],
  ['#1a1a1a', LIGHT_PALETTE.elevated],
  ['#1e1e1e', LIGHT_PALETTE.elevated],
  ['#171719', LIGHT_PALETTE.elevated],
  ['#242428', LIGHT_PALETTE.elevated],
  ['#29292d', LIGHT_PALETTE.border],
  ['#222', LIGHT_PALETTE.border],
  ['#222222', LIGHT_PALETTE.border],
  ['#252525', LIGHT_PALETTE.border],
  ['#292929', LIGHT_PALETTE.border],
  ['#2a2a2a', LIGHT_PALETTE.border],
  ['#333', LIGHT_PALETTE.border],
  ['#333333', LIGHT_PALETTE.border],
  ['#383838', LIGHT_PALETTE.border],
  ['#444', LIGHT_PALETTE.border],
  ['#444444', LIGHT_PALETTE.border],
]);

const LIGHT_TEXT = new Map([
  ['#fff', LIGHT_PALETTE.text],
  ['#ffffff', LIGHT_PALETTE.text],
  ['#f5f5f5', LIGHT_PALETTE.text],
  ['#eee', LIGHT_PALETTE.text],
  ['#e5e5e5', LIGHT_PALETTE.text],
  ['#e5e5e7', LIGHT_PALETTE.text],
  ['#b8b8bd', LIGHT_PALETTE.muted],
  ['#d4d4d8', LIGHT_PALETTE.muted],
  ['#fca5a5', '#b91c1c'],
  ['#ccc', LIGHT_PALETTE.muted],
  ['#bbb', LIGHT_PALETTE.muted],
  ['#aaa', LIGHT_PALETTE.muted],
  ['#999', LIGHT_PALETTE.muted],
  ['#888', LIGHT_PALETTE.subtle],
  ['#777', LIGHT_PALETTE.subtle],
  ['#666', LIGHT_PALETTE.subtle],
  ['#a3e635', LIGHT_PALETTE.accent],
  ['#84cc16', '#4d7c0f'],
  ['#38bdf8', '#0369a1'],
  ['#c084fc', '#7e22ce'],
  ['#fbbf24', '#92400e'],
  ['#fb923c', '#c2410c'],
  ['#f472b6', '#be185d'],
  ['#34d399', '#047857'],
  ['#f87171', '#b91c1c'],
  ['#60a5fa', '#1d4ed8'],
  ['#818cf8', '#4338ca'],
  ['#22c55e', '#15803d'],
  ['#14b8a6', '#0f766e'],
  ['#f97316', '#c2410c'],
  ['#ec4899', '#be185d'],
  ['#ef4444', '#b91c1c'],
]);

const BACKGROUND_KEYS = new Set(['backgroundColor']);
const BORDER_KEYS = new Set(['borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor']);
const TEXT_KEYS = new Set(['color', 'placeholderTextColor', 'selectionColor', 'tintColor']);

const parseColor = value => {
  if (typeof value !== 'string') return null;
  const color = value.trim().toLowerCase();
  if (color === 'black') return { red: 0, green: 0, blue: 0, alpha: 1 };
  if (color === 'white') return { red: 255, green: 255, blue: 255, alpha: 1 };
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (hex) {
    const shortHex = hex[1].length <= 4;
    const digits = shortHex
      ? hex[1].split('').map(digit => digit + digit).join('')
      : hex[1];
    return {
      red: parseInt(digits.slice(0, 2), 16),
      green: parseInt(digits.slice(2, 4), 16),
      blue: parseInt(digits.slice(4, 6), 16),
      alpha: digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1,
    };
  }
  const rgb = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/);
  if (!rgb) return null;
  return {
    red: Number(rgb[1]),
    green: Number(rgb[2]),
    blue: Number(rgb[3]),
    alpha: rgb[4] === undefined ? 1 : Number(rgb[4]),
  };
};

const getDarkSurfaceReplacement = (value, minimumAlpha = 0.9) => {
  const parsed = parseColor(value);
  if (!parsed || parsed.alpha < minimumAlpha) return null;
  const { red, green, blue } = parsed;
  const lightness = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
  const channelSpread = Math.max(red, green, blue) - Math.min(red, green, blue);
  if (lightness >= 0.34 || channelSpread > 46) return null;
  if (lightness < 0.07) return LIGHT_PALETTE.background;
  if (lightness < 0.19) return LIGHT_PALETTE.surface;
  return LIGHT_PALETTE.elevated;
};

const isDarkColor = value => {
  const parsed = parseColor(value);
  if (!parsed || parsed.alpha < 0.9) return false;
  const lightness = (parsed.red * 0.2126 + parsed.green * 0.7152 + parsed.blue * 0.0722) / 255;
  return lightness < 0.34;
};

const isDarkUnmappedColor = value => {
  return isDarkColor(value) && !getDarkSurfaceReplacement(value);
};

const getLightForegroundReplacement = value => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  const mapped = LIGHT_TEXT.get(normalized);
  if (mapped) return mapped;

  const parsed = parseColor(value);
  if (!parsed || parsed.alpha < 0.5) return value;
  const lightness = (parsed.red * 0.2126 + parsed.green * 0.7152 + parsed.blue * 0.0722) / 255;
  const channelSpread = Math.max(parsed.red, parsed.green, parsed.blue) - Math.min(parsed.red, parsed.green, parsed.blue);
  return lightness >= 0.72 && channelSpread <= 46 ? LIGHT_PALETTE.text : value;
};

const getLightSurfaceReplacement = value => {
  const parsed = parseColor(value);
  if (!parsed || parsed.alpha < 0.04) return null;
  const lightness = (parsed.red * 0.2126 + parsed.green * 0.7152 + parsed.blue * 0.0722) / 255;
  const channelSpread = Math.max(parsed.red, parsed.green, parsed.blue) - Math.min(parsed.red, parsed.green, parsed.blue);
  if (lightness < 0.72 || channelSpread > 46) return null;
  return lightness >= 0.92 ? LIGHT_PALETTE.surface : LIGHT_PALETTE.elevated;
};

const adaptInteractiveStyle = style => {
  const flattened = style ? StyleSheet.flatten(style) : null;
  if (!flattened || !flattened.backgroundColor) return style;
  const replacement = getDarkSurfaceReplacement(flattened.backgroundColor, 0.55);
  return replacement ? { ...flattened, backgroundColor: replacement } : style;
};

export function adaptStyleForLightTheme(style, preserveDarkForeground = false) {
  if (Array.isArray(style)) {
    return style.map(item => adaptStyleForLightTheme(item, preserveDarkForeground));
  }
  if (typeof style === 'number') {
    const resolvedStyle = StyleSheet.flatten(style);
    return resolvedStyle ? adaptStyleForLightTheme(resolvedStyle, preserveDarkForeground) : style;
  }
  if (!style || typeof style !== 'object') return style;

  const updated = { ...style };
  for (const key of Object.keys(updated)) {
    const value = updated[key];
    if (typeof value !== 'string') continue;
    const normalized = value.toLowerCase();
    if (BACKGROUND_KEYS.has(key)) {
      updated[key] = DARK_SURFACES.get(normalized)
        || getDarkSurfaceReplacement(value)
        || getLightSurfaceReplacement(value)
        || value;
    } else if (BORDER_KEYS.has(key)) {
      updated[key] = DARK_SURFACES.has(normalized) || getDarkSurfaceReplacement(value)
        ? LIGHT_PALETTE.border
        : getLightSurfaceReplacement(value) || value;
    } else if (TEXT_KEYS.has(key) && !preserveDarkForeground) {
      updated[key] = getLightForegroundReplacement(value);
    }
  }
  return updated;
}

export function adaptTreeForLightTheme(node, React, fallbackKey, preserveDarkForeground = false) {
  if (Array.isArray(node)) {
    return node.map((child, index) =>
      adaptTreeForLightTheme(child, React, index, preserveDarkForeground)
    );
  }
  if (!React.isValidElement(node)) return node;

  const props = { ...node.props };
  if (node.key == null && fallbackKey !== undefined) props.key = fallbackKey;
  const interactive = typeof props.onPress === 'function';
  const originalFlattenedStyle = props.style ? StyleSheet.flatten(props.style) : null;
  const originalStyleBackground = originalFlattenedStyle?.backgroundColor;
  const isMappedStyleBackground = DARK_SURFACES.has(String(originalStyleBackground || '').toLowerCase())
    || Boolean(getDarkSurfaceReplacement(originalStyleBackground, interactive ? 0.55 : 0.9));
  if (interactive) props.style = adaptInteractiveStyle(props.style);
  let flattenedStyle = props.style ? StyleSheet.flatten(props.style) : null;
  const hasSingleTextLabel = React.isValidElement(props.children)
    && (typeof props.children.props.children === 'string' || typeof props.children.props.children === 'number');
  if (interactive && hasSingleTextLabel && flattenedStyle?.backgroundColor && !flattenedStyle.flexDirection) {
    props.style = [
      props.style,
      {
        alignItems: flattenedStyle?.alignItems || 'center',
        justifyContent: flattenedStyle?.justifyContent || 'center',
      },
    ];
    const labelStyle = props.children.props.style ? StyleSheet.flatten(props.children.props.style) : {};
    if (!labelStyle.textAlign) {
      props.children = React.cloneElement(props.children, {
        style: [props.children.props.style, { textAlign: 'center' }],
      });
    }
    flattenedStyle = StyleSheet.flatten(props.style);
  }
  const styleBackground = flattenedStyle?.backgroundColor;
  const componentColors = Array.isArray(props.colors) ? props.colors : null;
  const hasUnmappedDarkComponentColor = componentColors?.some(color =>
    isDarkColor(color) && !getDarkSurfaceReplacement(color, 0.55)
  ) || false;
  const darkComponentSurface = componentColors
    ? hasUnmappedDarkComponentColor
    : props.children && typeof props.color === 'string' && isDarkColor(props.color);
  if (componentColors) {
    props.colors = componentColors.map(color => getDarkSurfaceReplacement(color, 0.55) || color);
  }
  const darkBackground = isDarkUnmappedColor(styleBackground) || darkComponentSurface;
  const isMappedComponentSurface = componentColors && !hasUnmappedDarkComponentColor;
  const preserveForeground = darkBackground || (
    preserveDarkForeground && !isMappedStyleBackground && !isMappedComponentSurface
  );

  if (props.style) {
    props.style = adaptStyleForLightTheme(props.style, preserveForeground);
  }
  if (!darkComponentSurface && typeof props.color === 'string') {
    if (preserveForeground && getDarkSurfaceReplacement(props.color)) {
      props.color = '#fff';
    } else if (!preserveForeground) {
      props.color = getLightForegroundReplacement(props.color);
    }
  }
  if (props.placeholderTextColor && !preserveForeground) {
    props.placeholderTextColor = getLightForegroundReplacement(props.placeholderTextColor);
  }
  if (props.children) {
    props.children = adaptTreeForLightTheme(
      props.children,
      React,
      undefined,
      preserveForeground
    );
  }

  return React.cloneElement(node, props);
}
