/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as AdminTypes from './admin.types';

export type CreateDraftOrderMutationVariables = AdminTypes.Exact<{
  input: AdminTypes.DraftOrderInput;
}>;


export type CreateDraftOrderMutation = { draftOrderCreate?: AdminTypes.Maybe<{ userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }> };

export type GetProductQueryVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
}>;


export type GetProductQuery = { product?: AdminTypes.Maybe<(
    Pick<AdminTypes.Product, 'id' | 'title'>
    & { priceRange: { maxVariantPrice: Pick<AdminTypes.MoneyV2, 'amount' | 'currencyCode'> }, variants: { edges: Array<{ node: Pick<AdminTypes.ProductVariant, 'id'> }> }, media: { edges: Array<{ node: { preview?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>> }> } }> } }
  )> };

export type GetProductsQueryVariables = AdminTypes.Exact<{
  first?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  last?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  after?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  before?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  search?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
}>;


export type GetProductsQuery = { productsCount?: AdminTypes.Maybe<Pick<AdminTypes.Count, 'count'>>, products: { edges: Array<{ node: (
        Pick<AdminTypes.Product, 'id' | 'title'>
        & { variants: { edges: Array<{ node: Pick<AdminTypes.ProductVariant, 'price'> }> }, media: { edges: Array<{ node: { preview?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>> }> } }> } }
      ) }>, pageInfo: Pick<AdminTypes.PageInfo, 'endCursor' | 'hasNextPage' | 'hasPreviousPage' | 'startCursor'> } };

interface GeneratedQueryTypes {
  "#graphql\nquery GetProduct ($id: ID!) {\n  product(id: $id) {\n    id\n    title\n    priceRange {\n        maxVariantPrice {\n            amount\n            currencyCode\n        }\n    }\n    variants(first: 1) {\n      edges {\n        node {\n          id\n        }\n      }\n    }\n    media(first: 1) {\n        edges {\n            node {\n              preview {\n                image {\n                  url\n                }\n              }\n                # previewImage {\n                #         url\n                # }\n            }\n        }\n    }\n  }\n}": {return: GetProductQuery, variables: GetProductQueryVariables},
  "#graphql\n        query getProducts($first: Int, $last: Int, $after: String, $before: String, $search: String) {\n          productsCount(query: $search) {\n            count\n          }\n          products(first: $first, last: $last, after: $after, before: $before, query: $search) {\n            edges {\n              node {\n                id\n                title\n                variants(first: 1) {\n                  edges {\n                    node {\n                      price\n                    }\n                  }\n                }\n                media(first: 1) {\n                  edges {\n                    node {\n                      preview {\n                        image {\n                          url\n                        }\n                      }\n                    }\n                  }\n                }\n              }\n            }\n            pageInfo {\n              endCursor\n              hasNextPage\n              hasPreviousPage\n              startCursor\n            }\n          }\n        }\n      ": {return: GetProductsQuery, variables: GetProductsQueryVariables},
}

interface GeneratedMutationTypes {
  "#graphql\n        mutation createDraftOrder($input: DraftOrderInput!) {\n            draftOrderCreate(input: $input) {\n            #    draftOrder {\n            #     id\n            #     invoiceUrl\n            #    }\n               userErrors {\n                field\n                message\n               }\n            }\n        } \n    ": {return: CreateDraftOrderMutation, variables: CreateDraftOrderMutationVariables},
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}
