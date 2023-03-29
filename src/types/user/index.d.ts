import mongoose from "mongoose";
import UserPaymentMethodType from "../paymentmethod";
import Transaction from "../transaction";
import { UserType } from "./UserType";
export default interface IUser extends mongoose.Document {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    password: string;
    photoPath: string | null;
    preferredLanguage: string;
    isEmailConfirmed: Boolean;
    confirmationToken: string | null;
    resetToken: string | null;
    resetTokenExpiration: Date | null;
    userType: UserType;
    userId: string;
    createdAt: Date;
    balance: number;
    paymentMethods: UserPaymentMethodType[];
    transactions: Transaction[];
    generateAuthToken: () => string;
    generateConfirmationToken: () => string;
}
