-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL DEFAULT 'demo',
    "scenarioId" TEXT NOT NULL,
    "scenarioVersion" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "clientScore" INTEGER NOT NULL,
    "serverScore" INTEGER NOT NULL,
    "verified" BOOLEAN NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "eventsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
