import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import definePlugin from "@utils/types";
import { FluxDispatcher, Menu, React } from "@webpack/common";
import { User } from "discord-types/general";

const STORAGE_KEY = "HideVoiceUsers_List";
let hiddenUsers = new Set<string>();

const userContextMenuPatch: NavContextMenuPatchCallback = (children, { user }: { user: User }) => {
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
        
        // Принудительно обновляем список войса
        FluxDispatcher.dispatch({ type: "VOICE_STATE_UPDATES", voiceStates: [] });
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
        "user-profile-actions": userContextMenuPatch // Меню трех точек в профиле
    },

    patches: [
        {
            // Патчим рендер списка пользователей под голосовым каналом
            find: "VoiceUser:",
            replacement: {
                match: /(?<=renderVoiceUsers\(\)\{.{0,200}?\.map\()(\i=>)/,
                replace: "user => !$self.isHidden(user?.user?.id) && ($1)"
            }
        }
    ],

    isHidden(userId?: string) {
        return userId ? hiddenUsers.has(userId) : false;
    },

    async start() {
        const saved = await DataStore.get<string[]>(STORAGE_KEY);
        if (saved) hiddenUsers = new Set(saved);
    }
});
