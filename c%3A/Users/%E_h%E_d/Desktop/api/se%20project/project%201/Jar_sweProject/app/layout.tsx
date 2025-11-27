// Root layout for the application
import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { Knewave } from 'next/font/google'

const knewave = Knewave({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'JAR',
  description: 'A minimalist ride-sharing platform for students',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <header className="w-full bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3">
            <a href="/" className="flex items-center gap-3">
              {/* Elegant JAR logo (SVG) */}
              <svg
                width="40"
                height="40"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <rect
                  x="6"
                  y="6"
                  width="88"
                  height="88"
                  rx="18"
                  fill="#1E293B"
                />
                <path
                  d="M30 64C30 64 35 38 52 38C69 38 72 64 72 64"
                  stroke="#F8FAFC"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M38 52C38 52 44 46 52 46C60 46 66 52 66 52"
                  stroke="#F8FAFC"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <text
                  x="50%"
                  y="86"
                  textAnchor="middle"
                  fontSize="10"
                  fill="#94A3B8"
                  fontFamily="Inter, ui-sans-serif, system-ui"
                >
                  JAR
                </text>
              </svg>
              <span
                className={`text-xl font-semibold text-slate-800 ${knewave.className}`}
              >
                JAR
              </span>
            </a>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-6">{children}</main>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}