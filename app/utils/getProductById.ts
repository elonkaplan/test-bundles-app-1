import type { StorefrontApiContext } from "@shopify/shopify-app-remix/server";

export interface IProduct {
  id: string;
  title: string;
  price: string;
  currencyCode: string;
  imageUrl: string;
  variantId: string;
}

export const getProductById = (
  storefront: StorefrontApiContext,
  productId: string,
) =>
  storefront
    .graphql(
      `#graphql
query GetProduct ($id: ID!) {
  product(id: $id) {
    id
    title
    priceRange {
        maxVariantPrice {
            amount
            currencyCode
        }
    }
    variants(first: 1) {
      edges {
        node {
          price {
            amount
          }
          id
        }
      }
    }
    media(first: 1) {
        edges {
            node {
                previewImage {
                        url
                }
            }
        }
    }
  }
}`,
      { variables: { id: productId } },
    )
    .then((res) => res.json())
    .then((data) => data.data?.product)
    .then((product): IProduct | null =>
      product
        ? {
            id: product.id,
            title: product.title,
            price: product.variants.edges[0].node.price.amount,
            imageUrl: product.media.edges[0].node.previewImage.url,
            currencyCode: product.priceRange.maxVariantPrice.currencyCode,
            variantId: product.variants.edges[0].node.id,
          }
        : null,
    );
