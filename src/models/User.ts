import mongoose, { Document } from 'mongoose';

const Schema = mongoose.Schema;

export type UserDocument = Document & {
  username: string;
  email: string;
  googleId: string;
  walletChallenge: string;
  walletAddress: string;
};

const userSchema = new Schema<UserDocument>({
  username: String,
  email: String,
  googleId: String,
  walletChallenge: String,
  walletAddress: String,
});

const User = mongoose.model<UserDocument>('User', userSchema);

export default User;
