import {originalColors} from './palettes';
import {AppColors} from './types';

const cloneColors = (palette: AppColors): AppColors => ({
  bg: {...palette.bg},
  gold: {...palette.gold},
  text: {...palette.text},
  status: {...palette.status},
  border: {...palette.border},
});

/**
 * Mutable singleton matching the historical `colors` import.
 * Theme changes deep-assign into this object so call-time readers
 * (utils, inline props) pick up the active palette after re-render.
 */
export const colors: AppColors = cloneColors(originalColors);

export const applyPalette = (palette: AppColors) => {
  Object.assign(colors.bg, palette.bg);
  Object.assign(colors.gold, palette.gold);
  Object.assign(colors.text, palette.text);
  Object.assign(colors.status, palette.status);
  Object.assign(colors.border, palette.border);
};

export type {AppColors};
