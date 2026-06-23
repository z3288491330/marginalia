import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import AdminPanel from "@/components/AdminPanel";
import {
  getApprovedBooks,
  getPendingBooks,
  getRecentComments,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const [pending, approved, recentComments] = await Promise.all([
    getPendingBooks(),
    getApprovedBooks(),
    getRecentComments(50),
  ]);

  return (
    <div className="mg-shell" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
      <AdminPanel
        pending={pending}
        approved={approved}
        recentComments={recentComments}
      />
    </div>
  );
}
