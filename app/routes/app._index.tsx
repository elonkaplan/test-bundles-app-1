import {
  BlockStack,
  Button,
  ButtonGroup,
  Card,
  EmptyState,
  Icon,
  IndexTable,
  InlineStack,
  Layout,
  Link,
  Page,
  Text,
  TextField,
  useBreakpoints,
  useIndexResourceState,
} from "@shopify/polaris";
import { DeleteIcon, SearchIcon, XIcon } from "@shopify/polaris-icons";
import { type KeyboardEvent, useCallback, useState } from "react";
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useNavigation,
  useSearchParams,
} from "@remix-run/react";

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import type { Prisma } from "@prisma/client";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "app/db.server";
import { findManyPaginated } from "app/utils/findManyPaginated";

const PER_PAGE = 20;

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

  return findManyPaginated<
    Prisma.BundleDelegate,
    Prisma.BundleGetPayload<Prisma.BundleDefaultArgs>
  >(
    db.bundle,
    { first, last, ...(after ? { after } : {}), ...(before ? { before } : {}) },
    where,
    [{ createdAt: "desc" }, { id: "desc" }],
    PER_PAGE,
  );
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const { method } = request;
  const formData = await request.formData();

  switch (method.toLowerCase()) {
    case "delete": {
      const ids = (formData.get("ids")?.toString() || "")
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean);

      const deleted = await db.bundle.deleteMany({
        where: {
          id: { in: ids },
          shop: session.shop,
        },
      });

      return {
        message: "Deleted",
        deleted,
      };
    }

    default:
      return new Response("Method is not allowed", { status: 405 });
  }
};

export default function Index() {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const {
    paginatedItems: bundles,
    pageInfo: { hasNextPage, hasPreviousPage, endCursor, startCursor },
  } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher<typeof action>();

  const isLoading = navigation.state === "loading";
  const query = searchParams.get("query") || "";

  const [queryValue, setQueryValue] = useState(query);

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(bundles);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) =>
      e.key === "Enter" && navigate(`?query=${queryValue}`),
    [navigate, queryValue],
  );

  return (
    <Page>
      <TitleBar>
        <button variant="primary" onClick={() => navigate("bundles/create")}>
          Create bundle
        </button>
      </TitleBar>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                {(!!bundles.length || query) && (
                  <BlockStack inlineAlign="end">
                    <Button
                      variant="primary"
                      url="bundles/create"
                      fullWidth={false}
                    >
                      Create bundle
                    </Button>
                  </BlockStack>
                )}

                {(!!bundles.length || query) && (
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

                <IndexTable
                  condensed={useBreakpoints().smDown}
                  resourceName={{
                    singular: "bundle",
                    plural: "bundles",
                  }}
                  itemCount={bundles.length}
                  selectedItemsCount={
                    allResourcesSelected ? "All" : selectedResources.length
                  }
                  onSelectionChange={handleSelectionChange}
                  headings={[
                    { title: "Title" },
                    { title: "Product amount", alignment: "end" },
                    { title: "Price", alignment: "end" },
                    { title: "Created at" },
                  ]}
                  emptyState={
                    query ? (
                      false
                    ) : (
                      <EmptyState
                        heading="You don't have any bundles yet"
                        action={{
                          content: "Create bundle",
                          url: "bundles/create",
                        }}
                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                      >
                        <p>Compile your products into bundles.</p>
                      </EmptyState>
                    )
                  }
                  bulkActions={[
                    {
                      items: [
                        {
                          prefix: <Icon source={DeleteIcon} />,
                          destructive: true,
                          content: "Delete bundles",
                          onAction: () => {
                            const formData = new FormData();
                            formData.set(
                              "ids",
                              `${selectedResources.join(",")}`,
                            );

                            fetcher.submit(formData, {
                              method: "DELETE",
                            });
                          },
                        },
                      ],
                    },
                  ]}
                  pagination={
                    bundles.length && (hasNextPage || hasPreviousPage)
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
                >
                  {bundles.map(
                    ({ id, title, price, productAmount, createdAt }, index) => (
                      <IndexTable.Row
                        id={id}
                        key={id}
                        selected={selectedResources.includes(id)}
                        position={index}
                      >
                        <IndexTable.Cell>
                          <Link dataPrimaryLink url={`bundles/${id}`}>
                            <Text variant="bodyMd" fontWeight="bold" as="span">
                              {title}
                            </Text>
                          </Link>
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <Text as="span" alignment="end" numeric>
                            {productAmount}
                          </Text>
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <Text as="span" alignment="end" numeric>
                            {price}
                          </Text>
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <Text as="span">
                            {new Date(createdAt).toLocaleString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        </IndexTable.Cell>
                      </IndexTable.Row>
                    ),
                  )}
                </IndexTable>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    App template specs
                  </Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Framework
                      </Text>
                      <Link
                        url="https://remix.run"
                        target="_blank"
                        removeUnderline
                      >
                        Remix
                      </Link>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Database
                      </Text>
                      <Link
                        url="https://www.prisma.io/"
                        target="_blank"
                        removeUnderline
                      >
                        Prisma
                      </Link>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Interface
                      </Text>
                      <span>
                        <Link
                          url="https://polaris.shopify.com"
                          target="_blank"
                          removeUnderline
                        >
                          Polaris
                        </Link>
                        {", "}
                        <Link
                          url="https://shopify.dev/docs/apps/tools/app-bridge"
                          target="_blank"
                          removeUnderline
                        >
                          App Bridge
                        </Link>
                      </span>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        API
                      </Text>
                      <Link
                        url="https://shopify.dev/docs/api/admin-graphql"
                        target="_blank"
                        removeUnderline
                      >
                        GraphQL API
                      </Link>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
