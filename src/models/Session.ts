import { Schema, model, models, Types } from "mongoose";

export interface ISession {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  date?: Date;
  maxPlayers?: number;
  tags?: string[];
  visibility: "public" | "private";
  ownerId: Types.ObjectId;
  inviteCode: string;
  participants: Types.ObjectId[]; // per il count rapido
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    date: { type: Date },
    maxPlayers: { type: Number, default: 5, min: 1, max: 50 },
    tags: [{ type: String }],
    visibility: { type: String, enum: ["public", "private"], default: "private" },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    inviteCode: { type: String, required: true, unique: true, index: true },
    participants: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
  },
  { timestamps: true }
);

const Session = models.Session || model<ISession>("Session", SessionSchema);
export default Session;
