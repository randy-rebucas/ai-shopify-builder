import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Logo } from "@/components/logo";

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo className="text-base" />
      <h1 className="max-w-lg text-4xl font-semibold tracking-tight">
        Build Shopify apps using natural language.
      </h1>
      <p className="max-w-md text-black/60">
        Describe the feature you want and AI plans, generates, and deploys a complete Shopify
        app.
      </p>
      <div className="flex gap-3">
        <Link href="/signup" className="rounded-md bg-black px-5 py-2.5 text-white">
          Get started
        </Link>
        <Link href="/login" className="rounded-md border border-black/10 px-5 py-2.5">
          Log in
        </Link>
      </div>
    </div>
  );
}
