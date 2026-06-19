import { pgTable, uuid, varchar, boolean, timestamp, text, integer, uniqueIndex, serial, numeric } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// -----------------------------------------------------------------------------
// Core Tables
// -----------------------------------------------------------------------------

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey(), // PK (matches auth.users.id of the admin in most cases)
  name: varchar("name").notNull(),
  document: varchar("document"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
});

export const tenantUsers = pgTable("tenant_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id"), // FK to auth.users.id
  name: varchar("name").notNull(),
  role: varchar("role").notNull().$type<"admin" | "operador">(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
});

export const consumerProfiles = pgTable("consumer_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  document: varchar("document", { length: 14 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  lgpdConsent: boolean("lgpd_consent").default(false),
  consentDate: timestamp("consent_date", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  consumerProfileId: uuid("consumer_profile_id").notNull().references(() => consumerProfiles.id),
  document: varchar("document", { length: 14 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  totalPoints: integer("total_points").default(0),
  lgpdConsent: boolean("lgpd_consent").default(false),
  consentDate: timestamp("consent_date", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
}, (t) => ({
  unqTenantDocument: uniqueIndex("idx_customers_tenant_document_unique").on(t.tenantId, t.document).where(sql`deleted_at IS NULL`),
}));

// -----------------------------------------------------------------------------
// Relations
// -----------------------------------------------------------------------------

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(tenantUsers),
  customers: many(customers),
}));

export const tenantUsersRelations = relations(tenantUsers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantUsers.tenantId],
    references: [tenants.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [customers.tenantId],
    references: [tenants.id],
  }),
  consumerProfile: one(consumerProfiles, {
    fields: [customers.consumerProfileId],
    references: [consumerProfiles.id],
  }),
  transactions: many(transactions),
}));

export const tenantSettings = pgTable("tenant_settings", {
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  settingKey: varchar("setting_key").notNull(),
  settingValue: integer("setting_value"),
  settingUnit: varchar("setting_unit"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "cascade" }),
  amountSpent: numeric("amount_spent").notNull(),
  pointsEarned: integer("points_earned").notNull(),
  remainingPoints: integer("remaining_points").notNull().default(0),
  availableAt: timestamp("available_at", { withTimezone: true, mode: "string" }),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
  operatorId: uuid("operator_id"),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
  customer: one(customers, {
    fields: [transactions.customerId],
    references: [customers.id],
  }),
  tenant: one(tenants, {
    fields: [transactions.tenantId],
    references: [tenants.id],
  }),
}));

export const rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  pointsCost: integer("points_cost").notNull(),
  isActive: boolean("is_active").default(true),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
});

export const redemptions = pgTable("redemptions", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "cascade" }),
  rewardId: integer("reward_id").references(() => rewards.id),
  pointsSpent: integer("points_spent").notNull(),
  operatorId: uuid("operator_id"),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
});

export const rewardsRelations = relations(rewards, ({ one }) => ({
  tenant: one(tenants, {
    fields: [rewards.tenantId],
    references: [tenants.id],
  }),
}));

export const redemptionsRelations = relations(redemptions, ({ one }) => ({
  customer: one(customers, {
    fields: [redemptions.customerId],
    references: [customers.id],
  }),
  reward: one(rewards, {
    fields: [redemptions.rewardId],
    references: [rewards.id],
  }),
  tenant: one(tenants, {
    fields: [redemptions.tenantId],
    references: [tenants.id],
  }),
}));
