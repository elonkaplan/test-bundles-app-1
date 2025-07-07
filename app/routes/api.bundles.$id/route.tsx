import { authenticate, unauthenticated } from "app/shopify.server";
import { dirname, join } from "path";

import type { LoaderFunctionArgs } from "@remix-run/node";
import db from "app/db.server";
import { fileURLToPath } from "url";
import { getProductById } from "app/utils/getProductById";
import { readFileSync } from "fs";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session, liquid } = await authenticate.public.appProxy(request);
  const id = params.id;

  if (!session?.shop) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const bundle = await db.bundle.findUnique({
    where: { id, shop: session.shop },
  });

  if (!bundle) {
    throw new Response("Not Found", { status: 404 });
  }

  const { storefront } = await unauthenticated.storefront(session.shop);

  const products = await Promise.all(
    (bundle.selectedProducts as string[]).map((productId) =>
      getProductById(storefront, productId),
    ),
  ).then((items) => items.filter(Boolean));

  console.log(products);

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  return liquid(
    readFileSync(join(__dirname, "assets", "bundle-page.liquid"))
      .toString("utf-8")
      .replace("$bundle", JSON.stringify(bundle))
      .replace("$products", JSON.stringify(products)),
  );
};
