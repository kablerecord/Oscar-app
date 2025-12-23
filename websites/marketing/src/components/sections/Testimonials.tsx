const testimonials = [
  {
    quote: "I used to spend 20 minutes crafting the 'perfect' prompt. Now I draft something rough, hit Refine, and get a sharper question in seconds. It's changed my whole workflow.",
    author: "Beta Tester",
    role: "Startup Founder",
    avatar: "S",
  },
  {
    quote: "The Knowledge Vault is a game-changer. I uploaded my company's SOPs and now I get answers grounded in how WE actually do things, not generic advice.",
    author: "Beta Tester",
    role: "Operations Director",
    avatar: "O",
  },
  {
    quote: "Running the same question through Claude and GPT-4 side-by-side showed me how much I was missing with a single-model approach. The disagreements are where the gold is.",
    author: "Beta Tester",
    role: "Strategy Consultant",
    avatar: "S",
  },
]

export function Testimonials() {
  return (
    <section className="py-20 bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block text-blue-400 font-semibold text-sm uppercase tracking-wider mb-3">
            Early Feedback
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            What Beta Users Are Saying
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            We&apos;re still in development, but early testers are already seeing the difference.
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 hover:border-blue-500/30 transition-colors"
            >
              {/* Quote icon */}
              <svg
                className="absolute top-6 right-6 h-8 w-8 text-blue-500/20"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>

              {/* Quote */}
              <p className="text-slate-300 mb-6 relative z-10">
                &quot;{testimonial.quote}&quot;
              </p>

              {/* Author */}
              <div className="flex items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 font-semibold mr-3">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{testimonial.author}</div>
                  <div className="text-xs text-slate-500">{testimonial.role}</div>
                </div>
              </div>

              {/* Placeholder badge */}
              <div className="absolute bottom-4 right-4">
                <span className="text-xs text-slate-600 italic">
                  Beta tester
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500 italic">
            Real testimonials coming soon. Join the waitlist to be among the first.
          </p>
        </div>
      </div>
    </section>
  )
}
