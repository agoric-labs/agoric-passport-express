import mongoose, { Document } from 'mongoose';

const Schema = mongoose.Schema;

export type UserDetail = {
  provider: 'google' | 'discord';
  username: string;
  email?: string;
  googleId?: string;
  discordId?: string;
  fetchedAt?: string;
};

export type UserDocument = Document &
  UserDetail & {
    walletChallenge: string;
    walletAddress: string;
  };

const userSchema = new Schema<UserDocument>({
  provider: String,
  username: String,
  email: String,
  googleId: String,
  discordId: String,
  fetchedAt: String,
  walletChallenge: String,
  walletAddress: String,
});

const User = mongoose.model<UserDocument>('User', userSchema);

export default User;
