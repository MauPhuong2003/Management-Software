"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const settingController_1 = require("../controllers/settingController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.route('/')
    .get(authMiddleware_1.protect, settingController_1.getSettings)
    .put(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('settings_update'), settingController_1.updateSettings);
router.route('/roles')
    .get(authMiddleware_1.protect, settingController_1.getRoles)
    .post(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('settings_create'), settingController_1.createRole);
router.route('/roles/:id')
    .put(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('settings_update'), settingController_1.updateRole)
    .delete(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('settings_delete'), settingController_1.deleteRole);
router.route('/users')
    .get(authMiddleware_1.protect, settingController_1.getUsers)
    .post(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('settings_create'), settingController_1.createUser);
router.route('/users/:id')
    .put(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('settings_update'), settingController_1.updateUser)
    .delete(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('settings_delete'), settingController_1.deleteUser);
exports.default = router;
