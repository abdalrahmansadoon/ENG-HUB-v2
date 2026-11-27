import { FileText, FolderOpen, Link2, Play } from 'lucide-react';
import type { ItemKind } from '../../lib/video';

const icons = { video: Play, pdf: FileText, drive: FolderOpen, link: Link2 };
export function KindIcon({ kind, size = 22 }: { kind: ItemKind; size?: number }) {
  const Icon = icons[kind];
  return <Icon size={size} aria-hidden />;
}
