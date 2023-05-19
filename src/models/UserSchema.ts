import * as mongoose from "mongoose";
import IUser from "../types/user";
import { UserType } from "../types/user/UserType";
import crypto from "crypto";
import UserPaymentMethodType from "../types/paymentmethod";

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    photoPath: { type: String, default: null },
    userType: {
        type: String,
        default: UserType.User,
        enum: Object.values(UserType),
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
        default: new Date(Date.now()),
    },
});
const User = mongoose.model<IUser>("User", userSchema);

export default User;
