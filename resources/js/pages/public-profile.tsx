import { Head, Link, router } from "@inertiajs/react";
import { Mail, Printer, ScanLine, Sparkles } from "lucide-react";
import { PostCard } from "@/components/content/post-card";
import { Button } from "@/components/ui/button";
import type { Post, User } from "@/types";

type PublicProfileProps = {
    user: Pick<
        User,
        "id" | "name" | "poster_message" | "username" | "bio" | "avatar"
    > & { email: string | null };
    viewer: {
        authenticated: boolean;
        is_self: boolean;
        is_friend: boolean;
    };
    profile_url: string;
    qr_code_svg: string;
    // Friends (and you) get all posts, others only public ones, guests none
    posts?: Post[];
};

export default function PublicProfile({
    user,
    viewer,
    profile_url,
    qr_code_svg,
    posts = [],
}: PublicProfileProps) {
    const posterMessage =
        typeof user.poster_message === "string" && user.poster_message.trim()
            ? user.poster_message.trim()
            : "Let's connect and start a conversation.";
    const contactHref = user.email
        ? `mailto:${encodeURIComponent(user.email)}?subject=${encodeURIComponent(`Hi ${user.name}`)}&body=${encodeURIComponent(`Hi ${user.name},\n\nI found your profile poster and would love to connect.`)}`
        : null;

    return (
        <>
            <Head title={`${user.name} | Contact`} />

            <style>{`
                @page {
                    size: A4;
                    margin: 0;
                }

                @media print {
                    body {
                        background: #f8fafc !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    .no-print {
                        display: none !important;
                    }

                    .poster-page {
                        min-height: 297mm !important;
                        padding: 18mm !important;
                    }

                    .poster-card {
                        min-height: 261mm !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                    }

                    .poster-qr {
                        width: 78mm !important;
                        height: 78mm !important;
                    }
                }
            `}</style>

            <div className="poster-page min-h-screen bg-slate-950 px-4 py-8 text-slate-900 sm:px-6 sm:py-12 lg:px-8">
                <div className="mx-auto max-w-4xl">
                    <div className="poster-card overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl shadow-black/30">
                        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-10 text-white sm:px-12 sm:py-14">
                            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
                            <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-fuchsia-300/20 blur-3xl" />
                            <div className="relative max-w-2xl">
                                {user.avatar && (
                                    <img
                                        src={user.avatar}
                                        alt={`Profielfoto van ${user.name}`}
                                        className="mb-6 size-24 rounded-full border-4 border-white/30 object-cover sm:size-28"
                                    />
                                )}
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-50 backdrop-blur">
                                    <Sparkles
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    Meet & connect
                                </div>
                                <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">
                                    Hi, I&apos;m {user.name}
                                </h1>
                                <p className="mt-3 text-sm font-semibold tracking-wide text-indigo-100">
                                    @{user.username}
                                </p>
                                <p className="mt-5 max-w-xl text-lg leading-8 text-indigo-50 sm:text-xl">
                                    {posterMessage}
                                </p>
                                {user.bio && (
                                    <p className="mt-4 max-w-xl text-sm leading-6 text-indigo-100">
                                        {user.bio}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-10 p-6 sm:p-12 md:grid-cols-[1fr_auto] md:items-center">
                            <div className="max-w-xl">
                                <div className="flex items-center gap-3 text-indigo-600">
                                    <div className="grid size-10 place-items-center rounded-2xl bg-indigo-50">
                                        <ScanLine
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </div>
                                    <p className="text-sm font-bold uppercase tracking-[0.16em]">
                                        Scan to connect
                                    </p>
                                </div>
                                <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                                    Let&apos;s get to know each other.
                                </h2>
                                <p className="mt-4 text-base leading-7 text-slate-600">
                                    Scan the QR code with your phone to open my
                                    profile and send me a message.
                                </p>
                                <div className="mt-8 hidden rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 md:block">
                                    <p className="font-semibold text-slate-900">
                                        Profile link
                                    </p>
                                    <p className="mt-1 break-all">
                                        {profile_url}
                                    </p>
                                </div>
                            </div>

                            <div className="mx-auto rounded-[1.75rem] bg-slate-950 p-4 text-center shadow-xl shadow-indigo-950/20 sm:p-5">
                                <div
                                    className="poster-qr mx-auto size-56 overflow-hidden rounded-2xl bg-white p-3 sm:size-64 [&>svg]:size-full"
                                    dangerouslySetInnerHTML={{
                                        __html: qr_code_svg,
                                    }}
                                />
                                <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-white/70">
                                    Open profile
                                </p>
                            </div>
                        </div>

                        <div className="no-print flex flex-col gap-4 border-t border-slate-200 bg-slate-50 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-12">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">
                                    Ready to share?
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    Print this poster or save it as a PDF.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {viewer.authenticated && !viewer.is_self && (
                                    <>
                                        <Button asChild variant="outline">
                                            <Link
                                                href={`/ontmoeten/berichten/start/${user.id}`}
                                            >
                                                Chat starten
                                            </Link>
                                        </Button>
                                        <Button
                                            onClick={() =>
                                                viewer.is_friend
                                                    ? router.delete(
                                                          `/friends/${user.id}`,
                                                          {
                                                              preserveScroll: true,
                                                          },
                                                      )
                                                    : router.post(
                                                          `/friends/${user.id}`,
                                                          {},
                                                          {
                                                              preserveScroll: true,
                                                          },
                                                      )
                                            }
                                            variant={
                                                viewer.is_friend
                                                    ? "outline"
                                                    : "default"
                                            }
                                        >
                                            {viewer.is_friend
                                                ? "Vriend verwijderen"
                                                : "Als vriend toevoegen"}
                                        </Button>
                                    </>
                                )}
                                {!viewer.authenticated && (
                                    <Button asChild>
                                        <Link
                                            href={`/ontmoeten/berichten/start/${user.id}`}
                                        >
                                            Log in om een bericht te sturen
                                        </Link>
                                    </Button>
                                )}
                                <Button
                                    onClick={() => window.print()}
                                    className="gap-2"
                                >
                                    <Printer
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Print / save PDF
                                </Button>
                                {contactHref && (
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="gap-2 bg-white"
                                    >
                                        <a href={contactHref}>
                                            <Mail
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                            Send message
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {viewer.authenticated && (
                        <section
                            aria-labelledby="profile-posts"
                            className="no-print mt-8 flex flex-col gap-4"
                        >
                            <h2
                                id="profile-posts"
                                className="text-lg font-bold text-white"
                            >
                                Posts van {user.name}
                            </h2>
                            {posts.length === 0 ? (
                                <p className="text-sm text-slate-400">
                                    Nog geen posts om te tonen.
                                </p>
                            ) : (
                                posts.map((post) => (
                                    <PostCard key={post.id} post={post} />
                                ))
                            )}
                        </section>
                    )}
                </div>
            </div>
        </>
    );
}
