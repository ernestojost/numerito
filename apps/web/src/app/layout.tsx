import type { Metadata } from "next";
import { Anton, Courier_Prime, Doto, Libre_Barcode_128_Text, Libre_Franklin } from "next/font/google";
import "./globals.css";

const franklin = Libre_Franklin({ variable: "--font-franklin", subsets: ["latin"] });
const anton = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"] });
const doto = Doto({ variable: "--font-doto", weight: "700", subsets: ["latin"] });
const courier = Courier_Prime({ variable: "--font-courier", weight: ["400", "700"], subsets: ["latin"] });
const barcode = Libre_Barcode_128_Text({ variable: "--font-libre-barcode", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Turnia — Turnos online para barberías",
  description:
    "Tu cliente reserva desde tu link, paga la seña por Mercado Pago y recibe un ticket confirmado. Nadie más puede tomar ese horario.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${franklin.variable} ${anton.variable} ${doto.variable} ${courier.variable} ${barcode.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
