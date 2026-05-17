import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  subject: text("subject").notNull(),
  level: text("level").notNull(),
  semester: text("semester"),
  docType: text("doc_type"),
  categoryId: integer("category_id"),
  sellerId: integer("seller_id"),
  price: integer("price").notNull(),
  previewUrl: text("preview_url"),
  fileUrl: text("file_url"),
  isFeatured: boolean("is_featured").notNull().default(false),
  pageCount: integer("page_count"),
  downloadCount: integer("download_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true, updatedAt: true, downloadCount: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
