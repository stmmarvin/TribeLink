import { Head } from "@inertiajs/react";
import { PostComposer } from "@/components/content/post-composer";
import { PageHeader } from "@/layouts/app-layout";

export default function FeedCreate() {
    return (
        <>
            <Head title="Nieuwe post" />
            <PageHeader title="Nieuwe post" backHref="/feed" />

            <div className="flex-1 px-5 pt-1 pb-24 md:px-10 md:py-8 xl:px-[72px]">
                <PostComposer />
            </div>
        </>
    );
}
