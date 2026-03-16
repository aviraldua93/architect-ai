/**
 * DomainBadge — colour-coded badge for domain identification.
 *
 * @author Zara Ibrahim, Frontend React Engineer — ArchitectAI
 */

import { DOMAIN_NAMES, DOMAIN_COLOURS } from '../lib/types';

interface DomainBadgeProps {
  domain: string;
  size?: 'sm' | 'md';
}

const defaultColour = {
  bg: 'bg-slate-500/20',
  text: 'text-slate-400',
  ring: 'ring-slate-500/30',
  fill: 'bg-slate-500',
};

export default function DomainBadge({ domain, size = 'md' }: DomainBadgeProps) {
  const domainNum = parseInt(domain.split('.')[0], 10);
  const colours = DOMAIN_COLOURS[domainNum] ?? defaultColour;
  const name = DOMAIN_NAMES[domainNum] ?? `Domain ${domainNum}`;

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs'
      : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset ${colours.bg} ${colours.text} ${colours.ring} ${sizeClasses}`}
    >
      <span
        className={`inline-block rounded-full ${colours.fill} ${size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2'}`}
        aria-hidden="true"
      />
      {name}
    </span>
  );
}
