import { useId } from "react";
import ProfileController from "@/actions/App/Http/Controllers/Settings/ProfileController";
import { Avatar } from "@/components/tribelink/avatar";
import { Button, Spinner } from "@/components/tribelink/button";
import { FieldError, FieldHint } from "@/components/tribelink/input";
import { useImageUpload } from "@/hooks/use-image-upload";

const MAX_SIZE_MB = 2;

/**
 * Avatar picker that uploads the chosen photo right away. A local preview is
 * shown while the upload runs.
 */
export function AvatarUpload({
    name,
    currentUrl,
}: {
    name: string;
    currentUrl?: string | null;
}) {
    const inputId = useId();
    const { inputRef, previewUrl, error, processing, choose, remove } =
        useImageUpload({
            field: "avatar",
            uploadUrl: ProfileController.updateAvatar.url(),
            removeUrl: ProfileController.destroyAvatar.url(),
            maxSizeMb: MAX_SIZE_MB,
        });

    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <Avatar
                name={name}
                src={previewUrl ?? currentUrl}
                size={112}
                className="self-center sm:self-auto"
            />
            <div className="flex flex-col gap-2.5">
                <div className="flex flex-wrap gap-2.5">
                    <input
                        ref={inputRef}
                        id={inputId}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(event) => choose(event.target.files?.[0])}
                    />
                    <Button
                        variant="secondary"
                        size="md"
                        disabled={processing}
                        onClick={() => inputRef.current?.click()}
                        aria-controls={inputId}
                    >
                        {processing && <Spinner />}
                        Foto kiezen
                    </Button>
                    {currentUrl && !previewUrl && (
                        <Button
                            variant="ghost"
                            size="md"
                            disabled={processing}
                            onClick={remove}
                        >
                            Verwijderen
                        </Button>
                    )}
                </div>
                <FieldHint>JPG, PNG of WebP, max. {MAX_SIZE_MB} MB.</FieldHint>
                <FieldError message={error} />
            </div>
        </div>
    );
}
