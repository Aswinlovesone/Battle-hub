import "./globals.css";
import Navbar from "./components/Navbar";

export const metadata = {
  title: "Battle Hub",
  description: "No Risk No Victory",
  verification: {
    google: "P4PZq6tFW3XzvLVtzHnoADbNqNoiW_GH3L5ovgWzwso",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ background: "var(--bg-void)", color: "var(--text-primary)" }}>
        <Navbar />
        <main className="relative z-10">
          {children}
        </main>
      </body>
    </html>
  );
}