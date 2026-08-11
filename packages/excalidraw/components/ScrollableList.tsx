import clsx from "clsx";
import { Children } from "react";

import "./ScrollableList.scss";

interface ScrollableListProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "role"> {
  className?: string;
  placeholder: string;
  children: React.ReactNode;
  semanticMode?: "menu" | "picker-listbox";
}

export const ScrollableList = ({
  className,
  placeholder,
  children,
  semanticMode = "menu",
  ...rest
}: ScrollableListProps) => {
  const isEmpty = !Children.count(children);

  return (
    <div
      {...rest}
      className={clsx("ScrollableList__wrapper", className)}
      role={semanticMode === "picker-listbox" ? "listbox" : "menu"}
    >
      {isEmpty ? <div className="empty">{placeholder}</div> : children}
    </div>
  );
};
