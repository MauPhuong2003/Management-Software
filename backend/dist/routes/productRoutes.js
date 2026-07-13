"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const productController_1 = require("../controllers/productController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.post('/bulk-import', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('products_create'), productController_1.bulkImportProducts);
router.route('/')
    .get(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('products_read'), productController_1.getProducts)
    .post(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('products_create'), productController_1.createProduct);
router.route('/:id')
    .put(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('products_update'), productController_1.updateProduct)
    .delete(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('products_delete'), productController_1.deleteProduct);
exports.default = router;
