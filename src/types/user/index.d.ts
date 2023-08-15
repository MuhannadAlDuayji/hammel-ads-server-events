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
    userTypeName: string;
    userTypeId: number;
    userId: string;
    createdAt: Date;
    balance: number;
    paymentMethods: UserPaymentMethodType[];
    transactions: Transaction[];
    totalAmountCharged: number;
    bonusAdded: boolean;
    discount: number;
    generateAuthToken: () => string;
    generateConfirmationToken: () => string;
}
