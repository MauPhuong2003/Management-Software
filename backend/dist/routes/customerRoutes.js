"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const customerController_1 = require("../controllers/customerController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.route('/')
    .get(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('customers_read'), customerController_1.getCustomers)
    .post(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('customers_create'), customerController_1.createCustomer);
router.route('/:id')
    .put(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('customers_update'), customerController_1.updateCustomer)
    .delete(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('customers_delete'), customerController_1.deleteCustomer);
exports.default = router;
