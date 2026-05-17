import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const sellersTable = pgTable("sellers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone").notNull(),
  productType: text("product_type").notNull(),
  applicationId: integer("application_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Seller = typeof sellersTable.$inferSelect;
