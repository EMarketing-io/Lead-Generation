import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Navbar from '../components/Navbar'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'LeadGen — Google Maps Lead Generator',
  description: 'Generate business leads from Google Maps',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans bg-slate-50 dark:bg-[#0e1117] min-h-screen transition-colors duration-200`}>
        <Providers>
          <Navbar />
          <main className="w-full px-6 lg:px-10 py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
