import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { filterSafeGeneratedFiles } from "@/lib/generated-file-path";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "app"
  );
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const project = await prisma.project.findFirst({ where: { id, userId: session.userId } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const latestApp = await prisma.generatedApp.findFirst({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });
  const files = (latestApp?.files as unknown as { path: string; content: string }[] | undefined) ?? [];
  if (files.length === 0) {
    return NextResponse.json({ error: "No generated files to download yet" }, { status: 404 });
  }

  // Reject any path with traversal segments or that's absolute — a malicious/prompt-injected path
  // like "../../../../.bashrc" would otherwise produce a zip-slip archive that writes outside the
  // extraction directory when a user later extracts it with a naive/vulnerable unzip tool.
  const { safe, rejected } = filterSafeGeneratedFiles(files);
  if (rejected.length > 0) {
    console.warn(`download: skipped ${rejected.length} unsafe generated file path(s):`, rejected);
  }

  const zip = new JSZip();
  for (const file of safe) {
    zip.file(file.path, file.content);
  }
  // Compress first, then hand back the finished archive — no uncompressed intermediate response.
  const zipArrayBuffer = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
  const zipBlob = new Blob([zipArrayBuffer], { type: "application/zip" });

  return new NextResponse(zipBlob, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slugify(project.name)}.zip"`,
      "Content-Length": String(zipArrayBuffer.byteLength),
    },
  });
}
