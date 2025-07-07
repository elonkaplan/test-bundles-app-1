import type { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import type { IProduct } from "./getProductById";
import type { Prisma } from "@prisma/client";

export const createBundleDraftOrder = async ({
  admin,
  bundle,
  products,
  selectedProducts,
}: {
  admin: AdminGraphqlClient;
  bundle: Prisma.BundleGetPayload<Prisma.BundleDefaultArgs>;
  products: IProduct[];
  selectedProducts: Record<string, number>;
}) => {
  const totalPrice = products.reduce(
    (sum, item) => sum + Number(item.price) * selectedProducts[item.id],
    0,
  );

  const input = {
    lineItems: products
      .map((item) => ({
        variantId: item.variantId,
        quantity: selectedProducts[item.id],
      }))
      .filter((item) => !!item.quantity),
    note: `Bundle Purchase: ${bundle.title}`,
    allowDiscountCodesInCheckout: true,
    appliedDiscount: {
      valueType: "FIXED_AMOUNT",
      description: `Bundle ${bundle.title} is applied`,
      value: totalPrice - bundle.price,
    },
  };

  return admin(
    `#graphql
        mutation createDraftOrder($input: DraftOrderInput!) {
            draftOrderCreate(input: $input) {
               draftOrder {
                id
                invoiceUrl
               }
               userErrors {
                field
                message
               }
            }
        } 
    `,
    {
      variables: {
        // @ts-ignore
        input,
      },
    },
  )
    .then((res) => res.json())
    .then((data) => {
      console.log(data.data.draftOrderCreate.userErrors);
      return data.data;
    })
    .then((data) => data.draftOrderCreate.draftOrder.invoiceUrl)
    .catch(console.log);
};
