export const metadata = {
  title: 'Zapier Redirect App',
  description: 'Minimal redirect endpoint project'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
