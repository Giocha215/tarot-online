"use client";

import { useLanguage } from "@/components/i18n/language-provider";
import { BLOG_POSTS } from "./data";
import { ArrowRight, ExternalLink } from "./icons";

export function Blog() {
  const { t } = useLanguage();
  return (
    <section id="blog" className="container-tarot scroll-mt-24 pt-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-accent1">
            {t.blogSection.eyebrow}
          </p>
          <h2 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">
            {t.blogSection.title}
          </h2>
        </div>
        <a href="#blog" className="btn-ghost hidden shrink-0 sm:inline-flex">
          {t.blogSection.verTodos} <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="mt-7 grid gap-5 md:grid-cols-3">
        {BLOG_POSTS.map((post, i) => {
          const tr = t.blogPosts[i];
          return (
            <article
              key={`${tr.title}-${i}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition-all hover:-translate-y-1 hover:shadow-card"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={post.image}
                  alt={tr.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-accent1">
                  {tr.category} · {post.minutes}
                </p>
                <h3 className="mt-2 font-serif text-xl leading-snug text-ink">
                  {tr.title}
                </h3>
                <p className="mt-2 flex-1 text-[0.86rem] text-ink-soft">
                  {tr.excerpt}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent1">
                  {t.blogSection.lerArtigo}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
