import { patcher } from "@pyoncord/api";
import { findByProps } from "@pyoncord/metro/filters";
import { createStorage, logger } from "@pyoncord/plugin";

interface Storage {
    confirmCalls: boolean;
}

export const storage = createStorage<Storage>();
storage.confirmCalls ??= true;

const callManager = findByProps("handleStartCall");
const dialog = findByProps("show", "confirm", "close");

export default definePlugin({
    start() {
        patcher.instead("handleStartCall", callManager, (args, orig) => {
            if (!storage.confirmCalls) return orig(...args);
            
            const [{ rawRecipients: [{ username }, multiple] }, isVideo] = args;
            const action = isVideo ? "video call" : "call";

            // if `multiple` is defined, it's probably a group call
            dialog.show({
                title: multiple ? `Start a group ${action}?` : `Start a ${action} with ${username}?`,
                body: multiple ? "Are you sure you want to start the group call?" : `Are you sure you want to **${action} with ${username}**?`,
                confirmText: "Yes",
                cancelText: "Cancel",
                confirmColor: "brand",
                onConfirm: () => {
                    try {
                        orig(...args);
                    } catch (e) {
                        logger.error("Failed to start call", e);
                    }
                },
            });
        });
    }
});
