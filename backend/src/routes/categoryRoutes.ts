import express from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/')
    .get(protect, authorize('categories_read'), getCategories)
    .post(protect, authorize('categories_create'), createCategory);

router.route('/:id')
    .put(protect, authorize('categories_update'), updateCategory)
    .delete(protect, authorize('categories_delete'), deleteCategory);

export default router;
