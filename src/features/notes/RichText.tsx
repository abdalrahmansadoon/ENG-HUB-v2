import { useEffect, useState } from 'react';
import { splitMath } from '../../lib/math';

type Katex = typeof import('katex').default;
let loading: Promise<Katex> | null = null;
// مكتبة المعادلات كبيرة: تُحمّل عند أول معادلة فقط.
const loadKatex = () => (loading ??= Promise.all([import('katex'), import('katex/dist/katex.min.css')])
  .then(([module]) => module.default)
  .catch((error) => { loading = null; throw error; }));

/** نص عادي تتخلله معادلات LaTeX. */
export default function RichText({ text }: { text: string }) {
  const parts = splitMath(text);
  const math = parts.some((p) => p.type !== 'text');
  const [katex, setKatex] = useState<Katex | null>(null);
  useEffect(() => {
    let alive = true;
    if (math) loadKatex().then((k) => { if (alive) setKatex(() => k); }).catch((e) => console.error(e));
    return () => { alive = false; };
  }, [math]);
  return (
    <div className="rich" dir="auto">
      {parts.map((p, i) => {
        if (p.type === 'text') return <span key={i}>{p.value}</span>;
        const block = p.type === 'block';
        if (!katex) return <code key={i} dir="ltr" className={block ? 'math-block' : 'math'}>{p.value}</code>;
        // KaTeX يهرّب المدخلات، وtrust المعطل يمنع الروابط وHTML داخل المعادلة.
        return <span key={i} dir="ltr" className={block ? 'math-block' : 'math'}
          dangerouslySetInnerHTML={{ __html: katex.renderToString(p.value, { displayMode: block, throwOnError: false, trust: false, strict: 'ignore', maxSize: 20, maxExpand: 200, output: 'htmlAndMathml' }) }} />;
      })}
    </div>
  );
}
