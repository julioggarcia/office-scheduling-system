-- AlterTable
ALTER TABLE "Building" ADD COLUMN "timezone" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DefaultWorker";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "SeatAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "daysOfWeek" TEXT NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "reviewNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SeatAssignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeatAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SeatAssignment_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SeatAssignment_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "adObjectId" TEXT,
    "managerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
-- carry the old isAdmin flag over to the new role column
INSERT INTO "new_User" ("active", "adObjectId", "createdAt", "email", "id", "name", "updatedAt", "role") SELECT "active", "adObjectId", "createdAt", "email", "id", "name", "updatedAt", CASE WHEN "isAdmin" THEN 'ADMIN' ELSE 'STAFF' END FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_adObjectId_key" ON "User"("adObjectId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE INDEX "SeatAssignment_locationId_status_idx" ON "SeatAssignment"("locationId", "status");

-- CreateIndex
CREATE INDEX "SeatAssignment_userId_idx" ON "SeatAssignment"("userId");

