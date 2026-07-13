"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const flashSaleController_1 = require("../controllers/flashSaleController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.route('/')
    .get(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('promotions_read'), flashSaleController_1.getFlashSales)
    .post(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('promotions_create'), flashSaleController_1.createFlashSale);
router.route('/:id')
    .put(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('promotions_update'), flashSaleController_1.updateFlashSale)
    .delete(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('promotions_delete'), flashSaleController_1.deleteFlashSale);
exports.default = router;
