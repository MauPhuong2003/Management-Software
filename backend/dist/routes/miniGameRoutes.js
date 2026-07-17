"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomerSpinHistory = exports.spinWheel = exports.exchangePointsForSpins = exports.getActiveMiniGame = void 0;
const express_1 = require("express");
const miniGameController_1 = require("../controllers/miniGameController");
Object.defineProperty(exports, "getActiveMiniGame", { enumerable: true, get: function () { return miniGameController_1.getActiveMiniGame; } });
Object.defineProperty(exports, "exchangePointsForSpins", { enumerable: true, get: function () { return miniGameController_1.exchangePointsForSpins; } });
Object.defineProperty(exports, "spinWheel", { enumerable: true, get: function () { return miniGameController_1.spinWheel; } });
Object.defineProperty(exports, "getCustomerSpinHistory", { enumerable: true, get: function () { return miniGameController_1.getCustomerSpinHistory; } });
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// ──────────────────────────────────────────────
// Admin routes (protected by admin JWT)
// ──────────────────────────────────────────────
router.get('/', authMiddleware_1.protect, miniGameController_1.getMiniGame);
router.post('/', authMiddleware_1.protect, miniGameController_1.upsertMiniGame);
router.put('/toggle', authMiddleware_1.protect, miniGameController_1.toggleMiniGame);
router.get('/history', authMiddleware_1.protect, miniGameController_1.getSpinHistory);
router.put('/history/:historyId/reward', authMiddleware_1.protect, miniGameController_1.updateRewardStatus);
router.put('/slots/:slotId/reset', authMiddleware_1.protect, miniGameController_1.resetSlotQuantity);
exports.default = router;
