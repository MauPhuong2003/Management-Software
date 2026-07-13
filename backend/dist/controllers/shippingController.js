"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateShipping = exports.getShipping = void 0;
const ShippingConfig_1 = __importDefault(require("../models/ShippingConfig"));
const getShipping = async (req, res) => {
    try {
        let config = await ShippingConfig_1.default.findOne();
        if (!config)
            config = await ShippingConfig_1.default.create({});
        res.json({ success: true, data: config });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getShipping = getShipping;
const updateShipping = async (req, res) => {
    try {
        let config = await ShippingConfig_1.default.findOne();
        if (config)
            config = await ShippingConfig_1.default.findOneAndUpdate({}, req.body, { new: true });
        else
            config = await ShippingConfig_1.default.create(req.body);
        res.json({ success: true, data: config });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.updateShipping = updateShipping;
