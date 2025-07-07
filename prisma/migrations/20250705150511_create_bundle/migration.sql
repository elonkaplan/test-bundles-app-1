-- CreateTable
CREATE TABLE "Bundle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL COLLATE NOCASE,
    "price" REAL NOT NULL,
    "selectedProducts" JSONB NOT NULL,
    "productAmount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);