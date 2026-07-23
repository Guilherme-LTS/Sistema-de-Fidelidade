import { pgTable, uuid, varchar, boolean, timestamp, text, integer, uniqueIndex, index, serial, numeric, decimal, jsonb } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// -----------------------------------------------------------------------------
// Core Tables
// -----------------------------------------------------------------------------

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey(), // PK (matches auth.users.id of the admin in most cases)
  name: varchar("name").notNull(),
  slug: varchar("slug", { length: 255 }).unique(),
  tradingName: varchar("trading_name"),
  document: varchar("document"),
  phone: varchar("phone"),
  email: varchar("email"),
  addressLine1: varchar("address_line1"),
  addressNumber: varchar("address_number"),
  addressCity: varchar("address_city"),
  addressState: varchar("address_state", { length: 2 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  logoUrl: text("logo_url"),
  regulationNotes: text("regulation_notes"),
  pointsConversionReal: decimal("points_conversion_real", { precision: 10, scale: 2 }).default("1.00").notNull(),
  loyaltyGracePeriodDays: integer("loyalty_grace_period_days").default(0),
  loyaltyExpirationDays: integer("loyalty_expiration_days").default(90),
  businessHours: jsonb("business_hours").$type<Record<string, { active: boolean; open: string; close: string }>>(),
  socialLinks: jsonb("social_links").$type<{ instagram?: string; facebook?: string; tiktok?: string; website?: string }>(),
  isActive: boolean("is_active").default(true),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).unique(),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }).unique(),
  stripeSubscriptionLastEventAt: integer("stripe_subscription_last_event_at"),
  stripeBillingCachedDetails: jsonb("stripe_billing_cached_details").$type<any>(),
  stripeBillingLastSyncedAt: integer("stripe_billing_last_synced_at"),
  subscriptionStatus: varchar("subscription_status", { length: 50 }).default("trialing"),
  subscriptionPriceId: varchar("subscription_price_id", { length: 255 }),
  subscriptionCurrentPeriodEnd: timestamp("subscription_current_period_end", { withTimezone: true, mode: "string" }).default(sql`(now() + interval '14 days')`),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  trialOnboardingShown: boolean("trial_onboarding_shown").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
});

export const tenantUsers = pgTable("tenant_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id"), // FK to auth.users.id
  name: varchar("name").notNull(),
  phone: varchar("phone"),
  role: varchar("role").notNull().$type<"admin" | "operador" | "novato">(),
  isActive: boolean("is_active").default(true),
  status: varchar("status", { length: 50 }).default("active").$type<"active" | "pending" | "declined">().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
});

export const invitations = pgTable("invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role").notNull().$type<"admin" | "operador" | "novato">(),
  token: uuid("token").defaultRandom().notNull().unique(),
  status: varchar("status", { length: 50 }).default("pending").$type<"pending" | "accepted" | "expired" | "revoked">().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
});

export const consumerProfiles = pgTable("consumer_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  authUserId: uuid("auth_user_id"), // FK to auth.users.id
  document: varchar("document", { length: 14 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  phone: varchar("phone"),
  lgpdConsent: boolean("lgpd_consent").default(false),
  consentDate: timestamp("consent_date", { withTimezone: true, mode: "string" }),
  consentIp: varchar("consent_ip", { length: 45 }),
  consentUserAgent: text("consent_user_agent"),
  consentOperatorId: uuid("consent_operator_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  consumerProfileId: uuid("consumer_profile_id").notNull().references(() => consumerProfiles.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
}, (t) => ({
  unqTenantConsumer: uniqueIndex("idx_customers_tenant_consumer_unique").on(t.tenantId, t.consumerProfileId).where(sql`deleted_at IS NULL`),
  idxTenantCreated: index("idx_customers_tenant_created").on(t.tenantId, t.createdAt),
}));

// -----------------------------------------------------------------------------
// Relations
// -----------------------------------------------------------------------------

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(tenantUsers),
  customers: many(customers),
  invitations: many(invitations),
}));

export const tenantUsersRelations = relations(tenantUsers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantUsers.tenantId],
    references: [tenants.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [invitations.tenantId],
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
}, (t) => ({
  idxTenantCreated: index("idx_transactions_tenant_created").on(t.tenantId, t.createdAt),
}));

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
  imageUrl: text("image_url"),
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
}, (t) => ({
  idxTenantCreated: index("idx_redemptions_tenant_created").on(t.tenantId, t.createdAt),
}));

export const rewardsRelations = relations(rewards, ({ one }) => ({
  tenant: one(tenants, {
    fields: [rewards.tenantId],
    references: [tenants.id],
  }),
}));

export const redemptionsRelations = relations(redemptions, ({ one, many }) => ({
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
  items: many(redemptionItems),
}));

export const redemptionItems = pgTable("redemption_items", {
  id: serial("id").primaryKey(),
  redemptionId: integer("redemption_id").notNull().references(() => redemptions.id, { onDelete: "cascade" }),
  transactionId: integer("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  pointsDeducted: integer("points_deducted").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
});

export const redemptionItemsRelations = relations(redemptionItems, ({ one }) => ({
  redemption: one(redemptions, {
    fields: [redemptionItems.redemptionId],
    references: [redemptions.id],
  }),
  transaction: one(transactions, {
    fields: [redemptionItems.transactionId],
    references: [transactions.id],
  }),
}));

// -----------------------------------------------------------------------------
// System & Audit
// -----------------------------------------------------------------------------

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  operatorId: uuid("operator_id"), // Quem realizou a acao (auth.users.id ou tenant_users.id dependendo do contexto)
  action: varchar("action").notNull(),
  entityType: varchar("entity_type"),
  entityId: varchar("entity_id"),
  metadata: text("metadata"), // JSON stringified para comportar o diff/contexto
  status: varchar("status").default("SUCESSO").notNull(), // SUCESSO ou FALHA
  ipAddress: varchar("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
}, (t) => ({
  idxTenantCreated: index("idx_audit_logs_tenant_created").on(t.tenantId, t.createdAt),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [auditLogs.tenantId],
    references: [tenants.id],
  }),
}));

export const expirations = pgTable("expirations", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  pointsExpired: integer("points_expired").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
}, (t) => ({
  idxTenantCreated: index("idx_expirations_tenant_created").on(t.tenantId, t.createdAt),
}));

export const expirationItems = pgTable("expiration_items", {
  id: serial("id").primaryKey(),
  expirationId: integer("expiration_id").notNull().references(() => expirations.id, { onDelete: "cascade" }),
  transactionId: integer("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  pointsDeducted: integer("points_deducted").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
});

export const expirationsRelations = relations(expirations, ({ one, many }) => ({
  customer: one(customers, {
    fields: [expirations.customerId],
    references: [customers.id],
  }),
  tenant: one(tenants, {
    fields: [expirations.tenantId],
    references: [tenants.id],
  }),
  items: many(expirationItems),
}));

export const expirationItemsRelations = relations(expirationItems, ({ one }) => ({
  expiration: one(expirations, {
    fields: [expirationItems.expirationId],
    references: [expirations.id],
  }),
  transaction: one(transactions, {
    fields: [expirationItems.transactionId],
    references: [transactions.id],
  }),
}));

export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  id: varchar("id", { length: 255 }).primaryKey(),
  processedAt: timestamp("processed_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const stripeInvoices = pgTable("stripe_invoices", {
  id: varchar("id", { length: 255 }).primaryKey(), // matches Stripe invoice ID, e.g. "in_..."
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  pdfUrl: text("pdf_url"),
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
});

export const stripeInvoicesRelations = relations(stripeInvoices, ({ one }) => ({
  tenant: one(tenants, {
    fields: [stripeInvoices.tenantId],
    references: [tenants.id],
  }),
}));

