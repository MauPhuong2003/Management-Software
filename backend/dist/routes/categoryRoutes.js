"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const categoryController_1 = require("../controllers/categoryController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.route('/')
    .get(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('categories_read'), categoryController_1.getCategories)
    .post(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('categories_create'), categoryController_1.createCategory);
router.route('/:id')
    .put(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('categories_update'), categoryController_1.updateCategory)
    .delete(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('categories_delete'), categoryController_1.deleteCategory);
exports.default = router;
