import { router } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";

/**
 * Uploads a chosen image right away (multipart POST with `field`) and can
 * remove it again (DELETE). Shows a local preview while the upload runs.
 */
export function useImageUpload({
    field,
    uploadUrl,
    removeUrl,
    maxSizeMb,
}: {
    field: string;
    uploadUrl: string;
    removeUrl: string;
    maxSizeMb: number;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string>();
    const [processing, setProcessing] = useState(false);

    // Release the object URL when it is replaced or the component unmounts.
    useEffect(
        () => () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        },
        [previewUrl],
    );

    const resetInput = () => {
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    const choose = (file: File | undefined) => {
        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            setError("Kies een afbeelding (JPG, PNG of WebP).");

            return;
        }

        if (file.size > maxSizeMb * 1024 * 1024) {
            setError(`Je afbeelding mag maximaal ${maxSizeMb} MB zijn.`);

            return;
        }

        setError(undefined);
        setPreviewUrl(URL.createObjectURL(file));

        router.post(
            uploadUrl,
            { [field]: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onError: (errors) => {
                    setError(errors[field] ?? "Opslaan is niet gelukt.");
                    setPreviewUrl(null);
                },
                // The saved image now comes in through the page props.
                onSuccess: () => setPreviewUrl(null),
                onFinish: () => {
                    setProcessing(false);
                    resetInput();
                },
            },
        );
    };

    const remove = () => {
        router.delete(removeUrl, {
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onSuccess: () => {
                setPreviewUrl(null);
                setError(undefined);
            },
            onFinish: () => {
                setProcessing(false);
                resetInput();
            },
        });
    };

    return { inputRef, previewUrl, error, processing, choose, remove };
}
