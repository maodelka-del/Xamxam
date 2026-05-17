import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sellerApplicationsTable = pgTable("seller_applications", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  productType: text("product_type").notNull(),
  description: text("description").notNull(),
  portfolioUrl: text("portfolio_url"),
  passwordHash: text("password_hash"),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSellerApplicationSchema = createInsertSchema(sellerApplicationsTable).omit({
  id: true,
  status: true,
  adminNote: true,
  createdAt: true,
});

export type InsertSellerApplication = z.infer<typeof insertSellerApplicationSchema>;
export type SellerApplication = typeof sellerApplicationsTable.$inferSelect;
