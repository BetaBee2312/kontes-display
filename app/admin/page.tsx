import AdminDashboardClient from "./dashboard-client";

// This dashboard loads fresh authenticated data in the browser after navigation.
// Opt this page out of Next.js Instant Navigation validation feedback; this does
// not disable navigation or affect the dashboard API itself.
export const instant = false;

export default function AdminPage() {
  return <AdminDashboardClient />;
}
