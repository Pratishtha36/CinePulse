"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = exports.registerUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
const env_1 = require("../config/env");
const registerUser = async (data) => {
    const existingUser = await prisma_1.prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
        throw { statusCode: 400, message: 'User with this email already exists' };
    }
    const role = data.role && ['ADMIN', 'ORGANISER', 'CUSTOMER'].includes(data.role.toUpperCase())
        ? data.role.toUpperCase()
        : 'CUSTOMER';
    const passwordHash = await bcryptjs_1.default.hash(data.password, 10);
    const user = await prisma_1.prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            passwordHash,
            role,
        },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, env_1.ENV.JWT_SECRET, {
        expiresIn: '7d',
    });
    return { user, token };
};
exports.registerUser = registerUser;
const loginUser = async (data) => {
    const user = await prisma_1.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
        throw { statusCode: 401, message: 'Invalid email or password' };
    }
    const isValidPassword = await bcryptjs_1.default.compare(data.password, user.passwordHash);
    if (!isValidPassword) {
        throw { statusCode: 401, message: 'Invalid email or password' };
    }
    const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, env_1.ENV.JWT_SECRET, {
        expiresIn: '7d',
    });
    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
        token,
    };
};
exports.loginUser = loginUser;
