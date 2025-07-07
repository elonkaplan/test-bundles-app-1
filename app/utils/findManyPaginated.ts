import type { Prisma } from "@prisma/client";

interface PaginationParams {
  first?: number;
  last?: number;
  after?: string;
  before?: string;
}

export interface PageInfo {
  endCursor: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
}

/**
 * A universal utility for performing cursor-based pagination with Prisma.
 *
 * @template T - The Prisma model delegate type (e.g., Prisma.BundleDelegate).
 * @template U - The type of items returned (e.g., Bundle).
 * @param dbModel - The Prisma model delegate (e.g., db.bundle).
 * @param params - Pagination parameters (first, last, after, before).
 * @param where - The filtering condition for the Prisma query.
 * @param orderBy - The sorting order for the Prisma query. It's crucial that this is a stable field (e.g., createdAt, id).
 * @param perPage - The default number of items per page if first/last are not specified.
 * @returns An object containing paginatedItems (an array of items) and pageInfo (page information).
 */
export async function findManyPaginated<
  T extends { findMany: any },
  U extends { id: string },
>(
  dbModel: T,
  params: PaginationParams,
  where: Prisma.BundleWhereInput,
  orderBy:
    | Prisma.BundleOrderByWithRelationInput
    | Prisma.BundleOrderByWithRelationInput[],
  perPage: number = 1,
): Promise<{
  paginatedItems: U[];
  pageInfo: PageInfo;
}> {
  const { first, last, after, before } = params;

  let items: U[] = [];
  let endCursor: string | null = null;
  let hasNextPage = false;
  let hasPreviousPage = false;
  let startCursor: string | null = null;

  const parsedFirst = first ? Math.max(1, Number(first)) : undefined;
  const parsedLast = last ? Math.max(1, Number(last)) : undefined;

  const isForwardPagination =
    (parsedFirst !== undefined && parsedFirst > 0) ||
    (parsedFirst === undefined && parsedLast === undefined);
  const isBackwardPagination = parsedLast !== undefined && parsedLast > 0;

  if (isForwardPagination) {
    const takeCount = (parsedFirst || perPage) + 1;
    const queryOptions: Prisma.BundleFindManyArgs = {
      where,
      take: takeCount,
      orderBy: orderBy,
    };

    if (after) {
      queryOptions.cursor = { id: after };
      queryOptions.skip = 1;
    }

    items = await dbModel.findMany(queryOptions);

    if (items.length > (parsedFirst || perPage)) {
      hasNextPage = true;
      items.pop();
    }

    hasPreviousPage = after !== undefined;
  } else if (isBackwardPagination) {
    const takeCount = (parsedLast || perPage) + 1;
    const queryOptions: Prisma.BundleFindManyArgs = {
      where,
      take: -takeCount,
      orderBy: orderBy,
    };

    if (before) {
      queryOptions.cursor = { id: before };
      queryOptions.skip = 1;
    }

    items = await dbModel.findMany(queryOptions);

    if (items.length > (parsedLast || perPage)) {
      hasPreviousPage = true;
      items.shift();
    }

    hasNextPage = before !== undefined;
  }

  if (items.length > 0) {
    startCursor = items[0].id;
    endCursor = items[items.length - 1].id;
  }

  return {
    paginatedItems: items,
    pageInfo: {
      endCursor,
      hasNextPage,
      hasPreviousPage,
      startCursor,
    },
  };
}
