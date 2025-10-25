import DiceRoller from "../../components/tools/DiceRoller";

export default function RollerPage() {
  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6">
      <h1 className="text-xl font-semibold mb-4">Tiradadi — ARCHEI</h1>
      <DiceRoller />
    </div>
  );
}