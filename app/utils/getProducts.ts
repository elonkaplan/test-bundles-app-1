import type { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";

interface IGetProductsParams {
  perPage: number;
  before: string | null;
  after: string | null;
  search: string | null;
}

export const getProducts = async (
  admin: AdminGraphqlClient,
  params: IGetProductsParams,
) => {
  const { perPage, before, after, search } = params;

  const pagination = before
    ? { before, last: perPage }
    : { after, first: perPage };

  const response = await admin(
    `#graphql
        query getProducts($first: Int, $last: Int, $after: String, $before: String, $search: String) {
          productsCount(query: $search) {
            count
          }
          products(first: $first, last: $last, after: $after, before: $before, query: $search) {
            edges {
              node {
                id
                title
                variants(first: 1) {
                  edges {
                    node {
                      price
                    }
                  }
                }
                media(first: 1) {
                  edges {
                    node {
                      preview {
                        image {
                          url
                        }
                      }
                    }
                  }
                }
              }
            }
            pageInfo {
              endCursor
              hasNextPage
              hasPreviousPage
              startCursor
            }
          }
        }
      `,
    { variables: { ...pagination, search } },
  );

  const { data } = await response.json();

  return (
    data || {
      productsCount: { count: 0 },
      products: {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      },
    }
  );
};
