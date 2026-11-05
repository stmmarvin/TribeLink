import { useForm } from "@inertiajs/react";
import { Pencil } from "lucide-react";
import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
} from "react";
import { Button } from "@/components/tribelink/button";
import { icons } from "@/components/tribelink/icons";
import { FieldError, inputClasses } from "@/components/tribelink/input";
import {
    POST_IMAGE_MAX_BYTES,
    POST_IMAGE_MAX_MB,
    POST_IMAGE_TYPES,
    POST_MAX_LENGTH,
} from "@/lib/post";
import { cn } from "@/lib/utils";

type EditForm = {
    _method: "patch";
    body: string;
    image: File | null;
    remove_image: boolean;
};

/** Quiet pencil icon that opens the edit form. */
export function EditPostButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="Post bewerken"
            title="Bewerken"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-subtle hover:text-ink focus-ring"
        >
            <Pencil size={16} aria-hidden="true" />
        </button>
    );
}

/** Edit the text and photo of a post in place, with save and cancel. */
export function EditPostForm({
    postId,
    body,
    imageUrl,
    onDone,
}: {
    postId: string;
    body: string;
    imageUrl?: string | null;
    onDone: () => void;
}) {
    // Files can't be sent with a real PATCH, so we POST and let Laravel
    // treat it as PATCH via _method
    const form = useForm<EditForm>({
        _method: "patch",
        body,
        image: null,
        remove_image: false,
    });
    const fileInput = useRef<HTMLInputElement>(null);
    const [newPreview, setNewPreview] = useState<string | null>(null);

    useEffect(() => {
        if (!form.data.image) {
            setNewPreview(null);
            return;
        }
        const url = URL.createObjectURL(form.data.image);
        setNewPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [form.data.image]);

    // What the photo looks like after saving
    const preview =
        newPreview ?? (form.data.remove_image ? null : (imageUrl ?? null));

    const length = form.data.body.length;
    const changed =
        form.data.body !== body ||
        form.data.image !== null ||
        form.data.remove_image;
    const canSave =
        !form.processing &&
        form.data.body.trim() !== "" &&
        length <= POST_MAX_LENGTH &&
        changed;

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
        form.setData((data) => ({ ...data, image: file, remove_image: false }));
    }

    function removeImage() {
        form.setData((data) => ({ ...data, image: null, remove_image: true }));
        if (fileInput.current) fileInput.current.value = "";
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(`/feed/${postId}`, {
            preserveScroll: true,
            onSuccess: onDone,
        });
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
                <label htmlFor={`edit-${postId}`} className="sr-only">
                    Tekst van je post
                </label>
                <textarea
                    id={`edit-${postId}`}
                    placeholder="Voorbeeld Bericht: Wat gaan jullie doen vandaag?"
                    autoFocus
                    rows={4}
                    value={form.data.body}
                    onChange={(e) => form.setData("body", e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && onDone()}
                    className={cn(
                        inputClasses,
                        "h-auto min-h-[96px] resize-y py-2",
                    )}
                />
                <div className="flex items-start justify-between gap-2">
                    <FieldError message={form.errors.body} />
                    <span
                        className={cn(
                            "ml-auto type-caption",
                            length > POST_MAX_LENGTH
                                ? "text-danger-text"
                                : "text-ink-muted",
                        )}
                    >
                        {length}/{POST_MAX_LENGTH}
                    </span>
                </div>
            </div>

            {/* Foto */}
            <div className="flex flex-col gap-1.5">
                <input
                    ref={fileInput}
                    id={`edit-image-${postId}`}
                    type="file"
                    accept={POST_IMAGE_TYPES.join(",")}
                    onChange={chooseImage}
                    className="sr-only"
                />
                {preview ? (
                    <div className="relative">
                        <img
                            src={preview}
                            alt="Foto bij je post"
                            className="max-h-64 w-full rounded-field object-cover"
                        />
                        <div className="absolute top-2 right-2 flex gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => fileInput.current?.click()}
                            >
                                Wijzigen
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={removeImage}
                            >
                                Verwijderen
                            </Button>
                        </div>
                    </div>
                ) : (
                    <label
                        htmlFor={`edit-image-${postId}`}
                        className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-field border border-dashed border-line-dashed bg-media-tint px-4 py-6 text-center transition-colors hover:border-brand"
                    >
                        <img src={icons.image} alt="" width={16} height={16} />
                        <span className="type-small font-semibold text-brand-aa">
                            Afbeelding toevoegen
                        </span>
                        <span className="type-caption text-ink-muted">
                            Optioneel · jpg, png of gif · max.{" "}
                            {POST_IMAGE_MAX_MB} MB
                        </span>
                    </label>
                )}
                <FieldError message={form.errors.image} />
            </div>

            <div className="flex justify-end gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onDone}
                >
                    Annuleren
                </Button>
                <Button type="submit" size="sm" disabled={!canSave}>
                    {form.processing ? "Opslaan…" : "Opslaan"}
                </Button>
            </div>
        </form>
    );
}
