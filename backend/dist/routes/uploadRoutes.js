"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uploadMiddleware_1 = require("../middlewares/uploadMiddleware");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.post('/', authMiddleware_1.protect, uploadMiddleware_1.upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'Vui lòng chọn một file ảnh' });
            return;
        }
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({
            success: true,
            data: {
                url: fileUrl,
                filename: req.file.filename
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.default = router;
