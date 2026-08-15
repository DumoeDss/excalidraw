import { checkIcon, emptyIcon } from "../icons";

import DropdownMenuItem from "./DropdownMenuItem";

import type { DropdownMenuItemProps } from "./DropdownMenuItem";

const DropdownMenuItemCheckbox = (
  props: Omit<DropdownMenuItemProps, "icon"> & { checked: boolean },
) => {
  const { checked, ...rest } = props;
  return (
    <DropdownMenuItem
      {...rest}
      icon={checked ? checkIcon : emptyIcon}
      selected={checked || rest.selected}
      role="menuitemcheckbox"
      aria-checked={checked}
    />
  );
};

export default DropdownMenuItemCheckbox;
