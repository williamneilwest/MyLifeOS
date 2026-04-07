import { NavLink } from 'react-router-dom';
import { cn } from '../../../utils/cn';

const tabs = [
  { label: 'Overview', to: '/finance' },
  { label: 'Income', to: '/finance/income' },
  { label: 'Expenses', to: '/finance/expenses' },
  { label: 'Savings', to: '/finance/savings' },
  { label: 'Debt', to: '/finance/debt' },
];

export function FinanceSubNav() {
  return (
    <nav className="sticky top-0 z-40 rounded-xl border border-white/10 bg-zinc-900/90 p-1 backdrop-blur-md">
      <div className="flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/finance'}
            className={({ isActive }) =>
              cn(
                'rounded-lg px-3 py-1.5 text-sm transition-all',
                isActive
                  ? 'bg-emerald-500/20 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
