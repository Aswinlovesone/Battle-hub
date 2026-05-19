import "./globals.css";
import Navbar from "./components/Navbar";

export const metadata = {
  title: "Battle Hub",
  description: "No Risk No Victory",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <Navbar />
        <main className="relative z-10">
          {children}
        </main>

      </body>
    </html>
  );
}
