import { AdminDashboardLayout } from "@/components/dashboard/AdminDashboardLayout";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full min-h-0">
      <AdminDashboardLayout>{children}</AdminDashboardLayout>
    </div>
  );
}
