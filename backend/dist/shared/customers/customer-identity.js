"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertConsumerProfile = upsertConsumerProfile;
exports.resolveTenantCustomerByDocument = resolveTenantCustomerByDocument;
exports.upsertTenantCustomerByDocument = upsertTenantCustomerByDocument;
const crypto_1 = require("crypto");
function cleanDocument(document) {
    return (document || '').replace(/\D/g, '');
}
function cleanName(name) {
    const normalized = (name || '').trim();
    return normalized.length > 0 ? normalized : null;
}
async function findConsumerProfileByDocument(executor, document) {
    const result = await executor.query(`
      SELECT id, document, name, lgpd_consent, consent_date
      FROM consumer_profiles
      WHERE document = $1
      LIMIT 1
    `, [document]);
    return result.rows[0] || null;
}
async function upsertConsumerProfile(executor, input) {
    const document = cleanDocument(input.document);
    const name = cleanName(input.name);
    const lgpdConsent = input.lgpdConsent ?? false;
    const consentDate = input.consentDate ?? null;
    const existingProfile = await findConsumerProfileByDocument(executor, document);
    if (existingProfile?.id) {
        const result = await executor.query(`
        UPDATE consumer_profiles
        SET name = COALESCE(name, $1),
            lgpd_consent = lgpd_consent OR $2,
            consent_date = COALESCE(consent_date, $3),
            deleted_at = NULL,
            updated_at = NOW()
        WHERE id = $4
        RETURNING id, document, name, lgpd_consent, consent_date
      `, [name, lgpdConsent, consentDate, existingProfile.id]);
        return result.rows[0];
    }
    const generatedId = (0, crypto_1.randomUUID)();
    await executor.query(`
      INSERT INTO consumer_profiles (id, document, name, lgpd_consent, consent_date)
      VALUES ($1, $2, $3, $4, $5)
    `, [generatedId, document, name, lgpdConsent, consentDate]);
    return {
        id: generatedId,
        document,
        name,
        lgpd_consent: lgpdConsent,
        consent_date: consentDate,
    };
}
async function resolveTenantCustomerByDocument(executor, tenantId, document) {
    const cpfLimpo = cleanDocument(document);
    if (!cpfLimpo) {
        return null;
    }
    const result = await executor.query(`
      SELECT
        c.id,
        COALESCE(c.name, cp.name) AS name,
        COALESCE(cp.document, c.document) AS document,
        c.consumer_profile_id
      FROM customers c
      LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id
      WHERE c.tenant_id = $1
        AND c.deleted_at IS NULL
        AND COALESCE(cp.document, c.document) = $2
      LIMIT 1
    `, [tenantId, cpfLimpo]);
    return result.rows[0] || null;
}
async function upsertTenantCustomerByDocument(executor, input) {
    const tenantId = input.tenantId;
    const document = cleanDocument(input.document);
    const displayName = cleanName(input.name);
    const profile = await upsertConsumerProfile(executor, {
        document,
        name: displayName,
        lgpdConsent: input.lgpdConsent,
        consentDate: input.consentDate,
    });
    const existingCustomer = await resolveTenantCustomerByDocument(executor, tenantId, document);
    if (existingCustomer?.id) {
        if (existingCustomer.consumer_profile_id !== profile.id || existingCustomer.name !== displayName) {
            const updated = await executor.query(`
          UPDATE customers
          SET consumer_profile_id = $1,
              name = COALESCE($2, name),
              document = $3,
              lgpd_consent = COALESCE($4, lgpd_consent),
              consent_date = COALESCE($5, consent_date),
              updated_at = NOW()
          WHERE id = $6
          RETURNING id, name, document, consumer_profile_id
        `, [profile.id, displayName, document, input.lgpdConsent ?? null, input.consentDate ?? null, existingCustomer.id]);
            return updated.rows[0];
        }
        return existingCustomer;
    }
    const inserted = await executor.query(`
      INSERT INTO customers (
        tenant_id,
        consumer_profile_id,
        name,
        document,
        lgpd_consent,
        consent_date
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, document, consumer_profile_id
    `, [
        tenantId,
        profile.id,
        displayName || profile.name,
        document,
        input.lgpdConsent ?? profile.lgpd_consent,
        input.consentDate ?? profile.consent_date,
    ]);
    if (inserted.rows.length === 0) {
        throw new Error(`Falha ao inserir cliente: RLS bloqueou a operação ou o tenant_id (${tenantId}) é inválido.`);
    }
    return inserted.rows[0];
}
