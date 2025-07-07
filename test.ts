import type { LoaderFunctionArgs } from "@remix-run/node";
import type { Prisma } from "@prisma/client";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";

const PER_PAGE = 1;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const query = url.searchParams.get("query")?.trim() ?? "";
  const firstParam = url.searchParams.get("first");
  const lastParam = url.searchParams.get("last");
  const after = url.searchParams.get("after");
  const before = url.searchParams.get("before");

  const first = firstParam ? Math.max(1, Number(firstParam)) : undefined;
  const last = lastParam ? Math.max(1, Number(lastParam)) : undefined;

  const where: Prisma.BundleWhereInput = { shop: session.shop };
  if (query) {
    where.title = { contains: query };
  }

  let bundles: Prisma.BundleGetPayload<Prisma.BundleDefaultArgs>[] = []; // This will hold the fetched bundles.
  let endCursor: string | null = null;
  let hasNextPage = false;
  let hasPreviousPage = false;
  let startCursor: string | null = null;

  const isForwardPagination =
    (first !== undefined && first > 0) ||
    (first === undefined && last === undefined);
  const isBackwardPagination = last !== undefined && last > 0;

  if (isForwardPagination) {
    const takeCount = (first || PER_PAGE) + 1;
    const queryOptions: Prisma.BundleFindManyArgs = {
      where,
      take: takeCount,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    };

    if (after) {
      queryOptions.cursor = { id: after };
      queryOptions.skip = 1;
    }

    bundles = await db.bundle.findMany(queryOptions);

    if (bundles.length > (first || PER_PAGE)) {
      hasNextPage = true;
      bundles.pop();
    }

    hasPreviousPage = after !== undefined;
  } else if (isBackwardPagination) {
    const takeCount = (last || PER_PAGE) + 1;
    const queryOptions: Prisma.BundleFindManyArgs = {
      where,
      take: -takeCount,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    };

    if (before) {
      queryOptions.cursor = { id: before };
      queryOptions.skip = 1;
    }

    bundles = await db.bundle.findMany(queryOptions);

    if (bundles.length > (last || PER_PAGE)) {
      hasPreviousPage = true;
      bundles.shift();
    }

    hasNextPage = before !== undefined;
  }

  if (bundles.length > 0) {
    startCursor = bundles[0].id;
    endCursor = bundles[bundles.length - 1].id;
  }

  return {
    bundles,
    pageInfo: {
      endCursor,
      hasNextPage,
      hasPreviousPage,
      startCursor,
    },
  };
};
