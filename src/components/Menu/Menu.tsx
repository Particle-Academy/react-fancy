import { cn } from "../../utils/cn";
import { MenuContext } from "./Menu.context";
import { MenuItem } from "./MenuItem";
import { MenuSubmenu } from "./MenuSubmenu";
import { MenuGroup } from "./MenuGroup";
import type { MenuProps } from "./Menu.types";

function MenuRoot({ children, orientation = "vertical", className }: MenuProps) {
  const isVertical = orientation === "vertical";

  return (
    <MenuContext.Provider value={{ orientation }}>
      <nav
        data-react-fancy-menu=""
        data-orientation={orientation}
        className={cn(
          "flex gap-0.5",
          isVertical ? "flex-col" : "flex-row items-center",
          className,
        )}
      >
        {children}
      </nav>
    </MenuContext.Provider>
  );
}

export const Menu = Object.assign(MenuRoot, {
  Item: MenuItem,
  Submenu: MenuSubmenu,
  Group: MenuGroup,
});
