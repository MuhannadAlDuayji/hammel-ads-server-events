import * as mongoose from "mongoose";
import IUser from "../types/user";
import { UserTypeId, UserTypeName } from "../types/user/UserType";
import crypto from "crypto";
import UserPaymentMethodType from "../types/paymentmethod";
import Transaction from "../types/transaction";

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    photoPath: { type: String, default: null },
    preferredLanguage: { type: String, default: "ar" },
    userTypeName: {
        type: String,
        default: "User",
        enum: Object.values(UserTypeName),
    },
    userTypeId: {
        type: Number,
        default: 1,
        enum: [1, 2],
        index: true,
    },
    isEmailConfirmed: {
        type: Boolean,
        default: false,
    },
    confirmationToken: {
        type: String,
        default: null,
    },
    resetToken: {
        type: String,
        default: null,
    },
    resetTokenExpiration: {
        type: Date,
        default: null,
    },
    balance: {
        type: Number,
        default: 0,
    },
    paymentMethods: {
        type: Array<UserPaymentMethodType>,
        default: [],
    },
    createdAt: {
        type: Date,
        required: true,
    },
    transactions: {
        type: Array<Transaction>,
        default: [],
    },
    discount: {
        type: Number,
        default: 0,
    },
});
const User = mongoose.model<IUser>("User", userSchema);

export default User;
