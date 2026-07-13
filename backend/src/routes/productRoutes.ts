import express from 'express';
import { getProducts, createProduct, updateProduct, deleteProduct, bulkImportProducts } from '../controllers/productController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/bulk-import', protect, authorize('products_create'), bulkImportProducts);

router.route('/')
    .get(protect, authorize('products_read'), getProducts)
    .post(protect, authorize('products_create'), createProduct);

router.route('/:id')
    .put(protect, authorize('products_update'), updateProduct)
    .delete(protect, authorize('products_delete'), deleteProduct);

export default router;
