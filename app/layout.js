import "./globals.css";

export const metadata = {
  title: "Mimuza LIVE Cart",
  description: "Carrinho de reservas LIVE da Mimuza Store"
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
