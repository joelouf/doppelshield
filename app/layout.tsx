import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import "@/app/globals.css";
import { mulish } from "@/styles/fonts";
import "@radix-ui/themes/styles.css";

export const metadata = {
  title: "DoppelShield | Expose URL Lookalikes",
  description: "Expose URL Lookalikes"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body className={`${mulish.className} antialiased`}>
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
