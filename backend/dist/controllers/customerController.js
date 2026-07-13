"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCustomer = exports.updateCustomer = exports.createCustomer = exports.getCustomers = void 0;
const Customer_1 = __importDefault(require("../models/Customer"));
const getCustomers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const customers = await Customer_1.default.find().skip(skip).limit(limit).sort({ createdAt: -1 });
        const total = await Customer_1.default.countDocuments();
        res.json({
            success: true,
            data: customers,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getCustomers = getCustomers;
const createCustomer = async (req, res) => {
    try {
        const customer = await Customer_1.default.create(req.body);
        res.status(201).json({ success: true, data: customer });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createCustomer = createCustomer;
const updateCustomer = async (req, res) => {
    try {
        const customer = await Customer_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: customer });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateCustomer = updateCustomer;
const deleteCustomer = async (req, res) => {
    try {
        await Customer_1.default.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteCustomer = deleteCustomer;
