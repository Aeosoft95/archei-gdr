import mongoose, { Schema, models, model } from "mongoose";

export interface IUser extends mongoose.Document {
  email: string;
  password: string; // bcrypt hash
  name?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, unique: true, required: true, lowercase: true, index: true },
    password: { type: String, required: true },
    name: { type: String },
    avatarUrl: { type: String }
  },
  { timestamps: true }
);

export default models.User || model<IUser>("User", UserSchema);
