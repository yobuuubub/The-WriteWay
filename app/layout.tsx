import './globals.css';
import './homepage.css';
import { Playfair_Display, Source_Serif_4, DM_Sans, Space_Grotesk } from 'next/font/google';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
  display: 'swap',
});
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const metadata = {
  title: 'The WriteWay - Journalism by and for serious youth',
  description: 'A calm, serious platform for youth voices in journalism, reporting, and thoughtful discussion.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${sourceSerif.variable} ${dmSans.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen flex flex-col bg-paper text-charcoal antialiased">
        <a href="#content" className="skip-link sr-only focus:not-sr-only">Skip to content</a>
        <Navigation />
        <main id="content" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
