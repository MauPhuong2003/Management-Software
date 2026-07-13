import express from 'express';
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '../controllers/warehouseController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/')
    .get(protect, authorize('warehouses_read'), getWarehouses)
    .post(protect, authorize('warehouses_create'), createWarehouse);

router.route('/:id')
    .put(protect, authorize('warehouses_update'), updateWarehouse)
    .delete(protect, authorize('warehouses_delete'), deleteWarehouse);

export default router;
