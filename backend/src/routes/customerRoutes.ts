import express from 'express';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../controllers/customerController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/')
    .get(protect, authorize('customers_read'), getCustomers)
    .post(protect, authorize('customers_create'), createCustomer);

router.route('/:id')
    .put(protect, authorize('customers_update'), updateCustomer)
    .delete(protect, authorize('customers_delete'), deleteCustomer);

export default router;
