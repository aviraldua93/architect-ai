import Link from 'next/link';

const features = [
  {
    icon: '📝',
    title: 'Practice Quiz',
    description: 'Quick practice sessions with instant feedback',
    href: '/quiz',
    gradient: 'from-indigo-500/20 to-violet-500/20',
    border: 'hover:border-indigo-500/40',
  },
  {
    icon: '📖',
    title: 'Study Mode',
    description: 'Learn with detailed explanations for every question',
    href: '/study',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    border: 'hover:border-emerald-500/40',
  },
  {
    icon: '🎯',
    title: 'Mock Exam',
    description: 'Timed 30-question exam simulation',
    href: '/exam',
    gradient: 'from-amber-500/20 to-orange-500/20',
    border: 'hover:border-amber-500/40',
  },
  {
    icon: '📊',
    title: 'Dashboard',
    description: 'Track progress, study streaks, and weak areas',
    href: '/dashboard',
    gradient: 'from-rose-500/20 to-pink-500/20',
    border: 'hover:border-rose-500/40',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-20 pb-16 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-[800px] rounded-full bg-indigo-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-400">
            🧠 Claude Certified Architect Exam Prep
          </div>

          <h1 className="mb-6 bg-gradient-to-b from-slate-100 to-slate-400 bg-clip-text text-5xl font-black leading-tight tracking-tight text-transparent sm:text-6xl lg:text-7xl">
            Master the Claude Certified Architect Exam
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
            AI-powered study tool with{' '}
            <span className="font-semibold text-slate-200">105 questions</span> across{' '}
            <span className="font-semibold text-slate-200">5 domains</span>. Practice quizzes,
            study mode with explanations, and timed mock exams.
          </p>

          <Link
            href="/quiz"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            Start Practicing
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(feature => (
            <Link
              key={feature.title}
              href={feature.href}
              className={`group relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br ${feature.gradient} p-8 backdrop-blur-sm transition-all duration-300 ${feature.border} hover:shadow-xl hover:shadow-indigo-500/5`}
            >
              <div className="mb-4 text-4xl">{feature.icon}</div>
              <h3 className="mb-2 text-xl font-bold text-slate-100">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{feature.description}</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-indigo-400 transition-transform group-hover:translate-x-1">
                Get started
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-slate-800 bg-slate-900/50">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-8 px-4 py-8 sm:gap-16">
          {[
            { value: '5', label: 'Domains' },
            { value: '30', label: 'Task Statements' },
            { value: '105', label: 'Questions' },
            { value: '72%', label: 'Passing Score' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-indigo-400">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Domain overview */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-center text-2xl font-bold text-slate-100">Five Exam Domains</h2>
        <div className="space-y-3">
          {[
            { num: 1, name: 'Agentic Architecture', weight: '28%', color: 'border-l-violet-500', desc: 'Loops, orchestration, subagents, state management' },
            { num: 2, name: 'Tool Design & MCP', weight: '24%', color: 'border-l-blue-500', desc: 'Interfaces, protocol, registry, error handling' },
            { num: 3, name: 'CLI & Commands', weight: '16%', color: 'border-l-emerald-500', desc: 'CLAUDE.md, slash commands, glob patterns, CI/CD' },
            { num: 4, name: 'Prompt Engineering', weight: '18%', color: 'border-l-amber-500', desc: 'Templates, CoT, few-shot, validation patterns' },
            { num: 5, name: 'Context Management', weight: '14%', color: 'border-l-rose-500', desc: 'Windows, tokens, retrieval, escalation patterns' },
          ].map(domain => (
            <div
              key={domain.num}
              className={`flex items-center justify-between rounded-lg border border-slate-800 border-l-4 ${domain.color} bg-slate-900/50 px-6 py-4`}
            >
              <div>
                <p className="font-semibold text-slate-200">Domain {domain.num}: {domain.name}</p>
                <p className="text-sm text-slate-500">{domain.desc}</p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold text-slate-300">
                {domain.weight}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
