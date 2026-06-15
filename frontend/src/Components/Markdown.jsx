import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const components = {
  h1: ({ node, ...p }) => <h1 className="text-base font-bold text-slate-800 mt-3 mb-1.5" {...p} />,
  h2: ({ node, ...p }) => <h2 className="text-sm font-bold text-slate-800 mt-3 mb-1.5" {...p} />,
  h3: ({ node, ...p }) => <h3 className="text-sm font-semibold text-slate-700 mt-2 mb-1" {...p} />,
  p: ({ node, ...p }) => <p className="mb-2 leading-relaxed" {...p} />,
  ul: ({ node, ...p }) => <ul className="list-disc pl-5 mb-2 space-y-1" {...p} />,
  ol: ({ node, ...p }) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...p} />,
  li: ({ node, ...p }) => <li className="leading-relaxed" {...p} />,
  strong: ({ node, ...p }) => <strong className="font-semibold text-slate-800" {...p} />,
  em: ({ node, ...p }) => <em className="text-slate-500" {...p} />,
  a: ({ node, ...p }) => <a className="text-brand-600 underline" target="_blank" rel="noreferrer" {...p} />,
  code: ({ node, ...p }) => <code className="bg-slate-100 rounded px-1 py-0.5 text-[0.85em]" {...p} />,
  table: ({ node, ...p }) => <table className="w-full text-xs border-collapse my-2" {...p} />,
  th: ({ node, ...p }) => <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left" {...p} />,
  td: ({ node, ...p }) => <td className="border border-slate-200 px-2 py-1" {...p} />,
  blockquote: ({ node, ...p }) => <blockquote className="border-l-3 border-slate-200 pl-3 text-slate-500 italic" {...p} />,
};

export default function Markdown({ children, className = "" }) {
  return (
    <div className={`text-sm text-slate-600 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children || ""}
      </ReactMarkdown>
    </div>
  );
}
