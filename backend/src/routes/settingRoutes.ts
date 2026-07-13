import express from 'express';
import { 
    getSettings, 
    updateSettings, 
    getRoles, 
    createRole, 
    updateRole, 
    deleteRole,
    getUsers,
    createUser,
    updateUser,
    deleteUser
} from '../controllers/settingController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/')
    .get(protect, getSettings)
    .put(protect, authorize('settings_update'), updateSettings);

router.route('/roles')
    .get(protect, getRoles)
    .post(protect, authorize('settings_create'), createRole);

router.route('/roles/:id')
    .put(protect, authorize('settings_update'), updateRole)
    .delete(protect, authorize('settings_delete'), deleteRole);

router.route('/users')
    .get(protect, getUsers)
    .post(protect, authorize('settings_create'), createUser);

router.route('/users/:id')
    .put(protect, authorize('settings_update'), updateUser)
    .delete(protect, authorize('settings_delete'), deleteUser);

export default router;
