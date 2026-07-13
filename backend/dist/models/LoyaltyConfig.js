"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const tierSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    minPoints: { type: Number, required: true, default: 0 },
    pointMultiplier: { type: Number, required: true, default: 1 },
    discountPercent: { type: Number, required: true, default: 0 },
    color: { type: String, default: '#6B7280' },
    icon: { type: String, default: '🥉' },
    isActive: { type: Boolean, default: true }
}, { _id: false });
const loyaltyConfigSchema = new mongoose_1.Schema({
    vndToEarnOnePoint: { type: Number, default: 100000 },
    applyToOrders: { type: String, enum: ['all', 'pos', 'website'], default: 'all' },
    delayDaysAfterPayment: { type: Number, default: 0 },
    minOrderToUsePoints: { type: Number, default: 0 },
    maxPointUsagePercent: { type: Number, default: 1 },
    vndPerPointRedemption: { type: Number, default: 1000 },
    tiers: {
        type: [tierSchema], default: [
            { name: 'Đồng', minPoints: 0, pointMultiplier: 1, discountPercent: 0, color: '#6B7280', icon: '🥉', isActive: true },
            { name: 'Bạc', minPoints: 1000, pointMultiplier: 1.5, discountPercent: 2, color: '#9CA3AF', icon: '🥈', isActive: true },
            { name: 'Vàng', minPoints: 5000, pointMultiplier: 2, discountPercent: 5, color: '#F59E0B', icon: '🥇', isActive: true },
            { name: 'Kim Cương', minPoints: 10000, pointMultiplier: 3, discountPercent: 7, color: '#60A5FA', icon: '💎', isActive: true },
        ]
    },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });
exports.default = mongoose_1.default.model('LoyaltyConfig', loyaltyConfigSchema);
