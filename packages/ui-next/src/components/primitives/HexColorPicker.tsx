import { HexColorInput, HexColorPicker as RCHexColorPicker } from 'react-colorful';
import styles from './HexColorPicker.module.css';

export interface HexColorPickerProps {
  value: string;
  onChange: (next: string) => void;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function HexColorPicker({ value, onChange }: HexColorPickerProps) {
  // react-colorful's RCHexColorPicker does not declare a `disabled` prop in its
  // ColorPickerBaseProps, so we cannot forward `disabled` here. Consumers
  // that need disabled behavior should wrap the component (e.g. with an
  // overlay) instead of editing this signature.
  return (
    <div className={styles.root}>
      <div className={styles.swatch}>
        <RCHexColorPicker color={value} onChange={onChange} />
      </div>
      <HexColorInput
        color={value}
        onChange={(next) => { if (HEX.test(next)) onChange(next.toLowerCase()); }}
        className={styles.input}
        aria-label="hex color"
        prefixed
      />
    </div>
  );
}
