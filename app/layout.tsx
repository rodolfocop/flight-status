import type { Metadata } from 'next';
import '@fontsource-variable/dm-sans';
import './globals.css';
export const metadata: Metadata = { title: 'Destino Certo · sua próxima viagem', description: 'Pesquise viagens e acompanhe seus preços.', robots: { index: false, follow: false } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
