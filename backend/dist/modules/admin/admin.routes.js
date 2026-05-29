"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_audit_routes_1 = __importDefault(require("./admin.audit.routes"));
const admin_users_routes_1 = __importDefault(require("./admin.users.routes"));
const admin_settings_routes_1 = __importDefault(require("./admin.settings.routes"));
const router = (0, express_1.Router)();
router.use(admin_audit_routes_1.default);
router.use(admin_users_routes_1.default);
router.use(admin_settings_routes_1.default);
exports.default = router;
