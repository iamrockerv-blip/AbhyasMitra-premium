// Admin layout — wraps all /admin/* pages
// Note: No special server-side logic here since protection is handled by proxy.ts
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
