/** "2:05" ساعة ودقائق. */
export const hours = (minutes: number) => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;

export function Figures({ items }: { items: [label: string, value: string | number][] }) {
  return <dl className="figures">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd><bdi>{value}</bdi></dd></div>)}</dl>;
}
