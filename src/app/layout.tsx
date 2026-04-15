import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Providers from '@/components/Providers'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Family Expense Control',
    description: 'Manage your family expenses with AI insights',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="es" suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>
                <Providers>
                    {children}
                </Providers>
                <Toaster 
                    position="top-right"
                    expand={false}
                    richColors
                    closeButton
                    theme="dark"
                    toastOptions={{
                        style: {
                            background: 'rgba(0, 0, 0, 0.9)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(20px)',
                        },
                    }}
                />
            </body>
        </html>
    )
}
