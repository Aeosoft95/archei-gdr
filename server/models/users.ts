import { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    // NON mettiamo select:false, così è sempre leggibile quando serve confrontare l'hash
    password: { type: String, required: true }
  },
  { timestamps: true }
);

const User = models.User || model("User", UserSchema);
export default User;
