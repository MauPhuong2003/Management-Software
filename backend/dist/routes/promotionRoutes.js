"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const promotionController_1 = require("../controllers/promotionController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.route('/')
    .get(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('promotions_read'), promotionController_1.getPromotions)
    .post(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('promotions_create'), promotionController_1.createPromotion);
router.route('/:id')
    .put(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('promotions_update'), promotionController_1.updatePromotion)
    .delete(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('promotions_delete'), promotionController_1.deletePromotion);
exports.default = router;
