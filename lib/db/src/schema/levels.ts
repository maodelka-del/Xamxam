import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const levelsTable = pgTable("levels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  group: text("group"),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLevelSchema = createInsertSchema(levelsTable).omit({ id: true, createdAt: true });
export type InsertLevel = z.infer<typeof insertLevelSchema>;
export type Level = typeof levelsTable.$inferSelect;
