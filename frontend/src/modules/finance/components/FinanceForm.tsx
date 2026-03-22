import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import type { FinanceEntry, FinanceEntryType } from '../../../types';

interface FinanceFormProps {
  onSubmit: (entry: FinanceEntry) => void;
}

export function FinanceForm({ onSubmit }: FinanceFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [amount, setAmount] = useState('0');
  const [type, setType] = useState<FinanceEntryType>('expense');

  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          id: crypto.randomUUID(),
          name,
          category,
          amount: Number(amount),
          type,
          date: new Date().toISOString().slice(0, 10),
        });
        setName('');
        setCategory('General');
        setAmount('0');
      }}
    >
      <Input label="Entry name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Mortgage fund transfer" required />
      <Input label="Category" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Housing" required />
      <Input label="Amount" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} min="0" step="0.01" required />
      <label className="flex flex-col gap-2 text-sm text-slate-200">
        <span className="font-medium">Type</span>
        <select value={type} onChange={(event) => setType(event.target.value as FinanceEntryType)} className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none focus:border-blue-400/50">
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="savings">Savings</option>
        </select>
      </label>
      <div className="md:col-span-2 flex justify-end">
        <Button type="submit">Add Entry</Button>
      </div>
    </form>
  );
}
