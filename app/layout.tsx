import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Dhanalakshmi Srinivasan University — Events",
  description: "Campus Events Portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}