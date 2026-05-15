import { VendorDashboardLayout } from "@/components/dashboard/VendorDashboardLayout";

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <VendorDashboardLayout>{children}</VendorDashboardLayout>;
}
