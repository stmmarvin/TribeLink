import { useForm, usePage } from "@inertiajs/react";
import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
} from "react";
import { Avatar } from "@/components/tribelink/avatar";
import { Button } from "@/components/tribelink/button";
import { icons } from "@/components/tribelink/icons";
import { Card } from "@/components/tribelink/card";
import { FieldError, inputClasses } from "@/components/tribelink/input";
import { SegmentedTabs } from "@/components/tribelink/tabs";
import {
    POST_IMAGE_MAX_BYTES,
    POST_IMAGE_MAX_MB,
    POST_IMAGE_TYPES,
    POST_MAX_LENGTH,
} from "@/lib/post";
import { usernameFor } from "@/lib/user";
import { cn } from "@/lib/utils";
import type { Visibility } from "@/types";

type PostForm = {
    body: string;
    visibility: Visibility;
    image: File | null;
};

export function PostComposer() {
    const { auth } = usePage().props;
    const username = usernameFor(auth.user);

    const form = useForm<PostForm>({
        body: "",
        visibility: "friends",
        image: null,
    });
    const fileInput = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);

    // Make a temporary URL for the preview and clean it up again
    useEffect(() => {
        if (!form.data.image) {
            setPreview(null);
            return;
        }
        const url = URL.createObjectURL(form.data.image);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [form.data.image]);

    const length = form.data.body.length;
    const canSubmit =
        !form.processing &&
        form.data.body.trim() !== "" &&
        length <= POST_MAX_LENGTH;

    function chooseImage(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!POST_IMAGE_TYPES.includes(file.type)) {
            form.setError("image", "Kies een JPG, PNG, WEBP of GIF.");
            event.target.value = "";
            return;
        }

        if (file.size > POST_IMAGE_MAX_BYTES) {
            form.setError(
                "image",
                `Foto mag maximaal ${POST_IMAGE_MAX_MB} MB zijn.`,
            );
            event.target.value = "";
            return;
        }

        form.clearErrors("image");
        form.setData("image", file);
    }

    function removeImage() {
        form.setData("image", null);
        if (fileInput.current) fileInput.current.value = "";
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        // Inertia sends multipart/form-data automatically because of the File
        form.post("/feed");
    }

    return (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* Linkerkaart: het formulier */}
            <Card className="flex-1 p-4 md:p-5 lg:max-w-[476px]">
                <form onSubmit={submit} className="flex flex-col gap-4">
                    {/* Post */}
                    <SegmentedTabs<"post">
                        idPrefix="create"
                        label="Wat wil je maken?"
                        value="post"
                        onChange={() => {}}
                        tabs={[{ value: "post", label: "Post" }]}
                    />

                    {/* Tekst */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="body" className="sr-only">
                            Tekst
                        </label>
                        <textarea
                            id="body"
                            rows={7}
                            placeholder="Voorbeeld Bericht: Wat gaan jullie doen vandaag?"
                            maxLength={POST_MAX_LENGTH}
                            value={form.data.body}
                            onChange={(e) =>
                                form.setData("body", e.target.value)
                            }
                            aria-invalid={form.errors.body ? true : undefined}
                            aria-describedby="body-count body-error"
                            className={cn(
                                inputClasses,
                                "min-h-[136px] resize-y py-3 md:h-auto",
                                form.errors.body && "border-danger",
                            )}
                        />
                        <div className="flex items-start justify-between gap-2">
                            <FieldError
                                id="body-error"
                                message={form.errors.body}
                            />
                            <span
                                id="body-count"
                                aria-live="polite"
                                className={cn(
                                    "ml-auto type-caption",
                                    length > POST_MAX_LENGTH - 100
                                        ? "text-danger-text"
                                        : "text-ink-muted",
                                )}
                            >
                                {length}/{POST_MAX_LENGTH}
                            </span>
                        </div>
                    </div>

                    {/* Afbeelding */}
                    <div className="flex flex-col gap-1.5">
                        {preview ? (
                            <div className="relative">
                                <img
                                    src={preview}
                                    alt="Voorbeeld van je afbeelding"
                                    className="max-h-64 w-full rounded-field object-cover"
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={removeImage}
                                    className="absolute top-2 right-2"
                                >
                                    Verwijderen
                                </Button>
                            </div>
                        ) : (
                            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-field border border-dashed border-line-dashed bg-media-tint px-4 py-6 text-center transition-colors hover:border-brand focus-within:ring-2 focus-within:ring-brand/25">
                                <input
                                    ref={fileInput}
                                    type="file"
                                    accept={POST_IMAGE_TYPES.join(",")}
                                    onChange={chooseImage}
                                    className="sr-only"
                                    aria-describedby={
                                        form.errors.image
                                            ? "image-error"
                                            : undefined
                                    }
                                />
                                <img
                                    src={icons.image}
                                    alt=""
                                    width={16}
                                    height={16}
                                />
                                <span className="type-small font-semibold text-brand-aa">
                                    Afbeelding toevoegen
                                </span>
                                <span className="type-caption text-ink-muted">
                                    Optioneel · jpg, png of gif · max.{" "}
                                    {POST_IMAGE_MAX_MB} MB
                                </span>
                            </label>
                        )}
                        <FieldError
                            id="image-error"
                            message={form.errors.image}
                        />
                    </div>

                    {/* Zichtbaarheid */}
                    <div className="flex flex-col gap-1.5">
                        <p className="type-field-label text-ink">
                            Zichtbaarheid
                        </p>
                        <SegmentedTabs<Visibility>
                            idPrefix="visibility"
                            label="Zichtbaarheid"
                            value={form.data.visibility}
                            onChange={(value) =>
                                form.setData("visibility", value)
                            }
                            tabs={[
                                { value: "public", label: "Publiek" },
                                { value: "friends", label: "Alleen vrienden" },
                            ]}
                            fullWidth
                        />
                        <FieldError message={form.errors.visibility} />
                    </div>

                    {form.progress && (
                        <progress
                            value={form.progress.percentage}
                            max={100}
                            className="w-full"
                        />
                    )}

                    <Button
                        type="submit"
                        size="md"
                        disabled={!canSubmit}
                        className="self-end px-12"
                    >
                        {form.processing ? "Plaatsen…" : "Plaatsen"}
                    </Button>
                </form>
            </Card>

            {/* Rechterkaart: live voorbeeld */}
            <aside aria-label="Voorbeeld" className="lg:w-[228px] lg:shrink-0">
                <Card className="p-4">
                    <h2 className="mb-3 type-h3 text-ink">Voorbeeld</h2>
                    <article className="flex flex-col gap-2 rounded-card border border-line p-3">
                        <header className="flex items-center gap-2">
                            <Avatar
                                name={username}
                                src={auth.user.avatar}
                                size={28}
                            />
                            <div className="flex min-w-0 flex-col leading-[16px]">
                                <span className="truncate font-display text-sm font-bold text-ink">
                                    @{username}
                                </span>
                                <span className="type-caption text-ink-muted">
                                    {form.data.visibility === "friends"
                                        ? "Alleen vrienden"
                                        : "Post"}{" "}
                                    · nu
                                </span>
                            </div>
                        </header>
                        <p className="type-small break-words whitespace-pre-line text-ink-secondary">
                            {form.data.body || "Tekst"}
                        </p>
                        {preview && (
                            <img
                                src={preview}
                                alt=""
                                className="h-[96px] w-full rounded-card object-cover"
                            />
                        )}
                    </article>
                </Card>
            </aside>
        </div>
    );
}
