"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const warehouseController_1 = require("../controllers/warehouseController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.route('/')
    .get(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('warehouses_read'), warehouseController_1.getWarehouses)
    .post(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('warehouses_create'), warehouseController_1.createWarehouse);
router.route('/:id')
    .put(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('warehouses_update'), warehouseController_1.updateWarehouse)
    .delete(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('warehouses_delete'), warehouseController_1.deleteWarehouse);
exports.default = router;
