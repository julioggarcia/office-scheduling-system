-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Building" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "floorCount" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_Building" ("id", "name") SELECT "id", "name" FROM "Building";
DROP TABLE "Building";
ALTER TABLE "new_Building" RENAME TO "Building";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
