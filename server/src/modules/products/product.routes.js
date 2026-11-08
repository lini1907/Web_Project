import { Router } from 'express';
import * as c from './product.controller.js';
import { requireRole, requireApprovedVendor } from '../../middleware/auth.js';

const router = Router();

// Công khai
router.get('/products', c.list);
router.get('/products/:idOrSlug', c.detail);
router.get('/categories', c.categories);
router.get('/rescue', c.rescueList);

// Vendor (quyền sở hữu kiểm trong service bằng điều kiện vendorId = session user)
router.get('/vendor/products', requireRole('vendor'), c.vendorList);
router.get('/vendor/products/:id', requireRole('vendor'), c.vendorGet);
router.post('/vendor/products', requireApprovedVendor, c.vendorCreate);
router.patch('/vendor/products/:id', requireApprovedVendor, c.vendorUpdate);
router.delete('/vendor/products/:id', requireApprovedVendor, c.vendorRemove);
router.put('/vendor/products/:id/rescue', requireApprovedVendor, c.vendorSetRescue);
router.delete('/vendor/products/:id/rescue', requireApprovedVendor, c.vendorClearRescue);

export default router;
