import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function Home() {
  // Kiểm tra session để xác định trạng thái đăng nhập
  const session = await getServerSession(authOptions);

  // Nếu chưa đăng nhập, điều hướng sang login
  if (!session) {
    redirect("/login");
  }

  // Nếu đã đăng nhập, điều hướng sang map
  redirect("/map");
}
