import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import definePlugin from "@utils/types";
import { Menu, React } from "@webpack/common";

const STORAGE_KEY = "HideVoiceUsers_List";
let hiddenUsers = new Set<string>();
let styleEl: HTMLStyleElement | null = null;

function updateStyles() {
    if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "hide-voice-users-style";
        document.head.appendChild(styleEl);
    }
    if (hiddenUsers.size === 0) {
        styleEl.textContent = "";
        return;
    }
    const rules = Array.from(hiddenUsers).map(
        id => `div[class*="voiceUser"]:has(img[src*="${id}"]) { display: none !important; }`
    );
    styleEl.textContent = rules.join("\n");
}

const userContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    const user = props?.user;
    if (!user) return;

    const [isHidden, setIsHidden] = React.useState(hiddenUsers.has(user.id));

    const toggleHide = async () => {
        if (hiddenUsers.has(user.id)) {
            hiddenUsers.delete(user.id);
            setIsHidden(false);
        } else {
            hiddenUsers.add(user.id);
            setIsHidden(true);
        }
        await DataStore.set(STORAGE_KEY, Array.from(hiddenUsers));
        updateStyles();
    };

    const group = findGroupChildrenByChildId("user-profile", children) ?? children;
    group.push(
        <Menu.MenuItem
            id="hide-voice-user"
            label={isHidden ? "Показать в войсе" : "Скрыть из войса"}
            action={toggleHide}
        />
    );
};

export default definePlugin({
    name: "HideVoiceUsers",
    description: "Скрывает выбранных пользователей из списка голосового канала по кнопке в меню профиля",
    authors: [{ name: "chmosha", id: 0n }],

    contextMenus: {
        "user-context": userContextMenuPatch,
        "user-profile-actions": userContextMenuPatch
    },

    async start() {
        const saved = await DataStore.get<string[]>(STORAGE_KEY);
        if (saved) hiddenUsers = new Set(saved);
        updateStyles();
    },

    stop() {
        if (styleEl) {
            styleEl.remove();
            styleEl = null;
        }
    }
});
