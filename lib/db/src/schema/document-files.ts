import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { documentsTable } from "./documents";

export const documentFilesTable = pgTable("document_files", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documentsTable.id, { onDelete: "cascade" }),
  objectPath: text("object_path").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DocumentFile = typeof documentFilesTable.$inferSelect;
