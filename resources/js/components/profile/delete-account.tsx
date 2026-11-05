import { Form } from "@inertiajs/react";
import { useRef, useState } from "react";
import ProfileController from "@/actions/App/Http/Controllers/Settings/ProfileController";
import { Button, Spinner } from "@/components/tribelink/button";
import { TextField } from "@/components/tribelink/input";
import { Modal } from "@/components/tribelink/modal";

/**
 * Danger zone + confirmation modal. Same request as the starter kit
 * (DELETE settings/profile with the current password).
 */
export function DeleteAccount() {
    const [open, setOpen] = useState(false);
    const passwordInput = useRef<HTMLInputElement>(null);

    return (
        <>
            <Button
                variant="danger-outline"
                size="md"
                onClick={() => setOpen(true)}
                data-test="delete-user-button"
                className="shrink-0 self-start md:self-auto"
            >
                Verwijderen
            </Button>

            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title="Account verwijderen?"
                description="Je profiel, bewaarde contacten en berichten worden definitief verwijderd. Dit kun je niet ongedaan maken. Vul je wachtwoord in om te bevestigen."
            >
                <Form
                    {...ProfileController.destroy.form()}
                    options={{ preserveScroll: true }}
                    onError={() => passwordInput.current?.focus()}
                    resetOnSuccess
                    className="flex flex-col gap-4"
                >
                    {({ resetAndClearErrors, processing, errors }) => (
                        <>
                            <TextField
                                ref={passwordInput}
                                id="delete-password"
                                name="password"
                                type="password"
                                label="Wachtwoord"
                                autoComplete="current-password"
                                placeholder="Je wachtwoord"
                                autoFocus
                                error={errors.password}
                            />
                            <Button
                                type="submit"
                                variant="danger"
                                fullWidth
                                disabled={processing}
                                data-test="confirm-delete-user-button"
                            >
                                {processing && <Spinner />}
                                Definitief verwijderen
                            </Button>
                            <Button
                                variant="ghost"
                                fullWidth
                                onClick={() => {
                                    resetAndClearErrors();
                                    setOpen(false);
                                }}
                            >
                                Annuleren
                            </Button>
                        </>
                    )}
                </Form>
            </Modal>
        </>
    );
}
