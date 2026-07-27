import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ArrowRight } from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { POSTS, POST_BY_SLUG } from "@/lib/blog";

type Params = { slug: string };

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = POST_BY_SLUG[slug];
  if (!post) return {};
  return {
    title: `${post.title} | IELTSAce Blog`,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title: post.title, description: post.excerpt },
  };
}

export default async function BlogArticle({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = POST_BY_SLUG[slug];
  if (!post) notFound();

  return (
    <MarketingShell>
      <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
        <ArrowLeft className="size-4" /> All articles
      </Link>

      <article className="mt-6">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-brand-soft px-2.5 py-0.5 font-medium text-brand">{post.category}</span>
          <span className="flex items-center gap-1 text-ink-muted"><Clock className="size-3" /> {post.readMins} min read</span>
          <span className="text-ink-muted">· {post.date}</span>
        </div>

        <h1 className="font-serif mt-4 text-4xl leading-tight tracking-tight sm:text-5xl">{post.title}</h1>
        <p className="mt-4 text-lg text-ink-soft">{post.excerpt}</p>

        <div className="mt-8 space-y-7 border-t border-line pt-8">
          {post.sections.map((s, i) => (
            <section key={i}>
              {s.heading && <h2 className="text-xl font-semibold text-ink">{s.heading}</h2>}
              {s.paragraphs?.map((p, j) => (
                <p key={j} className="mt-2 leading-relaxed text-ink-soft">{p}</p>
              ))}
              {s.bullets && (
                <ul className="mt-3 space-y-2">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex gap-2.5 text-ink-soft">
                      <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-ink-muted/50" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </article>

      {/* CTA */}
      <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-line bg-paper-elev p-8 text-center">
        <h2 className="font-serif text-2xl tracking-tight">Put it into practice.</h2>
        <p className="max-w-md text-sm text-ink-soft">Get AI-scored on your Writing and Speaking, free to start.</p>
        <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-green px-6 py-3 text-sm font-semibold text-green-ink transition-[filter] hover:brightness-105">
          Start practising free <ArrowRight className="size-4" />
        </Link>
      </div>
    </MarketingShell>
  );
}
