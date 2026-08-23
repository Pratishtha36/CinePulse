"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.ENV = {
    PORT: process.env.PORT || '5000',
    JWT_SECRET: process.env.JWT_SECRET || 'ticket_booking_super_secret_jwt_key_2026',
    NODE_ENV: process.env.NODE_ENV || 'development',
    SEAT_HOLD_TTL_MINUTES: parseInt(process.env.SEAT_HOLD_TTL_MINUTES || '10', 10),
    WAITLIST_OFFER_TTL_MINUTES: parseInt(process.env.WAITLIST_OFFER_TTL_MINUTES || '10', 10),
};
