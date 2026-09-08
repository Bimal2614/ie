import { redirect } from "next/navigation";

/**
 * Moved into the admin console as /admin/students.
 *
 * Kept as a redirect rather than deleted: the URL is bookmarked, it is named in
 * the proxy's protected list, and a 404 on the screen that grants access is a
 * bad ten minutes for whoever is trying to grant it.
 */
export default function VerifyStudentsRedirect() {
  redirect("/admin/students");
}
