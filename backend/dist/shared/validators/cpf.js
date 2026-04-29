"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAndCleanCPF = validateAndCleanCPF;
exports.extractAndValidateCPF = extractAndValidateCPF;
const cpf_cnpj_validator_1 = require("cpf-cnpj-validator");
/**
 * Valida e limpa um CPF
 * @param document CPF bruto (com ou sem formatação)
 * @returns { isValid: boolean; cleaned: string; error?: string }
 */
function validateAndCleanCPF(document) {
    if (!document || typeof document !== 'string') {
        return { isValid: false, cleaned: '', error: 'CPF é obrigatório.' };
    }
    const cleaned = document.replace(/\D/g, '');
    if (cleaned.length !== 11) {
        return { isValid: false, cleaned: '', error: 'CPF deve conter 11 dígitos.' };
    }
    if (!cpf_cnpj_validator_1.cpf.isValid(cleaned)) {
        return { isValid: false, cleaned: '', error: 'O CPF informado é inválido.' };
    }
    return { isValid: true, cleaned };
}
/**
 * Valida requisição contém CPF válido no body
 * Sou usado como método utilitário para request validation
 */
function extractAndValidateCPF(body) {
    const result = validateAndCleanCPF(body?.document);
    if (!result.isValid) {
        return { valid: false, cpf: '', error: result.error };
    }
    return { valid: true, cpf: result.cleaned };
}
