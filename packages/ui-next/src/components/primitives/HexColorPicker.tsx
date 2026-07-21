import { HexColorInput, HexColorPicker as RCHexColorPicker } from 'react-colorful';
import styles from './HexColorPicker.module.css';

export interface HexColorPickerProps {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function HexColorPicker({ value, onChange, disabled }: HexColorPickerProps) {
  return (
    <div className={styles.root}>
      <div className={styles.swatch}>
        <RCHexColorPicker color={value} onChange={onChange} disabled={disabled} />
      </div>
      <HexColorInput
        color={value}
        onChange={(next) => { if (HEX.test(next)) onChange(next.toLowerCase()); }}
        disabled={disabled}
        className={styles.input}
        aria-label="hex color"
        prefixed
      />
    </div>
  );
}
