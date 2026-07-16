"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var database_1 = require("../infra/database");
var schema_1 = require("../infra/database/schema");
var drizzle_orm_1 = require("drizzle-orm");
var supabase_js_1 = require("@supabase/supabase-js");
var dotenv_1 = require("dotenv");
dotenv_1.default.config();
var supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
function expireTrial() {
    return __awaiter(this, void 0, void 0, function () {
        var email, _a, usersData, usersError, user, tenantRows, tenant, pastDate;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    email = process.argv[2];
                    if (!email) {
                        console.error("❌ Por favor, forneça um email. Exemplo: npm run dev:expire-trial test@test.com");
                        process.exit(1);
                    }
                    console.log("\uD83D\uDD0D Buscando usu\u00E1rio com email: ".concat(email));
                    return [4 /*yield*/, supabase.auth.admin.listUsers()];
                case 1:
                    _a = _b.sent(), usersData = _a.data, usersError = _a.error;
                    if (usersError || !(usersData === null || usersData === void 0 ? void 0 : usersData.users)) {
                        console.error("❌ Erro ao buscar usuários no Supabase:", usersError);
                        process.exit(1);
                    }
                    user = usersData.users.find(function (u) { return u.email === email; });
                    if (!user) {
                        console.error("❌ Usuário não encontrado no Auth.");
                        process.exit(1);
                    }
                    console.log("\u2705 Usu\u00E1rio encontrado (ID: ".concat(user.id, "). Atualizando Tenant..."));
                    return [4 /*yield*/, database_1.db.select().from(schema_1.tenants).where((0, drizzle_orm_1.eq)(schema_1.tenants.id, user.id))];
                case 2:
                    tenantRows = _b.sent();
                    if (tenantRows.length === 0) {
                        console.error("❌ Tenant (Restaurante) não encontrado para este usuário.");
                        process.exit(1);
                    }
                    tenant = tenantRows[0];
                    if (tenant.subscriptionStatus !== "trialing") {
                        console.log("\u26A0\uFE0F Aviso: O status atual da assinatura \u00E9 '".concat(tenant.subscriptionStatus, "', mas vamos for\u00E7ar a expira\u00E7\u00E3o do trial mesmo assim."));
                    }
                    pastDate = new Date();
                    pastDate.setDate(pastDate.getDate() - 1);
                    return [4 /*yield*/, database_1.db
                            .update(schema_1.tenants)
                            .set({
                            subscriptionCurrentPeriodEnd: pastDate,
                            subscriptionStatus: "trialing", // Garantir que está como trialing
                        })
                            .where((0, drizzle_orm_1.eq)(schema_1.tenants.id, user.id))];
                case 3:
                    _b.sent();
                    console.log("\uD83C\uDF89 Sucesso! O Trial do restaurante '".concat(tenant.name, "' foi expirado."));
                    console.log("Data de t\u00E9rmino atualizada para: ".concat(pastDate.toISOString()));
                    console.log("\uD83D\uDC49 Agora recarregue a p\u00E1gina (F5) no frontend para ver o bloqueio.");
                    process.exit(0);
                    return [2 /*return*/];
            }
        });
    });
}
expireTrial().catch(function (err) {
    console.error("❌ Erro fatal:", err);
    process.exit(1);
});
