import mongoose, { Schema, model, models } from "mongoose";

export interface ISession extends mongoose.Document {
  name: string;
  description?: string;
  maxPlayers: number;
  code: string;         // codice invito univoco
  ownerId: string;      // id del creatore
  playersCount: number; // giocatori attuali (creatore incluso)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    maxPlayers: { type: Number, required: true, min: 1, max: 99 },
    code: { type: String, required: true, unique: true, index: true },
    ownerId: { type: String, required: true, index: true },
    playersCount: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default models.Session || model<ISession>("Session", SessionSchema);
