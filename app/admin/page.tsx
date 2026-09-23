// LAYMAN: The password-protected admin page; it just shows the AdminDashboard (Next.js shows this file for the "/admin" route).
import AdminDashboard from "@/components/AdminDashboard";

export default function AdminPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <AdminDashboard />
    </main>
  );
}
