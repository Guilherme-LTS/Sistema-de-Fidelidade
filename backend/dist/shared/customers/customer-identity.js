"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertConsumerProfile = upsertConsumerProfile;
exports.resolveTenantCustomerByDocument = resolveTenantCustomerByDocument;
exports.upsertTenantCustomerByDocument = upsertTenantCustomerByDocument;
function cleanDocument(document) {
    return (document || '').replace(/\D/g, '');
}
function cleanName(name) {
    const normalized = (name || '').trim();
    return normalized.length > 0 ? normalized : null;
}
async function upsertConsumerProfile(executor, input) {
    const document = cleanDocument(input.document);
    const name = cleanName(input.name);
    const lgpdConsent = input.lgpdConsent ?? false;
    const consentDate = input.consentDate ?? null;
    const result = await executor.query(`
      INSERT INTO consumer_profiles (document, name, lgpd_consent, consent_date)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (document)
      DO UPDATE SET
        name = COALESCE(consumer_profiles.name, EXCLUDED.name),
        lgpd_consent = consumer_profiles.lgpd_consent OR EXCLUDED.lgpd_consent,
        consent_date = COALESCE(consumer_profiles.consent_date, EXCLUDED.consent_date),
        deleted_at = NULL,
        updated_at = NOW()
      RETURNING id, document, name, lgpd_consent, consent_date
    `, [document, name, lgpdConsent, consentDate]);
    return result.rows[0];
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
    return inserted.rows[0];
}
