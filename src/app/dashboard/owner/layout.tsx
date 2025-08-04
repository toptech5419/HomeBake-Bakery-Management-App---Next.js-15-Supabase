// Owner routes completely bypass the main dashboard layout
// This layout does nothing - the owner pages handle everything themselves
export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}