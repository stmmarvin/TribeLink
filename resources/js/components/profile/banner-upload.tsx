import { useId } from "react";
import ProfileController from "@/actions/App/Http/Controllers/Settings/ProfileController";
import { Button, Spinner } from "@/components/tribelink/button";
import { FieldError, FieldHint } from "@/components/tribelink/input";
import { useImageUpload } from "@/hooks/use-image-upload";

const MAX_SIZE_MB = 4;

/**
 * Banner picker for the wide image behind the profile photo. Uploads the
 * chosen image right away; looks like the banner on "Mijn profiel".
 */
export function BannerUpload({ currentUrl }: { currentUrl?: string | null }) {
    const inputId = useId();
    const { inputRef, previewUrl, error, processing, choose, remove } =
        useImageUpload({
            field: "banner",
            uploadUrl: ProfileController.updateBanner.url(),
            removeUrl: ProfileController.destroyBanner.url(),
            maxSizeMb: MAX_SIZE_MB,
        });
    const src = previewUrl ?? currentUrl;

    return (
        <div className="flex flex-col gap-2.5">
            <div className="h-[120px] overflow-hidden rounded-card bg-media-tint md:h-[160px]">
                {src ? (
                    <img
                        src={src}
                        alt="Profielbanner"
                        className="size-full object-cover"
                    />
                ) : (
                    <div className="size-full bg-brand-gradient opacity-25" />
                )}
            </div>
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
                    Banner kiezen
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
            <FieldHint>
                Brede afbeelding, bijv. 1500 × 500 px. JPG, PNG of WebP, max.{" "}
                {MAX_SIZE_MB} MB.
            </FieldHint>
            <FieldError message={error} />
        </div>
    );
}
