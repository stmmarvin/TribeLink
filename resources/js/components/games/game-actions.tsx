import { Button } from "@/components/tribelink/button";
import { Modal } from "@/components/tribelink/modal";

/** "Opgeven" (while playing) and "Verlaten", in the page header of a game. */
export function GameActions({
    playing,
    onResign,
    onLeave,
}: {
    playing: boolean;
    onResign: () => void;
    onLeave: () => void;
}) {
    return (
        <div className="flex gap-2">
            {playing && (
                <Button variant="danger-outline" size="sm" onClick={onResign}>
                    Opgeven
                </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onLeave}>
                Verlaten
            </Button>
        </div>
    );
}

/** "Partij opgeven?" / "Partij verlaten?": confirm, or keep playing. */
export function ConfirmGameExit({
    open,
    title,
    description,
    confirmLabel,
    onConfirm,
    onClose,
}: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
    onClose: () => void;
}) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            description={description}
        >
            <div className="flex flex-col gap-3">
                <Button variant="danger" fullWidth onClick={onConfirm}>
                    {confirmLabel}
                </Button>
                <Button variant="secondary" fullWidth onClick={onClose}>
                    Doorspelen
                </Button>
            </div>
        </Modal>
    );
}
