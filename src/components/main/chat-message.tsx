import type { ChatMessageType } from "@/lib/types"
import { Copy, Check } from "lucide-react"
import { useState, useMemo } from "react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatMessageProps {
  message: ChatMessageType
}


export default function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Check if message contains code blocks or structural content
  const hasCode = useMemo(() => message.content.includes("```"), [message.content])
  const hasJson = useMemo(() => message.content.includes('"elements"'), [message.content])

  return (
    <div className={`flex gap-2 mb-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
      {message.role === "assistant" && (
        <div className="w-6 h-6 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-xs text-white font-bold">
          AI
        </div>
      )}
      <div
        className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg group ${message.role === "user"
          ? "bg-blue-600 text-white rounded-br-none"
          : "bg-slate-700 text-slate-100 rounded-bl-none"
          }`}
      >
        <div className="text-sm prose prose-invert max-w-none break-words leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="mb-0.5">{children}</li>,
              h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-4">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-2">{children}</h3>,
              code: ({ className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '')
                const isInline = !match && !String(children).includes('\n')
                return isInline ? (
                  <code className="bg-slate-800 px-1 py-0.5 rounded text-xs font-mono" {...props}>
                    {children}
                  </code>
                ) : (
                  <code className={`block bg-slate-800 p-2 rounded text-xs font-mono overflow-x-auto my-2 ${className || ''}`} {...props}>
                    {children}
                  </code>
                )
              },
              pre: ({ children }) => <pre className="bg-transparent p-0 m-0">{children}</pre>,
              a: ({ children, href }) => <a href={href} className="text-blue-300 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
              blockquote: ({ children }) => <blockquote className="border-l-2 border-slate-500 pl-3 italic text-slate-400 my-2">{children}</blockquote>
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        {message.role === "assistant" && !hasCode && !hasJson && (
          <button
            onClick={handleCopy}
            className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-600 rounded"
            title="Copy message"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-slate-300" />}
          </button>
        )}
      </div>
      {message.role === "user" && (
        <div className="w-6 h-6 rounded-full bg-slate-600 flex-shrink-0 flex items-center justify-center text-xs text-white font-bold">
          U
        </div>
      )}
    </div>
  )
}
