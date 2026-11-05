import { Head, router, usePoll } from "@inertiajs/react";
import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/random-chat/chat-panel";
import { LeaveDialog, ReportDialog } from "@/components/random-chat/dialogs";
import { SearchDots } from "@/components/random-chat/search-rings";
import {
    FriendStepsCard,
    HowItWorksCard,
    HowItWorksSteps,
    LobbyRoomsCard,
    PartnerCard,
} from "@/components/random-chat/sidebar-cards";
import {
    OnlineCount,
    StatusPanel,
} from "@/components/random-chat/status-panel";
import { BackLink, MobileHeader } from "@/components/tribelink/back-link";
import { Button, ButtonLink } from "@/components/tribelink/button";
import { PageHeader } from "@/layouts/app-layout";
import { ontmoeten } from "@/routes";
import { cancel, leave, report, save, search } from "@/routes/random-chat";
import { store } from "@/routes/random-chat/messages";
import type { RandomChatReport, RandomChatSession } from "@/types";

/** How often the page asks the server for a match / new messages. */
const POLL_MS = 2000;

const keep = {
    preserveScroll: true,
    preserveState: true,
    only: ["randomChat"],
};

/** `router.post` as a promise, so buttons can show their own loading state. */
function post(url: string, data: Record<string, unknown> = {}) {
    return new Promise<void>((resolve, reject) => {
        router.post(url, data as never, {
            ...keep,
            onSuccess: () => resolve(),
            onError: (errors) => reject(errors),
        });
    });
}

/**
 * Random chat (Figma 2.3 wachten, 2.4 gesprek, 2.10 chat verlaten) on top of
 * RandomChatController: "Start" puts you in the queue, two students who are
 * searching at the same time are matched and chat anonymously here.
 */
export default function RandomChat({
    randomChat,
}: {
    randomChat: RandomChatSession;
}) {
    const { status, chat, messages, onlineCount } = randomChat;
    const [dialog, setDialog] = useState<"leave" | "report" | null>(null);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);

    // Poll only while something can change: waiting for a match, or chatting.
    const poll = usePoll(
        POLL_MS,
        { only: ["randomChat"] },
        { autoStart: false },
    );
    const live = status === "searching" || status === "chatting";

    useEffect(() => {
        if (live) {
            poll.start();
        } else {
            poll.stop();
        }
        // `poll` is a new object every render; only `live` matters here.
    }, [live]);

    const startSearch = () => {
        setSendError(null);
        router.post(search.url(), {}, keep);
    };
    const cancelSearch = () => router.delete(cancel.url(), keep);
    const skip = () =>
        chat && router.post(leave.url(Number(chat.id)), { search: true }, keep);
    const leaveToOntmoeten = () => {
        setDialog(null);

        if (chat) {
            router.post(leave.url(Number(chat.id)));
        } else {
            router.visit(ontmoeten());
        }
    };
    const requestLeave = () => {
        if (status === "chatting" && chat && !chat.saved) {
            setDialog("leave");
        } else {
            leaveToOntmoeten();
        }
    };
    const savePartner = () =>
        chat ? post(save.url(Number(chat.id))) : Promise.resolve();
    const reportPartner = async (data: RandomChatReport) => {
        if (chat) {
            await post(report.url(Number(chat.id)), data);
        }
    };
    const send = (body: string, clear: () => void) => {
        if (!chat) {
            return;
        }

        router.post(
            store.url(Number(chat.id)),
            { body },
            {
                ...keep,
                onStart: () => {
                    setSending(true);
                    setSendError(null);
                },
                onSuccess: () => clear(),
                onError: (errors) =>
                    setSendError(
                        errors.body ??
                            "Je bericht kon niet worden verstuurd. Probeer het opnieuw.",
                    ),
                onFinish: () => setSending(false),
            },
        );
    };

    const inChat = status === "chatting" && chat !== null;

    return (
        <>
            <Head
                title={inChat ? `@${chat.partner.username}` : "Random chat"}
            />
            <PageHeader title="Random chat" />

            <div className="flex h-[calc(100dvh-68px-env(safe-area-inset-bottom))] min-h-0 gap-6 px-5 pt-1 pb-5 md:px-10 md:py-6 lg:h-[calc(100dvh-72px)] lg:py-8 xl:px-[72px]">
                <section
                    aria-label="Random chat"
                    className="flex min-h-0 min-w-0 flex-1 flex-col gap-3.5 md:gap-4"
                >
                    {inChat ? (
                        <BackLink
                            onClick={requestLeave}
                            className="hidden md:inline-flex"
                        />
                    ) : (
                        <BackLink
                            href={ontmoeten()}
                            className="hidden md:inline-flex"
                        />
                    )}

                    {!inChat && (
                        <MobileHeader
                            title="Random chat"
                            backHref={ontmoeten()}
                            className="md:hidden"
                        />
                    )}

                    {status === "idle" && (
                        <StatusPanel
                            rings="idle"
                            title="Praat met een random student"
                            actions={
                                <Button fullWidth onClick={startSearch}>
                                    Start random chat
                                </Button>
                            }
                        >
                            <p className="type-small text-ink-secondary">
                                Je wordt gekoppeld aan iemand die op hetzelfde
                                moment zoekt. Jullie blijven anoniem tot je zelf
                                iets deelt.
                            </p>
                            <OnlineCount count={onlineCount} />
                            <HowItWorksSteps className="mt-2 w-full rounded-card border border-line bg-surface p-4 shadow-card md:bg-subtle md:shadow-none xl:hidden" />
                        </StatusPanel>
                    )}

                    {status === "searching" && (
                        <StatusPanel
                            rings="searching"
                            title="Op zoek naar iemand die online is…"
                            live
                            actions={
                                <Button
                                    variant="secondary"
                                    fullWidth
                                    onClick={cancelSearch}
                                >
                                    Annuleren
                                </Button>
                            }
                        >
                            <OnlineCount count={onlineCount} />
                            <SearchDots />
                        </StatusPanel>
                    )}

                    {inChat && (
                        <ChatPanel
                            key={chat.id}
                            partner={chat.partner}
                            messages={messages}
                            saved={chat.saved}
                            reconnecting={false}
                            sending={sending}
                            sendError={sendError}
                            onSend={send}
                            onSave={savePartner}
                            onSkip={skip}
                            onLeave={requestLeave}
                            onReport={() => setDialog("report")}
                        />
                    )}

                    {status === "ended" && chat && (
                        <StatusPanel
                            rings="static"
                            live
                            title={
                                chat.endReason === "reported"
                                    ? "Bedankt voor je melding"
                                    : `@${chat.partner.username} heeft de chat verlaten`
                            }
                            actions={
                                <>
                                    <Button fullWidth onClick={startSearch}>
                                        Zoek een nieuwe chat
                                    </Button>
                                    <ButtonLink
                                        href={ontmoeten()}
                                        variant="secondary"
                                        fullWidth
                                    >
                                        Terug naar Ontmoeten
                                    </ButtonLink>
                                </>
                            }
                        >
                            <p className="type-small text-ink-secondary">
                                {chat.endReason === "reported"
                                    ? "De chat is beëindigd en jullie worden niet meer aan elkaar gekoppeld."
                                    : chat.saved
                                      ? `Je hebt @${chat.partner.username} bewaard, dus jullie kunnen verder praten via Berichten.`
                                      : "Het gesprek is beëindigd. Omdat je niet had bewaard, kun je het niet meer terugvinden."}
                            </p>
                        </StatusPanel>
                    )}
                </section>

                <aside
                    aria-label={
                        inChat
                            ? "Over dit gesprek"
                            : "Meer manieren om te ontmoeten"
                    }
                    className="hidden w-[336px] shrink-0 flex-col gap-8 overflow-y-auto xl:flex"
                >
                    {inChat ? (
                        <>
                            <PartnerCard
                                partner={chat.partner}
                                saved={chat.saved}
                                onSave={savePartner}
                                onSkip={skip}
                                onLeave={requestLeave}
                            />
                            <FriendStepsCard />
                        </>
                    ) : (
                        <>
                            <HowItWorksCard />
                            <LobbyRoomsCard />
                        </>
                    )}
                </aside>
            </div>

            {chat && (
                <>
                    <LeaveDialog
                        open={dialog === "leave"}
                        username={chat.partner.username}
                        onClose={() => setDialog(null)}
                        onLeave={leaveToOntmoeten}
                        onSaveAndLeave={async () => {
                            await savePartner();
                            leaveToOntmoeten();
                        }}
                    />
                    <ReportDialog
                        open={dialog === "report"}
                        username={chat.partner.username}
                        onClose={() => setDialog(null)}
                        onReport={reportPartner}
                    />
                </>
            )}
        </>
    );
}
