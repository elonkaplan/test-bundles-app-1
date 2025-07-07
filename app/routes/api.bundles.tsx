import { authenticate } from "app/shopify.server";
import db from "app/db.server";

export const loader = async ({ request }: { request: Request }) => {
  const { session } = await authenticate.public.appProxy(request);

  const url = new URL(request.url);

  const limit = Number(url.searchParams.get("limit")) || 5;

  const bundles = await db.bundle.findMany({
    where: { shop: session?.shop },
    take: Number(limit),
    orderBy: { createdAt: "desc" },
  });

  return bundles;
};
