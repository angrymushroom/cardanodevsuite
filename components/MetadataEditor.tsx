'use client';

import { TextField } from '@mui/material';

/**
 * Props for the MetadataEditor component.
 * @interface MetadataEditorProps
 * @property {string} value - The current value of the metadata (JSON string).
 * @property {(value: string) => void} onChange - Callback function when the metadata changes.
 * @property {boolean} disabled - If true, the editor will be disabled.
 */
interface MetadataEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

/**
 * MetadataEditor Component
 * Provides a text area for users to input and edit transaction metadata in JSON format.
 */
const MetadataEditor = ({ value, onChange, disabled }: MetadataEditorProps) => (
  <TextField
    label="Transaction Metadata (JSON)"
    multiline
    rows={4}
    fullWidth
    margin="normal"
    variant="outlined"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    sx={{ fontFamily: 'monospace' }} // Ensures monospaced font for JSON readability
  />
);

export default MetadataEditor;