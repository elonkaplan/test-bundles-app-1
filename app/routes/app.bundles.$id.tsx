import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  Avatar,
  BlockStack,
  Button,
  ButtonGroup,
  Card,
  Layout,
  Page,
  ResourceItem,
  ResourceList,
  Text,
  TextField,
} from "@shopify/polaris";
import { SearchIcon, XIcon } from "@shopify/polaris-icons";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { useCallback, useState } from "react";
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useNavigation,
  useSearchParams,
} from "@remix-run/react";

import type { KeyboardEvent } from "react";
import type { ResourceListProps } from "@shopify/polaris";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { getProducts } from "app/utils/getProducts";

const PER_PAGE = 5;

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const search = url.searchParams.get("query");
  const after = url.searchParams.get("after");
  const before = url.searchParams.get("before");

  const productsData = await getProducts(admin.graphql, {
    perPage: PER_PAGE,
    search,
    after,
    before,
  });

  const currentBundle =
    params.id === "create"
      ? null
      : await db.bundle.findFirst({
          where: { id: params.id, shop: session.shop },
        });

  return {
    totalProductsAmount: productsData.productsCount?.count || 0,
    products: productsData.products.edges.map((item) => item.node),
    pageInfo: productsData.products.pageInfo,
    currentBundle,
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const formData = await request.formData();

  switch (request.method.toLowerCase()) {
    case "post": {
      const title = formData.get("title") as string;
      const price = parseFloat(formData.get("price") as string);
      const productAmount = parseInt(formData.get("productAmount") as string);
      const selectedProducts = (
        formData.get("selectedProducts")?.toString() || ""
      )
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean);

      if (params.id === "create") {
        await db.bundle.create({
          data: {
            title,
            price,
            productAmount,
            selectedProducts,
            shop: session.shop,
          },
        });
      } else {
        await db.bundle.update({
          where: { id: params.id, shop: session.shop },
          data: {
            title,
            price,
            productAmount,
            selectedProducts,
          },
        });
      }

      return {
        message: `Bundle "${title}" was ${params.id === "create" ? "created" : "updated"}`,
      };
    }

    case "delete": {
      console.log(params.id, session.shop);
      const deleted = await db.bundle.deleteMany({
        where: {
          id: params.id,
          shop: session.shop,
        },
      });

      console.log(deleted);

      return {
        message: "Deleted",
        deleted,
      };
    }

    default:
      return new Response("Method is not allowed", { status: 405 });
  }
};

export default function BundlePage() {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const {
    totalProductsAmount,
    pageInfo: { hasNextPage, hasPreviousPage, endCursor, startCursor },
    products,
    currentBundle,
  } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [searchParams, setSearchParams] = useSearchParams();
  const shopify = useAppBridge();

  const isLoading = navigation.state === "loading";
  const query = searchParams.get("query") || "";

  const [selectedProducts, setSelectedProducts] = useState<
    ResourceListProps["selectedItems"]
  >((currentBundle?.selectedProducts as string[]) || []);
  const [queryValue, setQueryValue] = useState(query);
  const [title, setTitle] = useState<string>(currentBundle?.title || "");
  const [price, setPrice] = useState<string>(
    currentBundle?.price ? String(currentBundle.price) : "",
  );
  const [productAmount, setProductAmount] = useState<string>(
    currentBundle?.productAmount ? String(currentBundle.productAmount) : "",
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) =>
      e.key === "Enter" && navigate(`?query=${queryValue}`),
    [navigate, queryValue],
  );

  return (
    <Page>
      <TitleBar
        title={currentBundle ? `Edit ${currentBundle.title}` : "Create bundle"}
      >
        <button variant="breadcrumb" onClick={() => navigate("/app")}>
          Home
        </button>

        {currentBundle && (
          <button
            onClick={() => {
              const formData = new FormData();
              fetcher.submit(formData, { method: "DELETE" });
              shopify.toast.show("Bundle deleted!", { isError: true });
              navigate("/app");
            }}
          >
            Delete bundle
          </button>
        )}

        <button
          variant="primary"
          disabled={
            !title ||
            !price ||
            !productAmount ||
            !selectedProducts?.length ||
            selectedProducts.length < Number(productAmount)
          }
          onClick={() => {
            const formData = new FormData();
            formData.set("title", title);
            formData.set("price", price);
            formData.set("productAmount", productAmount);
            formData.set(
              "selectedProducts",
              typeof selectedProducts === "string"
                ? selectedProducts
                : (selectedProducts || []).join(","),
            );

            fetcher.submit(formData, { method: "POST" });
            shopify.toast.show(
              `Bundle ${currentBundle ? "updated" : "created"}!`,
            );
            navigate("/app");
          }}
        >
          {currentBundle ? "Update" : "Create"} bundle
        </button>
      </TitleBar>

      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="1000">
                <BlockStack gap="500">
                  <TextField
                    autoComplete="off"
                    label="Bundle title"
                    name="title"
                    value={title}
                    placeholder="Bundle title"
                    onChange={setTitle}
                    requiredIndicator
                  />
                  <TextField
                    autoComplete="off"
                    label="Bundle price"
                    name="price"
                    placeholder="Price"
                    type="number"
                    onChange={setPrice}
                    value={price}
                    requiredIndicator
                    inputMode="decimal"
                  />
                  <TextField
                    autoComplete="off"
                    label="Product amount"
                    name="productAmount"
                    placeholder="Product amount"
                    type="number"
                    onChange={setProductAmount}
                    value={productAmount}
                    requiredIndicator
                    inputMode="numeric"
                  />
                </BlockStack>

                <BlockStack>
                  {(!!products.length || query) && (
                    <BlockStack>
                      <div onKeyDown={onKeyDown}>
                        <TextField
                          label=""
                          autoComplete="off"
                          placeholder="Search..."
                          value={queryValue}
                          onChange={setQueryValue}
                          disabled={isLoading}
                          suffix={
                            <ButtonGroup>
                              <Button
                                size="micro"
                                icon={SearchIcon}
                                variant="plain"
                                loading={isLoading}
                                onClick={() => navigate(`?query=${queryValue}`)}
                              />
                              {queryValue && (
                                <Button
                                  size="micro"
                                  icon={XIcon}
                                  variant="plain"
                                  onClick={() => {
                                    setQueryValue("");
                                    navigate("?query=");
                                  }}
                                />
                              )}
                            </ButtonGroup>
                          }
                        />
                      </div>
                    </BlockStack>
                  )}

                  <ResourceList
                    resourceName={{ singular: "product", plural: "products" }}
                    items={products}
                    selectedItems={selectedProducts}
                    onSelectionChange={setSelectedProducts}
                    selectable
                    showHeader
                    totalItemsCount={totalProductsAmount}
                    renderItem={(item) => {
                      const {
                        id,
                        title,
                        media: {
                          edges: [mediaEdge],
                        },
                        variants: {
                          edges: [
                            {
                              node: { price },
                            },
                          ],
                        },
                      } = item;

                      const imageUrl =
                        mediaEdge?.node?.preview?.image?.url || "";

                      return (
                        <ResourceItem
                          id={id}
                          name={title}
                          media={
                            <Avatar size="lg" name={title} source={imageUrl} />
                          }
                          onClick={() => console.log("Clicked", id)}
                        >
                          <Text variant="bodyMd" fontWeight="bold" as="h3">
                            {title}
                          </Text>
                          <Text variant="bodyMd" fontWeight="bold" as="p">
                            ${price}
                          </Text>
                        </ResourceItem>
                      );
                    }}
                    pagination={
                      products.length && (hasNextPage || hasPreviousPage)
                        ? {
                            hasNext: hasNextPage,
                            hasPrevious: hasPreviousPage,
                            onNext: () =>
                              setSearchParams((prev) => {
                                prev.set("after", endCursor as string);
                                prev.set("first", String(PER_PAGE));
                                prev.delete("before");
                                prev.delete("last");

                                return prev;
                              }),
                            onPrevious: () =>
                              setSearchParams((prev) => {
                                prev.set("before", startCursor as string);
                                prev.set("last", String(PER_PAGE));
                                prev.delete("after");
                                prev.delete("first");

                                return prev;
                              }),
                          }
                        : undefined
                    }
                  />
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
