import "./globals.css";
import Navbar from "./components/Navbar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta
          name="google-site-verification"
          content="P4PZq6tFW3XzvLVtzHnoADbNqNoiW_GH3L5ovgWzwso"
        />
        <title>Battle Hub</title>
        <meta name="description" content="No Risk No Victory" />
      </head>

      <body
        style={{
          background: "var(--bg-void)",
          color: "var(--text-primary)",
        }}
      >
        <Navbar />
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}