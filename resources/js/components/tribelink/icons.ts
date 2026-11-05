// SVG icons exported 1:1 from the TribeLink Figma file.
// Every nav icon has a Default / Hover / Active colour variant, exactly like
// the "Desktop/Sidebar nav item" component set in Figma.
import gridActive from "../../../images/icons/grid-active.svg";
import gridHover from "../../../images/icons/grid-hover.svg";
import grid from "../../../images/icons/grid.svg";
import homeActive from "../../../images/icons/home-active.svg";
import homeHover from "../../../images/icons/home-hover.svg";
import home from "../../../images/icons/home.svg";
import image from "../../../images/icons/image.svg";
import lockError from "../../../images/icons/lock-error.svg";
import lockMuted from "../../../images/icons/lock-muted.svg";
import lock from "../../../images/icons/lock.svg";
import mail from "../../../images/icons/mail.svg";
import meetChatLg from "../../../images/icons/meet-chat-lg.svg";
import meetChat from "../../../images/icons/meet-chat.svg";
import meetGameLg from "../../../images/icons/meet-game-lg.svg";
import meetGame from "../../../images/icons/meet-game.svg";
import meetMailLg from "../../../images/icons/meet-mail-lg.svg";
import meetMail from "../../../images/icons/meet-mail.svg";
import meetQrLg from "../../../images/icons/meet-qr-lg.svg";
import meetQr from "../../../images/icons/meet-qr.svg";
import menuUser from "../../../images/icons/menu-user.svg";
import menuUsers from "../../../images/icons/menu-users.svg";
import userActive from "../../../images/icons/user-active.svg";
import userHover from "../../../images/icons/user-hover.svg";
import user from "../../../images/icons/user.svg";
import usersActive from "../../../images/icons/users-active.svg";
import usersHover from "../../../images/icons/users-hover.svg";
import users from "../../../images/icons/users.svg";

export type NavIconName = "home" | "users" | "grid" | "user";

export const navIcons: Record<
    NavIconName,
    { default: string; hover: string; active: string }
> = {
    home: { default: home, hover: homeHover, active: homeActive },
    users: { default: users, hover: usersHover, active: usersActive },
    grid: { default: grid, hover: gridHover, active: gridActive },
    user: { default: user, hover: userHover, active: userActive },
};

export const icons = {
    lock,
    lockMuted,
    lockError,
    mail,
    image,
    menuUser,
    menuUsers,
};

/** Ontmoeten option icons: `lg` for the desktop tiles, `sm` for mobile rows. */
export const meetIcons = {
    chat: { lg: meetChatLg, sm: meetChat },
    mail: { lg: meetMailLg, sm: meetMail },
    game: { lg: meetGameLg, sm: meetGame },
    qr: { lg: meetQrLg, sm: meetQr },
};
