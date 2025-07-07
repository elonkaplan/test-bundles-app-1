import { authenticate, unauthenticated } from "app/shopify.server";

import { type ActionFunctionArgs } from "@remix-run/node";
import type { IProduct } from "app/utils/getProductById";
import { createBundleDraftOrder } from "app/utils/createBundleDraftOrder";
import db from "app/db.server";
import { getProductById } from "app/utils/getProductById";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST")
    return new Response("Method is not allowed", { status: 405 });

  const { session, admin } = await authenticate.public.appProxy(request);

  if (!session?.shop) {
    return new Response("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();

  const bundleId = formData.get("bundleId")?.toString();
  const selectedProducts: Record<string, number> = JSON.parse(
    formData.get("selectedProducts")?.toString() || "{}",
  );

  if (!bundleId || Object.keys(selectedProducts).length === 0)
    return new Response("Missing bundle ID or selected products", {
      status: 400,
    });

  const bundle = await db.bundle.findUnique({
    where: { id: bundleId, shop: session.shop },
  });

  if (!bundle) return new Response("Bundle not found", { status: 404 });

  if (
    Object.keys(selectedProducts).reduce(
      (acc, key) => acc + selectedProducts[key],
      0,
    ) !== bundle.productAmount
  )
    return new Response(
      "Incorrect number of products selected for the bundle",
      {
        status: 400,
      },
    );

  if (
    !Object.keys(selectedProducts).every((item) =>
      (bundle.selectedProducts as string[]).includes(item),
    )
  )
    return new Response("Invalid products are selected", { status: 400 });

  const { storefront } = await unauthenticated.storefront(session.shop);

  const products = await Promise.all(
    Object.keys(selectedProducts).map((productId) =>
      getProductById(storefront, productId),
    ),
  ).then((items) => items.filter(Boolean) as IProduct[]);

  if (products.length !== Object.keys(selectedProducts).length)
    return new Response(
      "One or more selected products are not allowed to buy or invalid",
      {
        status: 400,
      },
    );

  const invoiceUrl = await createBundleDraftOrder({
    admin: admin.graphql,
    bundle,
    products,
    selectedProducts,
  });

  return {
    invoiceUrl,
  };
};
