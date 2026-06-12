interface TagPillStyle {
  backgroundColor: string;
  borderColor: string;
  color: string;
}

const TAG_PALETTE: TagPillStyle[] = [
  { backgroundColor: '#fff7ed', borderColor: '#fdba74', color: '#9a3412' },
  { backgroundColor: '#eff6ff', borderColor: '#93c5fd', color: '#1d4ed8' },
  { backgroundColor: '#ecfdf5', borderColor: '#86efac', color: '#166534' },
  { backgroundColor: '#f5f3ff', borderColor: '#c4b5fd', color: '#6d28d9' },
  { backgroundColor: '#fdf2f8', borderColor: '#f9a8d4', color: '#be185d' },
  { backgroundColor: '#fefce8', borderColor: '#fde047', color: '#a16207' },
  { backgroundColor: '#ecfeff', borderColor: '#67e8f9', color: '#0f766e' },
  { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', color: '#334155' },
];

export function getTagPillStyle(label: string): TagPillStyle {
  const seed = Array.from(label).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return TAG_PALETTE[seed % TAG_PALETTE.length];
}
