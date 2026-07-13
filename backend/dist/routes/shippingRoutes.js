"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const shippingController_1 = require("../controllers/shippingController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.route('/')
    .get(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('shipping_read'), shippingController_1.getShipping)
    .put(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('shipping_update'), shippingController_1.updateShipping);
exports.default = router;
